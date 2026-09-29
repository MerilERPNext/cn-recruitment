"""Test data for the Interview-stage actions: cancel, reschedule, feedback form → Tasks.

	bench --site <site> execute recruitment.interview_stage_seed.seed
	bench --site <site> execute recruitment.interview_stage_seed.report
	bench --site <site> execute recruitment.interview_stage_seed.teardown

One Job Opening with two Interview stages, and six candidates each parked in a
different situation, so every button and every refusal can be tried from the
Hiring Workflow tab. Re-running ``seed`` is safe; it tears down first.

Administrator sits on every panel, so the feedback tasks land in YOUR Tasks list.
The other panel members are ``@example.com`` users (RFC 2606 — no mail can reach
them). No email is sent while seeding; clicking the buttons afterwards sends the
normal notifications, to those same addresses.

Everything is marked ``[IV-SEED]`` and removed by ``teardown``.
"""

import json

import frappe
from frappe.utils import add_days, nowdate

MARKER = "[IV-SEED]"
OPENING_TITLE = f"{MARKER} Backend Engineer"
TECH = f"{MARKER} Technical Round"
HR = f"{MARKER} HR Round"
FORM_TECH = f"{MARKER} Technical Evaluation"
FORM_HR = f"{MARKER} HR Evaluation"
PANEL_PASSWORD = "IvSeed@2026"

PANEL = {
	"ivseed.meera@example.com": "Meera Iyer",
	"ivseed.rahul@example.com": "Rahul Nair",
	"ivseed.sana@example.com": "Sana Qureshi",
}
MEERA, RAHUL, SANA = PANEL
ADMIN = "Administrator"


# --------------------------------------------------------------------------- #
# Scenarios — what each candidate is set up to show
# --------------------------------------------------------------------------- #
SCENARIOS = [
	{
		"key": "asha", "name": "Asha Kulkarni",
		"what": "Upcoming interview, nothing started",
		"try": "⋮ → Reschedule (swap Meera for Sana, move the date) and ⋮ → Cancel Interview. "
		       "After cancelling, the interview is listed as Cancelled and Schedule Interview works again.",
		"interview": {"days": 1, "panel": [ADMIN, MEERA]},
	},
	{
		"key": "bala", "name": "Bala Subramanian",
		"what": "Interview held yesterday, 3 interviewers, no feedback yet",
		"try": "⋮ → Send Feedback Form: pick a form per interviewer and send. On this site each "
		       "interviewer already got their task when the interview was saved, so no second task is made — "
		       "the task in your Tasks list now opens the form you picked for you.",
		"interview": {"days": -1, "panel": [ADMIN, MEERA, RAHUL]},
	},
	{
		"key": "chitra", "name": "Chitra Menon",
		"what": "Interview held, Sana already submitted feedback on the Technical form",
		"try": "Cancel/Reschedule are greyed out (hover for the reason). Send Feedback Form goes to "
		       "Administrator only; switching the form to HR Evaluation is refused (form locked).",
		"interview": {"days": -1, "panel": [ADMIN, SANA], "form": FORM_TECH, "feedback_by": SANA},
	},
	{
		"key": "dev", "name": "Dev Malhotra",
		"what": "Upcoming interview with a Teams meeting booked",
		"try": "Cancel/Reschedule greyed out: the Teams meeting must be cancelled from the Interview form first.",
		"interview": {"days": 2, "panel": [ADMIN, RAHUL], "teams": True},
	},
	{
		"key": "esha", "name": "Esha Pillai",
		"what": "Candidate did not turn up (Not Appeared)",
		"try": "⋮ → Reschedule to a future slot: the interview goes back to Pending.",
		"interview": {"days": -1, "panel": [ADMIN, MEERA], "status": "Not Appeared"},
	},
	{
		"key": "farhan", "name": "Farhan Sheikh",
		"what": "Earlier interview already cancelled, nothing live",
		"try": "The cancelled interview shows greyed out as history; + Schedule Interview is enabled; "
		       "Cancel/Reschedule say 'Schedule an interview first'.",
		"interview": {"days": 1, "panel": [ADMIN, MEERA], "status": "Cancelled"},
	},
	{
		"key": "gita", "name": "Gita Rao",
		"what": "Held yesterday; each interviewer has their own form (you + Rahul: Technical, Meera: HR)",
		"try": "Open your task in the Tasks list: it shows the Technical form (Meera's shows HR). "
		       "⋮ → Send Feedback Form lists each interviewer with their form; changing Meera to Technical "
		       "updates her task. The Interview's panel grid has the same Feedback Form column.",
		"interview": {"days": -1, "panel": [ADMIN, MEERA, RAHUL],
		              "row_forms": {ADMIN: FORM_TECH, MEERA: FORM_HR, RAHUL: FORM_TECH}},
	},
	{
		"key": "hari", "name": "Hari Prasad",
		"what": "AND rule: Meera and Rahul already submitted POSITIVE feedback; yours is the last one",
		"try": "Fill your task (or the interview's Submit Feedback). Submit Rejected: the interview is Rejected and so is the "
		       "candidate, although 2 of 3 were positive (the old majority vote would have cleared them). "
		       "Re-seed and submit Cleared instead: they move to HR Round.",
		"interview": {"days": -1, "panel": [ADMIN, MEERA, RAHUL],
		              "row_forms": {ADMIN: FORM_TECH, MEERA: FORM_HR, RAHUL: FORM_TECH},
		              "feedbacks": {MEERA: "Cleared", RAHUL: "Cleared"}},
	},
	{
		"key": "isha", "name": "Isha Verma",
		"what": "On Technical Round, nothing scheduled — for adding a stage",
		"try": "+ Add Interview Stage (under the flow): e.g. 'Managerial Round' after Technical Round. It shows "
		       "with an 'Added' tag for Isha only (check Asha: unchanged). Remove it from its card while it is ahead.",
		"interview": None,
	},
]


