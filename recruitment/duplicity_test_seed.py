"""Test fixture for TA Duplicity Check Settings — every rule, one runnable set.

	bench --site <site> execute recruitment.duplicity_test_seed.seed
	bench --site <site> execute recruitment.duplicity_test_seed.teardown

Everything created is prefixed ``[DUP-TEST]`` (or DUPTEST for codes), lives in
one otherwise-unused company, and is removed by ``teardown``. Re-running
``seed`` is safe: it tears down first.

Why a dedicated company: the settings lookup resolves a company to exactly one
settings record, and the site already has TDC-00001 covering "BIG PVT LTD".
Seeding into a company nothing else claims keeps this fixture from colliding
with, or silently overriding, the existing configuration.

Ordering matters. The settings record is written LAST and the applicants are
created with overriding switched ON, because the seed's own inserts would
otherwise be refused by the very rules it is setting up.
"""

import frappe
from frappe.utils import add_days, nowdate, today

MARKER = "[DUP-TEST]"
COMPANY = "PW_02"

# Two openings, so "applied elsewhere" and "reapplied to the same job" are
# distinguishable.
OPENING_A = MARKER + " Alpha Engineer"
OPENING_B = MARKER + " Beta Analyst"

# One identity, reused across records — this is what the duplicity check matches
# on, and what makes two Job Applicant rows "the same person".
REPEAT_EMAIL = "duptest.repeat@example.com"
REPEAT_PAN = "DUPTA1234R"

ACTIVE_EMP_EMAIL = "duptest.active@example.com"
ACTIVE_EMP_PAN = "DUPTA5678A"

DNR_EMP_EMAIL = "duptest.dnr@example.com"
DNR_EMP_PAN = "DUPTD9012N"

RECENT_EXIT_EMAIL = "duptest.recent@example.com"
RECENT_EXIT_PAN = "DUPTR3456E"

MATCH_FIELDS = ("email_id", "custom_pan_number")

# The configuration under test. Every row of the specification is switched on to
# something observable — no rule is left at a default that does nothing.
SETTINGS = {
	"days_before_candidate_reapplication": 30,
	"allow_candidate_multi_positions_other_sources": 0,
	"allow_candidate_multi_positions_external_recruiter": 1,
	"block_job_offer_if_active_offer_exists": 1,
	"days_before_reapplication_post_exit": 180,
	"active_employee_non_ijp_action": "Block Job Offer",
	"do_not_rehire_action": "Exceptional Approval",
	"days_before_employee_ijp_reapplication": 15,
	"days_before_ijp_reapplication_if_rejected": 45,
	"allow_employee_multi_positions_ijp": 0,
	"allow_override_by_admins_and_roles": 1,
}

_log_lines = []


def _log(msg):
	_log_lines.append(msg)
	print("  " + msg)


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed():
	"""Build the whole fixture. Prints what to do with it."""
	_log_lines.clear()
	teardown(quiet=True)

	if not frappe.db.exists("Company", COMPANY):
		frappe.throw(f"Company {COMPANY} does not exist — edit COMPANY in this module.")

	print("\n=== seeding " + MARKER + " ===")
	designation = _designation()
	requisition = _requisition(designation)
	openings = _openings(designation, requisition)
	employees = _employees()
	_separation(employees["dnr"])
	settings = _settings()
	applicants = _applicants(openings, employees)

	frappe.db.commit()
	_print_guide(settings, openings, employees, applicants)
	return {"settings": settings, "openings": openings, "employees": employees,
	        "applicants": applicants, "requisition": requisition}


_DESIGNATION = []


def _designation_cached():
	if not _DESIGNATION:
		_DESIGNATION.append(frappe.db.get_value("Designation", {}, "name"))
	return _DESIGNATION[0]


def _designation():
	"""Reuse an existing Designation rather than create one.

	Designation is customised on this site (it autonames from a mandatory
	Designation Code), and the fixture has no opinion about which designation an
	opening carries — only that it has one.
	"""
	name = frappe.db.get_value("Designation", {}, "name")
	if not name:
		frappe.throw("No Designation exists on this site to attach the test openings to.")
	_log(f"designation {name} (reused)")
	return name


