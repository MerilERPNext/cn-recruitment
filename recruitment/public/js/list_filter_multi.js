/* global frappe */

/*
 * Recruitment — multi-value list filters.
 *
 * THE PROBLEM
 * -----------
 * Frappe ANDs every condition in the filter area. Two "Institute Equals …" rows
 * therefore compile to `custom_institute = 'INST-0668' AND custom_institute =
 * 'INST-0711'`, which no row can ever satisfy — picking a second institute
 * empties the list instead of widening it. Users read the two rows as "either
 * of these", which is the only sensible reading a repeated equality on ONE
 * field can have: the AND reading is a guaranteed-empty query, never a useful
 * one.
 *
 * THE FIX
 * -------
 * Fold repeated `=` conditions on the same (doctype, fieldname) into a single
 * `in` condition just before the filters are handed to the server. Only `=` is
 * touched: `!=` / `like` / `>` / … repeated on one field are all meaningful as
 * ANDs and pass through untouched, as does a field that appears only once.
 *
 * Patched per list view instance (see `install`) rather than on the prototype,
 * so the change is scoped to the lists that opt in. Every consumer of
 * `get_filters_for_args()` follows along: the row query, the header count, the
 * sidebar group-by counts and the shareable URL — which becomes
 * `?custom_institute=["in",["INST-0668","INST-0711"]]` and reloads as a single
 * "Institute In …" filter.
 *
 * Loaded globally through `app_include_js` because a doctype's list JS is
 * evaluated after this needs to exist.
 */

frappe.provide("recruitment.filters");

(function () {
	function key_of(f) {
		return String(f[0]) + "::" + String(f[1]);
	}

	/**
	 * @param {Array} filters - [doctype, fieldname, operator, value] tuples.
	 * @returns {Array} the same tuples with repeated `=` on one field merged to `in`.
	 */
	function coalesce(filters) {
		if (!Array.isArray(filters) || filters.length < 2) return filters || [];

		const eq_counts = {};
		filters.forEach((f) => {
			if (Array.isArray(f) && f.length >= 4 && f[2] === "=") {
				const k = key_of(f);
				eq_counts[k] = (eq_counts[k] || 0) + 1;
			}
		});
		const duplicated = Object.keys(eq_counts).filter((k) => eq_counts[k] > 1);
		if (!duplicated.length) return filters;

		// Fresh tuples throughout — the incoming arrays belong to the filter area.
		const merged = {};
		const out = [];
		filters.forEach((f) => {
			if (!Array.isArray(f) || f.length < 4 || f[2] !== "=") {
				out.push(f);
				return;
			}
			const k = key_of(f);
			if (duplicated.indexOf(k) === -1) {
				out.push(f);
				return;
			}
			if (!merged[k]) {
				merged[k] = [f[0], f[1], "in", [f[3]]];
				out.push(merged[k]); // keeps the field in its original position
			} else if (merged[k][3].indexOf(f[3]) === -1) {
				merged[k][3].push(f[3]);
			}
		});
		return out;
	}

	/** Make one list view read repeated `=` filters on a field as "any of". */
	function install(listview) {
		if (!listview || listview._recruitment_multi_filter) return;
		if (typeof listview.get_filters_for_args !== "function") return;
		listview._recruitment_multi_filter = true;

		const original = listview.get_filters_for_args.bind(listview);
		listview.get_filters_for_args = function () {
			return coalesce(original());
		};
	}

	recruitment.filters.coalesce = coalesce;
	recruitment.filters.install = install;
})();
