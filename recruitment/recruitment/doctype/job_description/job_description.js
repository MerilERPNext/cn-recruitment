// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Job Description", {
    onload(frm) {
        // Cascading filters: Company → Department → Designation → Functional Area
        frm.set_query("department", function (doc) {
            return {
                filters: {
                    company: doc.company,
                },
            };
        });

        frm.set_query("designation", function (doc) {
            let departments = (doc.department || []).map((row) => row.department);
            return {
                filters: {
                    custom_department: ["in", departments],
                },
            };
        });

        // A Designation names the Functional Area it belongs to
        // (Designation.custom_functional_area), so the JD's functional areas are
        // derivable from the designations picked above. Server-side query rather
        // than a plain filter because it needs that hop through Designation.
        frm.set_query("functional_area", function (doc) {
            return {
                query: "recruitment.recruitment.doctype.job_description.job_description.functional_area_query",
                filters: {
                    designations: (doc.designation || [])
                        .map((row) => row.designation)
                        .filter(Boolean),
                },
            };
        });
    },

    refresh(frm) {
        render_description_preview(frm);
    },

    description(frm) {
        render_description_preview(frm);
    },

    // Table MultiSelects write through the parent field, so adding and removing a
    // pill both land here (the child-table events never fire for them).
    department(frm) {
        render_description_preview(frm);
        sync_cascade(frm, "department");
    },

    designation(frm) {
        render_description_preview(frm);
        sync_cascade(frm, "designation");
    },

    // Parent-field updates that may be referenced by the template — re-render
    // the preview so the manager sees the new value immediately.
    company:            render_description_preview,
    preferred_role:     render_description_preview,
    preferred_company:  render_description_preview,
    min_preferred_work_experience_years: render_description_preview,
    max_preferred_work_experience_years: render_description_preview,
});

// Re-render the preview whenever a child row the template may reference changes.
// Department / Designation are handled by the parent-field handlers above.
const _CHILD_DOCTYPES_TO_WATCH = [
    "Education Category Table", "Education Degree Table", "Education Specialization Table",
    "Experience Sector Table", "Job Requisition Skill", "Competencies Table",
];
_CHILD_DOCTYPES_TO_WATCH.forEach((child_dt) => {
    frappe.ui.form.on(child_dt, {
        "*"(frm) { render_description_preview(frm); },
    });
});

// ─────────────────────────────────────────────────────────────
// Live preview — debounced server-side Jinja render.
// ─────────────────────────────────────────────────────────────
//
// Single source of truth: the server's `render_description` endpoint
// renders the Jinja template against the in-progress doc state. The JS
// just debounces the call (so typing into the Code field doesn't fire
// 50 requests/second) and drops the resulting HTML into the preview
// field's wrapper.
let _preview_timer = null;
function render_description_preview(frm) {
    const wrapper = frm.fields_dict.preview && frm.fields_dict.preview.$wrapper;
    if (!wrapper) return;

    if (_preview_timer) clearTimeout(_preview_timer);
    _preview_timer = setTimeout(() => _fetch_and_paint_preview(frm, wrapper), 300);
}

function _fetch_and_paint_preview(frm, wrapper) {
    const description = frm.doc.description || "";
    if (!description.trim()) {
        _paint(wrapper, "");
        return;
    }
    frappe.call({
        method: "recruitment.recruitment.doctype.job_description.job_description.render_description",
        args: {
            description: description,
            doc: JSON.stringify(frm.doc),
        },
        callback: (r) => {
            _paint(wrapper, (r && r.message) || "");
        },
    });
}

function _paint(wrapper, html) {
    // NOTE: the inner content must sit IMMEDIATELY after the opening tag —
    // any whitespace in the template literal would be preserved by
    // `white-space: pre-wrap` and shift the first line right.
    const style = [
        "border: 1px solid var(--border-color, #d1d8dd)",
        "border-radius: 6px",
        "padding: 14px 18px",
        "background: var(--bg-color, #fff)",
        "min-height: 60px",
        "line-height: 1.55",
        "font-size: 14px",
        "color: var(--text-color, #1F272E)",
        "white-space: pre-wrap",
    ].join(";");
    const placeholder = `<span style="color: var(--text-muted, #6c7680);">${__("Preview will appear here once a description is filled in.")}</span>`;
    const inner = (html && html.trim()) || placeholder;
    wrapper.empty();
    wrapper.append(`<div class="jd-preview" style="${style}">${inner}</div>`);
}