def _requisition(designation):
	"""Openings need an approved requisition with headcount left.

	Not a duplicity rule at all — ``api.offer_validation`` refuses any offer
	against an opening with no requisition behind it. Without this the offer-time
	tests never reach the duplicity check, and the failure looks like the
	duplicity rules are broken when they have not run.

	No Position Details rows are added on purpose, so capacity falls back to
	``no_of_positions`` — the simpler of the two headcount paths.
	"""
	existing = frappe.db.get_value("Job Requisition", {"custom_dup_test_marker": 1}, "name") \
		if frappe.get_meta("Job Requisition").has_field("custom_dup_test_marker") else None
	if existing:
		return existing

	doc = frappe.get_doc({
		"doctype": "Job Requisition",
		"designation": designation,
		"no_of_positions": 10,
		"company": COMPANY,
		"status": "Approved Active",
		"requested_by": "Administrator",
		"posting_date": today(),
		# An opening whose requisition names no recruiter is refused by
		# customizations.job_requisition — it would belong to nobody.
		"custom_assign_to_recruiter": "Administrator",
	})
	doc.flags.ignore_mandatory = True
	doc.flags.ignore_validate = True
	doc.insert(ignore_permissions=True)
	# Status is forced after insert: the requisition's own workflow resets a
	# directly-created record to Draft, and the offer gate reads the stored value.
	frappe.db.set_value("Job Requisition", doc.name, "status", "Approved Active",
	                    update_modified=False)
	_log(f"requisition {doc.name} — 10 positions, Approved Active")
	return doc.name


