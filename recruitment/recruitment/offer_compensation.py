"""Offer Compensation engine — dynamic, grade-driven salary breakup + offer clauses.

Given a Job Offer's **Level** (Employee Grade) and **Total Fixed Pay**, this
module computes the full fixed-pay component breakup (Basic, HRA, LTA,
Conveyance, Multi-Benefit, Other Allowance, Employer PF) into the offer's
existing ``custom_earnings`` child table, and derives CTC.

All rules are configurable:
  * Company-wide numeric rules  -> single "Offer Compensation Structure Settings"
  * Grade-specific values       -> custom fields on each "Employee Grade"
  * Conveyance slabs            -> child table on the settings single
  * Location Allowance          -> "Location Allowance" master (editable per offer)

Money-safety notes:
  * The breakup ALWAYS sums exactly to Total Fixed Pay — "Other Allowance" is the
    balancing figure and absorbs any rounding, so no rupee is created or lost.
  * CTC = Total Fixed Pay + Incentive + Location Allowance (Location Allowance is
    an add-on outside Total Fixed Pay), mirroring the approved worked examples.
  * A negative balancing figure (components exceed Total Fixed Pay) is blocked
    with a clear error rather than silently producing wrong numbers.

Everything here is idempotent and safe to run on every migrate.
"""

import frappe
from frappe import _
from frappe.utils import flt


SETTINGS_DOCTYPE = "Offer Compensation Structure Settings"

# Standard offer-breakup salary components, in print order, with a stable abbr.
# (name, abbreviation) — all created as "Earning" type Salary Components.
BREAKUP_COMPONENTS = [
    ("Basic", "B"),
    ("HRA", "HRA"),
    ("LTA", "LTA"),
    ("Conveyance", "CONV"),
    ("Multi Benefit Card/Allowance", "MBC"),
    ("Other Allowance", "OA"),
    ("Employer PF", "EPF"),
]

COMMITMENT_NOTE = (
    "[This offer commitment is contingent upon you continuing your employment "
    "with the Company, not serving a notice of resignation or termination, "
    "having no pending disciplinary proceedings against you, and fulfilling the "
    "necessary performance criteria discussed.]"
)

# The grade-based auto breakup runs ONLY when the offer's Compensation Method is
# "Auto by Grade". Any other value (incl. the default "Salary Structure" and the
# blank value on pre-existing offers) leaves every legacy flow untouched.
METHOD_AUTO = "Auto by Grade"
METHOD_DEFAULT = "Salary Structure"
AUTO_BY_GRADE = "eval:doc.custom_compensation_method=='Auto by Grade'"
NOT_AUTO = "eval:doc.custom_compensation_method!='Auto by Grade'"


