// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

frappe.ui.form.on("Campus Invite", {
	setup: function (frm) {
		// Only openings actively posted to the Campus channel can be linked.
		frm.set_query("job_opening", "job_openings", function () {
			return { query: "recruitment.api.campus_openings.campus_job_opening_query" };
		});
	},

	region: function (frm) {
		// Institute is filtered by Region (declarative link_filters). Clear a
		// stale Institute selection when the Region changes.
		if (frm.doc.institute) {
			frm.set_value("institute", null);
		}
	},

	institute: function (frm) {
		frm.clear_table("tpo_contacts");
		frm.refresh_field("tpo_contacts");

		if (!frm.doc.institute) {
			return;
		}

		// Mirror the Institute's TPO Contacts into the read-only table for
		// instant feedback. The server re-syncs the same data on save.
		frappe.db.get_doc("Institute", frm.doc.institute).then(function (institute) {
			(institute.tpo_contacts || []).forEach(function (contact) {
				const row = frm.add_child("tpo_contacts");
				row.contact_name = contact.contact_name;
				row.role = contact.role;
				row.email = contact.email;
				row.phone = contact.phone;
				row.invite_status = contact.invite_status;
			});
			frm.refresh_field("tpo_contacts");
		});
	},
});