def _openings(designation, requisition):
	out = {}
	for key, title in (("a", OPENING_A), ("b", OPENING_B)):
		existing = frappe.db.get_value("Job Opening", {"job_title": title}, "name")
		if existing:
			out[key] = existing
			continue
		doc = frappe.get_doc({
			"doctype": "Job Opening",
			"job_title": title,
			"company": COMPANY,
			"designation": designation,
			"status": "Open",
			"job_requisition": requisition,
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		out[key] = doc.name
		_log(f"opening {doc.name} — {title}")
	return out


def _department():
	"""Any department will do — cn_hrms_core makes it mandatory on Employee."""
	return (
		frappe.db.get_value("Department", {"company": COMPANY, "is_group": 0}, "name")
		or frappe.db.get_value("Department", {"is_group": 0}, "name")
		or frappe.db.get_value("Department", {}, "name")
	)


def _employee(first_name, email, pan, status, relieving=None, joining=None):
	existing = frappe.db.get_value("Employee", {"personal_email": email}, "name")
	if existing:
		return existing

	doc = frappe.get_doc({
		"doctype": "Employee",
		"first_name": first_name,
		"gender": frappe.db.get_value("Gender", {}, "name") or "Male",
		"date_of_birth": "1990-01-01",
		"date_of_joining": joining or add_days(nowdate(), -1500),
		"company": COMPANY,
		"company_email": f"{first_name.lower().replace(' ', '.')}@duptest.internal",
		"personal_email": email,
		"status": "Active",
		"department": _department(),
		"designation": _designation_cached(),
	})
	if frappe.get_meta("Employee").has_field("pan_number"):
		doc.pan_number = pan
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)

	# Status and relieving date are set after insert: HRMS validates a relieving
	# date against the joining date and the separation flow on the way in, and
	# this fixture only needs the resulting state.
	if status != "Active":
		frappe.db.set_value("Employee", doc.name, {
			"status": status, "relieving_date": relieving
		}, update_modified=False)

	_log(f"employee {doc.name} — {first_name} ({status}"
	     + (f", relieved {relieving}" if relieving else "") + ")")
	return doc.name


def _employees():
	return {
		# Currently on the payroll -> "Matches an Active Employee & Source != IJP".
		"active": _employee("DupTest Active", ACTIVE_EMP_EMAIL, ACTIVE_EMP_PAN, "Active"),
		# Left, flagged on exit -> "Matches an Inactive Employee marked Do Not Rehire".
		"dnr": _employee("DupTest DoNotRehire", DNR_EMP_EMAIL, DNR_EMP_PAN, "Left",
		                 relieving=add_days(nowdate(), -400)),
		# Left 20 days ago, against a 180-day rule -> "too soon".
		"recent": _employee("DupTest RecentExit", RECENT_EXIT_EMAIL, RECENT_EXIT_PAN, "Left",
		                    relieving=add_days(nowdate(), -20)),
	}


def _separation(employee):
	"""The Do Not Rehire flag lives on Employee Separation, not on Employee."""
	if frappe.db.exists("Employee Separation", {"employee": employee, "docstatus": ["<", 2]}):
		return
	doc = frappe.get_doc({
		"doctype": "Employee Separation",
		"employee": employee,
		"company": COMPANY,
		"boarding_status": "Pending",
		"custom_mark_do_not_rehire": 1,
		"custom_not_to_be_rehired_comment": MARKER + " flagged for testing",
	})
	doc.flags.ignore_mandatory = True
	doc.flags.ignore_validate = True
	doc.insert(ignore_permissions=True)
	_log(f"separation {doc.name} — Do Not Rehire on {employee}")
	return doc.name


def _settings():
	doc = frappe.get_doc({
		"doctype": "TA Duplicity Check Settings",
		"duplicity_check_setting_name": MARKER + " Settings",
		"applicable_to_scope": "Specific Companies",
		"created_on": today(),
		**SETTINGS,
	})
	doc.append("applicable_to", {"company": COMPANY})
	for field in MATCH_FIELDS:
		doc.append("select_duplicity_check_fields", {"applicant_field": field})
	if frappe.db.exists("Role", "HR Manager"):
		doc.append("override_roles", {"role": "HR Manager"})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	_log(f"settings {doc.name} — match keys {list(MATCH_FIELDS)}, override ON")
	return doc.name


def _applicant(name, email, pan, opening, status, source=None, employee=None,
               created=None, modified=None):
	doc = frappe.get_doc({
		"doctype": "Job Applicant",
		"applicant_name": name,
		"email_id": email,
		"custom_pan_number": pan,
		"job_title": opening,
		"status": status,
		"custom_company_finalized": COMPANY,
	})
	if source:
		doc.source = source
	if employee:
		doc.custom_applied_employee = employee
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)

	# Backdate directly: creation/modified are what the cooldown rules read, and
	# they cannot be set through the ORM.
	stamps = {}
	if created:
		stamps["creation"] = created
	if modified:
		stamps["modified"] = modified
	if stamps:
		frappe.db.set_value("Job Applicant", doc.name, stamps, update_modified=False)

	_log(f"applicant {doc.name} — {status}"
	     + (f" via {source}" if source else "")
	     + (f", backdated {created or modified}" if stamps else ""))
	return doc.name


def _applicants(openings, employees):
	"""The history the rules are evaluated against.

	Inserted as Administrator with overriding ON, so the seed's own writes are
	not refused by the rules it is installing.
	"""
	out = {}

	# Rejected on Alpha 5 days ago, against a 30-day cooldown -> reapplying to
	# Alpha must be refused, from ANY source.
	out["rejected_recent"] = _applicant(
		MARKER + " Repeat Candidate", REPEAT_EMAIL, REPEAT_PAN, openings["a"],
		"Rejected", source="Naukri",
		created=add_days(nowdate(), -40), modified=add_days(nowdate(), -5),
	)

	# Live application on Beta -> a new application anywhere else must be refused
	# while "Allow multiple positions - Other Sources" is off.
	out["active_elsewhere"] = _applicant(
		MARKER + " Multi Position", "duptest.multi@example.com", "DUPTM1234P",
		openings["b"], "Open", source="Linkedin",
	)

	# IJP application 5 days ago, against a 15-day gap -> a 2nd IJP application to
	# a different opening must be refused.
	out["ijp_recent"] = _applicant(
		MARKER + " IJP Member", "duptest.ijp@example.com", "DUPTI5678J",
		openings["a"], "Open", source="IJP", employee=employees["active"],
		created=add_days(nowdate(), -5), modified=add_days(nowdate(), -5),
	)

	# Clean candidates carrying an employee's identity — for the offer-time rules.
	out["is_active_employee"] = _applicant(
		MARKER + " Active Employee Applicant", ACTIVE_EMP_EMAIL, ACTIVE_EMP_PAN,
		openings["b"], "Open", source="Careers Page",
	)
	out["is_dnr"] = _applicant(
		MARKER + " DoNotRehire Applicant", DNR_EMP_EMAIL, DNR_EMP_PAN,
		openings["b"], "Open", source="Careers Page",
	)
	out["is_recent_exit"] = _applicant(
		MARKER + " RecentExit Applicant", RECENT_EXIT_EMAIL, RECENT_EXIT_PAN,
		openings["b"], "Open", source="Careers Page",
	)
	return out


# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------

def teardown(quiet=False):
	"""Remove everything the seed created. Safe to run when nothing is there."""
	if not quiet:
		print("\n=== removing " + MARKER + " ===")

	emails = [REPEAT_EMAIL, ACTIVE_EMP_EMAIL, DNR_EMP_EMAIL, RECENT_EXIT_EMAIL,
	          "duptest.multi@example.com", "duptest.ijp@example.com"]

	# Offers first, then applicants: the offer links the applicant.
	applicants = set(frappe.get_all(
		"Job Applicant", filters={"email_id": ["in", emails]}, pluck="name"
	))
	applicants |= set(frappe.get_all(
		"Job Applicant", filters={"applicant_name": ["like", MARKER + "%"]}, pluck="name"
	))
	for offer in frappe.get_all(
		"Job Offer", filters={"job_applicant": ["in", list(applicants) or [""]]}, pluck="name"
	):
		_force_delete("Job Offer", offer, quiet)
	for name in applicants:
		_force_delete("Job Applicant", name, quiet)

	employees = frappe.get_all(
		"Employee", filters={"personal_email": ["in", emails]}, pluck="name"
	)
	for sep in frappe.get_all(
		"Employee Separation", filters={"employee": ["in", employees or [""]]}, pluck="name"
	):
		_force_delete("Employee Separation", sep, quiet)
	_release_employee_links(employees, quiet)
	for name in employees:
		_force_delete("Employee", name, quiet)

	# The Employee insert provisions a User off company_email; remove those too,
	# or a re-seed reuses a stale account.
	for user in frappe.get_all(
		"User", filters={"name": ["like", "%@duptest.internal"]}, pluck="name"
	):
		_force_delete("User", user, quiet)

	# Openings before the requisition they point at.
	for dt, filters in (
		("TA Duplicity Check Settings", {"duplicity_check_setting_name": ["like", MARKER + "%"]}),
		("Job Opening", {"job_title": ["like", MARKER + "%"]}),
	):
		for name in frappe.get_all(dt, filters=filters, pluck="name"):
			_force_delete(dt, name, quiet)

	for name in frappe.get_all(
		"Job Requisition", filters={"company": COMPANY, "no_of_positions": 10}, pluck="name"
	):
		_force_delete("Job Requisition", name, quiet)

	frappe.db.commit()


def _release_employee_links(employees, quiet=False):
	"""Drop the rows that hold the test employees, not the records holding them.

	Other apps auto-assign new employees into shared records (a Dynamic User
	Assignment here). Those are real records with real people in them, so the
	fixture removes only its OWN child rows and never the parent.
	"""
	if not employees:
		return
	for child_dt, field in (("Assigned Users", "employee_id"),):
		if not frappe.db.exists("DocType", child_dt):
			continue
		for row in frappe.get_all(
			child_dt, filters={field: ["in", employees]}, fields=["name", "parent"]
		):
			try:
				frappe.db.delete(child_dt, {"name": row.name})
				if not quiet:
					print(f"  released {child_dt} row on {row.parent}")
			except Exception as exc:
				if not quiet:
					print(f"  could not release {child_dt} {row.name}: {exc}")


