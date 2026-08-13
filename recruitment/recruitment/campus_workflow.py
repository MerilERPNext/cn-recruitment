"""The hiring workflow every campus drive runs, defined once.

Campus hiring repeats the same rounds at every college — GD, a technical round or
two, HR, then the offer. Building that by hand per drive is where drives went
wrong: a round mapped to a stage the opening doesn't have shows a silent "0
waiting", because a round's pool is simply whoever sits at its hiring stage.

So one workflow is named in **Campus Settings → Default Campus Hiring Workflow**,
as a TA Interview Strategy Template — the same doctype that fills a Job Opening's
stages, so there is one editor and one vocabulary. From it:

  * a new drive's **Rounds** table is built, each round mapped to its stage, with
    a closing Offer round;
  * any linked **Job Opening with no stages of its own** is given the same list,
    so those rounds are reachable.

Both only ever FILL: a drive that already has rounds, and an opening that already
has stages, are left exactly as they are.
"""

import frappe

SETTINGS = "Campus Settings"
WORKFLOW_FIELD = "default_hiring_workflow"
APPLY_TO_OPENINGS_FIELD = "apply_workflow_to_openings"
STAGES_FIELD = "custom_hiring_stages"

# A template round is named, not typed, so the drive's round type is read off the
# name. Longest / most specific first; single words are matched as whole words so
# "HR" doesn't match "Threshold".
ROUND_TYPES = (
	("group discussion", "Group Discussion"),
	("assessment", "Assessment"),
	("aptitude", "Assessment"),
	("presentation", "PPT"),
	("technical", "Technical"),
	("gd", "Group Discussion"),
	("ppt", "PPT"),
	("hr", "HR"),
	("test", "Assessment"),
)

# The terminal round, in preference order — whichever the openings actually carry.
OFFER_STAGES = ("Pre Job Offer", "Job Offer")


def round_type_for(stage_name):
	"""The Campus Drive round type a stage name implies; "Other" when unclear."""
	name = (stage_name or "").strip().lower()
	if not name:
		return "Other"
	words = set(name.replace("/", " ").replace("-", " ").split())
	for key, round_type in ROUND_TYPES:
		if " " in key:
			if key in name:
				return round_type
		elif key in words:
			return round_type
	return "Technical" if "round" in words else "Other"


def get_default_workflow():
	"""``(template_name, [stage dict, ...])`` from Campus Settings, or ``(None, [])``.

	Stages come back in the template's own order, as Job Opening Hiring Stage rows.
	"""
	from recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template import (
		_map_rounds_to_stages,
	)

	template = frappe.db.get_single_value(SETTINGS, WORKFLOW_FIELD)
	if not template or not frappe.db.exists("TA Interview Strategy Template", template):
		return None, []
	stages = _map_rounds_to_stages(frappe.get_doc("TA Interview Strategy Template", template))
	for stage in stages:
		# Campus candidates are not emailed per stage (see Campus Settings → Notify
		# Campus Candidates on Stage Change); leaving notify on would also mail
		# lateral candidates who share the opening.
		stage["notify"] = 0
	return template, stages


def apply_to_drive(doc):
	"""Build a drive's Rounds table from the default workflow, when it has none.

	Called from Campus Drive.validate. Only fills an EMPTY table — clearing the
	rounds and saving is therefore also how you rebuild from the template.
	"""
	if doc.get("rounds"):
		return 0
	_template, stages = get_default_workflow()
	if not stages:
		return 0

	for stage in stages:
		doc.append("rounds", {
			"round_name": stage["stage_name"],
			"round_type": round_type_for(stage["stage_name"]),
			"hiring_stage": stage["stage_name"],
			"round_status": "Scheduled",
		})

	offer_stage = _offer_stage(doc)
	if offer_stage:
		doc.append("rounds", {
			"round_name": offer_stage, "round_type": "Offer",
			"hiring_stage": offer_stage, "round_status": "Scheduled",
		})
	return len(doc.get("rounds") or [])


def _offer_stage(doc):
	"""The offer stage this drive's openings actually carry.

	Both are appended virtually by get_opening_stages — Pre Job Offer only when the
	opening enables it — so the drive's closing round has to follow the openings
	rather than assume one.
	"""
	from recruitment.recruitment.doctype.campus_drive.campus_drive import _stage_options

	available = set(_stage_options(doc).get("stages") or [])
	if not available:
		return OFFER_STAGES[-1]
	return next((s for s in OFFER_STAGES if s in available), None)


def apply_to_openings(doc):
	"""Give every linked opening WITHOUT hiring stages the campus workflow.

	Called from Campus Drive.on_update, not validate: it saves other documents, and
	an opening that already has a workflow is never touched.
	"""
	if not frappe.db.get_single_value(SETTINGS, APPLY_TO_OPENINGS_FIELD):
		return []
	_template, stages = get_default_workflow()
	if not stages:
		return []

	openings = [row.job_opening for row in (doc.get("linked_job_openings") or []) if row.job_opening]
	if not openings:
		return []
	# One query for who already has stages, rather than loading every opening.
	have = set(frappe.get_all(
		"Job Opening Hiring Stage",
		filters={"parenttype": "Job Opening", "parent": ["in", openings]},
		pluck="parent",
	))

	filled = []
	for opening in openings:
		if opening in have:
			continue
		try:
			opening_doc = frappe.get_doc("Job Opening", opening)
			for stage in stages:
				opening_doc.append(STAGES_FIELD, dict(stage))
			opening_doc.flags.ignore_mandatory = True
			opening_doc.save(ignore_permissions=True)
			filled.append(opening)
		except Exception:
			# The drive is already saved and usable; a stubborn opening must not undo
			# it. The drive's health banner reports the round as unreachable anyway.
			frappe.log_error(frappe.get_traceback(),
			                 f"Campus workflow: could not fill stages on {opening}")
	return filled