// ─────────────────────────────────────────────────────────────
// Cascade: Department → Designation → Functional Area → Competencies
// ─────────────────────────────────────────────────────────────
// A Designation names its Department and Functional Area, so removing a
// department drops its designations, and the functional areas always follow the
// designations left. clear_table/add_child are used instead of set_value so the
// rewrite doesn't fire the change event and re-enter the cascade.

/** Link values of a Table MultiSelect field, empties dropped. */
function multiselect_values(frm, fieldname, link_fieldname) {
    return (frm.doc[fieldname] || [])
        .map((row) => row[link_fieldname])
        .filter(Boolean);
}

/** Rewrite a Table MultiSelect to hold exactly `values`, in order. */
function set_multiselect(frm, fieldname, link_fieldname, values) {
    frm.clear_table(fieldname);
    values.forEach((value) => frm.add_child(fieldname, { [link_fieldname]: value }));
    frm.refresh_field(fieldname);
    frm.dirty();

    // The control's cached selection hides values from its dropdown and only
    // refreshes on typing, so a programmatic rewrite must update it too.
    const field = frm.get_field(fieldname);
    if (field) field._rows_list = values.slice();
}

function same_values(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// `source` is the field the user just edited (only used to word the alert).
let _cascade_seq = 0;

function sync_cascade(frm, source) {
    const departments = multiselect_values(frm, "department", "department");
    const designations = multiselect_values(frm, "designation", "designation");

    // Only the latest lookup's reply is applied.
    const seq = ++_cascade_seq;

    if (!designations.length) {
        apply_cascade(frm, [], [], source);
        return;
    }

    frappe.call({
        method: "recruitment.recruitment.doctype.job_description.job_description.get_designation_mapping",
        args: { designations: JSON.stringify(designations) },
        callback: (r) => {
            if (seq !== _cascade_seq) return;

            const mapping = {};
            ((r && r.message) || []).forEach((row) => {
                mapping[row.name] = row;
            });

            // Keep a designation only while its department is still selected.
            const kept = departments.length
                ? designations.filter(
                      (d) => mapping[d] && departments.includes(mapping[d].department)
                  )
                : [];

            const areas = [];
            kept.forEach((d) => {
                const area = mapping[d] && mapping[d].functional_area;
                if (area && !areas.includes(area)) areas.push(area);
            });

            apply_cascade(frm, kept, areas, source);
        },
    });
}

/** Write the derived designation / functional area sets back onto the form. */
function apply_cascade(frm, designations, functional_areas, source) {
    const current_designations = multiselect_values(frm, "designation", "designation");
    const current_areas = multiselect_values(frm, "functional_area", "functional_area");

    const designations_changed = !same_values(current_designations, designations);
    const areas_changed = !same_values(current_areas, functional_areas);

    if (designations_changed) {
        set_multiselect(frm, "designation", "designation", designations);

        // Only flagged when a department edit removed them.
        const dropped = current_designations.length - designations.length;
        if (source === "department" && dropped > 0) {
            frappe.show_alert({
                message: __(
                    "{0} designation(s) removed — no longer under the selected department(s)",
                    [dropped]
                ),
                indicator: "orange",
            });
        }
    }

    if (areas_changed) {
        set_multiselect(frm, "functional_area", "functional_area", functional_areas);
    }

    if (designations_changed || source === "designation") {
        fetch_competencies(frm);
    }

    if (designations_changed || areas_changed) {
        render_description_preview(frm);
    }
}

/**
 * Fetch competencies for all currently selected designations.
 * Calls the backend API and populates the competencies child table.
 */
function fetch_competencies(frm) {
    let designations = (frm.doc.designation || [])
        .map((row) => row.designation)
        .filter(Boolean); // Remove empty/null values

    if (!designations.length) {
        // No designations selected — clear competencies table
        frm.clear_table("competencies");
        frm.refresh_field("competencies");
        return;
    }

    frappe.call({
        method: "recruitment.recruitment.doctype.job_description.job_description.get_competencies_for_designations",
        args: {
            designations: JSON.stringify(designations),
        },
        freeze: true,
        freeze_message: __("Fetching competencies..."),
        callback: function (r) {
            if (r.message && r.message.length) {
                populate_competencies(frm, r.message);
            } else {
                frm.clear_table("competencies");
                frm.refresh_field("competencies");
                frappe.show_alert({
                    message: __("No competencies found for the selected designation(s)"),
                    indicator: "yellow",
                });
            }
        },
    });
}

/**
 * Populate the competencies child table with fetched competency data.
 * Clears existing auto-filled rows and adds the new ones.
 */
function populate_competencies(frm, competencies) {
    // Clear existing rows
    frm.clear_table("competencies");

    // Add each competency as a new row
    competencies.forEach((comp) => {
        let row = frm.add_child("competencies");
        row.competencies_name = comp.competencies_name;
        row.competencies_mapping = comp.competencies_mapping;
        row.designations = comp.designations;
        row.weightage = comp.weightage;
        row.tier = comp.tier;
        row.add_to_jd = comp.add_to_jd || 1;
    });

    frm.refresh_field("competencies");

    frappe.show_alert({
        message: __("{0} competencies found for the selected designation(s)", [
            competencies.length,
        ]),
        indicator: "green",
    });
}

// ---------------------------------------------------------------------------
// Versioning — one Active JD per department + designation.
//
// Duplicates are refused on save (prevent_duplicate_applicability); the way to
// change an in-use JD is to create the next version, which supersedes this one.
// A superseded JD stays readable but is never matched into a new requisition.
// ---------------------------------------------------------------------------
frappe.ui.form.on("Job Description", {
    refresh(frm) {
        if (frm.is_new()) return;

        if (frm.doc.status === "Superseded") {
            frm.set_intro(
                __("Version {0} — superseded. This JD is kept for reference and is no longer matched to new requisitions.",
                   [frm.doc.version || 1]),
                "orange"
            );
        } else {
            frm.add_custom_button(__("Create New Version"), () => {
                frappe.confirm(
                    __("Create version {0}? This JD becomes Superseded and the new version takes over for its department and designation.",
                       [(frm.doc.version || 1) + 1]),
                    () => {
                        frappe.call({
                            method: "recruitment.recruitment.doctype.job_description.job_description.create_new_version",
                            args: { job_description: frm.doc.name },
                            freeze: true,
                            freeze_message: __("Creating new version…"),
                            callback: (r) => {
                                const res = (r && r.message) || {};
                                if (!res.job_description) return;
                                frappe.show_alert({
                                    message: __("Version {0} created", [res.version]),
                                    indicator: "green",
                                });
                                frappe.set_route("Form", "Job Description", res.job_description);
                            },
                        });
                    }
                );
            });
        }

        render_version_history(frm);
    },
});

function render_version_history(frm) {
    frappe.call({
        method: "recruitment.recruitment.doctype.job_description.job_description.get_version_history",
        args: { job_description: frm.doc.name },
        callback: (r) => {
            const rows = (r && r.message) || [];
            if (rows.length < 2) return;   // nothing to show for a lone v1
            const links = rows
                .map((v) => {
                    const label = __("v{0} — {1}", [v.version || 1, v.status || "Active"]);
                    return v.name === frm.doc.name
                        ? `<b>${frappe.utils.escape_html(label)} (${__("this one")})</b>`
                        : `<a href="/app/job-description/${encodeURIComponent(v.name)}">${frappe.utils.escape_html(label)}</a>`;
                })
                .join(" &nbsp;·&nbsp; ");
            frm.dashboard.add_comment(__("Versions: ") + links, "blue", true);
        },
    });
}
