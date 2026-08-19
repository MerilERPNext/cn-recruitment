import frappe
import json
from frappe import _
from frappe.model.mapper import get_mapped_doc
from frappe.utils import cint, flt

from hrms.hr.doctype.job_offer.job_offer import JobOffer


@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    """Gated override of HRMS's Job Offer → "Create Employee".

    Blocks a configured Hiring Lead (for the offer's company) from creating an
    Employee out of a Job Offer when 'Allow Hiring lead to Add Employee From
    Offer' is OFF in Recruitment Settings. System Managers / Administrator, and
    every company without a Hiring Lead Configuration, are unaffected. Once the
    gate passes it delegates to the original HRMS implementation, so the mapping
    behaviour is unchanged. Registered via override_whitelisted_methods in hooks."""
    from hrms.hr.doctype.job_offer.job_offer import make_employee as hrms_make_employee
    from recruitment.customizations.hiring_lead_permissions import _exempt, _settings
    from recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration import (
        is_hiring_lead_for_company,
    )

    company = frappe.db.get_value("Job Offer", source_name, "company")
    if (
        not _exempt()
        and is_hiring_lead_for_company(company)
        and not _settings().get("allow_hiring_lead_add_employee_from_offer")
    ):
        frappe.throw(
            _("Hiring leads are not allowed to add an Employee from a Job Offer. "
              "Enable 'Allow Hiring lead to Add Employee From Offer' in Recruitment "
              "Settings → Hiring Lead Permission Settings.")
        )

    return hrms_make_employee(source_name, target_doc)


def _basis_amounts(self):
    """Resolve the Basic and CTC base values for percentage computation, honoring
    the offer's 'Salary Component Period' (Monthly / Annual; default Monthly).

      Monthly: Basic = Base
      Annual:  Basic = Base * 12

    The CTC basis is always 0: it came from custom_ctc_per_annum /
    custom_ctc_per_month, which were removed with the Salary Breakup section
    (recruitment.patches.delete_job_offer_salary_breakup). Rows on the "% of CTC"
    basis therefore compute 0 until it is re-pointed at a surviving CTC field.

    Returns (basic_basis, ctc_basis)."""
    base = flt(self.get("custom_base_salary"))

    if (self.get("custom_salary_period") or "Monthly") == "Annual":
        return base * 12.0, 0.0
    return base, 0.0


def apply_percentage_components(self):
    """Compute each Earnings / Deduction row's amount from its percentage of the
    chosen basis (Basic or CTC), on the offer's Monthly/Annual period.

    Returns True when at least one row carried a percentage — i.e. the
    percentage model is in use — so the caller skips the legacy
    Salary-Structure-driven path. Rows with a blank percentage are left as-is
    (lets a recruiter still type a fixed amount on a row)."""
    basic_basis, ctc_basis = _basis_amounts(self)

    used = False
    for row in list(self.get("custom_earnings") or []) + list(self.get("custom_deduction") or []):
        pct = flt(row.get("percentage"))
        if not pct:
            continue
        basis_amount = ctc_basis if (row.get("basis") == "CTC") else basic_basis
        row.amount = flt(basis_amount) * pct / 100.0
        used = True
    return used


@frappe.whitelist()
def calculate_salary_structure(self, method=None):
    from recruitment.recruitment import offer_compensation as oc

    # Keep the auto contingency note in sync with the presence of clause rows.
    # (Clauses are independent of the compensation method.)
    oc.apply_commitment_note(self)

    # Grade-based auto breakup runs ONLY when explicitly selected via the
    # "Compensation Method" selector. Every other value — the default
    # "Salary Structure" and the blank value on pre-existing / other-project
    # offers — falls straight through to the untouched legacy flows below.
    if (self.get("custom_compensation_method") or oc.METHOD_DEFAULT) == oc.METHOD_AUTO:
        oc.compute_offer_compensation(self)
        return

    # Legacy model: components entered with a % of Basic/CTC directly on the offer.
    if apply_percentage_components(self):
        return

    # Fallback (unchanged): legacy Salary-Structure-driven computation, used only
    # when no percentages were entered.
    if self.custom_employee_salary_structure and self.custom_base_salary:
        rec_setting = frappe.get_doc("Recruitment Settings")
        ssa = frappe.db.get_value(
            "Salary Structure Assignment",
            {"name": rec_setting.dummy_salary_structure_assignment},
            ["name"],
        )
        if ssa:
            doc = frappe.get_doc("Salary Structure Assignment", ssa)
            doc.salary_structure = self.custom_employee_salary_structure
            doc.custom_fixed_ctc_annual = self.custom_base_salary
            doc.income_tax_slab = self.custom_income_tax_slab
            doc.custom_is_epf=self.custom_epf
            doc.custom_epf_type=self.custom_epf_type
            doc.save()
            self.custom_earnings = []
            self.custom_deduction = []
            make_salary_slip(
                self,
                self.custom_employee_salary_structure,
                target_doc=None,
                employee=doc.employee,
                posting_date=None,
                as_print=False,
                print_format=None,
                for_preview=0,
            )
        else:
            frappe.throw("No Salary Structure")


