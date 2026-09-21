"""TEMPORARY freelancer-hiring data seeder (safe to delete).

Builds a small, readable dataset that shows the freelance flow end to end and,
alongside it, every case the rehire check has to tell apart.

What it creates
---------------
1. Employment Type **Freelancer** — the tag the whole flow hangs off.

2. Four "people we have employed before", each with a PAN, one per rehire case:

     PAN            who they are                          what should happen
     AAAAA1111A     currently an Active employee          block — already ours
     BBBBB2222B     left 3 months ago                     block — DOE under a year
     CCCCC3333C     left 3 years ago                      allow — clean rehire
     DDDDD4444D     left, marked Do Not Rehire            block — never again

3. The hiring chain, tagged Freelancer throughout:

     Job Requisition -> Job Opening -> Job Applicants -> Job Offer -> Onboarding

   Five candidates apply. One is new to us and walks the whole path to a draft
   Employee Onboarding; the other four each carry one of the PANs above, so
   every rehire case has a candidate sitting in the pipeline to demonstrate it.

The point of the four decoys is that they are indistinguishable on the Job
Applicant form — same shape of record, same stage — and differ only in what a
lookup against Employee would say about them. That is exactly the judgement the
rehire check exists to make, so the data is arranged to make a wrong answer
visible rather than plausible.

Everything is marked so cleanup() can remove it:
  Requisition   description contains  [FREELANCE-SEED]
  Opening       job_title starts      Seed Freelance
  Applicants    email like            seedfl.*@freelance-seed.test
  Employees     company_email like    seedemp.*@freelance-seed.test

Employment Type "Freelancer" is deliberately NOT removed by cleanup — it is real
configuration you want to keep, not seed data.

Run:
  bench --site recruitment execute recruitment.freelance_seed.run
Show what was built, and what each candidate should resolve to:
  bench --site recruitment execute recruitment.freelance_seed.report
Cleanup:
  bench --site recruitment execute recruitment.freelance_seed.cleanup
"""

import frappe
from frappe.utils import add_days, add_months, today

MARKER = "[FREELANCE-SEED]"
OPENING_PREFIX = "Seed Freelance"
CAND_DOMAIN = "@freelance-seed.test"
CAND_PREFIX = "seedfl."
EMP_PREFIX = "seedemp."

FREELANCER_TYPE = "Freelancer"

# One past/present employee per rehire case. `expect` is what the rehire check
# should conclude once it exists — the seeder asserts nothing, it just arranges
# the data so the answer is checkable by eye.
PAST_EMPLOYEES = [
	{
		"key": "active",
		"pan": "AAAAA1111A",
		"first_name": "Rohit",
		"last_name": "Malhotra",
		"status": "Active",
		"joined_months_ago": 30,
		"left_months_ago": None,
		"do_not_rehire": False,
		"expect": "BLOCK - currently an Active employee",
	},
	{
		"key": "recent_leaver",
		"pan": "BBBBB2222B",
		"first_name": "Sneha",
		"last_name": "Kulkarni",
		"status": "Left",
		"joined_months_ago": 40,
		"left_months_ago": 3,
		"do_not_rehire": False,
		"expect": "BLOCK - left under a year ago",
	},
	{
		"key": "old_leaver",
		"pan": "CCCCC3333C",
		"first_name": "Imran",
		"last_name": "Sheikh",
		"status": "Left",
		"joined_months_ago": 80,
		"left_months_ago": 36,
		"do_not_rehire": False,
		"expect": "ALLOW - left over a year ago, no flag",
	},
	{
		"key": "dnr",
		"pan": "DDDDD4444D",
		"first_name": "Vikram",
		"last_name": "Desai",
		"status": "Left",
		"joined_months_ago": 50,
		"left_months_ago": 18,
		"do_not_rehire": True,
		"expect": "BLOCK - marked Do Not Rehire",
	},
]

