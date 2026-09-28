"""Test fixture for the dynamic interview feedback form — one candidate, one interview.

	bench --site <site> execute recruitment.interview_feedback_form_seed.seed
	bench --site <site> execute recruitment.interview_feedback_form_seed.report
	bench --site <site> execute recruitment.interview_feedback_form_seed.teardown

Builds the smallest complete path through the feature: a form, a candidate, and an
interview that points at the form with YOU on the panel — so the "Submit Feedback"
button is live the moment the seed finishes. Re-running ``seed`` is safe; it tears
down first.

Everything is marked ``[IFB-SEED]`` and removed by ``teardown``. The Interview
Round is deliberately NOT removed — rounds are shared configuration, reused by name
across every opening (see ``_ensure_interview_round``), so deleting one would take
it out from under other interviews.

WHY THE FORM LOOKS LIKE THIS
----------------------------
The schema is not a token two-field form. Every component in it is there to put
pressure on a specific decision in recruitment.api.interview_feedback_form:

  strengths             a plain required field — the base case
  tech_depth /          required, and nested inside a COLUMNS layout. A walk that
  communication         only reads top-level components misses these entirely, and
                        the form would submit with them blank
  recommendation        a required Select — blank must be caught, and "No Hire" is
                        a real answer, not an empty one
  areas_to_probe        a checkbox group. Its answer is a DICT ({"System Design":
                        true}), which the report has to flatten into a cell rather
                        than print as raw JSON
  concerns              required, but CONDITIONAL on recommendation == "No Hire".
                        The server deliberately does not enforce conditionals — if
                        it did, every Hire would be blocked on a question the panel
                        was never shown
  score                 a number, so 0 can be entered. 0 is a real score and must
                        not read as "unanswered"
  notes                 optional — proof that not everything is required
  submit                a Formio submit button, which the renderer strips. Left in,
                        it invites the panel to click the wrong thing and believe
                        they are done

``report`` prints what each of those should do, so a wrong answer is visible rather
than plausible.
"""

import json

import frappe
from frappe.utils import nowdate

MARKER = "[IFB-SEED]"

FORM_NAME = f"{MARKER} Technical Round Evaluation"
APPLICANT_EMAIL = "ifbseed.candidate@ifb-seed.test"
APPLICANT_NAME = f"{MARKER} Priya Raman"
ROUND_NAME = f"{MARKER} Technical Round"


# --------------------------------------------------------------------------- #
# The form
# --------------------------------------------------------------------------- #
def _schema():
	"""A Formio schema shaped like a real evaluation form. See the module docstring
	for why each component is here."""
	return {
		"display": "form",
		"components": [
			{
				"type": "textfield", "input": True, "key": "strengths",
				"label": "Key strengths", "tableView": True,
				"validate": {"required": True},
			},
			{
				"type": "columns", "input": False, "key": "ratings", "columnsKey": "ratings",
				"columns": [
					{"width": 6, "components": [{
						"type": "number", "input": True, "key": "tech_depth",
						"label": "Technical depth (1-10)",
						"validate": {"required": True, "min": 1, "max": 10},
					}]},
					{"width": 6, "components": [{
						"type": "number", "input": True, "key": "communication",
						"label": "Communication (1-10)",
						"validate": {"required": True, "min": 1, "max": 10},
					}]},
				],
			},
			{
				"type": "select", "input": True, "key": "recommendation",
				"label": "Recommendation", "widget": "choicesjs",
				"data": {"values": [
					{"label": "Strong Hire", "value": "strong_hire"},
					{"label": "Hire", "value": "hire"},
					{"label": "No Hire", "value": "no_hire"},
				]},
				"validate": {"required": True},
			},
			{
				"type": "selectboxes", "input": True, "key": "areas_to_probe",
				"label": "Areas the next round should probe",
				"values": [
					{"label": "System Design", "value": "system_design"},
					{"label": "Debugging", "value": "debugging"},
					{"label": "Ownership", "value": "ownership"},
				],
			},
			{
				"type": "textarea", "input": True, "key": "concerns",
				"label": "What went wrong?",
				"validate": {"required": True},
				# Only asked when the panel says No Hire. The SERVER must not enforce
				# this one — see the module docstring.
				"conditional": {"show": True, "when": "recommendation", "eq": "no_hire"},
			},
			{
				"type": "number", "input": True, "key": "score",
				"label": "Overall score", "validate": {"required": True},
			},
			{
				"type": "textarea", "input": True, "key": "notes",
				"label": "Anything else (optional)",
			},
			{
				"type": "button", "input": True, "key": "submit",
				"label": "Submit", "action": "submit", "theme": "primary",
			},
		],
	}