# ---------------------------------------------------------------------------
# Custom fields (idempotent — mirrors recruitment.install.ensure_* pattern)
# ---------------------------------------------------------------------------
def ensure_offer_compensation_fields():
    """Create the Employee Grade + Job Offer custom fields this feature needs.

    Idempotent: create_custom_field is a no-op when the field already exists."""
    from frappe.custom.doctype.custom_field.custom_field import create_custom_field

    grade_fields = [
        {
            "fieldname": "custom_offer_comp_section",
            "label": "Offer Compensation Rules",
            "fieldtype": "Section Break",
            "insert_after": "default_base_pay",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_hra_percent",
            "label": "HRA % of Basic (Offer)",
            "fieldtype": "Float",
            "non_negative": 1,
            "insert_after": "custom_offer_comp_section",
            "description": "Used when Total Fixed Pay is at/above the HRA band-2 limit.",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_lta_amount",
            "label": "LTA Amount (Offer)",
            "fieldtype": "Currency",
            "non_negative": 1,
            "insert_after": "custom_hra_percent",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_multi_benefit_eligible",
            "label": "Multi-Benefit Eligible (Offer)",
            "fieldtype": "Check",
            "insert_after": "custom_lta_amount",
            "description": "Grants the flat Multi Benefit Card / Allowance (typically L2 & above).",
            "module": "Recruitment",
        },
    ]

    job_offer_fields = [
        # ---- Method selector (always visible; decides which flow runs) -----
        {
            "fieldname": "custom_comp_method_section",
            "label": "Compensation",
            "fieldtype": "Section Break",
            "insert_after": "custom_offer_ctc",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_compensation_method",
            "label": "Compensation Method",
            "fieldtype": "Select",
            "options": "Salary Structure\nAuto by Grade",
            "default": "Salary Structure",
            "insert_after": "custom_comp_method_section",
            "description": "Salary Structure = existing / manual flow (default, unchanged). Auto by Grade = auto-compute the full salary breakup from Level + Total Fixed Pay.",
            "module": "Recruitment",
        },
        # ---- Grade-based inputs (shown only for 'Auto by Grade') -----------
        {
            "fieldname": "custom_comp_input_section",
            "label": "Compensation Breakup (Auto by Grade)",
            "fieldtype": "Section Break",
            "insert_after": "custom_compensation_method",
            "depends_on": AUTO_BY_GRADE,
            "description": "Set Level + Total Fixed Pay, then use 'Compute Compensation Breakup'. The Earnings table below is filled automatically.",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_compensation_level",
            "label": "Level",
            "fieldtype": "Link",
            "options": "Employee Grade",
            "insert_after": "custom_comp_input_section",
            "mandatory_depends_on": AUTO_BY_GRADE,
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_total_fixed_pay",
            "label": "Total Fixed Pay",
            "fieldtype": "Currency",
            "non_negative": 1,
            "insert_after": "custom_compensation_level",
            "mandatory_depends_on": AUTO_BY_GRADE,
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_comp_col_1",
            "fieldtype": "Column Break",
            "insert_after": "custom_total_fixed_pay",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_location",
            "label": "Location",
            "fieldtype": "Link",
            "options": "Location Allowance",
            "insert_after": "custom_comp_col_1",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_location_allowance",
            "label": "Location Allowance",
            "fieldtype": "Currency",
            "non_negative": 1,
            "fetch_from": "custom_location.amount",
            "fetch_if_empty": 1,
            "insert_after": "custom_location",
            "description": "Defaults from the Location master; editable per offer. Added on top of Total Fixed Pay for CTC.",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_comp_col_2",
            "fieldtype": "Column Break",
            "insert_after": "custom_location_allowance",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_ctc",
            "label": "CTC (Total)",
            "fieldtype": "Currency",
            "read_only": 1,
            "bold": 1,
            "insert_after": "custom_comp_col_2",
            "description": "Total Fixed Pay + Incentive + Location Allowance.",
            "module": "Recruitment",
        },
        # ---- Clauses & commitments (end of the Offer CTC tab) --------------
        {
            "fieldname": "custom_clauses_section",
            "label": "Offer Clauses & Commitments",
            "fieldtype": "Section Break",
            "insert_after": "custom_expected_salary",
            "collapsible": 1,
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_offer_clauses",
            "label": "Offer Clauses",
            "fieldtype": "Table",
            "options": "Job Offer Clause",
            "insert_after": "custom_clauses_section",
            "module": "Recruitment",
        },
        {
            "fieldname": "custom_commitment_note",
            "label": "Commitment Note",
            "fieldtype": "Small Text",
            "read_only": 1,
            "insert_after": "custom_offer_clauses",
            "description": "Auto-added contingency note, printed whenever any commitment clause is present.",
            "module": "Recruitment",
        },
    ]

    try:
        for df in grade_fields:
            if not frappe.get_meta("Employee Grade").get_field(df["fieldname"]):
                create_custom_field("Employee Grade", df, ignore_validate=True)
        for df in job_offer_fields:
            if not frappe.get_meta("Job Offer").get_field(df["fieldname"]):
                create_custom_field("Job Offer", df, ignore_validate=True)
        _sync_field_props()
        frappe.clear_cache(doctype="Employee Grade")
        frappe.clear_cache(doctype="Job Offer")
    except Exception:
        frappe.logger("recruitment").warning("ensure_offer_compensation_fields: skipped")


def _sync_field_props():
    """Idempotently apply properties that must exist even on fields created by an
    earlier version of this module (create_custom_field only ever creates, never
    updates). Keeps the Compensation-Method gating consistent on every migrate."""
    updates = {
        "Job Offer-custom_comp_input_section": {
            "depends_on": AUTO_BY_GRADE,
            "label": "Compensation Breakup (Auto by Grade)",
        },
        "Job Offer-custom_compensation_level": {"mandatory_depends_on": AUTO_BY_GRADE},
        "Job Offer-custom_total_fixed_pay": {"mandatory_depends_on": AUTO_BY_GRADE},
    }
    for name, props in updates.items():
        if frappe.db.exists("Custom Field", name):
            frappe.db.set_value("Custom Field", name, props, update_modified=False)


# ---------------------------------------------------------------------------
# Settings + Salary Component helpers
# ---------------------------------------------------------------------------
def get_settings():
    """Return the settings single (created with sane defaults if missing)."""
    doc = frappe.get_single(SETTINGS_DOCTYPE)
    return doc


