import frappe
from frappe import _
from frappe.utils import flt, get_link_to_form


def create_salary_structure_assignment(doc, method=None):
	"""GAP-29: auto-create a pre-filled DRAFT Salary Structure Assignment on hire.

	On Employee creation, transcribe the agreed pay from the accepted Job Offer
	into a draft SSA so HR stops re-keying it for every hire (Design A).

	- Resolves the employee's Job Offer (via ``job_applicant``) and sets
	  ``base`` = the offer's monthly CTC (``custom_ctc_per_month`` = CTC/12).
	- Pre-fills every deterministically-resolvable field: ``company``,
	  ``from_date`` = ``date_of_joining``, the current Payroll Period, and the
	  tax regime.
	- ``salary_structure`` and ``income_tax_slab`` are a per-hire HR judgement
	  (company + PF-vs-no-PF + contract) and are not carried on the offer in
	  practice, so they are left blank for HR to pick on the draft -- pre-filled
	  only if the offer happens to carry them.
	- Leaves the SSA as a DRAFT for HR to complete + submit.

	Best-effort and non-blocking: a savepoint + try/except guarantees a failure
	can never block the employee's creation; idempotent -- skips if the employee
	already has an SSA or has no source Job Offer.
	"""
	if frappe.db.exists("Salary Structure Assignment", {"employee": doc.name}):
		return

	job_offer = _get_source_job_offer(doc)
	if not job_offer:
		# Not a recruitment-sourced hire -> leave the SSA to the manual flow.
		return

	savepoint = "gap29_auto_ssa"
	frappe.db.savepoint(savepoint)
	try:
		ssa_name = _create_draft_ssa(doc, job_offer)
	except Exception:
		frappe.db.rollback(save_point=savepoint)
		frappe.log_error(
			title="Auto Salary Structure Assignment Failed",
			message=frappe.get_traceback(),
		)
		return

	frappe.msgprint(
		_(
			"A draft Salary Structure Assignment {0} was pre-filled from the Job "
			"Offer (monthly base from CTC). Please set the Salary Structure and "
			"Income Tax Slab, then submit."
		).format(get_link_to_form("Salary Structure Assignment", ssa_name)),
		title=_("Salary Structure Assignment - draft ready"),
		indicator="blue",
	)


def _get_source_job_offer(doc):
	"""Most recent submitted Job Offer for this employee's applicant, if any."""
	if not doc.get("job_applicant"):
		return None
	offers = frappe.get_all(
		"Job Offer",
		filters={"job_applicant": doc.job_applicant, "docstatus": 1},
		fields=[
			"name",
			"custom_ctc_per_annum",
			"custom_ctc_per_month",
			"custom_employee_salary_structure",
			"custom_income_tax_slab",
		],
		order_by="creation desc",
		limit=1,
	)
	return offers[0] if offers else None


def _create_draft_ssa(doc, job_offer):
	"""Build + insert (as a draft) the pre-filled SSA; return its name."""
	monthly = flt(job_offer.get("custom_ctc_per_month"))
	if not monthly and job_offer.get("custom_ctc_per_annum"):
		monthly = flt(job_offer.get("custom_ctc_per_annum")) / 12.0

	ssa = frappe.new_doc("Salary Structure Assignment")
	ssa.employee = doc.name
	ssa.company = doc.company
	ssa.from_date = doc.date_of_joining
	ssa.base = monthly

	# Indian-payroll fields we can resolve/default (cn_indian_payroll SSA).
	payroll_period = _current_payroll_period(doc.company, doc.date_of_joining)
	if payroll_period:
		ssa.custom_payroll_period = payroll_period
	ssa.custom_tax_regime = "New Regime"

	# The two per-hire judgement fields: only if the offer actually carries them.
	structure = job_offer.get("custom_employee_salary_structure")
	slab = job_offer.get("custom_income_tax_slab")
	if structure:
		ssa.salary_structure = structure
	if slab:
		ssa.income_tax_slab = slab

	# The SSA's own validate_company rejects a blank Salary Structure (and
	# validate_income_tax_slab requires a slab when the structure has a tax
	# component). This is a skeleton draft that deliberately leaves those two
	# HR-judgement fields blank, so skip validation on THIS insert only -- full
	# validation runs normally when HR completes the draft and submits it.
	if not (structure and slab):
		ssa.flags.ignore_validate = True
	ssa.insert(ignore_permissions=True, ignore_mandatory=True)
	return ssa.name


def _current_payroll_period(company, on_date):
	"""The Payroll Period for this company whose range covers ``on_date``."""
	if not company or not on_date:
		return None
	rows = frappe.get_all(
		"Payroll Period",
		filters={
			"company": company,
			"start_date": ["<=", on_date],
			"end_date": [">=", on_date],
		},
		pluck="name",
		limit=1,
	)
	return rows[0] if rows else None
