/* global frappe, Sortable */

/*
 * Recruitment — configurable columns for our designed Desk list views.
 *
 * WHY THIS EXISTS
 * ---------------
 * Job Applicant / Job Opening / Job Requisition each render a hand-designed
 * table into Frappe's `$result` instead of Frappe's native rows. That buys the
 * composite cells (avatar + name + email, status pill, pipeline bar, …) but it
 * used to hard-code the <thead> and every <td>: the columns could not be
 * reordered, hidden, realigned or resized, and Frappe's own "List Settings"
 * dialog never listed them because most of them are not plain docfields.
 *
 * This module turns those tables into a column REGISTRY. Each list declares its
 * designed columns once; the engine decides which of them are shown, in what
 * order, at what width and alignment — from a saved configuration — and draws
 * the header and the cells. Any ordinary docfield of the doctype can be added
 * as a column too, so "put Department second" is just a drag in the dialog.
 *
 * CONFIGURATION RESOLUTION (first hit wins)
 *   1. per-user   — frappe user settings, key `recruitment_columns`
 *   2. site-wide  — `Recruitment List Column Setting` (shipped in boot info)
 *   3. code       — the order the list declared its columns in
 *
 * Loaded globally through `app_include_js` because a doctype's list JS is
 * evaluated *after* this needs to exist.
 */

frappe.provide("recruitment.list_columns");

