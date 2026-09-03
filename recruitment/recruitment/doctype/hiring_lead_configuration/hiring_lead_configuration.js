// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

// Hiring Lead Configuration — restrict the "Applicable To" User Assignment picker
// to the kind of assignment this basis can actually use.
//
// `applicable_assignments` needs *Attributes* assignments applicable to Job
// Requisition. Offering the wrong kind fails silently rather than loudly: a
// People assignment carries no attribute values, so it would look like a scope
// while restricting nothing, and an assignment tagged for another process carries
// values for that document's fields, which say nothing about a requisition.
//
// The query lives on the server (see hiring_lead_configuration.py), because
// `applicable_for_process` is a child table and can't be a plain link filter.

const ASSIGNMENT_QUERY =
    "recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration.assignment_query";

function apply_assignment_query(frm) {
    // `applicable_assignments` is a Table MultiSelect, so the query goes on the
    // *parent* fieldname via the two-argument form. The three-argument form is
    // for a real grid: it reaches for `fields_dict[parentfield].grid`, which a
    // Table MultiSelect does not have, and throws during `setup` — taking the
    // rest of the form's rendering with it.
    frm.set_query("applicable_assignments", () => ({ query: ASSIGNMENT_QUERY }));
}

frappe.ui.form.on("Hiring Lead Configuration", {
    setup: apply_assignment_query,
    // Also on refresh: `set_query` is a no-op when `fields_dict[fieldname]` is
    // missing, and it fails *silently* — the picker then falls back to offering
    // every assignment rather than erroring.
    refresh: apply_assignment_query,
});
