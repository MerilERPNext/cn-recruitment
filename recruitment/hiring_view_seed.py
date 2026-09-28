"""One candidate to walk the whole hiring workflow for the stage View / Preview buttons.

	bench --site recruitment execute recruitment.hiring_view_seed.seed
	bench --site recruitment execute recruitment.hiring_view_seed.report
	bench --site recruitment execute recruitment.hiring_view_seed.teardown

Builds a lateral requisition with two positions of DIFFERENT Employee Types, an
opening on it (Technical Round → HR Round → Pre Job Offer → Job Offer, each round
with its own feedback form, and a handful of pre-offer fields) and one candidate
standing on the first round. From there every stage is tried by hand:

  * Interview rounds: Preview Feedback Form, then View Feedback once submitted
  * Pre Job Offer: Preview / View Pre Offer; the Job Offer can't be created until
    every pre-offer field is approved (skipping the stage without sending is fine)
  * Job Offer: picking a position fills its Employee Type

Everything is ``hwvseed.*@example.com`` (RFC 2606 — no mail can reach it).
Nothing is emailed while seeding. Re-running ``seed`` tears down first.
"""

import json

import frappe
from frappe.utils import add_days, today

MARKER = "[HWV-SEED]"
OPENING_TITLE = f"{MARKER} Business Analyst"
TECH_ROUND = f"{MARKER} Technical Round"
HR_ROUND = f"{MARKER} HR Round"
FORMS = {
	TECH_ROUND: (f"{MARKER} Technical Evaluation", "[IV-SEED] Technical Evaluation"),
	HR_ROUND: (f"{MARKER} HR Evaluation", "[IV-SEED] HR Evaluation"),
}
ADMIN = "Administrator"
PASSWORD = "HwvSeed@2026"
INTERVIEWER = "hwvseed.interviewer@example.com"
CANDIDATE = "hwvseed.candidate@example.com"

# Masters borrowed from an existing lateral requisition on the dev site.
MASTERS = {
	"company": "BIG PVT LTD",
	"designation": "_ACD_R&D_NB_MANAGEMENT",
	"department": "DEP_830",
	"requested_by": "PP0002",
	"location": "BIG_CO_NO_WFH",
}
# Two seats, two types: the offer must follow whichever seat is picked.
POSITION_TYPES = ("EMPTYPE_0007", "EMPTYPE_0006")
PRE_OFFER_SOURCE = "HR-OPN-2026-0001"
PRE_OFFER_FIELDS = ("phone_number", "custom_gender", "custom_current_address",
                    "custom_current_company_name", "custom_previous_salary")
PRE_OFFER_MANDATORY = ("phone_number", "custom_current_address")


def _log(msg):
	print(f"  {msg}")


# --------------------------------------------------------------------------- #
# Masters
# --------------------------------------------------------------------------- #
def _user(email, first, roles, user_type="System User"):
	from frappe.utils.password import update_password

	if not frappe.db.exists("User", email):
		frappe.get_doc({
			"doctype": "User", "email": email, "first_name": first, "last_name": "HWV Seed",
			"enabled": 1, "send_welcome_email": 0, "user_type": user_type,
			"roles": [{"role": r} for r in roles],
		}).insert(ignore_permissions=True)
	update_password(email, PASSWORD)


def _forms():
	"""Own copies of the feedback forms, so another seed's teardown can't pull them."""
	for label, source in FORMS.values():
		if frappe.db.exists("Microapp Form Widget", label):
			continue
		src = frappe.get_doc("Microapp Form Widget", source)
		doc = frappe.copy_doc(src)
		doc.label = label
		doc.original_widget_id = None
		doc.previous_widget_id = None
		doc.is_archived = 0
		doc.insert(ignore_permissions=True)


def _rounds():
	"""Interview rounds named after the stages, with the seed interviewer as panel."""
	from recruitment.api.hiring_stage import _ensure_interview_round, get_interview_round_doctype

	doctype = get_interview_round_doctype()
	for stage in FORMS:
		name = _ensure_interview_round(stage)
		doc = frappe.get_doc(doctype, name)
		if doc.meta.has_field("interviewers") and not any(r.user == INTERVIEWER for r in doc.interviewers):
			doc.append("interviewers", {"user": INTERVIEWER})
			doc.flags.ignore_mandatory = True
			doc.save(ignore_permissions=True)


