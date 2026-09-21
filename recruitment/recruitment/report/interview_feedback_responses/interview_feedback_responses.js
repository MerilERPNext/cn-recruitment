// Copyright (c) 2026, Hybrowlabs technologies and contributors
// For license information, please see license.txt

frappe.query_reports["Interview Feedback Responses"] = {
    filters: [
        {
            fieldname: "custom_evaluation_form",
            label: __("Feedback Form"),
            fieldtype: "Link",
            options: "Microapp Form Widget",
        },
        {
            fieldname: "job_applicant",
            label: __("Job Applicant"),
            fieldtype: "Link",
            options: "Job Applicant",
        },
        {
            fieldname: "interviewer",
            label: __("Interviewer"),
            fieldtype: "Link",
            options: "User",
        },
        {
            fieldname: "result",
            label: __("Result"),
            fieldtype: "Select",
            options: ["", "Cleared", "Rejected"],
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
