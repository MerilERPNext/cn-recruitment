// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

frappe.query_reports["Hiring Stage Pipeline"] = {
	filters: [
		{
			fieldname: "job_opening",
			label: __("Job Opening"),
			fieldtype: "Link",
			options: "Job Opening",
		},
	],
};
