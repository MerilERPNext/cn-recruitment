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

function lock_invite_for_tpo(frm) {
	// The drive is chosen for the TPO — "Add Candidates" on the TPO Desk opens this
	// form with the invite already set, and it stays put from then on. The server
	// refuses a change too, so this is only what makes it obvious.
	//
	// Left editable while it is still empty: a TPO who opens a blank form from the
	// workspace shortcut has to be able to pick one of their own drives (the link
	// query only ever offers theirs) — otherwise the form is a dead end.
	const chosen = Boolean(frm.doc.campus_invite);
	frm.set_df_property("campus_invite", "read_only", chosen ? 1 : 0);
	if (chosen && !frm.is_new()) {
		frm.set_df_property("campus_invite", "description",
			__("Set when this registration was created — contact the recruitment team to move it."));
	}
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
			lock_invite_for_tpo(frm);
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
