// Copyright (c) 2025, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Duplicity Check Setting", {
	setup: function(frm) {
		frm.set_query("applicable_to", () => {
			return {
				query: "recruitment.recruitment.doctype.duplicity_check_setting.duplicity_check_setting.get_available_company",
				filters: {
					docname: frm.doc.name
				}
			};
		});
    }
});