def _requisition():
	from recruitment.api.requisition_status import APPROVED_ACTIVE_STATUS, ensure_position_rows

	req = frappe.new_doc("Job Requisition")
	req.designation = MASTERS["designation"]
	req.company = MASTERS["company"]
	req.department = MASTERS["department"]
	req.requested_by = MASTERS["requested_by"]
	req.no_of_positions = len(POSITION_TYPES)
	req.status = "Draft"
	req.posting_date = today()
	req.expected_by = add_days(today(), 45)
	req.description = f"{MARKER} requisition — two positions, two employee types"
	req.reason_for_requesting = f"{MARKER} hiring workflow view/preview testing"
	for field, value in (("custom_hiring_type", "Lateral"), ("custom_location", MASTERS["location"]),
	                     ("custom_employment_type_link", POSITION_TYPES[0])):
		if req.meta.has_field(field):
			req.set(field, value)
	for employee_type in POSITION_TYPES:
		req.append("custom_position_details", {
			"location": MASTERS["location"],
			"reporting_manager": MASTERS["requested_by"],
			"employee_type": employee_type,
			"approval_status": "Approved",
		})
	req.flags.ignore_mandatory = True
	req.insert(ignore_permissions=True)
	# Stand in for the approval matrix: approval is what builds the position rows.
	frappe.db.set_value("Job Requisition", req.name, "status", APPROVED_ACTIVE_STATUS)
	ensure_position_rows(req.name)
	_log(f"requisition {req.name}")
	return req.name


def _pre_offer_rows():
	rows = frappe.get_all(
		"Job Opening Application Field",
		filters={"parent": PRE_OFFER_SOURCE, "parenttype": "Job Opening",
		         "reference_name": ["in", list(PRE_OFFER_FIELDS)]},
		fields=["section", "reference_name", "display_name", "fieldtype",
		        "preoffer_visibility", "preoffer_edit_approve"],
		order_by="idx asc",
	)
	for r in rows:
		r.update({
			"view_preoffer": 1,
			"mandatory_preoffer": 1 if r.reference_name in PRE_OFFER_MANDATORY else 0,
			"preoffer_visibility": r.preoffer_visibility or json.dumps(["All"]),
			"preoffer_edit_approve": r.preoffer_edit_approve or json.dumps(["All"]),
		})
	return rows


def _opening(requisition):
	doc = frappe.get_doc({
		"doctype": "Job Opening",
		"job_title": OPENING_TITLE,
		"company": MASTERS["company"],
		"designation": MASTERS["designation"],
		"department": MASTERS["department"],
		"status": "Open",
		"job_requisition": requisition,
		"custom_recruiter": ADMIN,
		"custom_enable_pre_job_offer": 1,
		"description": f"{MARKER} Test opening for the hiring workflow View / Preview buttons.",
		"custom_hiring_stages": [
			{"stage_name": stage, "stage_type": "Interview", "is_mandatory": 1, "owner_role": "HR",
			 "evaluation_form": FORMS[stage][0], "notify": 0, "auto": 0}
			for stage in (TECH_ROUND, HR_ROUND)
		],
		"custom_application_fields": _pre_offer_rows(),
	})
	doc.flags.ignore_mandatory = True
	doc.flags.ignore_validate = True
	doc.insert(ignore_permissions=True)
	_log(f"opening {doc.name}")
	return doc


def _applicant(opening):
	from recruitment.api.hiring_stage import set_stage

	# Inserting places the candidate on the first stage already.
	doc = frappe.get_doc({
		"doctype": "Job Applicant",
		"applicant_name": "Meera",
		"email_id": CANDIDATE,
		"job_title": opening.name,
		"designation": opening.designation,
		"status": "Open",
		"source": "Walk In",
	})
	if doc.meta.has_field("custom_applicant_last_name"):
		doc.custom_applicant_last_name = "Kapoor"
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	if frappe.db.get_value("Job Applicant", doc.name, "custom_current_stage") != TECH_ROUND:
		set_stage(doc.name, TECH_ROUND)
	_log(f"candidate {doc.name}")
	return doc.name


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #
def seed():
	frappe.set_user(ADMIN)
	teardown(quiet=True)

	real_sendmail = frappe.sendmail
	frappe.sendmail = lambda *a, **k: None
	try:
		_user(INTERVIEWER, "Interviewer", ["Interviewer", "Employee"])
		_user(CANDIDATE, "Meera", [], user_type="Website User")
		_forms()
		_rounds()
		opening = _opening(_requisition())
		_applicant(opening)
		frappe.db.commit()
	finally:
		frappe.sendmail = real_sendmail
	report()