@frappe.whitelist()
def make_salary_slip(
    self,
    source,
    target_doc=None,
    employee=None,
    posting_date=None,
    as_print=False,
    print_format=None,
    for_preview=0,
):
    def postprocess(source, target):
        if employee:
            target.employee = employee
            if posting_date:
                target.posting_date = posting_date

        target.run_method("process_salary_structure", for_preview=for_preview)

    doc = get_mapped_doc(
        "Salary Structure",
        source,
        {
            "Salary Structure": {
                "doctype": "Salary Slip",
                "field_map": {
                    "total_earning": "gross_pay",
                    "name": "salary_structure",
                    "currency": "currency",
                },
            }
        },
        target_doc,
        postprocess,
        ignore_child_tables=True,
        cached=True,
    )
    if doc:
        for i in doc.earnings:
            self.append(
                "custom_earnings", {"component": i.salary_component, "amount": i.amount}
            )
        for j in doc.deductions:
            self.append(
                "custom_deduction",
                {"component": j.salary_component, "amount": j.amount},
            )
        return doc


# recruitment.customizations.job_offer.CustomJobOffer
class CustomJobOffer(JobOffer):
    def on_change(self):
        pass


# --- Job Requisition behind the offer ---------------------------------------
# An offer always draws its headcount from a requisition (offer_validation refuses
# to create one otherwise), but until now the offer never recorded WHICH. Storing
# it makes the link reportable and lets the requisition's agreed pay bands flow
# straight onto the offer instead of being re-keyed.
#
# Source field on Job Requisition -> target field on Job Offer.
REQUISITION_PAY_MAP = {
	"fixed_pay": "custom_total_fixed_pay",
	"variable_pay": "custom_variable_incentive",
}


def _requisition_for_applicant(job_applicant):
	"""Job Applicant -> Job Opening -> Job Requisition, or None if not resolvable.

	The opening is the only thing that knows the requisition; the offer has no
	direct link of its own.
	"""
	if not job_applicant:
		return None
	opening = frappe.db.get_value("Job Applicant", job_applicant, "job_title")
	if not opening:
		return None
	return frappe.db.get_value("Job Opening", opening, "job_requisition") or None


def _requisition_pay(requisition):
	"""``{target_field: value}`` for whichever pay fields this site actually has.

	Guarded by ``has_column``, not ``meta.get_field``: a field can be present in the
	meta and still have no database column — which is exactly how `fixed_pay` and
	`variable_pay` shipped originally, as virtual fields. Reading one of those
	raises "Unknown column", so the meta alone is not a safe check.
	"""
	if not requisition:
		return {}
	available = [src for src in REQUISITION_PAY_MAP
	             if frappe.db.has_column("Job Requisition", src)]
	if not available:
		return {}
	values = frappe.db.get_value("Job Requisition", requisition, available, as_dict=True) or {}
	return {REQUISITION_PAY_MAP[src]: values.get(src) for src in available if values.get(src)}


def _campus_drive_pay(job_applicant):
	"""The package agreed on the candidate's Campus Drive, in offer fields.

	Campus hiring negotiates one package per drive rather than per requisition, so a
	drive that names its own Fixed / Variable Pay speaks for its candidates. The drive
	carries the same field names as the requisition, so one map serves both — and the
	same has_column guard applies, for a site that hasn't migrated the fields in yet.
	"""
	drive = frappe.db.get_value("Job Applicant", job_applicant,
	                            "custom_campus_drive") if job_applicant else None
	if not drive:
		return {}
	available = [src for src in REQUISITION_PAY_MAP
	             if frappe.db.has_column("Campus Drive", src)]
	if not available:
		return {}
	values = frappe.db.get_value("Campus Drive", drive, available, as_dict=True) or {}
	return {REQUISITION_PAY_MAP[src]: values.get(src) for src in available if values.get(src)}


