// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

function is_tpo_only() {
	// A provisioned TPO carries only the TPO role; HR / admins pick the institute.
	return (
		frappe.user.has_role("TPO") &&
		!frappe.user.has_role("HR Manager") &&
		!frappe.user.has_role("System Manager")
	);
}

function apply_tpo_institute(frm) {
	// TPOs must not browse other colleges: hide the picker and auto-fill their own
	// institute from their login. Server re-forces it on save, so this is only UX.
	frm.set_df_property("institute", "read_only", 1);
	frappe.call({
		method: "recruitment.recruitment.doctype.candidate_registration.candidate_registration.get_my_tpo_institute",
		args: { campus_invite: frm.doc.campus_invite || null },
		callback: function (r) {
			if (r.message && r.message !== frm.doc.institute) {
				frm.set_value("institute", r.message);
			}
		},
	});
}

frappe.ui.form.on("Candidate Registration", {
	setup: function (frm) {
		// HR / admins pick from the invite's institutes. (Ignored for TPOs — their
		// field is read-only and auto-filled.)
		frm.set_query("institute", function () {
			return {
				query: "recruitment.recruitment.doctype.candidate_registration.candidate_registration.invite_institute_query",
				filters: { campus_invite: frm.doc.campus_invite },
			};
		});
	},

	refresh: function (frm) {
		if (is_tpo_only()) {
			apply_tpo_institute(frm);
		}
	},

	campus_invite: function (frm) {
		if (is_tpo_only()) {
			// Re-resolve: a TPO primary at several colleges gets the one on this invite.
			apply_tpo_institute(frm);
		} else if (frm.doc.institute) {
			// A stale Institute from a previous invite would fail validation on save.
			frm.set_value("institute", null);
		}
	},
});
