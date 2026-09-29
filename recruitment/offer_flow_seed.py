"""Test data for the Pre Offer / Job Offer changes on the applicant hiring workflow.

	bench --site <site> execute recruitment.offer_flow_seed.seed
	bench --site <site> execute recruitment.offer_flow_seed.report
	bench --site <site> execute recruitment.offer_flow_seed.teardown

One Job Opening (HR Round → Pre Job Offer → Job Offer) on its own requisition, and
seven candidates, each parked where one change can be tried from the Hiring
Workflow tab:

  * Pre Offer completed / skipped from the workflow → portal card Completed
  * Resend Job Offer on a live offer (email again), a draft (greyed out, with the
    reason), an expired one and a declined one (new version, logged)
  * "Approval pending with" on the Offer stage
  * offer letter placeholders: link titles, formatted CTC

Candidates are ``offerseed.<key>@example.com`` (RFC 2606 — no mail can reach
them). Nothing is emailed while seeding; clicking the buttons afterwards sends the
normal emails to those same addresses. Offers use the existing "Freelance
Animator Offer Letter (DOCX)" template, so no new template can match a real
offer. Re-running ``seed`` is safe; it tears down first. Everything, including
new offer versions created while testing, is removed by ``teardown``.
"""

import frappe
from frappe.utils import add_days, now_datetime, nowdate

MARKER = "[OFFER-SEED]"
OPENING_TITLE = f"{MARKER} Physics Faculty"
HR_ROUND = f"{MARKER} HR Round"
PRE_OFFER = "Pre Job Offer"   # the virtual stages get_opening_stages appends
OFFER = "Job Offer"
TEMPLATE = "Freelance Animator Offer Letter (DOCX)"
APPROVER = "offerseed.approver@example.com"
APPROVER_PASSWORD = "OfferSeed@2026"
ADMIN = "Administrator"

PREFERRED = {
	"Company": "PW",
	"Designation": "ACD_D&A_EXAMS_TEACHING",   # title "Professor"
	"Employment Type": "EMPTYPE_0007",         # "Member"
}

