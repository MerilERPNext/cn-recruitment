/* global frappe, __ */
/*
 * Virtual fetched fields in native Desk list views.
 *
 * WHY THIS EXISTS
 * ---------------
 * `Custom Doctype Field` (and anything else that builds Custom Fields) can
 * create a field that is `is_virtual` and carries a `fetch_from`, e.g.
 *
 *     Interview.applicant_name   fetch_from = job_applicant.custom_full_name
 *
 * Such a field is computed, never stored: it has no column in the table, which
 * is the whole point of it — the field costs nothing per row no matter how
 * wide the table gets. Frappe's list view is built on two assumptions that a
 * virtual field breaks, and both of them are in core:
 *
 *   1. `base_list.js#_add_field` refuses to put a virtual field in the SELECT
 *      (`if (!is_valid_field || is_virtual) return;`), so the browser never
 *      asks the server for the value and the cell can only ever be empty.
 *   2. Columns are built from docfields that have `in_list_view` set, and the
 *      column list is then re-ordered from the saved List View Settings —
 *      a field that is only in the saved settings never becomes a column at
 *      all, so picking it in "Add column" silently does nothing.
 *
 * The form does not have this problem: the value is produced in Python when
 * the document is loaded. Only the list view, which is a plain SQL SELECT,
 * needs help.
 *
 * WHAT THIS DOES
 * --------------
 * Three small steps on `frappe.views.ListView.prototype`, all keyed off the
 * field's own metadata, so any doctype and any virtual fetched field is
 * covered without being named here:
 *
 *   1. `get_fields`      — ask the server for the value, as
 *                          `link_fieldname.source_fieldname as fieldname`.
 *                          That is the exact alias form Frappe itself already
 *                          uses for Link columns (`list_view.js#get_fields`),
 *                          so no new query shape is introduced: the value
 *                          rides along with the page's existing request and the
 *                          cell renders from `doc[fieldname]` as usual.
 *   2. `setup_columns`   — give the field a column when the user has picked it
 *                          in List View Settings, which is what the standard
 *                          "Add column" dialog writes, and place that column
 *                          where the saved order says it belongs.
 *   3. `render_header`   — drop `data-sort-by` from those headers. A virtual
 *                          field has no column, so Frappe refuses to sort or
 *                          filter on it ("You do not have permission to access
 *                          field ..."); a clickable header would only earn the
 *                          user a red toast. The column is display-only by
 *                          design, and this keeps it that way.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * No database column, no `bench migrate`, no backfill — the field stays
 * virtual and the row size problem that made it virtual in the first place
 * cannot come back. It also does not add the column by itself: the field has
 * to be picked in List View Settings like any other, and it is not added to
 * the dialog twice (`get_doctype_fields` in list_settings.js already lists
 * every non-`no_value_type` field, virtual or not).
 *
 * A fetched virtual field is only ever `link_fieldname.source_fieldname` —
 * that is the contract Frappe's own `Meta.get_fields_to_fetch` parses — so
 * anything else is left alone rather than guessed at.
 *
 * Loaded globally through `app_include_js`: Frappe loads its own bundles
 * (including `list.bundle.js`, which defines `frappe.views.ListView`) through
 * the same hook and is installed first, and a doctype's own list JS is
 * evaluated later still, so every native list view is covered. Bump `?v=` in
 * hooks.py when this file changes.
 */