def _applicants():
	return frappe.get_all("Job Applicant", filters={"email_id": CANDIDATE}, pluck="name")


def report():
	opening = frappe.db.get_value("Job Opening", {"job_title": OPENING_TITLE},
	                              ["name", "job_requisition"], as_dict=True)
	if not opening:
		print("Nothing seeded.")
		return
	base = frappe.utils.get_url()
	print(f"\nOpening    : {base}/app/job-opening/{opening.name}")
	print(f"Requisition: {base}/app/job-requisition/{opening.job_requisition}")
	for p in frappe.get_all("Job Requisition Position", filters={"parent": opening.job_requisition},
	                        fields=["position_no", "employee_type", "status"], order_by="position_no"):
		print(f"    Position {p.position_no}: employee type {p.employee_type}, {p.status}")
	for ja in frappe.get_all("Job Applicant", filters={"email_id": CANDIDATE},
	                         fields=["name", "custom_current_stage", "status"]):
		print(f"Candidate  : {base}/app/job-applicant/{ja.name}  (stage: {ja.custom_current_stage})")
	print(f"Interviewer login: {INTERVIEWER} / {PASSWORD}")
	print(f"Candidate portal : {CANDIDATE} / {PASSWORD}")


def teardown(quiet=False):
	# See memory "reseed name-reuse race": run delete_dynamic_links inline.
	in_test = frappe.flags.in_test
	frappe.flags.in_test = True
	try:
		_teardown(quiet)
	finally:
		frappe.flags.in_test = in_test


def _teardown(quiet):
	frappe.set_user(ADMIN)
	applicants = _applicants()
	if len(applicants) > 3:
		frappe.throw(f"Teardown matched {len(applicants)} candidates; refusing.")

	for ja in applicants:
		# Never an `["in", [""]]` fallback — filters are always this one applicant.
		for offer in frappe.get_all("Job Offer", filters={"job_applicant": ja}, pluck="name"):
			for tracker in frappe.get_all("Approval Tracker", filters={"doc_type": "Job Offer", "doc_name": offer},
			                              pluck="name"):
				frappe.db.delete("Approval Log Entry", {"parent": tracker})
				frappe.db.delete("Approval Tracker", {"name": tracker})
			frappe.db.set_value("Job Offer", offer, "docstatus", 0, update_modified=False)
			frappe.delete_doc("Job Offer", offer, force=True, ignore_permissions=True, delete_permanently=True)
		for iv in frappe.get_all("Interview", filters={"job_applicant": ja}, pluck="name"):
			for fb in frappe.get_all("Interview Feedback", filters={"interview": iv}, pluck="name"):
				frappe.db.set_value("Interview Feedback", fb, "docstatus", 0, update_modified=False)
				frappe.delete_doc("Interview Feedback", fb, force=True, ignore_permissions=True,
				                  delete_permanently=True)
			for tracker in frappe.get_all("Approval Tracker", filters={"doc_type": "Interview", "doc_name": iv},
			                              pluck="name"):
				frappe.db.delete("Approval Log Entry", {"parent": tracker})
				frappe.db.delete("Approval Tracker", {"name": tracker})
			frappe.db.delete("ToDo", {"reference_type": "Interview", "reference_name": iv})
			frappe.db.set_value("Interview", iv, "docstatus", 0, update_modified=False)
			frappe.delete_doc("Interview", iv, force=True, ignore_permissions=True, delete_permanently=True)
		frappe.db.delete("ToDo", {"reference_type": "Job Applicant", "reference_name": ja})
		frappe.db.delete("Comment", {"reference_doctype": "Job Applicant", "reference_name": ja})
		frappe.delete_doc("Job Applicant", ja, force=True, ignore_permissions=True, delete_permanently=True)
	frappe.db.delete("Candidate Action Center Item", {"candidate_email": CANDIDATE})

	for jo in frappe.get_all("Job Opening", filters={"job_title": OPENING_TITLE}, fields=["name", "job_requisition"]):
		frappe.delete_doc("Job Opening", jo.name, force=True, ignore_permissions=True, delete_permanently=True)
		if jo.job_requisition and frappe.db.exists("Job Requisition", jo.job_requisition):
			frappe.delete_doc("Job Requisition", jo.job_requisition, force=True, ignore_permissions=True,
			                  delete_permanently=True)
	if not quiet:
		print(f"Removed {len(applicants)} candidate(s) and the {MARKER} opening/requisition.")
	frappe.db.commit()