SCENARIOS = [
	{
		"key": "priya", "name": "Priya Raman", "stage": PRE_OFFER, "pre_offer": "Sent",
		"what": "On Pre Job Offer; pre-offer form sent, portal card 'Action Required'",
		"try": "Pre Job Offer card → ✓ Complete stage. She moves to Job Offer, and her "
		       "Candidate Action Center Item turns Completed (link below).",
	},
	{
		"key": "arjun", "name": "Arjun Mehta", "stage": PRE_OFFER, "pre_offer": "Filled",
		"what": "On Pre Job Offer; candidate already filled the form, card still open",
		"try": "⋮ → Mark as Not Required (any comment). The pre-offer row becomes Reviewed "
		       "and the card Completed.",
	},
	{
		"key": "kavya", "name": "Kavya Iyer", "stage": OFFER,
		"offer": {"status": "Awaiting Response", "submit": True, "sent": True, "expiry": 7},
		"what": "Offer submitted, emailed, awaiting her answer",
		"try": "Job Offer card → ↻ Resend Job Offer: emails the same offer again and adds a "
		       "comment on the offer. Open Job Offer → Offer Letter tab: Designation reads "
		       "'Professor', Engagement type 'Member', CTC '12,00,000.00' (not raw IDs).",
	},
	{
		"key": "rohan", "name": "Rohan Das", "stage": OFFER,
		"offer": {"status": "Awaiting Response", "submit": False, "sent": False, "expiry": 7},
		"what": "Offer still a draft, never emailed",
		"try": "Resend Job Offer is greyed out; hover it: 'The offer has not been emailed yet…'.",
	},
	{
		"key": "neha", "name": "Neha Joshi", "stage": OFFER,
		"offer": {"status": "Expired", "submit": True, "sent": True, "expiry": -3},
		"what": "Offer expired 3 days ago without an answer",
		"try": "✉ Resend Offer Letter (pick a new date): version 2 is created, submitted and "
		       "emailed. Both offers get a comment, and the hiring workflow history logs "
		       "'Offer Resent'.",
	},
	{
		"key": "vikas", "name": "Vikas Rao", "stage": OFFER,
		"offer": {"status": "Rejected", "submit": True, "sent": True, "expiry": 7},
		"applicant_status": "Rejected",
		"what": "Candidate declined the offer",
		"try": "↻ Resend Job Offer: version 2 is created as a Draft to edit, submit and send. "
		       "Both offers get a comment; history logs 'Offer Revised'.",
	},
	{
		"key": "sneha", "name": "Sneha Pillai", "stage": OFFER,
		"offer": {"status": "Awaiting Response", "submit": False, "sent": False, "expiry": 7},
		"approval": True,
		"what": "Offer waiting on an approval flow",
		"try": "Job Offer card shows 'Approval pending with: Administrator, Offer Approver; "
		       "HR Manager (role) (Stage 1 - Hiring Manager Approval)'.",
	},
	# ── Is Relocation Employee: Job Offer → Employee Onboarding → Employee ──
	{
		"key": "meera", "name": "Meera Nair", "stage": OFFER,
		"offer": {"status": "Awaiting Response", "submit": False, "sent": False, "expiry": 7},
		"what": "Relocation: draft offer, box not ticked yet",
		"try": "Open the Job Offer → 'Is Relocation Employee' sits after Work Location. Tick it and save.",
	},
	{
		"key": "farhan", "name": "Farhan Ali", "stage": OFFER, "applicant_status": "Accepted",
		"offer": {"status": "Accepted", "submit": True, "sent": True, "expiry": 7, "relocation": 1},
		"onboarding": True,
		"what": "Relocation: offer accepted WITH relocation; onboarding submitted and ready",
		"try": "Open the Employee Onboarding → 'Is Relocation Employee' is ticked (copied from the "
		       "offer). Click Create Employee, pick a Gender, save → the Employee has 'Is Relocation "
		       "Employee' ticked and 'Relocation Based On' = Date Of Joining.",
	},
	{
		"key": "ishita", "name": "Ishita Sen", "stage": OFFER, "applicant_status": "Accepted",
		"offer": {"status": "Accepted", "submit": True, "sent": True, "expiry": 7, "relocation": 0},
		"onboarding": True,
		"what": "Relocation: offer accepted WITHOUT relocation (control)",
		"try": "Same steps as Farhan → the Employee is NOT a relocation employee and "
		       "'Relocation Based On' stays blank.",
	},
]


def _email(key):
	return f"offerseed.{key}@example.com"


def _first(doctype, filters):
	rows = frappe.get_all(doctype, filters=filters, pluck="name", order_by="creation desc", limit=1)
	return rows[0] if rows else None


def _pick(doctype):
	preferred = PREFERRED.get(doctype)
	if preferred and frappe.db.exists(doctype, preferred):
		return preferred
	return frappe.get_all(doctype, pluck="name", limit=1)[0]


# --------------------------------------------------------------------------- #
# Masters
# --------------------------------------------------------------------------- #
def _approver():
	from frappe.utils.password import update_password

	if not frappe.db.exists("User", APPROVER):
		frappe.get_doc({
			"doctype": "User", "email": APPROVER, "first_name": "Offer", "last_name": "Approver",
			"enabled": 1, "send_welcome_email": 0, "user_type": "System User",
			"roles": [{"role": "HR Manager"}],
		}).insert(ignore_permissions=True)
	update_password(APPROVER, APPROVER_PASSWORD)


def _requisition():
	# Headcount without a position list — what offer_validation falls back to —
	# so resending (which re-runs the headcount gate) has room.
	doc = frappe.get_doc({
		"doctype": "Job Requisition",
		"designation": _pick("Designation"),
		"company": _pick("Company"),
		"no_of_positions": 10,
		"status": "Approved Active",
		"description": f"{MARKER} requisition",
	})
	doc.flags.ignore_mandatory = True
	doc.flags.ignore_validate = True
	doc.insert(ignore_permissions=True)
	return doc.name