def _email(key):
	return f"ivseed.{key}@example.com"


# --------------------------------------------------------------------------- #
# Masters
# --------------------------------------------------------------------------- #
def _schema(title):
	return {"display": "form", "components": [
		{"type": "textarea", "key": "strengths", "label": "Key strengths", "input": True,
		 "validate": {"required": True}},
		{"type": "number", "key": "score", "label": f"{title} score (1-10)", "input": True,
		 "validate": {"required": True, "min": 1, "max": 10}},
		{"type": "textarea", "key": "notes", "label": "Notes", "input": True},
		{"type": "button", "key": "submit", "label": "Submit", "action": "submit", "input": True},
	]}


def _forms():
	for label, title in ((FORM_TECH, "Technical"), (FORM_HR, "HR")):
		if frappe.db.exists("Microapp Form Widget", label):
			continue
		doc = frappe.new_doc("Microapp Form Widget")
		doc.label = label
		doc.doc_type = "Interview Feedback"
		doc.custom_form_data = json.dumps(_schema(title))
		doc.form_status = "Active"
		doc.insert(ignore_permissions=True)


def _users():
	from frappe.utils.password import update_password

	for email, full_name in PANEL.items():
		if not frappe.db.exists("User", email):
			first, last = full_name.split(" ", 1)
			frappe.get_doc({
				"doctype": "User", "email": email, "first_name": first, "last_name": last,
				"enabled": 1, "send_welcome_email": 0, "user_type": "System User",
				"roles": [{"role": "Interviewer"}],
			}).insert(ignore_permissions=True)
		# So you can log in as a panel member and see their Tasks.
		update_password(email, PANEL_PASSWORD)


