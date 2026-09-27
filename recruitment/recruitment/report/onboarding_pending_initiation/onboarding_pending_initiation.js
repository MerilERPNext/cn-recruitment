frappe.query_reports["Onboarding Pending Initiation"] = {
	filters: [
		{
			fieldname: "company",
			label: __("Company"),
			fieldtype: "Link",
			options: "Company",
		},
		{
			fieldname: "source",
			label: __("Source"),
			fieldtype: "Select",
			options: ["", "Job Applicant", "New Hire"],
		},
	],

	formatter(value, row, column, data, default_formatter) {
		if (column.fieldname === "action" && data && data.reference) {
			if (data.blocker) return "";
			const esc = frappe.utils.escape_html;
			return `<button class="btn btn-xs btn-primary opi-initiate"
				data-source="${esc(data.source)}" data-name="${esc(data.reference)}">${__("Initiate")}</button>`;
		}
		return default_formatter(value, row, column, data);
	},

	onload(report) {
		$(document)
			.off("click.opi")
			.on("click.opi", ".opi-initiate", function (e) {
				e.preventDefault();
				e.stopPropagation();
				const { source, name } = $(this).data();
				frappe.confirm(__("Initiate onboarding for {0}?", [name]), () => {
					frappe.call({
						method: "recruitment.api.onboarding_retrigger.initiate_pending",
						args: { source, name },
						freeze: true,
						freeze_message: __("Initiating onboarding..."),
						callback(r) {
							const eo = r.message && r.message.employee_onboarding;
							if (!eo) return;
							frappe.show_alert({
								message: __("Employee Onboarding {0} created.", [eo]),
								indicator: "green",
							});
							report.refresh();
						},
					});
				});
			});
	},
};
