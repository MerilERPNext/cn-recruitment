"""Drop the Job Offer "Salary Breakup" section and trim "Salary Expectation".

The breakup section carried 15 hand-keyed currency fields (Basic, HRA, Medical,
HEEMA, POL, Driver, PF, Uniform, TWD, LTA, Vehicle MT, Bonus, CTC Per Annum,
CTC Per Month) that the Earnings / Deductions tables and the Auto-by-Grade
compensation breakup replaced. Salary Expectation likewise carried a Currency
link and a Minimum/Maximum CTC band that nothing reads.

What replaces them: Salary Expectation now holds exactly Current Salary (CTC)
and Expected Salary (CTC), both mirroring the Job Applicant's own free-text CTC
fields via ``fetch_from``.

Removing entries from ``custom/job_offer.json`` only stops NEW sites getting the
fields — ``sync_customizations`` creates and updates, it never deletes — so the
records have to be dropped here for sites that already have them.

Two fields are deliberately NOT deleted: ``custom_rejection_reason`` and
``custom_rejection_message`` sat inside the breakup section by accident of
layout. They are status-gated rejection fields written by
``job_offer_utils.reject_job_offer``, and the customization re-anchors them to
the candidate block instead.
"""

import frappe

DOCTYPE = "Job Offer"

# Salary Breakup: the section, its column break, and every field inside it.
_BREAKUP_FIELDS = [
    "custom_section_break_lss8n",
    "custom_column_break_6egqc",
    "custom_ctc_per_annum",
    "custom_ctc_per_month",
    "custom_basic_salary",
    "custom_medical_allowance",
    "custom_heema",
    "custom_pol_allowance",
    "custom_driver_salary",
    "custom_pf",
    "custom_hra",
    "custom_uniform_allowance",
    "custom_twd",
    "custom_lta",
    "custom_vehicle_mt",
    "custom_bonus",
]

# Salary Expectation: everything except the two salary fields that stay.
_EXPECTATION_FIELDS = [
    "custom_currency",
    "custom_column_break_chqnu",
    "custom_minimum",
    "custom_maximum",
]

_OBSOLETE = _BREAKUP_FIELDS + _EXPECTATION_FIELDS


def execute():
    removed = []
    for fieldname in _OBSOLETE:
        name = f"{DOCTYPE}-{fieldname}"
        if frappe.db.exists("Custom Field", name):
            # force: the fields are Administrator-owned on most sites, and
            # deleting a Custom Field drops its Property Setters with it.
            frappe.delete_doc("Custom Field", name, force=1, ignore_permissions=True)
            removed.append(fieldname)

    _clear_stale_current_salary()

    if removed:
        frappe.db.commit()
        frappe.clear_cache(doctype=DOCTYPE)

    frappe.logger("recruitment").info(
        "delete_job_offer_salary_breakup: removed %d field(s): %s", len(removed), removed
    )


def _clear_stale_current_salary():
    """Blank the zeroes left behind by Current Salary's Currency -> Data change.

    The column was ``decimal(21,9)`` and every row held 0. ``ALTER TABLE`` to
    ``varchar`` renders those as the literal string "0.000000000", which would
    show up in the field as text and block the ``fetch_from`` (it only fills an
    empty field). Only touches values that are numerically zero, so a real
    figure typed before this patch survives.

    Works off the DISTINCT values rather than the rows: every affected row holds
    the same handful of strings, so this stays two queries whether the site has
    ten Job Offers or a hundred thousand.
    """
    if not frappe.db.has_column(DOCTYPE, "custom_current_salary"):
        return

    distinct = frappe.db.get_all(
        DOCTYPE, distinct=True, pluck="custom_current_salary", filters={"custom_current_salary": ("!=", "")}
    )

    zeroes = []
    for value in distinct:
        text = str(value or "").strip()
        if not text:
            continue
        try:
            if float(text.replace(",", "")) == 0:
                zeroes.append(value)
        except ValueError:
            continue  # real text like "12 LPA" — leave it alone

    if zeroes:
        frappe.db.set_value(
            DOCTYPE,
            {"custom_current_salary": ("in", zeroes)},
            "custom_current_salary",
            "",
            update_modified=False,
        )