def _opening(requisition):
	doc = frappe.get_doc({
		"doctype": "Job Opening",
		"job_title": OPENING_TITLE,
		"company": _pick("Company"),
		"designation": _pick("Designation"),
		"status": "Open",
		"job_requisition": requisition,
		"custom_recruiter": ADMIN,
		"custom_enable_pre_job_offer": 1,
		"description": f"{MARKER} Test opening for the Pre Offer / Job Offer workflow changes.",
		"custom_hiring_stages": [
			{"stage_name": HR_ROUND, "stage_type": "Interview", "owner_role": "HR", "notify": 0, "auto": 0},
		],
	})
	doc.flags.ignore_mandatory = True
	doc.flags.ignore_validate = True
	doc.insert(ignore_permissions=True)
	return doc


# --------------------------------------------------------------------------- #
# Candidates
# --------------------------------------------------------------------------- #
def _applicant(opening, sc):
	from recruitment.api.hiring_stage import HISTORY_FIELD, STATUS_BY_STAGE_TYPE, get_applicant_stages

	first, last = sc["name"].split(" ", 1)
	doc = frappe.get_doc({
		"doctype": "Job Applicant",
		"applicant_name": first,
		"email_id": _email(sc["key"]),
		"job_title": opening.name,
		"designation": opening.designation,
		"status": "Open",
		"source": "Walk In",
	})
	if doc.meta.has_field("custom_applicant_last_name"):
		doc.custom_applicant_last_name = last
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)

	# Walk the history up to the scenario's stage, so earlier stages read as done.
	stages = get_applicant_stages(doc)
	target = next(i for i, s in enumerate(stages) if s["stage_name"] == sc["stage"])
	for s in stages[: target + 1]:
		doc.append(HISTORY_FIELD, {
			"stage_name": s["stage_name"], "stage_type": s["stage_type"],
			"entered_on": now_datetime(), "moved_by": ADMIN,
			"result": "Seeded", "notes": MARKER,
		}).db_insert()
	status = sc.get("applicant_status") or STATUS_BY_STAGE_TYPE.get(stages[target]["stage_type"], "Open")
	doc.db_set({"custom_current_stage": sc["stage"], "status": status}, update_modified=False)
	return frappe.get_doc("Job Applicant", doc.name)


def _pre_offer(applicant, row_status):
	from recruitment.api.action_center import ACTION_DOCTYPE, _send_pre_offer_for_applicant

	res = _send_pre_offer_for_applicant(applicant)
	if row_status != "Sent":
		applicant.reload()
		row = applicant.custom_pre_offer_forms[-1]
		row.db_set({"status": row_status, "filled_at": now_datetime()}, update_modified=False)
		# The card a candidate's submit normally completes — left open on purpose:
		# that stale card is the bug being tested.
		frappe.db.set_value(ACTION_DOCTYPE, res["action_item"], "status", "Action Required")
	# Put them back on the stage the pre-offer send moved them off.
	applicant.db_set({"custom_current_stage": PRE_OFFER, "status": "Approvals"}, update_modified=False)


def _offer(applicant, spec):
	offer = frappe.get_doc({
		"doctype": "Job Offer",
		"job_applicant": applicant.name,
		"applicant_name": applicant.get("custom_full_name") or applicant.applicant_name,
		"applicant_email": applicant.email_id,
		"company": _pick("Company"),
		"designation": _pick("Designation"),
		"status": "Awaiting Response",
		"offer_date": add_days(nowdate(), -10 if spec["expiry"] < 0 else 0),
		"custom_employment_type": _pick("Employment Type"),
		"custom_expected_doj": add_days(nowdate(), 30),
		"custom_jo_expiry_date": add_days(nowdate(), spec["expiry"]),
		"custom_offer_letter_template": TEMPLATE,
		"custom_ctc": 1200000,
		"custom_base_salary": 1000000,
		"custom_is_relocation_employee": spec.get("relocation", 0),
	})
	if spec["status"] == "Accepted":
		# Only offers that go on to "Create Employee": the payroll app builds the
		# new Employee's Salary Structure Assignment from these. On an offer that
		# is still being edited they switch on the legacy salary-structure
		# computation, which fails on this site's structures — so drafts get none.
		offer.custom_employee_salary_structure = _first(
			"Salary Structure", {"company": _pick("Company"), "docstatus": 1, "is_active": "Yes"})
		offer.custom_income_tax_slab = _first(
			"Income Tax Slab", {"company": _pick("Company"), "docstatus": 1, "disabled": 0})
	if spec["status"] == "Accepted":
		offer.custom_offer_accepted_on = nowdate()
	offer.flags.ignore_mandatory = True
	offer.flags.ignore_permissions = True
	offer.flags.ignore_validate = True
	offer.insert(ignore_permissions=True)
	if spec["submit"]:
		offer.flags.ignore_validate_update_after_submit = True
		offer.submit()
	if spec["sent"]:
		offer.db_set({"email_status": "Sent", "email_sent_on": now_datetime()}, update_modified=False)
	if spec["status"] != "Awaiting Response":
		offer.db_set("status", spec["status"], update_modified=False)
	return offer