(function () {
	const ListView = frappe.views && frappe.views.ListView;
	if (!ListView) return;

	const proto = ListView.prototype;
	if (proto.__recruitment_virtual_field_columns) return;
	proto.__recruitment_virtual_field_columns = true;

	// ------------------------------------------------------------- the field

	/*
	 * The docfield of a fetched virtual field, or null for anything else — a real
	 * (stored) field, a field with no `fetch_from`, a controller-computed virtual
	 * field with nothing to fetch, or a malformed `fetch_from`.
	 */
	function fetched_virtual_df(df) {
		if (!df || !df.is_virtual || !df.fetch_from) return null;

		const parts = String(df.fetch_from).split(".");
		if (parts.length !== 2) return null;

		const link_fieldname = (parts[0] || "").trim();
		const source_fieldname = (parts[1] || "").trim();
		if (!link_fieldname || !source_fieldname) return null;

		// A `fetch_from` whose prefix is not a Link field on this doctype is not
		// something this module can resolve. Leave it be rather than build a
		// SELECT that would take the whole list down.
		const link_df = get_docfield(df.parent || df.doctype, link_fieldname);
		if (!link_df || link_df.fieldtype !== "Link") return null;

		return { df: df, link_fieldname: link_fieldname, source_fieldname: source_fieldname };
	}

	function get_docfield(doctype, fieldname) {
		if (!doctype || !fieldname) return null;
		try {
			return frappe.meta.get_docfield(doctype, fieldname);
		} catch (e) {
			return null;
		}
	}

	function field_columns(listview) {
		return (listview.columns || []).filter((c) => c && c.type === "Field" && c.df && c.df.fieldname);
	}

	// Every fetched virtual field currently drawn as a column.
	function visible_fetched_virtual(listview) {
		return field_columns(listview)
			.map((c) => fetched_virtual_df(c.df))
			.filter(Boolean);
	}

	// Fieldnames the user picked in List View Settings ("Add column" writes these).
	function selected_fieldnames(listview) {
		const raw = listview.list_view_settings && listview.list_view_settings.fields;
		if (!raw) return [];

		try {
			const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
			if (!Array.isArray(parsed)) return [];
			return parsed.map((f) => (typeof f === "string" ? f : f && f.fieldname)).filter(Boolean);
		} catch (e) {
			// Corrupt settings are Frappe's problem to report, not ours to crash on.
			return [];
		}
	}

	function column_index_of(columns, fieldname) {
		for (let i = 0; i < columns.length; i++) {
			const col = columns[i];
			if (col && col.type === "Field" && col.df && col.df.fieldname === fieldname) return i;
		}
		return -1;
	}

	/*
	 * Where a column goes in `columns`, given the order the user saved in List
	 * View Settings and the position it holds there (`saved_index`).
	 *
	 * Frappe's own reorder (`reorder_listview_fields` in list_view.js) walks the
	 * saved order and keeps only the entries it can match against a column that
	 * already exists — anything unmatched is dropped from the result. A fetched
	 * virtual field has no column at that point by definition, so its saved
	 * position is never consulted and appending it is the only thing left to do
	 * (which is why it used to land last, whatever the user had dragged it to).
	 *
	 * So position it here instead, against its neighbours in the saved order:
	 * after the saved predecessor if that one is on screen, otherwise before the
	 * saved successor, otherwise last. Working relative to a sibling rather than
	 * to an index is what keeps the fixed first column, the Tag column and the
	 * trailing ID column where Frappe put them — and it only ever moves the one
	 * column being added, never the ones already there.
	 */
	function saved_order_insert_index(columns, saved, saved_index) {
		for (let i = saved_index - 1; i >= 0; i--) {
			const at = column_index_of(columns, saved[i]);
			if (at !== -1) return at + 1;
		}
		for (let i = saved_index + 1; i < saved.length; i++) {
			const at = column_index_of(columns, saved[i]);
			if (at !== -1) return at;
		}
		return columns.length;
	}

	// ------------------------------------------- 1. ask the server for the value

	// Each step wraps one native method, and each is skipped if that method is
	// missing: a list view that cannot render is worse than a virtual field that
	// stays invisible, and this module must never be the reason a list breaks.
	const native_get_fields = proto.get_fields;
	if (typeof native_get_fields === "function") {
		proto.get_fields = function () {
			// The native list returns a fresh array of already-quoted column names,
			// so appending to it here is safe and lands in the same request as
			// everything else the page already asks for.
			const fields = native_get_fields.call(this);

			// A field that somehow made it into `this.fields` is already selected.
			const already_selected = new Set((this.fields || []).map((f) => f[0]));

			visible_fetched_virtual(this).forEach((col) => {
				const fieldname = col.df.fieldname;
				if (already_selected.has(fieldname)) return;
				fields.push(col.link_fieldname + "." + col.source_fieldname + " as " + fieldname);
			});

			return fields;
		};
	}

	// ------------------------------------------ 2. give a selected field a column

	const native_setup_columns = proto.setup_columns;
	if (typeof native_setup_columns === "function") {
		proto.setup_columns = function () {
			native_setup_columns.call(this);

			if (!this.columns) return;

			// Walk the saved order, not the columns: each field is placed against
			// its saved neighbours, so several virtual columns in one list each
			// land where they were configured.
			const saved = selected_fieldnames(this);
			saved.forEach((fieldname, saved_index) => {
				// Already drawn — either a real field, or a virtual one an earlier
				// pass of this loop placed.
				if (column_index_of(this.columns, fieldname) !== -1) return;

				const col = fetched_virtual_df(get_docfield(this.doctype, fieldname));
				if (!col) return;

				// The docfield itself is the column definition: `get_column_html`
				// only reads `df.label` / `df.fieldname` / `df.fieldtype` off it,
				// which is what formats and renders the value the request brought
				// back.
				const column = { type: "Field", df: col.df };
				this.columns.splice(
					saved_order_insert_index(this.columns, saved, saved_index),
					0,
					column
				);
			});
		};
	}

	// ------------------------------------------------- 3. display-only, not sortable

	const native_render_header = proto.render_header;
	if (typeof native_render_header === "function") {
		proto.render_header = function (refresh_header) {
			native_render_header.call(this, refresh_header);

			if (!this.$result) return;

			const unsortable = visible_fetched_virtual(this).map((c) => c.df.fieldname);
			if (!unsortable.length) return;

			// Frappe delegates the click handler on `$result` and reads
			// `data-sort-by` off the header, so removing the attribute is enough to
			// make the header inert — no re-binding, and it survives every re-render.
			this.$result.find(".list-row-head [data-sort-by]").each(function () {
				if (unsortable.indexOf(this.getAttribute("data-sort-by")) !== -1) {
					this.removeAttribute("data-sort-by");
					this.setAttribute("title", __("This column is not sortable"));
				}
			});
		};
	}
})();
