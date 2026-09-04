/* global frappe, __ */
// A panel member's landing page: their GDs, newest first, coloured by how far each
// one has got. The list itself is already scoped to them — see
// permissions/doc_type_permissions.group_discussion_query.
frappe.listview_settings["Group Discussion"] = {
	add_fields: ["status", "results_pushed", "candidate_count", "panel_name", "region"],
	get_indicator(doc) {
		if (doc.results_pushed) return [__("Completed"), "green", "results_pushed,=,1"];
		const map = {
			"In Progress": "orange",
			Scheduled: "blue",
			Planned: "gray",
			Completed: "green",
		};
		return [__(doc.status || "Planned"), map[doc.status] || "gray", `status,=,${doc.status}`];
	},
};
