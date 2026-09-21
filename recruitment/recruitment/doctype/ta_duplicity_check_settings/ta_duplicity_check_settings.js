// Copyright (c) 2026, Hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("TA Duplicity Check Settings", {
	setup(frm) {
		// Only a live Job Offer flow can approve an offer; an archived version
		// never fires.
		frm.set_query("exceptional_approval_workflow", () => ({
			filters: { module_transaction: "Job Offer", is_archived: 0 },
		}));
	},

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