def _onboarding(applicant, offer):
	"""A submitted onboarding, ready for "Create Employee".

	Fields come off the offer through the same code the portal uses when the
	candidate accepts (`_auto_map_offer_applicant_fields`), so the relocation flag
	arrives the real way. No activities and no portal fields awaiting approval, so
	nothing stands between it and an Employee. Submitted on the row: the real
	submit would raise tasks and mails the test does not need.
	"""
	from recruitment.api.candidate_portal import _auto_map_offer_applicant_fields

	eo = frappe.new_doc("Employee Onboarding")
	eo.job_applicant = applicant.name
	eo.job_offer = offer.name
	eo.company = offer.company
	eo.designation = offer.designation
	eo.date_of_joining = offer.custom_expected_doj
	eo.boarding_begins_on = nowdate()
	_auto_map_offer_applicant_fields(eo, applicant, offer.name)
	eo.employee_name = applicant.get("custom_full_name") or applicant.applicant_name
	if eo.meta.has_field("custom_date_of_birth"):
		eo.custom_date_of_birth = "1996-05-14"
	eo.flags.ignore_mandatory = True
	eo.flags.ignore_links = True
	eo.insert(ignore_permissions=True)
	eo.db_set({"docstatus": 1, "boarding_status": "Completed"}, update_modified=False)
	# As if the candidate filled the portal form and HR approved every field —
	# the other half of what Create Employee checks.
	portal_rows = eo.meta.get_field("custom_candidate_portal_fields")
	if portal_rows:
		frappe.db.set_value(portal_rows.options, {"parent": eo.name, "parenttype": "Employee Onboarding"},
		                    "approval_status", "Approved", update_modified=False)
	applicant.db_set("custom_pre_onboarding_employee_onboarding", eo.name, update_modified=False)
	return eo


def _approval(offer):
	"""A live nextai approval on the offer, written as rows (no flow engine run,
	no ToDos, no mail) — only what the workflow reads to say who it waits on."""
	tracker = frappe.new_doc("Approval Tracker")
	tracker.doc_type = "Job Offer"
	tracker.doc_name = offer.name
	tracker.status = "Pending"
	tracker.current_approval_step = 0
	tracker.flags.ignore_mandatory = True
	tracker.flags.ignore_links = True
	tracker.set_new_name()
	tracker.db_insert()
	for idx, (users, roles) in enumerate(((f"{ADMIN}, {APPROVER}", None), (None, "HR Manager")), start=1):
		log = frappe.new_doc("Approval Log Entry")
		log.update({
			"parent": tracker.name, "parenttype": "Approval Tracker", "parentfield": "approval_logs",
			"idx": idx, "stage_index": 0, "stage_name": "Stage 1 - Hiring Manager Approval",
			"status": "Pending", "custom_allocated_to_users": users, "user": (users or "").split(",")[0] or None,
			"custom_assigned_to_roles": roles, "role": roles,
			"approver_type": "Role" if roles else "User",
		})
		log.set_new_name()
		log.db_insert()


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #
def seed():
	frappe.set_user(ADMIN)
	teardown(quiet=True)

	# Nothing leaves the site while seeding.
	real_sendmail = frappe.sendmail
	frappe.sendmail = lambda *a, **k: None
	try:
		_approver()
		opening = _opening(_requisition())
		for sc in SCENARIOS:
			applicant = _applicant(opening, sc)
			if sc.get("pre_offer"):
				_pre_offer(applicant, sc["pre_offer"])
			if sc.get("offer"):
				offer = _offer(applicant, sc["offer"])
				if sc.get("approval"):
					_approval(offer)
				if sc.get("onboarding"):
					_onboarding(applicant, offer)
		frappe.db.commit()
	finally:
		frappe.sendmail = real_sendmail
	report()


