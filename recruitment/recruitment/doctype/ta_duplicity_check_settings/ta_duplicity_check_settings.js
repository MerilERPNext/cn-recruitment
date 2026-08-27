// Copyright (c) 2026, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("TA Duplicity Check Settings", {
	applicable_to_scope(frm) {
		// The server clears the company rows when the scope becomes group-wide
		// (see validate_scope). Say so before the save, so rows disappearing
		// reads as intended rather than as lost input.
		if (frm.doc.applicable_to_scope !== "All Group Companies") return;
		if (!(frm.doc.applicable_to || []).length) return;

		frappe.msgprint({
			title: __("Company List Will Be Cleared"),
			indicator: "orange",
			message: __(
				"This setting will apply to every company, so the {0} listed here are no longer needed and will be removed on save.",
				[frm.doc.applicable_to.length]
			),
		});
	},
});