def _ensure_salary_component(name, abbr):
    """Idempotently ensure an Earning-type Salary Component exists; return name."""
    if frappe.db.exists("Salary Component", name):
        return name
    try:
        frappe.get_doc(
            {
                "doctype": "Salary Component",
                "salary_component": name,
                "salary_component_abbr": abbr,
                "type": "Earning",
            }
        ).insert(ignore_permissions=True, ignore_if_duplicate=True)
    except Exception:
        # A racing insert or a pre-existing component under a different abbr is fine.
        frappe.logger("recruitment").warning(f"ensure salary component skipped: {name}")
    return name


def ensure_breakup_components():
    for name, abbr in BREAKUP_COMPONENTS:
        _ensure_salary_component(name, abbr)


def _conveyance_for(tfp, settings):
    """First slab whose [from, to] range contains ``tfp``; 0 if none matches."""
    for row in sorted(settings.get("conveyance_slabs") or [], key=lambda r: flt(r.from_amount)):
        if flt(row.from_amount) <= flt(tfp) <= flt(row.to_amount):
            return flt(row.amount)
    return 0.0


# ---------------------------------------------------------------------------
# The engine
# ---------------------------------------------------------------------------
def compute_breakup(level, total_fixed_pay, incentive=0.0, location_allowance=0.0):
    """Pure calculator. Returns a dict with each component + totals.

    Raises frappe.ValidationError if the fixed-pay components exceed Total Fixed
    Pay (i.e. the balancing 'Other Allowance' would be negative)."""
    tfp = flt(total_fixed_pay)
    settings = get_settings()

    grade = frappe.get_doc("Employee Grade", level) if level else None
    grade_hra_pct = flt(grade.get("custom_hra_percent")) if grade else 0.0
    grade_lta = flt(grade.get("custom_lta_amount")) if grade else 0.0
    multi_eligible = bool(grade and grade.get("custom_multi_benefit_eligible"))

    # a) Basic = higher of floor or (basic % of TFP)
    basic = max(flt(settings.basic_minimum), tfp * flt(settings.basic_percent) / 100.0)
    basic = flt(basic, 0)

    # b) HRA — low-TFP bands override the grade %
    if tfp < flt(settings.hra_band1_limit):
        hra = basic * flt(settings.hra_band1_percent) / 100.0
    elif tfp < flt(settings.hra_band2_limit):
        hra = basic * flt(settings.hra_band2_percent) / 100.0
    else:
        hra = basic * grade_hra_pct / 100.0
    hra = flt(hra, 0)

    # c) LTA — grade-driven flat amount
    lta = flt(grade_lta, 0)

    # d) Conveyance — slab by TFP
    conveyance = flt(_conveyance_for(tfp, settings), 0)

    # e) Multi Benefit — flat, only for eligible grades
    multi_benefit = flt(settings.multi_benefit_amount, 0) if multi_eligible else 0.0

    # i) Employer PF — % of Basic
    employer_pf = flt(basic * flt(settings.employer_pf_percent) / 100.0, 0)

    # g) Other Allowance = balancing figure so components sum EXACTLY to TFP
    allocated = basic + hra + lta + conveyance + multi_benefit + employer_pf
    other_allowance = flt(tfp - allocated, 0)

    if other_allowance < 0:
        frappe.throw(
            _(
                "The fixed components (Basic {0} + HRA {1} + LTA {2} + Conveyance {3} "
                "+ Multi-Benefit {4} + Employer PF {5} = {6}) exceed the Total Fixed "
                "Pay of {7}. Increase Total Fixed Pay or review the grade rules."
            ).format(
                basic, hra, lta, conveyance, multi_benefit, employer_pf, allocated, tfp
            )
        )

    components = {
        "Basic": basic,
        "HRA": hra,
        "LTA": lta,
        "Conveyance": conveyance,
        "Multi Benefit Card/Allowance": multi_benefit,
        "Other Allowance": other_allowance,
        "Employer PF": employer_pf,
    }
    ctc = tfp + flt(incentive) + flt(location_allowance)

    return {
        "components": components,
        "total_fixed_pay": tfp,
        "incentive": flt(incentive),
        "location_allowance": flt(location_allowance),
        "ctc": flt(ctc, 0),
    }


