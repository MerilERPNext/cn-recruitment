// Raise Requisition Scope — cascading Company → Department → Designation pickers.
//
// The three field-based scope bases are not independent: a Department belongs to
// a Company (`Department.company`) and a Designation to a Department
// (`Designation.custom_department`, with `custom_company` as the wider fallback).
// Left unfiltered the pickers are unusable at this org's scale — ~1.1k
// departments and ~11.6k designations — and they happily accept combinations
// that can never match a real requisition, e.g. a Department from Company A
// paired with a Company B scope, which silently blocks every requisition instead
// of erroring.
//
// So the pickers cascade: Departments are limited to the chosen Companies, and
// Designations to the chosen Departments (falling back to the chosen Companies
// when no Department is selected). When a parent selection changes, the
// now-invalid children below it are dropped with a notice, rather than being
// left behind to silently narrow the scope to nothing.
//
// A basis only feeds the cascade when its own "Scope by" box is ticked — an
// un-ticked basis imposes no restriction, so a stale hidden value must not
// constrain a selector the user can actually see. The server re-checks all of
// this in `RaiseRequisitionScope.validate`; this is the ergonomic half.

// Table MultiSelect fieldname -> label used in the "cleared selections" notice.
const CASCADE = {
    scope_departments: { label: __("Department") },
    scope_designations: { label: __("Designation") },
};

/** Values of a Table MultiSelect, but only when its "Scope by" box is ticked. */
function active_values(frm, check_field, table_field, child_field) {
    if (!frm.doc[check_field]) {
        return [];
    }
    return (frm.doc[table_field] || []).map((row) => row[child_field]).filter(Boolean);
}

function selected_companies(frm) {
    return active_values(frm, "scope_by_company", "scope_companies", "company");
}

function selected_departments(frm) {
    return active_values(frm, "scope_by_department", "scope_departments", "department");
}

// NOTE: these are Table MultiSelect fields, so the query goes on the PARENT
// fieldname via the single-argument `set_query`. The two-argument child-table
// form does `fields_dict[parentfield].grid.get_field(...)`, and a Table
// MultiSelect has no `.grid` — it is a ControlLink subclass, not a grid — which
// throws "Cannot read properties of undefined (reading 'get_field')" during form
// setup and kills the rest of the form's rendering.
function apply_queries(frm) {
    // Departments are limited to the selected Companies.
    frm.set_query("scope_departments", () => {
        const companies = selected_companies(frm);
        return companies.length ? { filters: { company: ["in", companies] } } : {};
    });

    // Designations follow the narrowest selection available: Department first,
    // then Company. `custom_department` is set on ~99% of designations; the
    // handful without one are genuinely unattributable and are correctly absent
    // from a department-filtered list.
    frm.set_query("scope_designations", () => {
        const departments = selected_departments(frm);
        if (departments.length) {
            return { filters: { custom_department: ["in", departments] } };
        }
        const companies = selected_companies(frm);
        return companies.length ? { filters: { custom_company: ["in", companies] } } : {};
    });
}

/**
 * Replace a Table MultiSelect's rows. Assigning the filtered array and
 * refreshing is the reliable path for child tables — `frm.set_value` on a table
 * field does not consistently re-render the pills.
 */
function set_rows(frm, fieldname, rows) {
    frm.doc[fieldname] = rows;
    frm.refresh_field(fieldname);
    frm.dirty();
}

/**
 * Drop selections that the current parent selection no longer permits.
 * Returns the list of human-readable messages describing what was removed.
 */
async function prune_invalid(frm) {
    if (frm.__pruning) {
        // Rewriting the rows below re-fires the field's own change handler;
        // without this guard the second pass races the first and can resurrect
        // rows it is midway through removing.
        return;
    }
    frm.__pruning = true;
    try {
        await run_prune(frm);
    } finally {
        frm.__pruning = false;
    }
}

async function run_prune(frm) {
    const removed = [];
    const companies = selected_companies(frm);

    if (companies.length && (frm.doc.scope_departments || []).length) {
        const valid = new Set(
            await frappe.db.get_list("Department", {
                filters: { name: ["in", (frm.doc.scope_departments || []).map((r) => r.department)], company: ["in", companies] },
                fields: ["name"],
                limit: 0,
            }).then((rows) => rows.map((r) => r.name))
        );
        const keep = (frm.doc.scope_departments || []).filter((r) => valid.has(r.department));
        if (keep.length !== (frm.doc.scope_departments || []).length) {
            removed.push(CASCADE.scope_departments.label);
            set_rows(frm, "scope_departments", keep);
        }
    }

    // Re-read after a possible department prune, so designations are checked
    // against what actually survived.
    const live_departments = selected_departments(frm);
    if ((live_departments.length || companies.length) && (frm.doc.scope_designations || []).length) {
        const names = (frm.doc.scope_designations || []).map((r) => r.designation);
        const filters = { name: ["in", names] };
        if (live_departments.length) {
            filters.custom_department = ["in", live_departments];
        } else {
            filters.custom_company = ["in", companies];
        }
        const valid = new Set(
            await frappe.db.get_list("Designation", { filters, fields: ["name"], limit: 0 })
                .then((rows) => rows.map((r) => r.name))
        );
        const keep = (frm.doc.scope_designations || []).filter((r) => valid.has(r.designation));
        if (keep.length !== (frm.doc.scope_designations || []).length) {
            removed.push(CASCADE.scope_designations.label);
            set_rows(frm, "scope_designations", keep);
        }
    }

    if (removed.length) {
        frappe.show_alert({
            message: __("Cleared {0} selections that are outside the chosen scope.", [removed.join(" & ")]),
            indicator: "orange",
        });
    }
}

// A Table MultiSelect writes through to the PARENT fieldname, so adding or
// removing a pill fires that field's own handler. The grid-style
// `<fieldname>_remove` and child-doctype (`Raise Requisition Scope Company`)
// events never fire for this control type — they belong to real grids.
frappe.ui.form.on("Raise Requisition Scope", {
    setup: apply_queries,
    refresh: apply_queries,

    scope_companies: prune_invalid,
    scope_departments: prune_invalid,

    // Un-ticking a basis takes it out of the cascade, so what is allowed below
    // it changes too.
    scope_by_company: prune_invalid,
    scope_by_department: prune_invalid,
});