def _agreed_pay(doc):
	"""What this offer should start from: the candidate's Campus Drive package where
	there is one, the requisition's band for anything it doesn't cover."""
	pay = _campus_drive_pay(doc.get("job_applicant"))
	for target, value in _requisition_pay(doc.get("custom_job_requisition")).items():
		pay.setdefault(target, value)
	return pay


def set_requisition_and_pay(doc, method=None):
	"""Stamp the requisition on the offer and pull the agreed pay across.

	Only fills fields that are still empty, so an amount HR has deliberately
	negotiated is never overwritten on a later save.
	"""
	if not doc.meta.get_field("custom_job_requisition"):
		return

	if not doc.get("custom_job_requisition"):
		doc.custom_job_requisition = _requisition_for_applicant(doc.get("job_applicant"))

	for target, value in _agreed_pay(doc).items():
		if doc.meta.get_field(target) and not flt(doc.get(target)):
			doc.set(target, value)


# The two things an offer cannot go out without. Employment Type decides which
# salary structure and statutory treatment the hire falls under; Expected DOJ is the
# date onboarding, the joining kit and the reporting manager all plan around. Neither
# is guessable after the fact, and an offer that reaches the candidate without them
# has to be withdrawn and re-issued.
OFFER_REQUIRED_BEFORE_SEND = (
	("custom_employment_type", "Employee Type"),
	("custom_expected_doj", "Expected DOJ"),
)

# A Trainee is sent two letters — the Management Trainee one and the permanent one
# — and they start on different days, so the traineeship's own date is required
# too. Guessing it from Expected DOJ is what this field exists to stop.
TRAINEE_EMPLOYMENT_TYPE = "Trainee"
TRAINEE_REQUIRED_BEFORE_SEND = (
	("custom_trainee_doj", "Management Trainee Joining Date"),
)

# Where an employment type can be found, best source first. The offer's own
# fetch_from only reads the Job Applicant, so an applicant who never had one (every
# campus candidate — nothing in the application form asks) left the field blank with
# no indication of why.
_EMPLOYMENT_TYPE_SOURCES = (
	("Job Applicant", "job_applicant", "custom_employment_type"),
	("Job Opening", "job_title", "employment_type"),
)


def set_employment_type(doc, method=None):
	"""``before_submit``: fill Employee Type from the candidate, then the opening.

	Runs at SEND, not on every save. A draft is left exactly as HR typed it — nothing
	is written into an offer that is still being negotiated — and the value is derived
	at the one moment it has to be right. Ordered ahead of
	``validate_offer_is_complete`` in hooks.py, so the check never rejects an offer for
	a value that could have been derived a line earlier.

	Only fills when empty, so a type HR has chosen by hand is never overwritten.
	"""
	field = "custom_employment_type"
	if not doc.meta.get_field(field) or doc.get(field):
		return

	applicant = doc.get("job_applicant")
	if not applicant:
		return
	opening = frappe.db.get_value("Job Applicant", applicant, "job_title")

	for doctype, source, column in _EMPLOYMENT_TYPE_SOURCES:
		key = applicant if doctype == "Job Applicant" else opening
		if not key or not frappe.get_meta(doctype).has_field(column):
			continue
		value = frappe.db.get_value(doctype, key, column)
		if value:
			doc.set(field, value)
			return


def validate_offer_is_complete(doc, method=None):
	"""``before_submit``: refuse an offer that is missing what onboarding needs.

	Checked on submit rather than made a mandatory field, deliberately: an offer is
	drafted, negotiated and costed over several saves, and a joining date is often the
	last thing agreed. Blocking every save would stop HR recording the rest of it —
	blocking the SEND is what actually matters.
	"""
	required = list(OFFER_REQUIRED_BEFORE_SEND)
	if _is_trainee_offer(doc):
		required.extend(TRAINEE_REQUIRED_BEFORE_SEND)

	missing = [
		label for field, label in required
		if doc.meta.get_field(field) and not doc.get(field)
	]
	if not missing:
		return

	frappe.throw(
		_("Fill in {0} before sending this offer.<br><br>"
		  "The offer decides how this person is hired: <b>Employee Type</b> drives their "
		  "salary structure and statutory treatment, and <b>Expected DOJ</b> is the date "
		  "onboarding is planned around. A Trainee is also sent the Management Trainee "
		  "letter, which starts on its own <b>Management Trainee Joining Date</b>. An "
		  "offer sent without them has to be withdrawn and re-issued.").format(
			", ".join(frappe.bold(m) for m in missing)),
		title=_("Offer is incomplete"),
	)


