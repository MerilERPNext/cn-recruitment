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
				row.institute_name = contact.institute_name;
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
			// Only openings actively posted to the Campus channel can be linked, and —
			// once a Region is chosen — only the ones that region is hiring for. The
			// filter is read from the form at query time, so picking a Region narrows
			// the list immediately without re-registering the query.
			//
			// Openings carrying NO region stay on offer whatever is selected: a blank
			// Region means "not tied to one", the same reading the campus panels use.
			return {
				query: "recruitment.api.campus_openings.campus_job_opening_query",
				filters: frm.doc.region ? { region: frm.doc.region } : {},
			};
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
		drop_openings_outside_region(frm);
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

/**
 * Remove the openings that the newly chosen Region does not offer.
 *
 * Changing the Region re-points the whole invite, and openings picked under the old
 * one would otherwise ride along — the college would be invited for roles that
 * region is not hiring. Unlike Institutes (cleared wholesale, since every one of
 * them is region-specific) only the mismatched rows go: an opening with no region
 * belongs to every region and is still a valid pick.
 *
 * The server decides which rows those are — the grid shows a region LABEL while the
 * match is on the region link, and the two need not be the same string.
 */
function drop_openings_outside_region(frm) {
	const picked = (frm.doc.job_openings || []).map((d) => d.job_opening).filter(Boolean);
	if (!picked.length || !frm.doc.region) {
		return;
	}

	frappe.call({
		method: "recruitment.api.campus_openings.openings_outside_region",
		args: { job_openings: picked, region: frm.doc.region },
		callback: function (r) {
			const drop = new Set(r.message || []);
			if (!drop.size) {
				return;
			}
			const kept = (frm.doc.job_openings || []).filter(
				(d) => !drop.has(d.job_opening)
			);
			frm.clear_table("job_openings");
			kept.forEach(function (row) {
				const child = frm.add_child("job_openings");
				child.job_opening = row.job_opening;
				child.job_title = row.job_title;
				child.region = row.region;
				child.opening_status = row.opening_status;
			});
			frm.refresh_field("job_openings");
			frappe.show_alert(
				{
					message: __("Removed {0} job opening(s) that belong to another region.", [
						drop.size,
					]),
					indicator: "orange",
				},
				7
			);
		},
	});
}

frappe.ui.form.on("Campus Invite Job Opening", {
	job_opening: function (frm, cdt, cdn) {
		// Each Job Opening can appear once. Mirrors the server-side
		// validate_unique_job_openings check; caught here for instant feedback.
		const row = locals[cdt][cdn];
		if (!row.job_opening) {
			return;
		}
		const dupe = (frm.doc.job_openings || []).find(
			(d) => d.name !== row.name && d.job_opening === row.job_opening
		);
		if (dupe) {
			const value = row.job_opening;
			frappe.model.set_value(cdt, cdn, "job_opening", null);
			frappe.msgprint({
				title: __("Duplicate Job Opening"),
				message: __("Job Opening {0} is already added in this invite.", [value]),
				indicator: "orange",
			});
		}
	},
});