def compute_offer_compensation(self):
    """before_save entry point. Fills custom_earnings + custom_ctc from Level +
    Total Fixed Pay. Returns True when the grade-based model ran (so the caller
    skips the legacy percentage / salary-structure paths), else False."""
    level = self.get("custom_compensation_level")
    tfp = flt(self.get("custom_total_fixed_pay"))
    if not (level and tfp > 0):
        return False

    result = compute_breakup(
        level,
        tfp,
        incentive=flt(self.get("custom_variable_incentive")),
        location_allowance=flt(self.get("custom_location_allowance")),
    )

    ensure_breakup_components()

    # Rebuild the Earnings table from the computed breakup (fixed-pay side only;
    # Incentive and Location Allowance live in their own fields, not here).
    self.set("custom_earnings", [])
    abbr_by_name = dict(BREAKUP_COMPONENTS)
    for name, _abbr in BREAKUP_COMPONENTS:
        amount = result["components"].get(name, 0.0)
        self.append(
            "custom_earnings",
            {"component": name, "amount": amount, "percentage": 0},
        )

    self.custom_ctc = result["ctc"]
    return True


def apply_commitment_note(self):
    """Set / clear the contingency note based on whether any clause row exists."""
    has_clause = bool(self.get("custom_offer_clauses"))
    self.custom_commitment_note = COMMITMENT_NOTE if has_clause else None


# ---------------------------------------------------------------------------
# Whitelisted preview (client "Compute Compensation Breakup" button)
# ---------------------------------------------------------------------------
@frappe.whitelist()
def preview_offer_compensation(level, total_fixed_pay, incentive=0, location_allowance=0):
    """Compute the breakup for unsaved form values so the client can render it
    live without persisting. Single source of truth = compute_breakup."""
    result = compute_breakup(
        level,
        flt(total_fixed_pay),
        incentive=flt(incentive),
        location_allowance=flt(location_allowance),
    )
    # Ordered rows for the grid (respect BREAKUP_COMPONENTS order).
    result["rows"] = [
        {"component": name, "amount": result["components"][name]}
        for name, _abbr in BREAKUP_COMPONENTS
    ]
    return result


# ---------------------------------------------------------------------------
# Seed / setup defaults (idempotent; called from after_migrate)
# ---------------------------------------------------------------------------
_CONVEYANCE_SLABS = [
    (0, 310000, 0),
    (310001, 500000, 24000),
    (500001, 650000, 30000),
    (650001, 800000, 60000),
    (800001, 950000, 96000),
    (950001, 1500000, 120000),
    (1500001, 999999999, 150000),
]

# grade name -> (hra %, lta amount, multi-benefit eligible)
_GRADE_RULES = {
    "L0": (50, 0, 0),
    "L1": (50, 0, 0),
    "L2": (60, 60000, 1),
    "L3": (60, 100000, 1),
    "L4": (70, 120000, 1),
    "L5": (70, 120000, 1),
    "L6": (70, 120000, 1),
    "Management": (70, 120000, 1),
}

# Clause-type master records (name, description). Seeded before the templates so
# the templates' clause_type Link resolves.
_CLAUSE_TYPES = [
    ("ESOP", "Employee Stock Options entitlement."),
    ("Joining Bonus", "One-time joining bonus."),
    ("Other Commitment", "Appraisal / compensation-revision and other commitments."),
]

_CLAUSE_TEMPLATES = [
    ("ESOP", "Option 1 - Specific options",
     "You will be entitled to [XXXX] options under our Stock Options Plan [ESOP 2021] "
     "in the next allotment cycle, post your joining. This entitlement will be subject "
     "to the terms and conditions of [ESOP 2021], including eligibility criteria, "
     "vesting schedules, and other provisions as outlined in the plan document."),
    ("ESOP", "Option 2 - General entitlement",
     "You will be entitled to Employee Stock Options under our Stock Options Plan "
     "[ESOP 2021] in the next allotment cycle, post your joining. This entitlement will "
     "be subject to the terms and conditions of [ESOP 2021], including eligibility "
     "criteria, vesting schedules, and other provisions as outlined in the plan document."),
    ("Joining Bonus", "Option 1 - 50/50, 6 months",
     "You will be entitled to a one-time joining bonus of [XXXXX/-], which will be "
     "disbursed in two tranches: 50% will be paid with your first month's salary, and "
     "the remaining 50% will be paid upon completion of six months of continuous "
     "employment, i.e., with the salary of the following month. Joining Bonus (Pre-Tax) "
     "would be recovered in full in case you leave the organization within twelve months "
     "from the date of joining."),
    ("Joining Bonus", "Option 2 - 50/50, 12 months",
     "You will be entitled to a one-time joining bonus of [XXXXX/-], which will be "
     "disbursed in two tranches: 50% will be paid with your first month's salary, and "
     "the remaining 50% will be paid upon completion of twelve months of continuous "
     "employment, i.e., with the salary of the following month. Joining Bonus (Pre-Tax) "
     "would be recovered in full in case you leave the organization within twelve months "
     "from the date of joining."),
    ("Joining Bonus", "Option 3 - Single payout",
     "You will be entitled to a one-time joining bonus of [XXXXX/-], which will be "
     "included with your first month's salary. The joining bonus (Pre-Tax) would be "
     "recovered in full in case you leave the organization within twelve months from the "
     "date of joining."),
    ("Other Commitment", "Option 1 - Full Appraisal",
     "(Full Appraisal): Total Fixed Pay & Variable pay to be revised to [_______] & "
     "[_______] starting on [Month, Year]."),
    ("Other Commitment", "Option 2 - One Component Change",
     "(One Component Change): Total Fixed Pay OR Variable pay to be revised to [_______] "
     "starting on [Month, Year]."),
    ("Other Commitment", "Option 3 - Review Only",
     "Review Only: You will be considered for an appraisal in [Month, Year]. The final "
     "numbers will be decided at that time."),
]