# The candidates who apply. The first is genuinely new; the rest each carry the
# PAN of one of the people above.
CANDIDATES = [
	{"key": "clean", "first": "Ananya", "last": "Rao", "pan": "EEEEE5555E",
	 "matches": None, "expect": "ALLOW - no prior record; walks through to onboarding"},
	{"key": "active", "first": "Rohit", "last": "Malhotra", "pan": "AAAAA1111A",
	 "matches": "active", "expect": PAST_EMPLOYEES[0]["expect"]},
	{"key": "recent_leaver", "first": "Sneha", "last": "Kulkarni", "pan": "BBBBB2222B",
	 "matches": "recent_leaver", "expect": PAST_EMPLOYEES[1]["expect"]},
	{"key": "old_leaver", "first": "Imran", "last": "Sheikh", "pan": "CCCCC3333C",
	 "matches": "old_leaver", "expect": PAST_EMPLOYEES[2]["expect"]},
	{"key": "dnr", "first": "Vikram", "last": "Desai", "pan": "DDDDD4444D",
	 "matches": "dnr", "expect": PAST_EMPLOYEES[3]["expect"]},
]

# The freelance pipeline. Short on purpose — a freelancer is screened and
# offered, not run through three interview panels.
HIRING_STAGES = [
	{"stage_name": "Screening", "stage_type": "Screening", "owner_role": "Recruiter"},
	{"stage_name": "Portfolio Review", "stage_type": "Interview", "owner_role": "Hiring Lead"},
]


def _log(msg):
	print(f"[freelance-seed] {msg}")


def _first(doctype, filters=None):
	"""The lowest-named matching record — a stable pick across runs."""
	rows = frappe.get_all(doctype, filters=filters or {}, pluck="name",
	                      order_by="name asc", limit=1)
	return rows[0] if rows else None


# --------------------------------------------------------------------------- #
# Masters
# --------------------------------------------------------------------------- #
def _ensure_employment_type():
	name = frappe.db.get_value("Employment Type", {"employee_type_name": FREELANCER_TYPE})
	if name:
		return name
	doc = frappe.get_doc({
		"doctype": "Employment Type",
		"employee_type_name": FREELANCER_TYPE,
	}).insert(ignore_permissions=True)
	_log(f"created Employment Type {FREELANCER_TYPE} ({doc.name})")
	return doc.name


def _context():
	"""The company / department / designation the seed data hangs off.

	Reuses what the site already has rather than inventing masters — seeded
	records should sit in the same places real ones do, or the screens they show
	up on look nothing like the real thing.

	Every lookup is ordered by name. Without that, "any Company" is whichever row
	the database happened to return first, and a second run of the seeder can
	build its documents under a different company than the first — leaving two
	half-sets that reference each other across a boundary they should never cross.
	"""
	company = _first("Company")
	if not company:
		frappe.throw("No Company on this site — cannot seed.")

	designation = _first("Designation")
	department = _first("Department", {"company": company}) or _first("Department")
	requested_by = (
		_first("Employee", {"status": "Active", "company": company})
		or _first("Employee", {"status": "Active"})
	)
	recruiter = _first("User", {"enabled": 1, "name": ["!=", "Guest"]})
	# Every headcount row is raised against a Branch, and names its reporting
	# manager — both are mandatory on Position Details. Branch is not company-scoped
	# on every site, so it is picked without a company filter.
	branch = _first("Branch")

	return frappe._dict(
		company=company, designation=designation, department=department,
		requested_by=requested_by, recruiter=recruiter, branch=branch,
	)


# --------------------------------------------------------------------------- #
# Check settings — which fields identify "the same person"
# --------------------------------------------------------------------------- #
# PAN first: it is the only one of the three that survives a person changing
# jobs, numbers and surname, which is exactly the case a rehire check is for.
# Email and phone are kept because they are what most candidates are actually
# matched on day to day — a PAN is often supplied late or not at all.
MATCH_FIELDS = ("custom_pan_number", "email_id", "phone_number")


