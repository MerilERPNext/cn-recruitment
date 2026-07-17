// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

function refresh_tpo_preview(frm) {
	const institutes = (frm.doc.institutes || []).map((d) => d.institute).filter(Boolean);

	frm.clear_table("tpo_contacts");
	if (!institutes.length) {
		frm.refresh_field("tpo_contacts");
		return;
	}

	// Mirror every selected Institute's TPO Contacts into the read-only table for
	// instant feedback. The server re-syncs the identical (deduped) data on save.
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_invite.campus_invite.get_tpo_contacts_for_institutes",
		args: { institutes: institutes },
		callback: function (r) {
			frm.clear_table("tpo_contacts");
			(r.message || []).forEach(function (contact) {
				const row = frm.add_child("tpo_contacts");
				row.contact_name = contact.contact_name;
				row.role = contact.role;
				row.email = contact.email;
				row.phone = contact.phone;
				row.invite_status = contact.invite_status;
			});
			frm.refresh_field("tpo_contacts");
		},
	});
}

frappe.ui.form.on("Campus Invite", {
	setup: function (frm) {
		// job_openings is a real grid, so the query goes on its child field.
		frm.set_query("job_opening", "job_openings", function () {
			// Only openings actively posted to the Campus channel can be linked.
			return { query: "recruitment.api.campus_openings.campus_job_opening_query" };
		});

		// institutes is a Table MultiSelect: it has no grid, so the query belongs on
		// the field itself (the 3-arg child form would throw and kill the render).
		frm.set_query("institutes", function () {
			return frm.doc.region ? { filters: { region: frm.doc.region } } : {};
		});
	},

	region: function (frm) {
		// Institutes are filtered by Region — drop selections belonging to another
		// Region, then rebuild the TPO preview.
		if ((frm.doc.institutes || []).length) {
			frm.clear_table("institutes");
			frm.refresh_field("institutes");
		}
		refresh_tpo_preview(frm);
	},

	// A Table MultiSelect only emits add/remove — there is no per-row field event.
	institutes_add: function (frm) {
		refresh_tpo_preview(frm);
	},

	institutes_remove: function (frm) {
		refresh_tpo_preview(frm);
	},
});
