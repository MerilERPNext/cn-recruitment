// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Job Description", {
    onload(frm) {
        // Set cascading filters: Company → Business Unit → Department → Designation
        frm.set_query("business_unit", function (doc) {
            return {
                filters: {
                    group_company: doc.company,
                },
            };
        });

        frm.set_query("department", function (doc) {
            let business_units = (doc.business_unit || []).map((row) => row.business_unit);
            return {
                filters: {
                    custom_business_unit: ["in", business_units],
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
    },

    refresh(frm) {
        render_description_preview(frm);
    },

    description(frm) {
        render_description_preview(frm);
    },

    // Parent-field updates that may be referenced by the template — re-render
    // the preview so the manager sees the new value immediately.
    company:            render_description_preview,
    preferred_role:     render_description_preview,
    preferred_company:  render_description_preview,
    min_preferred_work_experience_years: render_description_preview,
    max_preferred_work_experience_years: render_description_preview,
});

// Re-render the preview whenever any child-table row that the template may
// reference gets added / edited / removed.
const _CHILD_DOCTYPES_TO_WATCH = [
    "JD Designations", "JD Department", "JD Business Unit",
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
// Competency Auto-Fill: Listen to Designation child table events
// ─────────────────────────────────────────────────────────────
frappe.ui.form.on("JD Designations", {
    // Triggered when a designation value is set in a row
    designation(frm, cdt, cdn) {
        fetch_competencies(frm);
    },

    // Triggered when a designation row is removed
    designation_remove(frm) {
        fetch_competencies(frm);
    },
});

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