def _seed_check_settings(ctx):
	"""Configure the duplicity and rehire checks for the seed company.

	Both are scoped to the seed company alone, so nothing here changes how
	candidates behave anywhere else on the site.

	The duplicity settings are deliberately configured NOT to block: cooldown 0,
	multi-position applications allowed. Creating them with a cooldown would
	immediately start refusing applications for this company — including the
	seeder's own — which is a surprise, not a demonstration. To watch the existing
	block work, set "Days Before Candidate Reapplication" to 30 on the record and
	re-apply one of the seeded candidates.

	The duplicity settings carry the match keys for both checks: the employee-pool
	detection reads the same keys (see ta_rehire_check), and TA Rehire Check
	Settings is no longer read at all — it is kept only so existing records stay
	readable.
	"""
	created = {}

	if not frappe.db.exists("TA Duplicity Check Settings", {"duplicity_check_setting_name": MARKER}):
		doc = frappe.get_doc({
			"doctype": "TA Duplicity Check Settings",
			"duplicity_check_setting_name": MARKER,
			"created_on": today(),
			"days_before_candidate_reapplication": 0,
			"allow_candidate_multi_positions_other_sources": 1,
			"allow_employee_multi_positions_ijp": 1,
			"allow_override_by_admins_and_roles": 1,
		})
		doc.append("applicable_to", {"company": ctx.company})
		for fieldname in MATCH_FIELDS:
			doc.append("select_duplicity_check_fields", {"applicant_field": fieldname})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		created["duplicity"] = doc.name
		_log(f"duplicity check settings {doc.name} (non-blocking) keys={list(MATCH_FIELDS)}")

	if not frappe.db.exists("TA Rehire Check Settings", {"rehire_check_setting_name": MARKER}):
		doc = frappe.get_doc({
			"doctype": "TA Rehire Check Settings",
			"rehire_check_setting_name": MARKER,
			"created_on": today(),
		})
		doc.append("applicable_to", {"company": ctx.company})
		for fieldname in MATCH_FIELDS:
			doc.append("select_rehire_check_fields", {"applicant_field": fieldname})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		created["rehire"] = doc.name
		_log(f"rehire check settings {doc.name} keys={list(MATCH_FIELDS)} "
		     f"(no engine reads these yet)")

	return created


# --------------------------------------------------------------------------- #
# The people we have employed before
# --------------------------------------------------------------------------- #
def _seed_past_employees(ctx):
	created = {}
	for spec in PAST_EMPLOYEES:
		email = f"{EMP_PREFIX}{spec['key']}{CAND_DOMAIN}"
		existing = frappe.db.get_value("Employee", {"company_email": email}, "name")
		if existing:
			created[spec["key"]] = existing
			continue

		doj = add_months(today(), -spec["joined_months_ago"])
		emp = frappe.get_doc({
			"doctype": "Employee",
			"first_name": spec["first_name"],
			"last_name": spec["last_name"],
			"gender": _any_gender(),
			"date_of_birth": add_months(today(), -12 * 32),
			"date_of_joining": doj,
			"company": ctx.company,
			"company_email": email,
			"personal_email": email,
			"designation": ctx.designation,
			"department": ctx.department,
			"status": "Active",
			"pan_number": spec["pan"],
		})
		emp.flags.ignore_mandatory = True
		emp.insert(ignore_permissions=True)

		if spec["status"] == "Left":
			# Written straight to the columns: going through Employee.save would
			# drag in the relieving/exit validations this data does not need.
			frappe.db.set_value("Employee", emp.name, {
				"status": "Left",
				"relieving_date": add_months(today(), -spec["left_months_ago"]),
			}, update_modified=False)

		if spec["do_not_rehire"]:
			_mark_do_not_rehire(emp.name, ctx)

		created[spec["key"]] = emp.name
		_log(f"employee {emp.name} {spec['first_name']} {spec['last_name']} "
		     f"pan={spec['pan']} -> {spec['expect']}")
	return created