(function () {
	const USER_SETTINGS_KEY = "recruitment_columns";
	const FIELD_PREFIX = "field:";

	// doctype -> spec, filled by register()
	const registry = {};

	// ------------------------------------------------------------------ utils

	function escapeHtml(s) {
		if (s === null || s === undefined) return "";
		return String(s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}

	// Click-to-filter, the same contract Frappe's native rows use: Frappe binds a
	// delegated handler on `$result` for `.filterable` and reads `data-filter=
	// "fieldname,operator,value"`. We render into that same `$result`, so tagging a
	// cell this way gets native filter-on-click for free.
	function filterData(fieldname, value) {
		if (value === null || value === undefined || value === "") return "";
		return ` data-filter="${escapeHtml(fieldname)},=,${escapeHtml(value)}"`;
	}

	// Standard fields have no docfield in meta, so describe the ones worth showing
	// as columns. Anything not here and not in meta simply can't be added.
	// Labels stay untranslated here and go through __() at the point of use — this
	// module is evaluated at desk boot, before the user's language is settled.
	const STD_FIELDS = {
		name: { fieldname: "name", fieldtype: "Data", label: "ID" },
		owner: { fieldname: "owner", fieldtype: "Link", options: "User", label: "Created By" },
		modified_by: { fieldname: "modified_by", fieldtype: "Link", options: "User", label: "Modified By" },
		creation: { fieldname: "creation", fieldtype: "Datetime", label: "Created On" },
		modified: { fieldname: "modified", fieldtype: "Datetime", label: "Last Modified" },
		idx: { fieldname: "idx", fieldtype: "Int", label: "Index" },
	};

	const RIGHT_ALIGNED = ["Currency", "Float", "Int", "Percent", "Duration"];

	function alignFor(fieldtype) {
		if (RIGHT_ALIGNED.includes(fieldtype)) return "right";
		if (fieldtype === "Check") return "center";
		return "left";
	}

	function getDocfield(doctype, fieldname) {
		let df = null;
		try { df = frappe.meta.get_docfield(doctype, fieldname); } catch (e) { /* noop */ }
		return df || STD_FIELDS[fieldname] || null;
	}

	/*
	 * Render one docfield value the way Frappe's native list cell does: formatted
	 * for display, wrapped in a `.filterable` element carrying the raw stored value,
	 * for every fieldtype Frappe makes clickable (i.e. all but Image / rich HTML).
	 */
	function formatFieldCell(doc, df) {
		const fieldname = df && df.fieldname;
		const value = doc[fieldname];
		if (value === null || value === undefined || value === "") return "";

		const htmlTypes = (frappe.model && frappe.model.html_fieldtypes) || [];
		if (df.fieldtype === "Image" || htmlTypes.includes(df.fieldtype)) {
			try { return frappe.format(value, df, { inline: true }, doc); }
			catch (e) { return escapeHtml(value); }
		}
		// Link: a filter-only anchor (no href) so clicking filters instead of
		// navigating away — matching Frappe's native Link cell.
		if (df.fieldtype === "Link" || df.fieldtype === "Dynamic Link") {
			return `<a class="filterable"${filterData(fieldname, value)}>${escapeHtml(value)}</a>`;
		}
		let display;
		try { display = frappe.format(value, df, { inline: true }, doc); }
		catch (e) { display = escapeHtml(value); }
		return `<span class="filterable"${filterData(fieldname, value)}>${display == null ? "" : display}</span>`;
	}

	// --------------------------------------------------------- column defs

	function normalize(def) {
		const out = Object.assign({}, def);
		out.fields = out.fields || (out.fieldname ? [out.fieldname] : []);
		out.covers = out.covers || out.fields.slice();
		out.align = out.align || "left";
		out.nowrap = out.nowrap !== false;
		out.label = out.label === undefined ? "" : out.label;
		return out;
	}

	/*
	 * Whether a docfield can be a column at all. `no_value_type` already rules out
	 * the ones with no scalar to show AND the ones with no column in this table
	 * (Table, Table MultiSelect) — adding one of those to the SELECT would take the
	 * whole list down with an SQL error. Virtual fields are computed in Python and
	 * skipped by Frappe's own `_add_field`, so a column for one is always blank.
	 */
	function isColumnableField(df) {
		if (!df) return false;
		if ((frappe.model.no_value_type || []).includes(df.fieldtype)) return false;
		return !df.is_virtual;
	}

	// A column backed by a plain docfield — what the user picks in "Add column".
	function makeFieldColumn(doctype, fieldname) {
		const df = getDocfield(doctype, fieldname);
		if (!isColumnableField(df)) return null;
		return normalize({
			key: FIELD_PREFIX + fieldname,
			label: __(df.label || fieldname, null, doctype),
			fieldname,
			df,
			fields: [fieldname],
			align: alignFor(df.fieldtype),
			cell_class: "rlc-field-cell",
			render: (doc) => formatFieldCell(doc, df),
		});
	}

	// ------------------------------------------------------------- persistence

	function bootConfigs() {
		return (frappe.boot && frappe.boot.recruitment_list_columns) || {};
	}

	function userConfig(doctype) {
		const raw = (frappe.get_user_settings(doctype) || {})[USER_SETTINGS_KEY];
		if (!raw) return null;
		try {
			const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
			return Array.isArray(parsed) && parsed.length ? parsed : null;
		} catch (e) { return null; }
	}

	function globalConfig(doctype) {
		const cfg = bootConfigs()[doctype];
		return Array.isArray(cfg) && cfg.length ? cfg : null;
	}

	/** The configuration in force for this doctype, or null to fall back to code. */
	function getConfig(doctype) {
		return userConfig(doctype) || globalConfig(doctype);
	}

	function canManageGlobal() {
		return !!(frappe.boot && frappe.boot.can_manage_recruitment_list_columns);
	}

	// ------------------------------------------------------------- resolution

	function defFor(spec, key) {
		if (spec.by_key[key]) return spec.by_key[key];
		if (key.indexOf(FIELD_PREFIX) === 0) {
			return makeFieldColumn(spec.doctype, key.slice(FIELD_PREFIX.length));
		}
		return null;
	}

	function withOverrides(def, entry) {
		if (!entry) return def;
		const out = Object.assign({}, def);
		if (entry.label) out.label = entry.label;
		if (entry.align) out.align = entry.align;
		if (entry.width !== undefined && entry.width !== null && entry.width !== "") {
			out.width = entry.width;
			out.min_width = null;   // an explicit width wins over the designed min
		}
		return out;
	}

	/*
	 * Columns the user added through Frappe's own List Settings that no designed
	 * column already draws. Only consulted when we have no configuration of our
	 * own, so the lists behave exactly as before anyone opens our dialog.
	 */
	function nativeExtras(spec, listview) {
		const covered = new Set(spec.reserved_fields);
		spec.columns.forEach((d) => d.covers.forEach((f) => covered.add(f)));
		return ((listview && listview.columns) || [])
			.filter((c) => c && c.type === "Field" && c.df && c.df.fieldname && !covered.has(c.df.fieldname))
			.map((c) => makeFieldColumn(spec.doctype, c.df.fieldname))
			.filter(Boolean);
	}

	/*
	 * resolve() runs once for the header and once per row, so it is memoised: a
	 * hundred-row table would otherwise re-parse the saved config a hundred times.
	 * The stamp covers both things it depends on — the config (bumped by invalidate()
	 * whenever one is saved) and Frappe's own column list, which only matters while
	 * we have no config of our own.
	 */
	const resolveCache = {};
	let configVersion = 0;

	function invalidate() {
		configVersion += 1;
	}

	/*
	 * The identity of Frappe's own column list, not just its size: swapping one
	 * field for another in native List Settings keeps the count identical, and a
	 * length-only stamp would serve the previous layout from cache.
	 *
	 * Recomputed on every call rather than cached against the array's identity —
	 * that shortcut assumes setup_columns() always assigns a fresh array, and a
	 * future in-place mutation would silently freeze the layout. Walking ten
	 * columns per row costs nothing next to parsing the table's HTML.
	 */
	function nativeStamp(listview) {
		return (((listview || {}).columns) || [])
			.map((c) => (c && c.df && c.df.fieldname) || c.type || "?")
			.join(",");
	}

	/** The ordered, visible column definitions for this list, config applied. */
	function resolve(doctype, listview) {
		const spec = registry[doctype];
		if (!spec) return [];

		const stamp = `${configVersion}:${nativeStamp(listview)}`;
		const cached = resolveCache[doctype];
		if (cached && cached.stamp === stamp) return cached.defs;

		const defs = computeResolved(spec, listview).map(prepare);
		resolveCache[doctype] = { stamp, defs };
		return defs;
	}

	/*
	 * Freeze the parts of a cell that depend only on the column, never on the row —
	 * its class list and its inline sizing/alignment. Done once per layout instead
	 * of once per cell, which is the difference between ~10 string builds and ~1000
	 * on a hundred-row table.
	 */
	function prepare(def) {
		return Object.assign({}, def, {
			_class: cellClass(def),
			_style: cellStyle(def, false),
			_head_style: cellStyle(def, true),
		});
	}

	function computeResolved(spec, listview) {
		const doctype = spec.doctype;
		const config = getConfig(doctype);
		if (!config) {
			return spec.columns
				.filter((d) => d.default !== false)
				.concat(spec.merge_native_extras ? nativeExtras(spec, listview) : []);
		}

		const out = [];
		const seen = new Set();
		config.forEach((entry) => {
			if (!entry || !entry.key || seen.has(entry.key)) return;
			seen.add(entry.key);
			if (entry.hidden) return;
			const def = defFor(spec, entry.key);
			if (def) out.push(withOverrides(def, entry));
		});
		// A column marked `locked` is structural (the row's identity cell): keep it
		// even if a stale config predates it or dropped it.
		spec.columns.forEach((d, i) => {
			if (d.locked && !seen.has(d.key)) out.splice(Math.min(i, out.length), 0, d);
		});
		return out;
	}

	/*
	 * The full configuration as the dialog shows it: every column the list can
	 * offer, visible ones first in their configured order, then the hidden /
	 * not-yet-added designed columns.
	 */
	function editableConfig(doctype, listview) {
		const spec = registry[doctype];
		if (!spec) return [];
		const config = getConfig(doctype);
		const rows = [];
		const seen = new Set();

		const push = (def, hidden, entry) => {
			if (!def || seen.has(def.key)) return;
			seen.add(def.key);
			rows.push({
				key: def.key,
				label: (entry && entry.label) || def.label,
				default_label: def.label,
				hidden: hidden ? 1 : 0,
				align: (entry && entry.align) || def.align || "left",
				width: (entry && entry.width) || def.width || "",
				locked: !!def.locked,
				removable: def.key.indexOf(FIELD_PREFIX) === 0,
				designed: !!spec.by_key[def.key],
			});
		};

		if (config) {
			config.forEach((entry) => push(defFor(spec, entry.key), entry.hidden, entry));
		} else {
			spec.columns.filter((d) => d.default !== false).forEach((d) => push(d, false, null));
			if (spec.merge_native_extras) nativeExtras(spec, listview).forEach((d) => push(d, false, null));
		}
		// Designed columns not mentioned by the config are offered, switched off.
		spec.columns.forEach((d) => push(d, true, null));
		return rows;
	}

	// ---------------------------------------------------------------- fetching

	/*
	 * Every docfield the list must SELECT. Deliberately the union over all designed
	 * columns plus every configured field column — not just the visible ones — so
	 * toggling a column on in the dialog never needs a round trip for its data.
	 */
	function requiredFields(doctype) {
		const spec = registry[doctype];
		if (!spec) return [];
		const fields = new Set(spec.reserved_fields.concat(spec.fetch_fields));
		spec.columns.forEach((d) => d.fields.forEach((f) => fields.add(f)));
		(getConfig(doctype) || []).forEach((entry) => {
			if (entry && entry.key && entry.key.indexOf(FIELD_PREFIX) === 0) {
				fields.add(entry.key.slice(FIELD_PREFIX.length));
			}
		});
		return Array.from(fields);
	}

	/** Make sure the running list is selecting everything the columns now need. */
	function ensureFields(doctype, listview) {
		if (!listview || typeof listview._add_field !== "function") return;
		const have = new Set((listview.fields || []).map((f) => f[0]));
		requiredFields(doctype).forEach((f) => {
			if (!have.has(f)) listview._add_field(f);
		});
	}

	// ----------------------------------------------------------------- render

	/*
	 * Sizing and alignment are configuration, so they are emitted inline rather
	 * than living in each list's stylesheet — that is what makes them editable.
	 * `is_head` keeps header labels on one line even above a wrapping column, and
	 * carries the same alignment down so a right-aligned column's label sits over
	 * its values instead of drifting to the left edge.
	 */
	function cellStyle(def, is_head) {
		const bits = [];
		if (def.width) bits.push(`width:${def.width}`);
		if (def.min_width) bits.push(`min-width:${def.min_width}`);
		if (def.max_width) bits.push(`max-width:${def.max_width}`);
		if (def.align && def.align !== "left") bits.push(`text-align:${def.align}`);
		bits.push(is_head || def.nowrap ? "white-space:nowrap" : "white-space:normal");
		return ` style="${bits.join(";")}"`;
	}

	function cellClass(def, extra) {
		return ["rlc-col", `rlc-col-${String(def.key).replace(/[^a-z0-9_-]/gi, "-")}`, def.cell_class, extra]
			.filter(Boolean).join(" ");
	}

	function headHtml(doctype, listview) {
		const spec = registry[doctype];
		if (!spec) return "";
		const cell = (def) => {
			const inner = def.head_render ? def.head_render(listview, def) : escapeHtml(def.label || "");
			return `<th class="${def._class}"${def._head_style}>${inner}</th>`;
		};
		const cells = [];
		if (spec.leading) cells.push(cell(spec.leading));
		resolve(doctype, listview).forEach((d) => cells.push(cell(d)));
		if (spec.trailing) cells.push(cell(spec.trailing));
		return `<tr>${cells.join("")}</tr>`;
	}

	function rowHtml(doctype, doc, listview) {
		const spec = registry[doctype];
		if (!spec) return "";
		const cell = (def) => {
			let inner = "";
			// One column throwing must cost that cell, not the whole table.
			try { inner = def.render ? def.render(doc, listview, def) : ""; }
			catch (e) { console.error("column render failed", def.key, e); }
			const attrs = def.cell_attrs ? def.cell_attrs(doc, def) : "";
			return `<td class="${def._class}"${def._style}${attrs}>${inner == null ? "" : inner}</td>`;
		};
		const cells = [];
		if (spec.leading) cells.push(cell(spec.leading));
		resolve(doctype, listview).forEach((d) => cells.push(cell(d)));
		if (spec.trailing) cells.push(cell(spec.trailing));
		return `<tr data-name="${escapeHtml(doc.name)}">${cells.join("")}</tr>`;
	}

	// ----------------------------------------------------------------- dialog

	function injectDialogStyles() {
		if (document.getElementById("rlc-dialog-styles")) return;
		const style = document.createElement("style");
		style.id = "rlc-dialog-styles";
		style.textContent = `
			.rlc-rows { border: 1px solid var(--border-color, #E5E7EB); border-radius: 8px; overflow: hidden; }
			.rlc-row {
				display: flex; align-items: center; gap: 8px; padding: 7px 10px;
				border-bottom: 1px solid var(--border-color, #F3F4F6); background: var(--card-bg, #fff);
			}
			.rlc-row:last-child { border-bottom: none; }
			.rlc-row.rlc-off { opacity: .55; }
			.rlc-handle { cursor: grab; color: var(--text-muted, #9CA3AF); display: inline-flex; }
			.rlc-handle.rlc-locked { visibility: hidden; cursor: default; }
			.rlc-name { flex: 1 1 auto; min-width: 0; }
			.rlc-name-main { font-size: 13px; color: var(--text-color, #111827); }
			.rlc-name-sub { font-size: 11px; color: var(--text-muted, #9CA3AF); }
			.rlc-row select.rlc-align, .rlc-row input.rlc-width {
				height: 26px; font-size: 12px; padding: 0 6px; flex: 0 0 auto;
				border: 1px solid var(--border-color, #E5E7EB); border-radius: 6px;
				background: var(--control-bg, #fff); color: inherit;
			}
			.rlc-row select.rlc-align { width: 82px; }
			.rlc-row input.rlc-width { width: 74px; }
			.rlc-remove { color: var(--text-muted, #9CA3AF); cursor: pointer; display: inline-flex; }
			.rlc-remove.rlc-hidden { visibility: hidden; }
			.rlc-legend { display: flex; gap: 8px; font-size: 11px; color: var(--text-muted, #9CA3AF); padding: 0 10px 4px; }
			.rlc-legend .rlc-legend-align { width: 82px; }
			.rlc-legend .rlc-legend-width { width: 74px; }
			.rlc-legend .rlc-legend-spacer { flex: 1 1 auto; }
		`;
		document.head.appendChild(style);
	}

	function rowMarkup(row) {
		const sub = row.designed ? __("Designed column") : row.key.slice(FIELD_PREFIX.length);
		const opt = (v, label) => `<option value="${v}"${row.align === v ? " selected" : ""}>${label}</option>`;
		return `
			<div class="rlc-row ${row.hidden ? "rlc-off" : ""}" data-key="${escapeHtml(row.key)}"
				data-designed="${row.designed ? 1 : 0}" data-locked="${row.locked ? 1 : 0}">
				<span class="rlc-handle ${row.locked ? "rlc-locked" : ""}">${frappe.utils.icon("drag", "xs")}</span>
				<input type="checkbox" class="rlc-visible" ${row.hidden ? "" : "checked"} ${row.locked ? "disabled" : ""}/>
				<span class="rlc-name">
					<div class="rlc-name-main">${escapeHtml(row.label)}</div>
					<div class="rlc-name-sub">${escapeHtml(sub)}</div>
				</span>
				<select class="rlc-align">
					${opt("left", __("Left"))}${opt("center", __("Center"))}${opt("right", __("Right"))}
				</select>
				<input type="text" class="rlc-width" value="${escapeHtml(row.width)}" placeholder="${__("auto")}"/>
				<a class="rlc-remove ${row.removable ? "" : "rlc-hidden"}">${frappe.utils.icon("close", "xs")}</a>
			</div>`;
	}

	function openSettings(doctype, listview) {
		const spec = registry[doctype];
		if (!spec) return;
		injectDialogStyles();

		let rows = editableConfig(doctype, listview);

		const dialog = new frappe.ui.Dialog({
			title: __("Configure Columns — {0}", [__(doctype)]),
			size: "large",
			fields: [
				{ fieldtype: "HTML", fieldname: "rows_html" },
				{ fieldtype: "Section Break" },
				{
					fieldtype: "Select", fieldname: "new_field", label: __("Add a field as a column"),
					options: [], description: __("Any field on {0} can become its own column.", [__(doctype)]),
				},
				{ fieldtype: "Column Break" },
				{
					fieldtype: "Select", fieldname: "scope", label: __("Applies to"),
					// "me" / "everyone", NOT "user" / "global": Frappe reads a default of
					// "user" (case-insensitively) as the magic keyword for the logged-in
					// user and substitutes their email, which matches no option and leaves
					// the select blank.
					options: canManageGlobal()
						? [{ value: "me", label: __("Only me") }, { value: "everyone", label: __("Everyone (site default)") }]
						: [{ value: "me", label: __("Only me") }],
					default: canManageGlobal() && globalConfig(doctype) && !userConfig(doctype) ? "everyone" : "me",
				},
			],
		});

		// Fields that already have a home in this list: either as a `field:` row of
		// their own, or inside a designed column that draws them (offering
		// "Designation" again when the designed Designation column is right there
		// only invites two columns showing the same thing).
		function availableFieldOptions() {
			const used = new Set();
			rows.forEach((r) => {
				used.add(r.key);
				const def = spec.by_key[r.key];
				if (def) def.covers.forEach((f) => used.add(FIELD_PREFIX + f));
			});
			spec.reserved_fields.forEach((f) => used.add(FIELD_PREFIX + f));

			const noValue = frappe.model.no_value_type || [];
			const meta = frappe.get_meta(doctype) || { fields: [] };
			const seen = new Set();
			const opts = [];
			const add = (fieldname, label) => {
				const value = FIELD_PREFIX + fieldname;
				if (used.has(value) || seen.has(value)) return;
				seen.add(value);
				opts.push({ value, label });
			};
			(meta.fields || [])
				.filter((df) => df.fieldname && !noValue.includes(df.fieldtype))
				.forEach((df) => add(df.fieldname, __(df.label || df.fieldname, null, doctype)));
			Object.keys(STD_FIELDS).forEach((f) => add(f, __(STD_FIELDS[f].label)));

			return [{ value: "", label: __("Select a field…") }]
				.concat(opts.sort((a, b) => a.label.localeCompare(b.label)));
		}

		// Read the DOM back into `rows` — the DOM is the source of truth while the
		// dialog is open, because Sortable reorders it directly.
		function syncFromDom() {
			const wrapper = dialog.get_field("rows_html").$wrapper[0];
			const byKey = {};
			rows.forEach((r) => { byKey[r.key] = r; });
			rows = Array.from(wrapper.querySelectorAll(".rlc-row")).map((el) => {
				const key = el.getAttribute("data-key");
				const base = byKey[key] || {};
				return Object.assign({}, base, {
					key,
					hidden: el.querySelector(".rlc-visible").checked ? 0 : 1,
					align: el.querySelector(".rlc-align").value,
					width: el.querySelector(".rlc-width").value.trim(),
				});
			});
		}

		let sortable = null;

		function paint() {
			const field = dialog.get_field("rows_html");
			// Detach the previous instance before its element is thrown away, so a
			// long editing session doesn't accumulate live Sortables on dead nodes.
			if (sortable) { sortable.destroy(); sortable = null; }
			field.html(`
				<div class="rlc-legend">
					<span class="rlc-legend-spacer">${__("Column")}</span>
					<span class="rlc-legend-align">${__("Align")}</span>
					<span class="rlc-legend-width">${__("Width")}</span>
					<span style="width:16px"></span>
				</div>
				<div class="rlc-rows">${rows.map(rowMarkup).join("")}</div>`);

			const wrapper = field.$wrapper[0];
			sortable = new Sortable(wrapper.querySelector(".rlc-rows"), {
				handle: ".rlc-handle:not(.rlc-locked)",
				draggable: ".rlc-row",
				onUpdate: () => syncFromDom(),
			});
			wrapper.querySelectorAll(".rlc-row").forEach((el) => {
				el.querySelector(".rlc-visible").addEventListener("change", (e) => {
					el.classList.toggle("rlc-off", !e.target.checked);
					syncFromDom();
				});
				el.querySelector(".rlc-remove").addEventListener("click", () => {
					el.remove();
					syncFromDom();
					dialog.set_df_property("new_field", "options", availableFieldOptions());
				});
			});
			dialog.set_df_property("new_field", "options", availableFieldOptions());
		}

		dialog.fields_dict.new_field.$input.on("change", function () {
			const key = this.value;
			if (!key) return;
			syncFromDom();
			const def = defFor(spec, key);
			if (def) {
				rows.push({
					key, label: def.label, default_label: def.label, hidden: 0,
					align: def.align || "left", width: "", locked: false,
					removable: true, designed: false,
				});
			}
			// Clear through the control, not the raw <option> value: repainting drops
			// the field we just consumed from the options, and a model still holding
			// that key would leave the select showing nothing at all. Re-entry is safe
			// — the change this fires comes back with an empty key and returns above.
			dialog.set_value("new_field", "");
			paint();
		});

		function persist(config) {
			const scope = dialog.get_value("scope") || "me";
			if (scope === "everyone") {
				return frappe.xcall("recruitment.api.list_columns.save_column_config", {
					list_doctype: doctype, columns: JSON.stringify(config),
				}).then(() => {
					frappe.boot.recruitment_list_columns = frappe.boot.recruitment_list_columns || {};
					frappe.boot.recruitment_list_columns[doctype] = config;
					// A personal override would mask the new site default the admin
					// just set, so clear it — they meant "this is what I want to see".
					return frappe.model.user_settings.save(doctype, USER_SETTINGS_KEY, "");
				});
			}
			return frappe.model.user_settings.save(doctype, USER_SETTINGS_KEY, JSON.stringify(config));
		}

		function refreshList() {
			invalidate();
			if (!listview) return;
			ensureFields(doctype, listview);
			listview.refresh();
		}

		dialog.set_primary_action(__("Apply"), () => {
			syncFromDom();
			const config = rows.map((r) => {
				const entry = { key: r.key, hidden: r.hidden ? 1 : 0 };
				if (r.align && r.align !== "left") entry.align = r.align;
				if (r.width) entry.width = r.width;
				if (r.label && r.label !== r.default_label) entry.label = r.label;
				return entry;
			});
			if (!config.some((c) => !c.hidden)) {
				frappe.msgprint(__("Keep at least one column visible."));
				return;
			}
			persist(config).then(() => {
				dialog.hide();
				refreshList();
				frappe.show_alert({ message: __("Columns updated"), indicator: "green" });
			});
		});

		dialog.set_secondary_action_label(__("Reset to Default"));
		dialog.set_secondary_action(() => {
			frappe.confirm(__("Restore the designed columns for {0}?", [__(doctype)]), () => {
				const scope = dialog.get_value("scope") || "me";
				const done = scope === "everyone"
					? frappe.xcall("recruitment.api.list_columns.reset_column_config", { list_doctype: doctype })
						.then(() => {
							if (frappe.boot.recruitment_list_columns) delete frappe.boot.recruitment_list_columns[doctype];
						})
					: Promise.resolve();
				done.then(() => frappe.model.user_settings.save(doctype, USER_SETTINGS_KEY, ""))
					.then(() => {
						dialog.hide();
						refreshList();
						frappe.show_alert({ message: __("Columns reset"), indicator: "green" });
					});
			});
		});

		paint();
		dialog.show();
	}

	// --------------------------------------------------------------- registry

	function register(doctype, spec) {
		const columns = (spec.columns || []).map(normalize);
		const by_key = {};
		columns.forEach((d) => { by_key[d.key] = d; });
		registry[doctype] = {
			doctype,
			columns,
			by_key,
			// The pinned cells never take configuration, so their class/style are
			// frozen here rather than on every resolve.
			leading: spec.leading ? prepare(normalize(spec.leading)) : null,
			trailing: spec.trailing ? prepare(normalize(spec.trailing)) : null,
			// Fields the list always needs and that must never surface as a column
			// of their own (_liked_by, _comment_count, …).
			reserved_fields: spec.reserved_fields || [],
			// Always fetched, but still offerable as a column — data other code on
			// the page reads off `listview.data`.
			fetch_fields: spec.fetch_fields || [],
			merge_native_extras: spec.merge_native_extras !== false,
		};
		return registry[doctype];
	}

	/** Put "Configure Columns" in the list view's ⋯ menu, next to List Settings. */
	function addMenuItem(doctype, listview) {
		if (!listview || !listview.page || listview._rlc_menu_added) return;
		listview._rlc_menu_added = true;
		listview.page.add_menu_item(__("Configure Columns"), () => openSettings(doctype, listview));
	}

	Object.assign(recruitment.list_columns, {
		register,
		resolve,
		head_html: headHtml,
		row_html: rowHtml,
		required_fields: requiredFields,
		ensure_fields: ensureFields,
		invalidate,
		open_settings: openSettings,
		add_menu_item: addMenuItem,
		// shared helpers, so the individual lists don't each re-implement them
		escape: escapeHtml,
		filter_data: filterData,
		format_field_cell: formatFieldCell,
		FIELD_PREFIX,
	});
})();
