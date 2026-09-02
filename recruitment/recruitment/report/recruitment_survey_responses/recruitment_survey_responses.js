// Copyright (c) 2026, Hybrowlabs technologies and contributors
// For license information, please see license.txt

frappe.query_reports["Recruitment Survey Responses"] = {
    filters: [
        {
            fieldname: "job_opening",
            label: __("Job Opening"),
            fieldtype: "Link",
            options: "Job Opening",
        },
        {
            fieldname: "microapp_form_widget",
            label: __("Form Widget"),
            fieldtype: "Link",
            options: "Microapp Form Widget",
        },
        {
            fieldname: "from_date",
            label: __("Submitted From"),
            fieldtype: "Date",
        },
        {
            fieldname: "to_date",
            label: __("Submitted To"),
            fieldtype: "Date",
        },
    ],
};