def _create_form():
	"""The Microapp Form Widget the interview points at.

	``Microapp Form Widget`` is autonamed ``field:label``, so the label IS the
	document name — which is what makes teardown a straight delete by name.
	"""
	if frappe.db.exists("Microapp Form Widget", FORM_NAME):
		return FORM_NAME

	doc = frappe.new_doc("Microapp Form Widget")
	doc.label = FORM_NAME
	doc.doc_type = "Interview Feedback"
	doc.custom_form_data = json.dumps(_schema())
	doc.form_status = "Active"
	doc.insert(ignore_permissions=True)
	return doc.name


# --------------------------------------------------------------------------- #
# The candidate and the interview
# --------------------------------------------------------------------------- #
def _create_applicant():
	existing = frappe.db.get_value("Job Applicant", {"email_id": APPLICANT_EMAIL}, "name")
	if existing:
		return existing

	doc = frappe.new_doc("Job Applicant")
	doc.applicant_name = APPLICANT_NAME
	doc.email_id = APPLICANT_EMAIL
	doc.status = "Open"
	doc.insert(ignore_permissions=True)
	return doc.name


def _create_interview(applicant, form_name):
	"""The interview under test: our form, and the current user on the panel.

	The panel member is ``frappe.session.user`` on purpose. HRMS only enables
	"Submit Feedback" for a user listed in ``interview_details`` (interview.js), so
	seeding anyone else would hand the tester a disabled button and no way in.

	The round field is resolved rather than hardcoded — HRMS v15 calls it
	``interview_round``, v16 ``interview_type`` — via the same helpers the rest of
	the app uses, so this seed works on either.
	"""
	from recruitment.api.hiring_stage import _ensure_interview_round, get_interview_round_field

	round_field = get_interview_round_field()
	round_name = _ensure_interview_round(ROUND_NAME)

	doc = frappe.new_doc("Interview")
	doc.job_applicant = applicant
	if round_field and round_name:
		doc.set(round_field, round_name)
	doc.status = "Pending"
	doc.scheduled_on = nowdate()
	doc.from_time = "10:00:00"
	doc.to_time = "11:00:00"
	doc.custom_evaluation_form = form_name
	doc.custom_interview_type = "Online"
	doc.append("interview_details", {"interviewer": frappe.session.user})

	# The round carries no expected skills (rounds are kept designation-agnostic),
	# and Interview Round's skill table is mandatory on its own form — neither is
	# this seed's business.
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	return doc.name


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #
def seed():
	teardown(quiet=True)

	form_name = _create_form()
	applicant = _create_applicant()
	interview = _create_interview(applicant, form_name)
	# The CONTROL. Same candidate, same round, no form — this is the one that proves
	# an ordinary interview is untouched: the Skill Assessment grid still shows and
	# is still mandatory. Without it, "nothing else changed" is only an assertion.
	control = _create_interview(applicant, None)
	frappe.db.commit()

	print("")
	print(f"  Form       {form_name}")
	print(f"  Candidate  {applicant}  ({APPLICANT_NAME})")
	print(f"  Panel      {frappe.session.user}")
	print("")
	print(f"  WITH form     /app/interview/{interview}")
	print("                -> dynamic form, no skill grid")
	print(f"  WITHOUT form  /app/interview/{control}")
	print("                -> normal skill grid, still mandatory")
	print("")
	report()