def _any_gender():
	return frappe.db.get_value("Gender", {"name": "Male"}, "name") \
		or frappe.db.get_value("Gender", {}, "name")


def _mark_do_not_rehire(employee, ctx):
	"""Record the Do Not Rehire flag where the real flow records it.

	The flag lives on Employee Separation (``custom_mark_do_not_rehire``), not on
	Employee — so putting it anywhere else would make the seeded case unlike the
	real one and let a rehire check that reads the wrong place still look correct.

	Employee Separation runs a long before_insert chain (expense claims, absent
	days, leave). If any of it objects on this site we fall back to writing the
	row directly: the flag is what matters here, not the separation paperwork.
	"""
	existing = frappe.db.get_value(
		"Employee Separation", {"employee": employee, "docstatus": ["<", 2]}, "name"
	)
	if existing:
		frappe.db.set_value("Employee Separation", existing, "custom_mark_do_not_rehire", 1)
		return existing

	try:
		sep = frappe.get_doc({
			"doctype": "Employee Separation",
			"employee": employee,
			"company": ctx.company,
			"boarding_begins_on": today(),
			"custom_mark_do_not_rehire": 1,
			"custom_not_to_be_rehired_comment": f"{MARKER} seeded Do Not Rehire case",
		})
		sep.flags.ignore_mandatory = True
		sep.insert(ignore_permissions=True)
		_log(f"  separation {sep.name} marked Do Not Rehire")
		return sep.name
	except Exception as exc:
		_log(f"  separation doc refused ({type(exc).__name__}); flag not recorded — "
		     f"see Employee {employee}")
		return None


# --------------------------------------------------------------------------- #
# The hiring chain
# --------------------------------------------------------------------------- #
def _seed_requisition(ctx, employment_type):
	existing = frappe.db.get_value(
		"Job Requisition", {"description": ["like", f"%{MARKER}%"]}, "name"
	)
	if existing:
		# Re-run over a half-built requisition (an earlier run that failed further
		# down): carry it the rest of the way rather than returning it as-is, or
		# the opening cannot be activated against it.
		_approve_and_position(existing)
		return existing

	doc = frappe.get_doc({
		"doctype": "Job Requisition",
		"designation": ctx.designation,
		"department": ctx.department,
		"company": ctx.company,
		"requested_by": ctx.requested_by,
		"no_of_positions": 3,
		"expected_by": add_days(today(), 45),
		"description": f"{MARKER} Freelance content designers for the festive campaign.",
		"custom_employment_type_link": employment_type,
		"custom_assign_to_recruiter": ctx.recruiter,
		"status": "Draft",
	})
	for _ in range(3):
		doc.append("custom_position_details", {
			"location": ctx.branch,
			"reporting_manager": ctx.requested_by,
			"employee_type": employment_type,
		})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)

	_approve_and_position(doc.name)
	_log(f"requisition {doc.name} (Employment Type = {FREELANCER_TYPE}, 3 positions)")
	return doc.name


def _approve_and_position(requisition):
	"""Stand in for the approval the real flow runs.

	Approval is what materialises the trackable position rows, and only an
	"Approved Draft" requisition can then be activated against an opening. The
	seeder writes the status directly rather than driving an approval matrix that
	is configured per site.
	"""
	from recruitment.api.requisition_status import (
		APPROVED_ACTIVE_STATUS,
		APPROVED_DRAFT_STATUS,
		ensure_position_rows,
	)

	status = frappe.db.get_value("Job Requisition", requisition, "status")
	if status not in (APPROVED_DRAFT_STATUS, APPROVED_ACTIVE_STATUS):
		frappe.db.set_value("Job Requisition", requisition, "status", APPROVED_DRAFT_STATUS)
	ensure_position_rows(requisition)