def _applicants():
	return frappe.get_all("Job Applicant", filters={"email_id": ["like", "offerseed.%@example.com"]},
	                      pluck="name")


def report():
	opening = frappe.db.get_value("Job Opening", {"job_title": OPENING_TITLE}, "name")
	if not opening:
		print("Nothing seeded.")
		return
	base = frappe.utils.get_url()
	print(f"\nOpening: {OPENING_TITLE}  {base}/app/job-opening/{opening}")
	print(f"Stages : {HR_ROUND} → {PRE_OFFER} → {OFFER}")
	print(f"Approver login: {APPROVER} / {APPROVER_PASSWORD}")
	print("Open each candidate → Hiring Workflow tab.\n")
	for sc in SCENARIOS:
		email = _email(sc["key"])
		ja = frappe.db.get_value("Job Applicant", {"email_id": email}, ["name", "custom_current_stage", "status"],
		                         as_dict=True)
		if not ja:
			continue
		print(f"• {sc['name']} — {sc['what']}")
		print(f"    {base}/app/job-applicant/{ja.name}   (stage: {ja.custom_current_stage}, status: {ja.status})")
		for o in frappe.get_all("Job Offer", filters={"job_applicant": ja.name},
		                        fields=["name", "status", "docstatus", "email_status", "custom_offer_version",
		                                "custom_is_relocation_employee"],
		                        order_by="creation asc"):
			print(f"    {o.name} v{o.custom_offer_version or 1}: {o.status}"
			      f"{' (cancelled)' if o.docstatus == 2 else ''}, email {o.email_status or '—'}"
			      f", relocation {o.custom_is_relocation_employee}   {base}/app/job-offer/{o.name}")
		for eo in frappe.get_all("Employee Onboarding", filters={"job_applicant": ja.name},
		                         fields=["name", "custom_is_relocation_employee"]):
			print(f"    Onboarding {eo.name}: relocation {eo.custom_is_relocation_employee}"
			      f"   {base}/app/employee-onboarding/{eo.name}")
		for emp in frappe.get_all("Employee", filters={"job_applicant": ja.name},
		                          fields=["name", "custom_is_relocation_employee", "custom_relocation_based_on"]):
			print(f"    Employee {emp.name}: relocation {emp.custom_is_relocation_employee}, "
			      f"based on {emp.custom_relocation_based_on or '—'}   {base}/app/employee/{emp.name}")
		items = frappe.get_all("Candidate Action Center Item",
		                       filters={"candidate_email": email, "reference_doctype": "Job Applicant Pre Offer Form"},
		                       fields=["name", "status"])
		for it in items:
			print(f"    Portal card {it.name}: {it.status}   {base}/app/candidate-action-center-item/{it.name}")
		print(f"    Try: {sc['try']}\n")


# The seed never makes more than this many of anything. A teardown that matches
# more is matching real data — stop before a single delete.
_TEARDOWN_CEILING = 3 * len(SCENARIOS)


def _refuse_if_too_many(kind, names):
	if len(names) > _TEARDOWN_CEILING:
		frappe.throw(f"Teardown matched {len(names)} {kind} — more than the seed ever creates "
		             f"({_TEARDOWN_CEILING}). Refusing to delete anything; check the filters.")


def teardown(quiet=False):
	# Deleting queues delete_dynamic_links, which runs after the commit — by then a
	# reseed has reused the same names and it wipes the NEW records' ToDos and
	# comments. Under in_test Frappe runs it straight away instead.
	in_test = frappe.flags.in_test
	frappe.flags.in_test = True
	try:
		_teardown(quiet)
	finally:
		frappe.flags.in_test = in_test