def _opening():
	template = frappe.get_all(
		"Job Opening", filters={"status": "Open", "company": ["is", "set"], "designation": ["is", "set"]},
		fields=["company", "designation"], order_by="creation asc", limit=1,
	)
	if not template:
		frappe.throw("Needs at least one open Job Opening with a company and designation to copy from.")
	doc = frappe.get_doc({
		"doctype": "Job Opening",
		"job_title": OPENING_TITLE,
		"company": template[0].company,
		"designation": template[0].designation,
		"status": "Open",
		"custom_recruiter": ADMIN,
		"description": f"{MARKER} Test opening for interview cancel / reschedule / feedback tasks.",
		"custom_hiring_stages": [
			{"stage_name": TECH, "stage_type": "Interview", "owner_role": "Recruiter",
			 "evaluation_form": FORM_TECH, "notify": 0, "auto": 1},
			{"stage_name": HR, "stage_type": "Interview", "owner_role": "HR",
			 "evaluation_form": FORM_HR, "notify": 0, "auto": 1},
		],
	})
	doc.flags.ignore_mandatory = True
	doc.flags.ignore_validate = True
	doc.insert(ignore_permissions=True)
	return doc


# --------------------------------------------------------------------------- #
# Candidates and their interviews
# --------------------------------------------------------------------------- #
def _applicant(opening, sc):
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
	# Park them on the Technical Round whatever the first-stage seeding did.
	doc.db_set({"custom_current_stage": TECH, "status": "Interview"}, update_modified=False)
	return doc


def _interview(opening, applicant, spec):
	from recruitment.api.hiring_stage import _ensure_interview_round, get_interview_round_field

	rnd = _ensure_interview_round(TECH, opening.designation)
	doc = frappe.get_doc({
		"doctype": "Interview",
		"job_applicant": applicant.name,
		"job_opening": opening.name,
		"designation": opening.designation,
		get_interview_round_field() or "interview_round": rnd,
		"status": "Pending",
		"scheduled_on": add_days(nowdate(), spec["days"]),
		"from_time": "11:00:00",
		"to_time": "12:00:00",
		"interview_details": [{"interviewer": u} for u in spec["panel"]],
	})
	if spec.get("form"):
		doc.custom_evaluation_form = spec["form"]
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)

	if spec.get("status"):
		doc.db_set("status", spec["status"], update_modified=False)
	if spec.get("teams"):
		doc.db_set({"custom_calendar_event_id": "seed-fake-teams-event",
		            "custom_meeting_status": "Scheduled",
		            "custom_zoom_link": "https://teams.example.com/meet/seed"}, update_modified=False)
	for row in doc.interview_details:
		form = (spec.get("row_forms") or {}).get(row.interviewer)
		if form:
			row.db_set("custom_evaluation_form", form, update_modified=False)
	# Where the site's Approval Policy Matrix already handed out tasks on insert,
	# point them at each interviewer's form (what saving the Interview does).
	from recruitment.api.interview_feedback_approval import cancel_approval_tasks, sync_approval_forms

	sync_approval_forms(doc.name)
	feedbacks = dict(spec.get("feedbacks") or {})
	if spec.get("feedback_by"):
		feedbacks[spec["feedback_by"]] = "Cleared"
	for interviewer, result in feedbacks.items():
		fb = frappe.new_doc("Interview Feedback")
		fb.interview = doc.name
		fb.interviewer = interviewer
		fb.job_applicant = applicant.name
		fb.set(get_interview_round_field("Interview Feedback") or "interview_round", rnd)
		fb.result = result
		fb.feedback = f"{MARKER} Strong fundamentals."
		fb.custom_evaluation_form = (spec.get("row_forms") or {}).get(interviewer) or spec.get("form")
		fb.custom_form_response = json.dumps({"strengths": "Clear system design", "score": 8})
		fb.flags.ignore_validate = True
		fb.flags.ignore_mandatory = True
		fb.insert(ignore_permissions=True)
		# Submitted straight on the row: the real submit chain would decide the
		# interview and move the candidate on, which is not the state wanted here.
		fb.db_set("docstatus", 1, update_modified=False)
	if feedbacks:
		# Their feedback is in, so their tasks are done.
		cancel_approval_tasks(doc.name, users=list(feedbacks), reason="Seeded feedback")
	return doc


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
		_forms()
		_users()
		opening = _opening()
		for sc in SCENARIOS:
			applicant = _applicant(opening, sc)
			if sc["interview"]:
				_interview(opening, applicant, sc["interview"])
		frappe.db.commit()
	finally:
		frappe.sendmail = real_sendmail
	report()