def _seed_opening(ctx, requisition, employment_type):
	existing = frappe.db.get_value(
		"Job Opening", {"job_title": ["like", f"{OPENING_PREFIX}%"]}, "name"
	)
	if existing:
		return existing

	doc = frappe.get_doc({
		"doctype": "Job Opening",
		"job_title": f"{OPENING_PREFIX} Content Designer",
		"company": ctx.company,
		"designation": ctx.designation,
		"department": ctx.department,
		"status": "Open",
		"employment_type": employment_type,
		"job_requisition": requisition,
		"description": f"{MARKER} Freelance content designer, festive campaign.",
	})
	for idx, stage in enumerate(HIRING_STAGES, start=1):
		doc.append("custom_hiring_stages", dict(stage, idx=idx))
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)

	# Activation is what moves the requisition's positions from Draft to Open.
	try:
		from recruitment.api.job_requisition import activate_job_requisition
		activate_job_requisition(requisition, doc.name)
		_log(f"opening {doc.name} created and requisition activated")
	except Exception as exc:
		_log(f"opening {doc.name} created; activation skipped ({exc})")
	return doc.name


def _seed_candidates(ctx, opening):
	created = {}
	for spec in CANDIDATES:
		email = f"{CAND_PREFIX}{spec['key']}{CAND_DOMAIN}"
		existing = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
		if existing:
			created[spec["key"]] = existing
			continue

		doc = frappe.get_doc({
			"doctype": "Job Applicant",
			"applicant_name": f"{spec['first']} {spec['last']}",
			"email_id": email,
			"phone_number": f"98{abs(hash(spec['key'])) % 100000000:08d}",
			"job_title": opening,
			"designation": ctx.designation,
			"company_name": ctx.company,
			"status": "Open",
			"custom_pan_number": spec["pan"],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		created[spec["key"]] = doc.name
		_log(f"applicant {doc.name} {spec['first']} {spec['last']} "
		     f"pan={spec['pan']} -> {spec['expect']}")
	return created


def _free_position(applicant):
	"""An unclaimed position row on the requisition behind this candidate's opening.

	Returns None when the requisition itemises no positions — campus and fresher
	requisitions budget headcount per region instead, and an offer against one has
	nothing to pick.
	"""
	opening = frappe.db.get_value("Job Applicant", applicant, "job_title")
	requisition = frappe.db.get_value("Job Opening", opening, "job_requisition") if opening else None
	if not requisition:
		return None
	# "is not set" rather than an IN over ('', None): an unclaimed row holds NULL,
	# and in SQL a NULL never equals anything in an IN list — the row would be
	# skipped and the offer would look as though there were no free positions.
	return frappe.db.get_value(
		"Job Requisition Position",
		{"parent": requisition, "parenttype": "Job Requisition",
		 "status": ["!=", "Filled"], "candidate": ["is", "not set"]},
		"name",
		order_by="position_no asc",
	)


def _seed_offer_and_onboarding(ctx, applicant, employment_type):
	"""Take the one clean candidate all the way, so the tag can be watched moving.

	Offer -> Accepted -> Employee Onboarding, through the app's own auto-release
	path rather than by building the onboarding by hand — a seeded shortcut would
	demonstrate the shortcut, not the flow.
	"""
	existing = frappe.db.get_value("Job Offer", {"job_applicant": applicant}, "name")
	if not existing:
		offer = frappe.get_doc({
			"doctype": "Job Offer",
			"job_applicant": applicant,
			"applicant_name": frappe.db.get_value("Job Applicant", applicant, "applicant_name"),
			"offer_date": today(),
			"designation": ctx.designation,
			"company": ctx.company,
			"status": "Awaiting Response",
			"custom_employment_type": employment_type,
			"custom_expected_doj": add_days(today(), 21),
			# An offer has to say which of the requisition's positions it consumes —
			# that is what gets claimed and released as the offer moves.
			"custom_requisition_position": _free_position(applicant),
		})
		offer.flags.ignore_mandatory = True
		offer.insert(ignore_permissions=True)
		existing = offer.name
		_log(f"offer {offer.name} raised (Employment Type = {FREELANCER_TYPE})")

	frappe.db.set_value("Job Offer", existing, "status", "Accepted")
	frappe.db.set_value("Job Applicant", applicant, "status", "Accepted")

	try:
		from recruitment.api.action_center import _auto_release_and_materialize_onboarding
		onboarding = _auto_release_and_materialize_onboarding(applicant, raise_on_error=True)
		if onboarding:
			_log(f"onboarding {onboarding} created from the accepted offer")
		return existing, onboarding
	except Exception as exc:
		_log(f"onboarding not created ({type(exc).__name__}: {exc}) — "
		     f"raise it from the Job Applicant's Initiate Onboarding button")
		return existing, None


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #
def run():
	ctx = _context()
	_log(f"company={ctx.company} designation={ctx.designation} department={ctx.department}")

	employment_type = _ensure_employment_type()
	_seed_check_settings(ctx)
	_seed_past_employees(ctx)

	requisition = _seed_requisition(ctx, employment_type)
	opening = _seed_opening(ctx, requisition, employment_type)
	applicants = _seed_candidates(ctx, opening)
	_seed_offer_and_onboarding(ctx, applicants["clean"], employment_type)

	frappe.db.commit()
	_log("done — run recruitment.freelance_seed.report to see it laid out")
	report()


def report():
	"""Print what was seeded, and what each candidate should resolve to."""
	print("\n" + "=" * 78)
	print("FREELANCE SEED — what is on the site")
	print("=" * 78)

	req = frappe.db.get_value(
		"Job Requisition", {"description": ["like", f"%{MARKER}%"]},
		["name", "status", "no_of_positions", "custom_employment_type_link"], as_dict=True
	)
	if not req:
		print("nothing seeded yet — run recruitment.freelance_seed.run")
		return

	opening = frappe.db.get_value(
		"Job Opening", {"job_requisition": req.name},
		["name", "job_title", "status", "employment_type"], as_dict=True
	)

	print(f"\nRequisition  {req.name}  [{req.status}]  positions={req.no_of_positions}")
	print(f"             employment type = {_type_name(req.custom_employment_type_link)}")
	if opening:
		print(f"Opening      {opening.name}  {opening.job_title}  [{opening.status}]")
		print(f"             employment type = {_type_name(opening.employment_type)}")

	print("\nPast / present employees the check has to find:")
	print(f"  {'PAN':<12} {'employee':<22} {'status':<8} {'relieved':<12} DNR  expected")
	for spec in PAST_EMPLOYEES:
		emp = frappe.db.get_value(
			"Employee", {"company_email": f"{EMP_PREFIX}{spec['key']}{CAND_DOMAIN}"},
			["name", "employee_name", "status", "relieving_date"], as_dict=True
		)
		if not emp:
			continue
		dnr = frappe.db.get_value(
			"Employee Separation", {"employee": emp.name, "docstatus": ["<", 2]},
			"custom_mark_do_not_rehire"
		)
		print(f"  {spec['pan']:<12} {emp.employee_name[:20]:<22} {emp.status:<8} "
		      f"{str(emp.relieving_date or '-'):<12} {'Y' if dnr else 'n':<4} {spec['expect']}")

	print("\nCandidates in the pipeline:")
	print(f"  {'PAN':<12} {'applicant':<22} {'status':<12} {'stage':<18} expected")
	for spec in CANDIDATES:
		ja = frappe.db.get_value(
			"Job Applicant", {"email_id": f"{CAND_PREFIX}{spec['key']}{CAND_DOMAIN}"},
			["name", "applicant_name", "status", "custom_current_stage"], as_dict=True
		)
		if not ja:
			continue
		print(f"  {spec['pan']:<12} {ja.applicant_name[:20]:<22} {ja.status:<12} "
		      f"{str(ja.custom_current_stage or '-')[:16]:<18} {spec['expect']}")

	print("\nThe tag, hop by hop (the clean candidate):")
	_trace_tag()
	print()


def _type_name(name):
	if not name:
		return "-- not set --"
	return frappe.db.get_value("Employment Type", name, "employee_type_name") or name


def _trace_tag():
	"""Follow Employment Type across every hop, so a break is obvious."""
	ja = frappe.db.get_value(
		"Job Applicant", {"email_id": f"{CAND_PREFIX}clean{CAND_DOMAIN}"},
		["name", "custom_employment_type"], as_dict=True
	)
	if not ja:
		print("   (clean candidate not seeded)")
		return

	offer = frappe.db.get_value(
		"Job Offer", {"job_applicant": ja.name},
		["name", "custom_employment_type"], as_dict=True
	)
	eo = frappe.db.get_value(
		"Employee Onboarding", {"job_applicant": ja.name},
		["name", "custom_employment_type", "employee"], as_dict=True
	)

	hops = [("Job Applicant", ja.name, ja.custom_employment_type)]
	if offer:
		hops.append(("Job Offer", offer.name, offer.custom_employment_type))
	if eo:
		hops.append(("Employee Onboarding", eo.name, eo.custom_employment_type))
		if eo.employee:
			field = _employee_type_field()
			hops.append(("Employee", eo.employee,
			             frappe.db.get_value("Employee", eo.employee, field) if field else None))

	for label, name, value in hops:
		mark = "OK  " if value else "GAP "
		print(f"   {mark} {label:<22} {name:<26} {_type_name(value)}")


def _employee_type_field():
	meta = frappe.get_meta("Employee")
	for fieldname in ("employment_type", "custom_employment_type"):
		if meta.has_field(fieldname):
			return fieldname
	return None


def demo_activate():
	"""Finish the clean candidate's onboarding and watch the gate release.

	Run this after ``run()``. It shows the gate refusing first, then satisfies the
	two things it actually asks for — every portal field approved, and every
	required task closed — and creates the Employee through the app's own mapper.
	The point is to see the refusal and the release come from the same check, not
	to shortcut it: nothing here writes the Employee directly.
	"""
	from recruitment.auto_fetch_fields import build_employee
	from recruitment.customizations.employee_onboarding.overide_class import IncompleteTaskError

	applicant = frappe.db.get_value(
		"Job Applicant", {"email_id": f"{CAND_PREFIX}clean{CAND_DOMAIN}"}, "name"
	)
	onboarding = frappe.db.get_value(
		"Employee Onboarding", {"job_applicant": applicant}, "name"
	) if applicant else None
	if not onboarding:
		_log("no seeded onboarding — run recruitment.freelance_seed.run first")
		return

	doc = frappe.get_doc("Employee Onboarding", onboarding)

	print("\n" + "=" * 78)
	print(f"ACTIVATION — {onboarding}")
	print("=" * 78)
	print("\n1. Before anything is approved:")
	print("   " + _gate_verdict(doc))

	# Approve every portal field, exactly as HR would from the approval screen.
	from recruitment.api.field_level_approval import update_selected_fields_approval_status
	fields = [r.fieldname for r in (doc.get("custom_candidate_portal_fields") or [])
	          if r.fieldname and not r.get("hidden")]
	if fields:
		update_selected_fields_approval_status(onboarding, fields, "Approved")
		_log(f"approved {len(fields)} portal fields")

	# Close whatever tasks were flagged as required.
	doc.reload()
	required = [a for a in (doc.get("activities") or []) if a.required_for_employee_creation]
	for activity in required:
		if activity.task:
			frappe.db.set_value("Task", activity.task, "status", "Completed")
	if required:
		_log(f"completed {len(required)} required onboarding tasks")

	if doc.docstatus == 0:
		doc.reload()
		doc.submit()
		_log("submitted the onboarding")

	doc.reload()
	print("\n2. After approvals and tasks:")
	print("   " + _gate_verdict(doc))

	if frappe.db.get_value("Employee Onboarding", onboarding, "employee"):
		print("\n3. Employee already created.")
	else:
		try:
			emp = build_employee(onboarding)
			emp.status = "Active"
			emp.flags.ignore_mandatory = True
			emp.insert(ignore_permissions=True)
			frappe.db.set_value("Employee Onboarding", onboarding, "employee", emp.name)
			print(f"\n3. Employee created: {emp.name}")
		except IncompleteTaskError as exc:
			print(f"\n3. Still blocked: {frappe.utils.strip_html(str(exc))}")
		except Exception as exc:
			print(f"\n3. Employee not created ({type(exc).__name__}): {exc}")

	frappe.db.commit()
	print("\nThe tag, hop by hop:")
	_trace_tag()
	print()


def _gate_verdict(doc):
	from recruitment.customizations.employee_onboarding.overide_class import IncompleteTaskError
	try:
		doc.validate_employee_creation()
		return "gate: ALLOWED — Create Employee would work"
	except IncompleteTaskError as exc:
		return "gate: BLOCKED — " + frappe.utils.strip_html(str(exc)).replace("\n", " ")
	except frappe.ValidationError as exc:
		return "gate: BLOCKED — " + frappe.utils.strip_html(str(exc))


def cleanup():
	"""Remove everything the seeder made, newest link first.

	Employment Type "Freelancer" is left behind on purpose — it is configuration
	you asked for, not seed data, and deleting it would break anything already
	pointed at it.
	"""
	deleted = 0

	applicants = frappe.get_all(
		"Job Applicant", filters={"email_id": ["like", f"{CAND_PREFIX}%{CAND_DOMAIN}"]}, pluck="name"
	)
	for eo in frappe.get_all(
		"Employee Onboarding", filters={"job_applicant": ["in", applicants or [""]]}, pluck="name"
	):
		frappe.delete_doc("Employee Onboarding", eo, force=True, ignore_permissions=True)
		deleted += 1
	for offer in frappe.get_all(
		"Job Offer", filters={"job_applicant": ["in", applicants or [""]]}, pluck="name"
	):
		frappe.delete_doc("Job Offer", offer, force=True, ignore_permissions=True)
		deleted += 1
	for ja in applicants:
		frappe.delete_doc("Job Applicant", ja, force=True, ignore_permissions=True)
		deleted += 1

	for opening in frappe.get_all(
		"Job Opening", filters={"job_title": ["like", f"{OPENING_PREFIX}%"]}, pluck="name"
	):
		frappe.delete_doc("Job Opening", opening, force=True, ignore_permissions=True)
		deleted += 1
	for req in frappe.get_all(
		"Job Requisition", filters={"description": ["like", f"%{MARKER}%"]}, pluck="name"
	):
		frappe.delete_doc("Job Requisition", req, force=True, ignore_permissions=True)
		deleted += 1

	employees = frappe.get_all(
		"Employee", filters={"company_email": ["like", f"{EMP_PREFIX}%{CAND_DOMAIN}"]}, pluck="name"
	)
	for sep in frappe.get_all(
		"Employee Separation", filters={"employee": ["in", employees or [""]]}, pluck="name"
	):
		frappe.delete_doc("Employee Separation", sep, force=True, ignore_permissions=True)
		deleted += 1
	for emp in employees:
		frappe.delete_doc("Employee", emp, force=True, ignore_permissions=True)
		deleted += 1

	for dt, field in (("TA Duplicity Check Settings", "duplicity_check_setting_name"),
	                  ("TA Rehire Check Settings", "rehire_check_setting_name")):
		for name in frappe.get_all(dt, filters={field: MARKER}, pluck="name"):
			frappe.delete_doc(dt, name, force=True, ignore_permissions=True)
			deleted += 1

	frappe.db.commit()
	_log(f"cleanup removed {deleted} documents (Employment Type {FREELANCER_TYPE} kept)")