def report():
	"""What to try, and what each attempt should do."""
	interview = frappe.db.get_value("Interview", {"custom_evaluation_form": FORM_NAME}, "name")
	if not interview:
		print("  Nothing seeded — run seed first.")
		return

	print(f"  TEST PLAN for /app/interview/{interview}")
	print("")
	checks = [
		("Open the interview, click Submit Feedback",
		 "lands on Interview Feedback with the evaluation form drawn in, and NO Skill "
		 "Assessment grid"),
		("Look for a Submit button inside the form itself",
		 "there is none — the form's own submit button is stripped; you save/submit "
		 "with Frappe's toolbar"),
		("Fill nothing, pick a Result, hit Save",
		 "SAVES. A half-filled draft is allowed on purpose, so a panel can come back "
		 "to it"),
		("Reopen the interview and click Submit Feedback again",
		 "reopens the SAME draft — it must not start a second one"),
		("Now hit Submit with the form still blank",
		 "BLOCKED, naming the required questions in form order: Key strengths, "
		 "Technical depth, Communication, Recommendation, Overall score"),
		("Note which question is NOT named",
		 "'What went wrong?' — it is required but conditional, so only the browser "
		 "enforces it. The server naming it would block every Hire"),
		("Set Overall score to 0, fill the rest, Submit",
		 "SUBMITS. 0 is a real score, not a blank"),
		("Tick some 'Areas the next round should probe' boxes",
		 "stored as a dict; the report must show them as text, not raw JSON"),
		("After submitting, reopen the feedback",
		 "the form renders read-only"),
		("Check the Interview's status",
		 "set from the feedback verdict by check_feedback_and_update_result"),
		("Check the Job Applicant's hiring stage",
		 "advanced by auto_advance_stage — this is the step that proves the dynamic "
		 "form did not break the workflow"),
		("Run the report: /app/query-report/Interview Feedback Responses",
		 "one row, one column per question, headers in form order"),
	]
	for i, (action, expected) in enumerate(checks, 1):
		print(f"  {i:2}. {action}")
		print(f"      -> {expected}")
	print("")
	print("  Known + expected: Average Rating on the Interview reads 0. It averages the")
	print("  Skill Assessment grid, which a dynamic form replaces. Not a bug.")
	print("")


def teardown(quiet=False):
	"""Remove everything the seed made.

	The Interview Round is kept: rounds are shared by name across openings, so
	deleting one could take it out from under unrelated interviews.
	"""
	removed = []

	# Keyed on the CANDIDATE, not on the form. The seed also creates a control
	# interview with no form attached, and keying on the form would walk straight
	# past it and leave it behind on every teardown.
	applicants = frappe.get_all(
		"Job Applicant", filters={"email_id": APPLICANT_EMAIL}, pluck="name"
	)

	for applicant in applicants:
		for name in frappe.get_all(
			"Interview Feedback", filters={"job_applicant": applicant}, pluck="name"
		):
			doc = frappe.get_doc("Interview Feedback", name)
			# A submitted doc has to be cancelled before it can be deleted.
			if doc.docstatus == 1:
				doc.flags.ignore_permissions = True
				doc.cancel()
			frappe.delete_doc("Interview Feedback", name, force=True, ignore_permissions=True)
			removed.append(f"Interview Feedback {name}")

		for name in frappe.get_all(
			"Interview", filters={"job_applicant": applicant}, pluck="name"
		):
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True)
			removed.append(f"Interview {name}")

	for name in applicants:
		frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		removed.append(f"Job Applicant {name}")

	if frappe.db.exists("Microapp Form Widget", FORM_NAME):
		frappe.delete_doc("Microapp Form Widget", FORM_NAME, force=True, ignore_permissions=True)
		removed.append(f"Microapp Form Widget {FORM_NAME}")

	frappe.db.commit()

	if not quiet:
		print("  removed: " + (", ".join(removed) if removed else "nothing"))


