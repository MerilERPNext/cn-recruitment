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
        // Nothing extra on refresh — competencies are already saved in the table
    },
});

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
