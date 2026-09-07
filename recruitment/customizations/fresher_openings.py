"""Fresher requisitions raise their Job Openings themselves, one per region.

A Fresher requisition is a single document that hires across several regions at
once: `custom_regions` holds one row per region, carrying that region's headcount
and — added by the Hiring Lead during approval — its fixed pay, variable pay and
recruiter. Nothing about it is per-region except that table, so nothing downstream
can act on it: a Job Opening posts to one region, for one recruiter, with one
salary. Somebody had to sit and cut the requisition into N openings by hand, and
every field they mistyped was a field the campus drive then hired against.

So the split happens here, at the moment the requisition becomes real. When the
final approver moves it to **Approved Active**, each region row becomes its own
fully-formed Job Opening:

    vacancies              <- row.no_of_openings
    custom_recruiter       <- row.recruiter          (+ the Hiring Team's Recruiter)
    fixed_pay/variable_pay <- row.fixed_pay/variable_pay
    custom_regions         <- that one row
    custom_posting_options <- a Campus row, Active
    custom_hiring_stages   <- Campus Settings' default campus hiring workflow,
                              falling back to the attribute-matched template

Everything else — company, designation, department, description/JD, employment
type, qualifications, skills — comes from `make_job_opening`, the same mapper the
Desk "Create Job Opening" button uses, so an auto-raised opening and a hand-raised
one are built from one definition rather than two that drift.

All of it is set BEFORE the insert, so the opening is saved complete. That matters
for the hiring stages in particular: the Job Opening form prefills an empty
workflow tab and marks the document dirty, so an opening saved without stages
would open as "Not Saved" with a workflow nobody chose.

The region row then records the opening it produced. That stamp is what makes the
whole thing idempotent: a requisition saved again, re-approved, or activated twice
raises nothing new, because every region already points at its opening.

**Fresher only.** A Lateral requisition holds no region rows and never reaches
past the first guard; its openings are still raised by hand from the Desk button.
"""

import frappe
from frappe import _

from recruitment.api.requisition_status import APPROVED_ACTIVE_STATUS

HIRING_TYPE_FRESHER = "Fresher"
REGION_CHILD_DOCTYPE = "Job Requisition Region"
JOB_OPENING = "Job Opening"

# Every Fresher opening is a campus opening: that is what "Fresher" means here, so
# the posting row is not a default the recruiter may or may not get round to.
CAMPUS_POSTING_CHANNEL = "Campus"
POSTING_STATUS_ACTIVE = "Active"

# Its own template, not the requisition's "Job Requisition Recruiter Assigned":
# that one is still sent by the Lateral approval matrix with the REQUISITION as
# its context, and every field this mail wants to name (region, vacancies, pay,
# the opening's own recruiter) lives on the opening.
RECRUITER_ASSIGNED_TEMPLATE = "Job Opening Recruiter Assigned"


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def create_openings_for_regions(doc, method=None):
	"""Job Requisition `on_update` — raise the region openings once approved.

	Gated on an actual status change so the ordinary save (every edit, every
	workflow touch, the stamp we write below) costs nothing but a field read.

	The approval engine reaches this by `doc.set("status", ...)` +
	`doc.save()` (see nextai's approval log handler), so the final approver's
	click is what fires it.
	"""
	if (doc.get("custom_hiring_type") or "").strip() != HIRING_TYPE_FRESHER:
		return
	if doc.get("status") != APPROVED_ACTIVE_STATUS:
		return
	if not doc.has_value_changed("status"):
		return

	try:
		create_missing_openings(doc)
	except Exception:
		# The requisition IS approved — that is decided and saved. A failure to
		# raise its openings must be visible and fixable, not a reason to undo an
		# approval three people have already given.
		frappe.log_error(
			frappe.get_traceback(), "Fresher requisition: raising region openings failed"
		)


def sync_vacancies_from_region(doc, method=None):
	"""Job Opening `validate` — a Fresher opening's headcount is its region's.

	`vacancies` is declared `fetch_from: job_requisition.no_of_positions`, which
	is right for Lateral and wrong for every Fresher opening: the requisition's
	`no_of_positions` is the total across ALL its regions, so five region openings
	would each advertise the whole requisition's headcount. Worse, the fetch is
	re-applied on every save, so assigning the right number at creation would not
	survive the next edit.

	Frappe resolves fetch_from in `_validate_links()`, which runs before the
	`validate` doc_events — so correcting it here wins, on every save path, for
	good.

	Fresher openings carrying a region row only: a Lateral opening has none and
	keeps the fetched value untouched.
	"""
	if (doc.get("custom_hiring_type") or "").strip() != HIRING_TYPE_FRESHER:
		return
	rows = doc.get("custom_regions") or []
	if not rows:
		return
	doc.vacancies = sum(frappe.utils.cint(row.no_of_openings) for row in rows)