def verify():
	"""Drive the seeded interview through the server chain and report pass/fail.

	This is the proof that does not depend on anyone clicking correctly: it creates
	a real Interview Feedback against the seeded interview, tries the cases that
	must be refused, then submits a good one and checks what the hooks did with it.
	Cleans up after itself, so it can be run as often as you like.

	It exercises the SERVER only. The rendering, the stripped submit button and the
	conditional question are the browser's half and still need the manual pass.
	"""
	interview = frappe.db.get_value("Interview", {"custom_evaluation_form": FORM_NAME}, "name")
	if not interview:
		print("  Nothing seeded — run seed first.")
		return

	applicant = frappe.db.get_value("Interview", interview, "job_applicant")
	results = []

	def check(label, expectation, fn):
		try:
			fn()
			ok = expectation == "pass"
			detail = "saved/submitted"
		except Exception as e:
			ok = expectation == "block"
			detail = str(e)[:140].replace("\n", " ")
		results.append((ok, label, detail))

	def new_feedback(response=None):
		doc = frappe.new_doc("Interview Feedback")
		doc.interview = interview
		doc.interviewer = frappe.session.user
		doc.job_applicant = applicant
		doc.result = "Cleared"
		if response is not None:
			doc.custom_form_response = json.dumps(response)
		return doc

	# 1. A half-filled draft must be parkable.
	draft = new_feedback({"strengths": "Strong on SQL"})
	check("draft with the form half filled", "pass",
	      lambda: draft.insert(ignore_permissions=True))

	# 2. Submitting it incomplete must be refused, naming the questions.
	check("submit while required answers are blank", "block", draft.submit)

	# 3. The refusal must NOT name the conditional question.
	blocked = next((d for ok, l, d in results if "blank" in l), "")
	named_conditional = "went wrong" in blocked
	results.append((not named_conditional,
	                "refusal leaves the CONDITIONAL question out",
	                blocked))

	frappe.delete_doc("Interview Feedback", draft.name, force=True, ignore_permissions=True)

	# 4. A complete answer with score 0 must go through — 0 is a real score.
	good = new_feedback({
		"strengths": "Strong on SQL", "tech_depth": 8, "communication": 7,
		"recommendation": "hire", "score": 0,
		"areas_to_probe": {"system_design": True, "debugging": False},
	})
	check("submit complete, Overall score = 0", "pass",
	      lambda: (good.insert(ignore_permissions=True), good.submit()))

	# 5. The label snapshot must have been frozen onto the row.
	labels = frappe.db.get_value("Interview Feedback", good.name, "custom_response_labels")
	parsed = json.loads(labels) if labels else {}
	results.append((parsed.get("score", {}).get("label") == "Overall score",
	                "label snapshot frozen onto the feedback",
	                f"{len(parsed)} questions captured"))

	# 6. The form must have been stamped from the interview.
	stamped = frappe.db.get_value("Interview Feedback", good.name, "custom_evaluation_form")
	results.append((stamped == FORM_NAME, "form stamped from the interview", str(stamped)))

	# 7. The verdict must have reached the Interview — this is the hook chain running.
	status = frappe.db.get_value("Interview", interview, "status")
	results.append((status == "Cleared",
	                "Interview verdict updated by the on_submit chain",
	                f"status = {status}"))

	# ── The control: an interview with NO form must behave exactly as before ──
	# This is the half that matters most. Making the skill grid optional so a
	# dynamic form could replace it is a GLOBAL schema change, and the risk is that
	# it silently relaxes every ordinary feedback on the site too.
	control = frappe.db.get_value(
		"Interview",
		{"job_applicant": applicant, "custom_evaluation_form": ("is", "not set")},
		"name",
	)
	if not control:
		results.append((False, "control interview (no form) present", "not seeded"))
	else:
		def new_control(skills=None):
			doc = frappe.new_doc("Interview Feedback")
			doc.interview = control
			doc.interviewer = frappe.session.user
			doc.job_applicant = applicant
			doc.result = "Cleared"
			for skill in skills or []:
				doc.append("skill_assessment", {"skill": skill, "rating": 0.8})
			return doc

		# No skills → must still be refused, on a plain SAVE, exactly as reqd did.
		empty = new_control()
		check("NO form: saving with an empty skill grid", "block",
		      lambda: empty.insert(ignore_permissions=True))

		# With skills → the ordinary path, untouched.
		skill = frappe.db.get_value("Skill", {}, "name")
		if skill:
			filled = new_control([skill])
			check("NO form: saving with skills rated", "pass",
			      lambda: filled.insert(ignore_permissions=True))
			if filled.get("name") and frappe.db.exists("Interview Feedback", filled.name):
				# Average rating must still be computed off the grid.
				avg = frappe.db.get_value("Interview Feedback", filled.name, "average_rating")
				results.append((bool(avg), "NO form: average rating still computed",
				                f"average_rating = {avg}"))
				frappe.delete_doc("Interview Feedback", filled.name,
				                  force=True, ignore_permissions=True)
		else:
			results.append((True, "NO form: skills rated (skipped)",
			                "no Skill records on this site"))

	print("")
	for ok, label, detail in results:
		print(f"  [{'PASS' if ok else 'FAIL'}]  {label}")
		print(f"          {detail}")
	failed = [r for r in results if not r[0]]
	print("")
	print(f"  {len(results) - len(failed)}/{len(results)} passed")
	print("")
	print("  Still needs a manual pass in the browser: the form renders, its own")
	print("  Submit button is gone, and the conditional question appears on No Hire.")

	# Leave the seed as it was found, ready for the manual pass.
	doc = frappe.get_doc("Interview Feedback", good.name)
	if doc.docstatus == 1:
		doc.flags.ignore_permissions = True
		doc.cancel()
	frappe.delete_doc("Interview Feedback", good.name, force=True, ignore_permissions=True)
	frappe.db.set_value("Interview", interview, "status", "Pending")
	frappe.db.commit()