def _force_delete(doctype, name, quiet=False):
	try:
		doc = frappe.get_doc(doctype, name)
		if doc.meta.is_submittable and doc.docstatus == 1:
			doc.cancel()
		doc.delete(ignore_permissions=True)
		if not quiet:
			print(f"  deleted {doctype} {name}")
	except Exception as exc:
		if not quiet:
			print(f"  could not delete {doctype} {name}: {exc}")


# ---------------------------------------------------------------------------
# What to do with it
# ---------------------------------------------------------------------------

def _print_guide(settings, openings, employees, applicants):
	print(f"""
=== ready ===

Settings   {settings}   (company {COMPANY})
Openings   A={openings['a']} ({OPENING_A})
           B={openings['b']} ({OPENING_B})

IMPORTANT — how to test
  Overriding is ON with role "HR Manager", and Administrator / System Manager
  override too. Log in as a user with NONE of those roles (an "HR User" is
  ideal), or the rules will let you straight through. To test as an admin,
  untick "Allow Permission Holders to Override..." on {settings} first.

APPLICATION-TIME rules — new Job Applicant, company {COMPANY}
  1  Mandatory match keys
     New applicant on opening A, fill Email but leave PAN blank.
     EXPECT: refused, "PAN is required ...".

  2  Rejection cooldown (30 days, any source)
     New applicant on opening A with email {REPEAT_EMAIL}
     (or PAN {REPEAT_PAN}) and PAN filled. That person was rejected 5 days ago.
     EXPECT: refused, reapplication allowed only from {add_days(nowdate(), 25)}.
     Change the source — still refused. That is the "any source" part.

  3  Multi-position, other sources
     New applicant on opening A with email duptest.multi@example.com + a PAN.
     They already have a live application on B.
     EXPECT: refused, "already has an active application".

  4  IJP gap (15 days)
     New applicant on opening B, source IJP, Applied Employee = {employees['active']}.
     They applied via IJP 5 days ago.
     EXPECT: refused, allowed only from {add_days(nowdate(), 10)}.

OFFER-TIME rules — create a Job Offer for these applicants
  5  Active employee, source != IJP        -> BLOCK
     Offer to "{MARKER} Active Employee Applicant" ({applicants['is_active_employee']}).
     EXPECT: refused, "is already on record as an employee".

  6  Do Not Rehire                          -> EXCEPTIONAL APPROVAL
     Offer to "{MARKER} DoNotRehire Applicant" ({applicants['is_dnr']}).
     EXPECT: saves, orange message, and on the offer
             "Duplicity Exception Required" = ticked with a reason.
             That checkbox is the Flow Config trigger.

  7  Exited too recently (180 days)         -> BLOCK
     Offer to "{MARKER} RecentExit Applicant" ({applicants['is_recent_exit']}).
     EXPECT: refused, "Left 20 day(s) ago; this company requires 180".

  8  Active offer elsewhere
     Give {applicants['is_dnr']} an offer (step 6), then create a SECOND
     Job Applicant with the same email {DNR_EMP_EMAIL} on opening A and offer
     that one too.
     EXPECT: refused, "already holds an active job offer".

  9  Override
     Repeat any blocked step as an HR Manager.
     EXPECT: goes through.

ALLOW HIRING — on {settings} tick "Allow Hiring Even Though It Matches ...",
pick a Hiring Workflow and an Exceptional Approval Workflow, and save
 10  Application let through
     Repeat step 2 or 3.
     EXPECT: saves with an orange message; Employee Record tab shows the
             Duplicity Match section with the reasons; the Hiring workflow
             tab shows the chosen workflow's stages, not the opening's.

 11  Offer routed to approval
     Repeat step 5 or 7, or offer to the applicant from step 10.
     EXPECT: saves with the reasons; a few seconds later "Duplicity Approval
             Trigger" = the Exceptional Approval Workflow's name, which starts
             that Flow Config (an HR Manager approval ToDo appears).

Clean up
  bench --site {frappe.local.site} execute recruitment.duplicity_test_seed.teardown
""")