def _is_trainee_offer(doc):
	"""Whether this offer is for a Trainee, by the Employment Type's readable name.

	Compared on the name rather than the link value because Employment Type is
	autonamed (``EMPTYPE_.#``), so the id differs from site to site.
	"""
	employment_type = doc.get("custom_employment_type")
	if not employment_type:
		return False

	name = frappe.db.get_value("Employment Type", employment_type, "employee_type_name")
	return (name or "").strip().casefold() == TRAINEE_EMPLOYMENT_TYPE.casefold()


@frappe.whitelist()
def get_requisition_defaults(job_applicant):
	"""What the Job Offer form should prefill once a candidate is chosen.

	Lets the form show the agreed pay the moment the applicant is picked, rather
	than only after the first save.
	"""
	frappe.has_permission("Job Offer", "create", throw=True)
	requisition = _requisition_for_applicant(job_applicant)
	pay = _requisition_pay(requisition)
	pay.update(_campus_drive_pay(job_applicant))  # the drive's package wins
	return {"job_requisition": requisition, "pay": pay}


def _requisition_scope(job_applicant=None, company=None, designation=None):
	"""Filters that scope the Job Requisition picker on a Job Offer.

	The field is editable (auto-resolution silently yields nothing whenever the
	candidate's opening carries no requisition), but an unfiltered picker would
	offer every requisition on the site — including other companies' and other
	roles' — which is how an offer ends up consuming the wrong headcount.

	Narrowed by the candidate's own opening, in decreasing order of certainty:

	  1. The opening names a requisition -> only that one. The offer belongs to
	     that requisition; there is nothing to choose.
	  2. The opening resolves but names no requisition -> the opening's company
	     and designation. This is the case the editable field exists for.
	  3. No opening (no candidate yet, or a candidate applying outside an
	     opening) -> the offer's own company and designation.

	Deliberately no ``status`` filter: a requisition is commonly already
	"Filled" or "On Hold" by the time the offer is raised, so filtering on it
	would swap a too-long list for an empty one. Returns ``{}`` when nothing is
	known — an unfiltered picker beats one that can never match.
	"""
	opening = frappe.db.get_value("Job Applicant", job_applicant, "job_title") if job_applicant else None
	if opening:
		row = (
			frappe.db.get_value(
				"Job Opening", opening, ["job_requisition", "company", "designation"], as_dict=True
			)
			or {}
		)
		if row.get("job_requisition"):
			return {"name": row["job_requisition"]}
		company = row.get("company") or company
		designation = row.get("designation") or designation

	scope = {}
	if company:
		scope["company"] = company
	if designation:
		scope["designation"] = designation

	# Designation is the narrowest part and the one most likely to match nothing:
	# requisitions are commonly raised against a broader role than the opening's
	# own designation. Widening to company-only beats handing the recruiter an
	# empty picker on the very case this field exists for. Checked up front, not
	# after searching, so the scope does not shift as they type.
	if scope.get("designation") and not frappe.db.exists("Job Requisition", scope):
		scope.pop("designation")

	return scope


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def job_requisition_query(doctype, txt, searchfield, start, page_len, filters):
	"""Link query behind the Job Requisition picker — see :func:`_requisition_scope`.

	A link *query* rather than a set_query ``filters`` dict on purpose: the scope
	depends on the candidate's opening, which only the server can resolve, and
	resolving it here means it costs nothing until the picker is actually opened.
	Computing it up front instead would put an extra round trip on every Job
	Offer form load, for a field most saves never touch.
	"""
	filters = filters or {}
	scope = _requisition_scope(
		filters.get("job_applicant"), filters.get("company"), filters.get("designation")
	)

	return frappe.get_list(
		doctype,
		filters=scope,
		or_filters=[[searchfield, "like", f"%{txt}%"], ["designation", "like", f"%{txt}%"]] if txt else None,
		fields=["name", "designation", "status"],
		start=start,
		page_length=page_len,
		order_by="modified desc",
		as_list=True,
	)