def create_missing_openings(doc):
	"""One Job Opening per region row that hasn't got one. Returns their names.

	Safe to call repeatedly: a row already carrying a `job_opening` is skipped, so
	this only ever fills gaps. Each region is raised inside its own savepoint —
	one region failing (a missing master, a rejected mandatory field) leaves the
	rest raised rather than taking them all down with it.
	"""
	pending = [
		row for row in (doc.get("custom_regions") or [])
		if row.region and not row.job_opening
	]
	if not pending:
		return []

	# Read once for the whole requisition, not once per region.
	stages = _campus_hiring_stages()

	created = []
	for row in pending:
		savepoint = f"fresher_opening_{row.idx}"
		frappe.db.savepoint(savepoint)
		try:
			opening = _build_opening(doc, row, stages)
			opening.insert(ignore_permissions=True)
		except Exception:
			frappe.db.rollback(save_point=savepoint)
			frappe.log_error(
				frappe.get_traceback(),
				f"Fresher requisition {doc.name}: could not raise the opening for {row.region}",
			)
			continue

		_stamp_opening_on_row(row, opening.name)
		created.append((row, opening))

	for row, opening in created:
		_notify_recruiter(doc, row, opening)

	if created:
		doc.add_comment(
			"Comment",
			_("Approved Active: raised {0} region job opening(s) — {1}.").format(
				len(created),
				", ".join(f"{row.region} → {opening.name}" for row, opening in created),
			),
		)

	return [opening.name for _row, opening in created]


# ---------------------------------------------------------------------------
# Building one region's opening
# ---------------------------------------------------------------------------

def _build_opening(requisition, row, stages):
	"""An unsaved Job Opening for one region row.

	Starts from `make_job_opening` so every shared field is mapped exactly as the
	Desk button maps it, then narrows the result from "the whole requisition" down
	to "this region": the requisition's total headcount becomes this region's, and
	its full Regions table becomes this region's single row.
	"""
	from recruitment.customizations.job_requisition import make_job_opening

	opening = make_job_opening(requisition.name, recruiter=row.recruiter)

	opening.custom_hiring_type = HIRING_TYPE_FRESHER
	# The mapper copies the requisition's TOTAL headcount (no_of_positions ->
	# vacancies), which is right for a Lateral opening and wrong for every region
	# of a Fresher one.
	opening.vacancies = frappe.utils.cint(row.no_of_openings)

	_set_if_field(opening, "custom_recruiter", row.recruiter)
	_set_if_field(opening, "fixed_pay", row.fixed_pay)
	_set_if_field(opening, "variable_pay", row.variable_pay)

	# Same child doctype on both sides, so the mapper copied EVERY region across.
	# The opening speaks for one region only.
	if opening.meta.has_field("custom_regions"):
		opening.set("custom_regions", [])
		opening.append("custom_regions", {
			"region": row.region,
			"no_of_openings": frappe.utils.cint(row.no_of_openings),
			"fixed_pay": row.fixed_pay,
			"variable_pay": row.variable_pay,
			"recruiter": row.recruiter,
		})

	_ensure_campus_posting(opening)
	_apply_hiring_stages(opening, stages)

	return opening


def _set_if_field(doc, fieldname, value):
	"""Assign only when the field exists — these are custom fields, and a site
	that hasn't migrated them yet should still get its openings."""
	if doc.meta.has_field(fieldname):
		doc.set(fieldname, value)


def _ensure_campus_posting(opening):
	"""Post the opening to Campus, Active — unless it is already posted there.

	`recruitment.recruitment.eligibility_engine.apply_default_eligibility_rules`
	keys off exactly this row, so adding it here is also what gives the opening
	its default campus eligibility conditions on save.
	"""
	if not opening.meta.has_field("custom_posting_options"):
		return
	for existing in opening.get("custom_posting_options") or []:
		if existing.post_to == CAMPUS_POSTING_CHANNEL:
			existing.status = POSTING_STATUS_ACTIVE
			return
	opening.append("custom_posting_options", {
		"post_to": CAMPUS_POSTING_CHANNEL,
		"status": POSTING_STATUS_ACTIVE,
	})