def _teardown(quiet):
	frappe.set_user(ADMIN)
	applicants = _applicants()
	emails = [_email(sc["key"]) for sc in SCENARIOS]
	# NEVER fall back to `["in", [""]]` when there are no seeded candidates:
	# Frappe reads that as "job_applicant is blank" and matches every real
	# Employee / onboarding / offer that has no applicant. That fallback once
	# deleted 152 Employees on the recruitment site. No candidates, nothing to
	# look up by candidate.
	by_applicant = {"job_applicant": ["in", applicants]} if applicants else None
	# Employees created while testing "Create Employee", then their onboardings —
	# both link back to the offer and applicant, so they go first.
	employees = frappe.get_all("Employee", filters=by_applicant, pluck="name") if by_applicant else []
	offers = (frappe.get_all("Job Offer", filters=by_applicant, pluck="name", order_by="creation desc")
	          if by_applicant else [])
	onboardings = frappe.get_all("Employee Onboarding", filters=by_applicant, pluck="name") if by_applicant else []
	for kind, names in (("candidates", applicants), ("employees", employees),
	                    ("onboardings", onboardings), ("offers", offers)):
		_refuse_if_too_many(kind, names)
	for emp in employees:
		# The payroll app raises one from the offer as the Employee is created.
		for ssa in frappe.get_all("Salary Structure Assignment", filters={"employee": emp}, pluck="name"):
			frappe.db.set_value("Salary Structure Assignment", ssa, "docstatus", 0, update_modified=False)
			frappe.delete_doc("Salary Structure Assignment", ssa, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		frappe.db.set_value("Employee Onboarding", {"employee": emp}, "employee", None, update_modified=False)
		frappe.delete_doc("Employee", emp, force=True, ignore_permissions=True, delete_permanently=True)
	for eo in onboardings:
		frappe.db.delete("Candidate Action Center Item", {"reference_doctype": "Employee Onboarding",
		                                                  "reference_docname": eo})
		frappe.db.set_value("Employee Onboarding", eo, "docstatus", 0, update_modified=False)
		frappe.delete_doc("Employee Onboarding", eo, force=True, ignore_permissions=True, delete_permanently=True)
	for name in offers:
		for tracker in frappe.get_all("Approval Tracker", filters={"doc_type": "Job Offer", "doc_name": name},
		                              pluck="name"):
			frappe.db.delete("Approval Log Entry", {"parent": tracker})
			frappe.db.delete("Approval Tracker", {"name": tracker})
		frappe.db.delete("ToDo", {"reference_type": "Job Offer", "reference_name": name})
		frappe.db.delete("Comment", {"reference_doctype": "Job Offer", "reference_name": name})
		# Straight off the rows: cancel would run the position and workflow hooks
		# for data that is about to disappear anyway.
		frappe.db.set_value("Job Offer", name, "docstatus", 0, update_modified=False)
		frappe.delete_doc("Job Offer", name, force=True, ignore_permissions=True, delete_permanently=True)
	frappe.db.delete("Candidate Action Center Item", {"candidate_email": ["in", emails]})
	for ja in applicants:
		frappe.db.delete("ToDo", {"reference_type": "Job Applicant", "reference_name": ja})
		frappe.db.delete("Comment", {"reference_doctype": "Job Applicant", "reference_name": ja})
		frappe.delete_doc("Job Applicant", ja, force=True, ignore_permissions=True, delete_permanently=True)
	for jo in frappe.get_all("Job Opening", filters={"job_title": OPENING_TITLE},
	                         fields=["name", "job_requisition"]):
		frappe.delete_doc("Job Opening", jo.name, force=True, ignore_permissions=True, delete_permanently=True)
		if jo.job_requisition and frappe.db.exists("Job Requisition", jo.job_requisition):
			frappe.delete_doc("Job Requisition", jo.job_requisition, force=True, ignore_permissions=True,
			                  delete_permanently=True)
	if frappe.db.exists("User", APPROVER):
		frappe.db.delete("ToDo", {"allocated_to": APPROVER})
		frappe.delete_doc("User", APPROVER, force=True, ignore_permissions=True)
	frappe.db.commit()
	if not quiet:
		print(f"Removed {len(applicants)} candidates, {len(offers)} offers and the {MARKER} opening.")