def seed_settings_defaults():
    """Ensure the settings single exists and has conveyance slabs. Numeric field
    defaults come from the DocType; we only persist + seed slabs once."""
    doc = frappe.get_single(SETTINGS_DOCTYPE)
    changed = False
    if not doc.get("conveyance_slabs"):
        for frm, to, amt in _CONVEYANCE_SLABS:
            doc.append("conveyance_slabs", {"from_amount": frm, "to_amount": to, "amount": amt})
        changed = True
    # Persist defaults on first run so the single is materialised.
    if changed or not frappe.db.exists("Singles", {"doctype": SETTINGS_DOCTYPE, "field": "basic_minimum"}):
        doc.save(ignore_permissions=True)


def seed_grade_values():
    """Create the standard grades if missing and seed their offer-comp rules.

    Only seeds a grade whose HRA % is still unset, so manual HR edits are never
    overwritten on a later migrate."""
    for name, (hra, lta, multi) in _GRADE_RULES.items():
        if not frappe.db.exists("Employee Grade", name):
            try:
                frappe.get_doc({"doctype": "Employee Grade", "__newname": name}).insert(
                    ignore_permissions=True, ignore_if_duplicate=True
                )
            except Exception:
                frappe.logger("recruitment").warning(f"seed grade skipped: {name}")
                continue
        if not frappe.db.get_value("Employee Grade", name, "custom_hra_percent"):
            frappe.db.set_value(
                "Employee Grade",
                name,
                {
                    "custom_hra_percent": hra,
                    "custom_lta_amount": lta,
                    "custom_multi_benefit_eligible": multi,
                },
                update_modified=False,
            )


def seed_clause_types():
    """Create the Clause Type master records (idempotent)."""
    for name, desc in _CLAUSE_TYPES:
        if not frappe.db.exists("Job Offer Clause Type", name):
            try:
                frappe.get_doc(
                    {
                        "doctype": "Job Offer Clause Type",
                        "type_name": name,
                        "is_active": 1,
                        "description": desc,
                    }
                ).insert(ignore_permissions=True)
            except Exception:
                frappe.logger("recruitment").warning(f"seed clause type skipped: {name}")


def seed_clause_templates():
    for clause_type, title, text in _CLAUSE_TEMPLATES:
        if frappe.db.exists("Job Offer Clause Template", {"clause_type": clause_type, "title": title}):
            continue
        try:
            frappe.get_doc(
                {
                    "doctype": "Job Offer Clause Template",
                    "clause_type": clause_type,
                    "title": title,
                    "clause_text": text,
                    "is_active": 1,
                }
            ).insert(ignore_permissions=True)
        except Exception:
            frappe.logger("recruitment").warning(f"seed clause skipped: {clause_type}/{title}")


def seed_location_allowance():
    if not frappe.db.exists("Location Allowance", "Mumbai"):
        try:
            frappe.get_doc(
                {
                    "doctype": "Location Allowance",
                    "location_name": "Mumbai",
                    "amount": 150000,
                    "is_active": 1,
                    "description": "MT-Sales",
                }
            ).insert(ignore_permissions=True)
        except Exception:
            frappe.logger("recruitment").warning("seed location allowance skipped")


def setup_offer_compensation():
    """One entry point for after_migrate: fields, components, settings, seeds.

    Fully idempotent and defensive — a failure in any step is logged but never
    breaks the migrate."""
    ensure_offer_compensation_fields()
    try:
        ensure_breakup_components()
        seed_settings_defaults()
        seed_grade_values()
        seed_clause_types()
        seed_clause_templates()
        seed_location_allowance()
    except Exception:
        frappe.logger("recruitment").warning("setup_offer_compensation: seed step skipped")