def report():
	opening = frappe.db.get_value("Job Opening", {"job_title": OPENING_TITLE}, "name")
	if not opening:
		print("Nothing seeded.")
		return
	base = frappe.utils.get_url()
	print(f"\nOpening: {OPENING_TITLE}  {base}/app/job-opening/{opening}")
	print(f"Stages : {TECH} (form: {FORM_TECH}) → {HR} (form: {FORM_HR}) → offer stages")
	print(f"Panel logins (password {PANEL_PASSWORD}): " + ", ".join(PANEL))
	print("Open each candidate → Hiring Workflow tab → Technical Round card.\n")
	for sc in SCENARIOS:
		ja = frappe.db.get_value("Job Applicant", {"email_id": _email(sc["key"])}, "name")
		ivs = frappe.get_all("Interview", filters={"job_applicant": ja},
		                     fields=["name", "status", "scheduled_on"]) if ja else []
		print(f"• {sc['name']} — {sc['what']}")
		print(f"    {base}/app/job-applicant/{ja}")
		for iv in ivs:
			tasks = frappe.get_all("ToDo", filters={"reference_type": "Interview", "reference_name": iv.name,
			                                        "status": "Open"}, pluck="allocated_to")
			print(f"    {iv.name}: {iv.status}, {iv.scheduled_on}" + (f", open tasks: {', '.join(tasks)}" if tasks else ""))
		print(f"    Try: {sc['try']}\n")


def teardown(quiet=False):
	# Deleting a document queues a background clean-up of everything that points
	# at its name (ToDos, comments…). Frappe then reuses the freed names, so a
	# re-seed's new interviews would lose their fresh tasks to that late clean-up.
	# Run it now instead (Frappe does so when this flag is set).
	was_in_test = frappe.flags.in_test
	frappe.flags.in_test = True
	try:
		_teardown(quiet)
	finally:
		frappe.flags.in_test = was_in_test


def _teardown(quiet=False):
	frappe.set_user(ADMIN)
	applicants = frappe.get_all("Job Applicant", filters={"email_id": ["like", "ivseed.%@example.com"]},
	                            pluck="name")
	# Never `["in", [""]]` when nothing is seeded: Frappe reads it as "blank
	# job_applicant" and would match every real Interview that has none.
	interviews = (frappe.get_all("Interview", filters={"job_applicant": ["in", applicants]}, pluck="name")
	              if applicants else [])
	for iv in interviews:
		frappe.db.delete("ToDo", {"reference_type": "Interview", "reference_name": iv})
		frappe.db.delete("Interview Feedback", {"interview": iv})
		frappe.delete_doc("Interview", iv, force=True, ignore_permissions=True, delete_permanently=True)
	for ja in applicants:
		frappe.db.delete("ToDo", {"reference_type": "Job Applicant", "reference_name": ja})
		frappe.delete_doc("Job Applicant", ja, force=True, ignore_permissions=True, delete_permanently=True)
	for jo in frappe.get_all("Job Opening", filters={"job_title": OPENING_TITLE}, pluck="name"):
		frappe.delete_doc("Job Opening", jo, force=True, ignore_permissions=True, delete_permanently=True)
	from recruitment.api.hiring_stage import get_interview_round_doctype

	# The rounds are seed-named, so no real interview shares them.
	for rnd in frappe.get_all(get_interview_round_doctype(), filters={"name": ["like", f"{MARKER}%"]},
	                          pluck="name"):
		frappe.delete_doc(get_interview_round_doctype(), rnd, force=True, ignore_permissions=True)
	for form in (FORM_TECH, FORM_HR):
		if frappe.db.exists("Microapp Form Widget", form):
			frappe.delete_doc("Microapp Form Widget", form, force=True, ignore_permissions=True)
	for user in PANEL:
		if frappe.db.exists("User", user):
			frappe.db.delete("ToDo", {"allocated_to": user})
			frappe.delete_doc("User", user, force=True, ignore_permissions=True)
	frappe.db.commit()
	if not quiet:
		print(f"Removed {len(applicants)} candidates, {len(interviews)} interviews and the {MARKER} masters.")