def _campus_hiring_stages():
	"""The campus hiring workflow's stages, or [] when none is configured.

	Read from Campus Settings through `campus_workflow.get_default_workflow`, the
	same source a Campus Drive builds its rounds from — a drive's round is only
	reachable if the openings it runs against carry the matching stage, so the two
	must come from one definition.
	"""
	try:
		from recruitment.recruitment.campus_workflow import get_default_workflow

		_template, stages = get_default_workflow()
		return stages or []
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			"Fresher requisition: could not read the default campus hiring workflow",
		)
		return []


def _apply_hiring_stages(opening, campus_stages):
	"""Fill the opening's hiring stages BEFORE it is saved. Never overwrites.

	This has to happen here, at build time, and not be left to the Job Opening
	form: `job_opening_hiring_workflow.js` prefills an empty Hiring workflow tab
	when the form is opened and calls `frm.dirty()`, so an opening saved without
	stages greets whoever opens it as an unsaved document with a workflow they
	never chose to add. The opening must arrive complete.

	Campus Settings' default campus workflow comes first — every Fresher opening
	is a campus opening, and a Campus Drive's rounds are only reachable if the
	openings carry those same stages. When that is not configured, the
	attribute-matched template is used instead: it is exactly what the form would
	have filled in, so taking it now means the tab is already correct and the form
	has nothing left to do.
	"""
	if not opening.meta.has_field("custom_hiring_stages"):
		return
	if opening.get("custom_hiring_stages"):
		return

	for stage in campus_stages or _attribute_matched_stages(opening):
		opening.append("custom_hiring_stages", dict(stage))


def _attribute_matched_stages(opening):
	"""The workflow the Job Opening form would prefill, resolved server-side.

	Same call the form makes (`get_hiring_stages_for_job_opening`), given the
	unsaved opening so its department / designation / location can be matched
	against the templates' attributes. Returns [] when the hiring-workflow feature
	is off or nothing matches — in which case the form finds nothing either and
	leaves the opening clean.
	"""
	try:
		from recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template import (
			get_hiring_stages_for_job_opening,
		)

		result = get_hiring_stages_for_job_opening(doc=opening.as_dict()) or {}
		return result.get("stages") or []
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			"Fresher requisition: could not resolve a hiring workflow for the opening",
		)
		return []


def _stamp_opening_on_row(row, opening_name):
	"""Record the opening on its region row, in the DB and in memory.

	A direct child-table write rather than a parent `save()`: we are inside the
	requisition's own `on_update`, and saving it again from there would re-enter
	this hook and re-run every validate rule on a document that is mid-save.
	"""
	row.job_opening = opening_name
	frappe.db.set_value(
		REGION_CHILD_DOCTYPE, row.name, "job_opening", opening_name, update_modified=False
	)


# ---------------------------------------------------------------------------
# Telling the recruiter
# ---------------------------------------------------------------------------

def _notify_recruiter(requisition, row, opening):
	"""Mail the region's recruiter that this opening is theirs.

	This used to be the approval matrix's job, sent once to the requisition's
	`custom_assign_to_recruiter`. A Fresher requisition has no such field filled —
	it has a recruiter per region — and a matrix `userfield::` recipient cannot
	address a child table, so the mail is sent from here instead: once per opening,
	to the person who actually owns it.

	Best-effort. A requisition that is approved and has its openings must not be
	held back by a mail server.
	"""
	if not row.recruiter:
		return
	try:
		email = frappe.db.get_value("User", row.recruiter, "email") or row.recruiter
		if not email:
			return

		from frappe.email.doctype.email_template.email_template import get_email_template

		if not frappe.db.exists("Email Template", RECRUITER_ASSIGNED_TEMPLATE):
			frappe.log_error(
				f"Email Template {RECRUITER_ASSIGNED_TEMPLATE!r} is missing, so the "
				f"recruiter for {opening.name} was not told about it.",
				"Fresher requisition: recruiter template missing",
			)
			return

		rendered = get_email_template(
			RECRUITER_ASSIGNED_TEMPLATE,
			{"doc": opening, "requisition": requisition, "region": row.region},
		)
		frappe.sendmail(
			recipients=[email],
			subject=rendered.get("subject")
			or _("New Job Opening Assigned — {0}").format(opening.name),
			message=rendered.get("message"),
			reference_doctype=JOB_OPENING,
			reference_name=opening.name,
		)
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			f"Fresher requisition: could not notify the recruiter for {opening.name}",
		)
