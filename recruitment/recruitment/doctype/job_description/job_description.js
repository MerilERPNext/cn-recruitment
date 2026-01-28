// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Job Description", {
    onload(frm) {
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

    refresh(frm) { },
});
