// Raise Requisition Scope — restrict the two assignment pickers to the kind of
// assignment each one actually needs.
//
// The two tables want opposite things, and offering the wrong kind fails
// silently rather than loudly:
//
//   * "Employees Allowed to Raise Requisitions" needs *People* assignments — an
//     Attributes assignment resolves to nobody, so it would look like a grant
//     while granting nothing.
//   * "Scope of Raising Requisitions" needs *Attributes* assignments applicable
//     to Job Requisition — a People assignment carries no values, so it would
//     look like a scope while restricting nothing.
//
// Both queries live on the server (see raise_requisition_scope.py), because
// `applicable_for_process` is a child table and can't be a plain link filter.
//
// The Company / Department / Designation cascade that used to live here is gone
// with the fields it drove. Those restrictions are now attributes on the
// assignments this form points at, configured on the User Assignment itself.

const SCOPE_QUERY =
    "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.scope_assignment_query";
const POPULATION_QUERY =
    "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.population_assignment_query";

function apply_assignment_queries(frm) {
    // Both fields are Table MultiSelect, so the query goes on the *parent*
    // fieldname. The three-argument form is for a real grid: it reaches for
    // `fields_dict[parentfield].grid`, which a Table MultiSelect does not have,
    // and throws during `setup` — taking the rest of the form's rendering with
    // it. ControlTableMultiSelect extends ControlLink and reads `this.get_query`
    // off the parent control, hence the two-argument form.
    frm.set_query("scope_of_raising_requisitions", () => ({ query: SCOPE_QUERY }));
    frm.set_query("employees_allowed_to_raise_requisitions", () => ({ query: POPULATION_QUERY }));
}

frappe.ui.form.on("Raise Requisition Scope", {
    setup: apply_assignment_queries,
    // Also on refresh: `set_query` is a no-op when `fields_dict[fieldname]` is
    // missing, and it fails *silently* — the picker then falls back to offering
    // every assignment rather than erroring. Re-applying costs two property
    // assignments and removes the timing question entirely.
    refresh: apply_assignment_queries,
});
