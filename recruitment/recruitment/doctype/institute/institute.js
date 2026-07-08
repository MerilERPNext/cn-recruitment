// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

// State -> Region / City dependent filtering is declarative via each field's
// `link_filters` (Region.state_id / City.state == doc.state). This script only
// clears the downstream selections when State changes so a stale Region/City
// from a different State can't linger.
frappe.ui.form.on("Institute", {
	state: function (frm) {
		if (frm.doc.region) {
			frm.set_value("region", null);
		}
		if (frm.doc.city) {
			frm.set_value("city", null);
		}
	},
});
