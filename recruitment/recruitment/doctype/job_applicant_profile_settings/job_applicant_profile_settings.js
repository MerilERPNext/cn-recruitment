/* global frappe, $ */
/**
 * Job Applicant Profile Settings — section list on the LEFT, grouped column
 * table on the RIGHT (only the active section's rows render). Backs the
 * hidden `default_application_fields` table.
 */

(function () {
	// Column definitions, the stylesheet and every cell renderer are shared with the
	// Job Opening's Application Fields tab — see public/js/applicant_fields_ui.js.
	// Only the parts that differ live here: this page edits the settings singleton's
	// `default_application_fields` directly, the Job Opening upserts overrides.
	const AFU = recruitment.applicant_fields_ui;
	const escapeHtml = AFU.escapeHtml;
	const injectStyles = AFU.injectStyles;

	const APPL = "recruitment.recruitment.field_applicability";
	const APPL_TYPES = ["Company", "Assignment"];

	// Must match nextai Data Element `field_type` options — a value missing there
	// fails on save. Layout types never appear in this grid, and Table / Dynamic
	// Link need an options target this dialog can't collect, so they're omitted.
	const FIELD_TYPE_OPTIONS = [
		"Data", "Small Text", "Long Text", "Text", "Text Editor",
		"Select", "Link",
		"Date", "Datetime", "Time",
		"Int", "Float", "Currency", "Percent",
		"Check", "Phone", "Rating",
		"Attach", "Attach Image", "Signature",
	];
	const MAP_MODE = "Map Existing Fields";
	const FF = "recruitment.recruitment.field_flow_sync";

	/**
	 * Darwin-style bulk "Add Custom Field" dialog. A spreadsheet grid (custom HTML
	 * field): each ROW is a field, each COLUMN is a doctype in the flow. Map
	 * Existing → every cell is a dropdown of that doctype's fields (blank = skip).
	 * Create New → columns become Label / Type / Options and the field is created
	 * on every flow doctype. The flow defaults to Job Applicant → Employee
	 * Onboarding → Employee and can be extended (Add doctype auto-detects the
	 * connecting link field). Update creates the nextai records one row at a time.
	 */
	function openFieldFlowDialog(frm, presetSection) {
		const state = { flow_name: "", flow: [], mode: "Create New Field", rows: [] };
		let d;

		// Sections the admin can drop the new field into — the same groups shown
		// in the left sidebar. Default to the section they were viewing.
		const sectionOptions = [];
		(frm.doc.default_application_fields || []).forEach((r) => {
			const s = r.section || "General";
			if (!sectionOptions.includes(s)) sectionOptions.push(s);
		});
		if (presetSection && !sectionOptions.includes(presetSection)) sectionOptions.unshift(presetSection);
		if (!sectionOptions.length) sectionOptions.push("General");
		const defaultSection = (presetSection && sectionOptions.includes(presetSection))
			? presetSection : sectionOptions[0];

		function emptyRow() {
			return state.mode === MAP_MODE
				? { fields: {} }
				: { field_label: "", field_type: "Data", options_raw: "", reqd: 0, hidden: 0 };
		}

		function hostEl() {
			return d.fields_dict.grid_host.$wrapper.get(0);
		}

		function optionTags(fields, selected) {
			let h = `<option value="">${__("— skip —")}</option>`;
			(fields || []).forEach((f) => {
				h += `<option value="${escapeHtml(f.value)}" ${f.value === selected ? "selected" : ""}>${escapeHtml(f.label)}</option>`;
			});
			return h;
		}

		function renderFlowbar() {
			const chips = state.flow.map((f, idx) => {
				const isLast = idx === state.flow.length - 1;
				const x = (isLast && state.flow.length > 1)
					? `<button class="ffd-chip-x" title="${__("Remove from flow")}">×</button>` : "";
				return `<span class="ffd-chip">${escapeHtml(f.doctype)}${x}</span>`;
			}).join(`<span class="ffd-arrow">→</span>`);
			return `<div class="ffd-flowbar">
				<span class="ffd-flow-label">FLOW</span>${chips}
				<button class="ffd-add-dt">+ ${__("Add doctype")}</button>
			</div>`;
		}

		// Options cell adapts to the field type: Link → DocType picker button,
		// Select → multi-line options editor button, others → nothing to set.
		function optionsCell(row, i) {
			if (row.field_type === "Link") {
				const v = row.options_raw || "";
				return `<button class="ffd-opts-btn" data-row="${i}">${v ? escapeHtml(v) : __("Choose DocType")}</button>`;
			}
			if (row.field_type === "Select") {
				const n = (row.options_raw || "").split(/\n/).map((s) => s.trim()).filter(Boolean).length;
				return `<button class="ffd-opts-btn" data-row="${i}">${__("Edit options")} (${n})</button>`;
			}
			return `<span class="ffd-opts-na">—</span>`;
		}

		function openOptionsEditor(i) {
			syncFromDom();
			const row = state.rows[i];
			if (row.field_type === "Link") {
				frappe.prompt(
					[{ fieldtype: "Link", options: "DocType", fieldname: "v", label: __("Target DocType"), reqd: 1, default: row.options_raw || "" }],
					(vals) => { state.rows[i].options_raw = vals.v || ""; render(); },
					__("Link target"), __("Set")
				);
			} else if (row.field_type === "Select") {
				frappe.prompt(
					[{ fieldtype: "Small Text", fieldname: "v", label: __("Options (one per line)"), default: row.options_raw || "" }],
					(vals) => { state.rows[i].options_raw = vals.v || ""; render(); },
					__("Select options"), __("Set")
				);
			}
		}

		function renderGrid() {
			if (state.mode === MAP_MODE) {
				const head = state.flow.map((f) => `<th>${escapeHtml(f.doctype)}</th>`).join("") + "<th></th>";
				const body = state.rows.map((row, i) => {
					const cells = state.flow.map((f) =>
						`<td><select class="ffd-cell" data-row="${i}" data-dt="${escapeHtml(f.doctype)}">${optionTags(f.fields, (row.fields || {})[f.doctype] || "")}</select></td>`
					).join("");
					return `<tr>${cells}<td><button class="ffd-row-del" data-row="${i}" title="${__("Remove")}">×</button></td></tr>`;
				}).join("");
				return `<div class="ffd-grid-wrap"><table class="ffd-grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
			}
			const head = ["LABEL", "TYPE", "OPTIONS", "REQ", "HIDE", ""].map((h) => `<th>${h}</th>`).join("");
			const body = state.rows.map((row, i) => `<tr>
				<td><input class="ffd-in" data-row="${i}" data-k="field_label" value="${escapeHtml(row.field_label || "")}" placeholder="${__("Field Label")}"/></td>
				<td><select class="ffd-in" data-row="${i}" data-k="field_type">${FIELD_TYPE_OPTIONS.map((t) => `<option ${t === row.field_type ? "selected" : ""}>${t}</option>`).join("")}</select></td>
				<td>${optionsCell(row, i)}</td>
				<td><input type="checkbox" class="ffd-chk" data-row="${i}" data-k="reqd" ${row.reqd ? "checked" : ""}/></td>
				<td><input type="checkbox" class="ffd-chk" data-row="${i}" data-k="hidden" ${row.hidden ? "checked" : ""}/></td>
				<td><button class="ffd-row-del" data-row="${i}" title="${__("Remove")}">×</button></td>
			</tr>`).join("");
			return `<div class="ffd-grid-wrap"><table class="ffd-grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
		}

		function render() {
			const h = hostEl();
			if (!h) return;
			if (!state.flow.length) {
				h.innerHTML = `<div style="padding:20px;color:#6B7280;">${__("Loading…")}</div>`;
				return;
			}
			const hint = state.mode === MAP_MODE
				? __("Pick the existing field on each doctype. Leave a cell blank to skip that doctype. The first column is the source.")
				: __("New field is created on every doctype in the flow above.");
			h.innerHTML = renderFlowbar()
				+ `<div class="ffd-hint">${hint}</div>`
				+ renderGrid()
				+ `<button class="ffd-add-row">+ ${__("Add field")}</button>`;
			bindGrid();
		}

		function syncFromDom() {
			const h = hostEl();
			if (!h) return;
			if (state.mode === MAP_MODE) {
				state.rows.forEach((row, i) => {
					row.fields = row.fields || {};
					state.flow.forEach((f) => {
						const el = h.querySelector(`select.ffd-cell[data-row="${i}"][data-dt="${f.doctype}"]`);
						if (el) row.fields[f.doctype] = el.value;
					});
				});
			} else {
				state.rows.forEach((row, i) => {
					h.querySelectorAll(`.ffd-in[data-row="${i}"]`).forEach((el) => { row[el.getAttribute("data-k")] = el.value; });
					h.querySelectorAll(`.ffd-chk[data-row="${i}"]`).forEach((el) => { row[el.getAttribute("data-k")] = el.checked ? 1 : 0; });
				});
			}
		}

		function bindGrid() {
			const h = hostEl();
			const addRow = h.querySelector(".ffd-add-row");
			if (addRow) addRow.addEventListener("click", () => { syncFromDom(); state.rows.push(emptyRow()); render(); });
			const addDt = h.querySelector(".ffd-add-dt");
			if (addDt) addDt.addEventListener("click", addDoctype);
			const chipX = h.querySelector(".ffd-chip-x");
			if (chipX) chipX.addEventListener("click", removeLastDoctype);
			h.querySelectorAll(".ffd-row-del").forEach((b) => b.addEventListener("click", () => {
				const i = +b.getAttribute("data-row");
				syncFromDom();
				state.rows.splice(i, 1);
				if (!state.rows.length) state.rows.push(emptyRow());
				render();
			}));
			// Create mode: changing the type re-renders so the Options cell adapts.
			h.querySelectorAll('select.ffd-in[data-k="field_type"]').forEach((sel) =>
				sel.addEventListener("change", () => { syncFromDom(); render(); }));
			h.querySelectorAll(".ffd-opts-btn").forEach((b) =>
				b.addEventListener("click", () => openOptionsEditor(+b.getAttribute("data-row"))));
			// Map mode: selecting the source field auto-fills same-named cells downstream.
			if (state.mode === MAP_MODE && state.flow.length) {
				const src = state.flow[0].doctype;
				h.querySelectorAll(`select.ffd-cell[data-dt="${src}"]`).forEach((sel) => sel.addEventListener("change", () => {
					const i = +sel.getAttribute("data-row");
					const val = sel.value;
					state.flow.forEach((f, idx) => {
						if (idx === 0) return;
						const cell = h.querySelector(`select.ffd-cell[data-row="${i}"][data-dt="${f.doctype}"]`);
						if (cell && !cell.value && (f.fields || []).some((x) => x.value === val)) cell.value = val;
					});
				}));
			}
		}

		function pushDoctype(dt, docfield) {
			frappe.call({ method: `${FF}.get_doctype_mappable_fields`, args: { doctype: dt } }).then((r) => {
				syncFromDom();
				state.flow.push({ doctype: dt, docfield: docfield, fields: (r && r.message) || [] });
				render();
			});
		}

		function pickLink(dt, cands) {
			const dlg = new frappe.ui.Dialog({
				title: __("Choose link field"),
				fields: [{
					fieldname: "lf", fieldtype: "Select", reqd: 1,
					label: __("Link field on {0} that connects into the flow", [dt]),
					options: cands.map((c) => c.label).join("\n"),
				}],
				primary_action_label: __("Add"),
				primary_action(v) { dlg.hide(); const c = cands.find((x) => x.label === v.lf); if (c) pushDoctype(dt, c.docfield); },
			});
			dlg.show();
		}

		function addDoctype() {
			const dlg = new frappe.ui.Dialog({
				title: __("Add doctype to flow"),
				fields: [{ fieldname: "dt", fieldtype: "Link", options: "DocType", label: __("DocType"), reqd: 1 }],
				primary_action_label: __("Next"),
				primary_action(v) {
					const dt = v.dt;
					dlg.hide();
					if (!dt) return;
					if (state.flow.some((f) => f.doctype === dt)) { frappe.msgprint(__("{0} is already in the flow.", [dt])); return; }
					frappe.call({
						method: `${FF}.resolve_flow_link`,
						args: { target_doctype: dt, existing_doctypes: JSON.stringify(state.flow.map((f) => f.doctype)) },
					}).then((r) => {
						const cands = (r && r.message) || [];
						if (!cands.length) {
							frappe.msgprint(__("No Link field on {0} points to a doctype already in the flow. Add such a Link field first.", [dt]));
						} else if (cands.length === 1) {
							pushDoctype(dt, cands[0].docfield);
						} else {
							pickLink(dt, cands);
						}
					});
				},
			});
			dlg.show();
		}

		function removeLastDoctype() {
			if (state.flow.length <= 1) return;
			syncFromDom();
			const removed = state.flow.pop();
			if (state.mode === MAP_MODE) state.rows.forEach((row) => { if (row.fields) delete row.fields[removed.doctype]; });
			render();
		}

		function onSubmit() {
			syncFromDom();
			const editable = d.get_value("editable_after_fetch") ? 1 : 0;
			let rows = [];
			if (state.mode === MAP_MODE) {
				rows = state.rows
					.filter((r) => r.fields && Object.values(r.fields).some((v) => v))
					.map((r) => ({ fields: r.fields }));
			} else {
				rows = state.rows.filter((r) => (r.field_label || "").trim()).map((r) => {
					const out = { field_label: r.field_label, field_type: r.field_type, reqd: r.reqd ? 1 : 0, hidden: r.hidden ? 1 : 0 };
					if (r.field_type === "Link") out.field_options = (r.options_raw || "").trim();
					else if (r.field_type === "Select") out.select_options = (r.options_raw || "").replace(/[;,]/g, "\n");
					return out;
				});
			}
			if (!rows.length) { frappe.msgprint(__("Add at least one field to map/create.")); return; }

			const payload = {
				flow_name: state.flow_name,
				flow: state.flow.map((f) => ({ target_doctype: f.doctype, docfield: f.docfield })),
				source_mode: state.mode,
				editable_after_fetch: editable,
				section: d.get_value("section") || "",
				rows: rows,
			};
			d.disable_primary_action();
			frappe.call({
				method: `${FF}.save_field_flows_bulk`,
				args: { payload: JSON.stringify(payload) },
				freeze: true,
				freeze_message: __("Creating field flows…"),
			}).then((r) => {
				d.enable_primary_action();
				const res = (r && r.message) || {};
				const created = (res.created || []).length;
				const errs = res.errors || [];
				if (errs.length) {
					frappe.msgprint({
						title: __("Some rows could not be applied"),
						indicator: "orange",
						message: errs.map((e) => `${__("Row")} ${e.row}: ${frappe.utils.escape_html(e.error)}`).join("<br>"),
					});
				}
				if (created) {
					frappe.show_alert({ message: __("{0} field flow(s) created", [created]), indicator: "green" });
					d.hide();
					frm.reload_doc();
				}
			}).catch(() => d.enable_primary_action());
		}

		function loadFlow() {
			frappe.call({ method: `${FF}.get_field_flow_picker` }).then((r) => {
				const m = (r && r.message) || {};
				state.flow_name = m.flow_name || "Recruitment Profile Flow";
				state.flow = (m.doctypes || []).map((x) => ({ doctype: x.doctype, docfield: x.docfield || "", fields: x.fields || [] }));
				if (!state.rows.length) state.rows = [emptyRow()];
				render();
			});
		}

		injectStyles();
		d = new frappe.ui.Dialog({
			title: __("Add / Map Custom Fields"),
			size: "extra-large",
			fields: [
				{
					fieldname: "source_mode", fieldtype: "Select", label: __("Mode"),
					options: ["Create New Field", MAP_MODE].join("\n"), default: "Create New Field",
					onchange() {
						state.mode = d.get_value("source_mode");
						state.rows = [emptyRow()];
						// Section only governs where a newly created field lands;
						// mapped existing fields keep their own placement.
						d.set_df_property("section", "hidden", state.mode === MAP_MODE ? 1 : 0);
						render();
					},
				},
				{
					fieldname: "section", fieldtype: "Select", label: __("Section"),
					options: sectionOptions.join("\n"), default: defaultSection,
					description: __("The section on the applicant profile this field is added to."),
				},
				{
					fieldname: "editable_after_fetch", fieldtype: "Check", default: 1,
					label: __("Editable After Fetch (pre-fill downstream but keep editable)"),
				},
				{ fieldtype: "HTML", fieldname: "grid_host" },
			],
			primary_action_label: __("Update"),
			primary_action() { onSubmit(); },
		});
		d.show();
		loadFlow();
	}

	/**
	 * Reposition fields: drop on a row to reorder inside the section, drop on a
	 * sidebar section (or use the grip / bulk Move) to change section.
	 *
	 * The child table's own order IS the order every consumer renders in, so
	 * reordering the rows and renumbering `idx` is all this has to do; Save
	 * persists it and the channel forms follow.
	 */
	function moveRows(host, frm, state, refs, dest) {
		const list = frm.doc.default_application_fields || [];
		const result = AFU.applyMove(
			list, refs, dest,
			(r) => r.section || "General",
			(r, s) => { r.section = s; }
		);
		if (!result) return;

		result.rows.forEach((r, i) => { r.idx = i + 1; });
		frm.doc.default_application_fields = result.rows;
		frm.refresh_field("default_application_fields");
		frm.dirty();

		// Follow the fields to wherever they landed, and keep the section they left
		// listed even if it is now empty (see renderUI) so the move is reversible.
		state.activeSection = result.section;
		renderUI(host, frm, state);
		frappe.show_alert({
			message: __("{0} field(s) moved to {1}", [refs.length, escapeHtml(result.section)]),
			indicator: "green",
		});
	}


	// Applicability dialog styles (it renders in frappe's modal, outside the grid).
	// Colours match the grid: blue = Company, violet = Assignment.
	function injectApplicabilityStyles() {
		if (document.getElementById("japs-appl-styles")) return;
		const el = document.createElement("style");
		el.id = "japs-appl-styles";
		el.textContent = `
			.japs-appl { --co:#2563EB; --as:#7C3AED; --ok:#15803D; --no:#B45309; }
			[data-theme="dark"] .japs-appl { --co:#60A5FA; --as:#A78BFA; --ok:#4ADE80; --no:#FBBF24; }
			.japs-appl-ico { width:13px; height:13px; flex:none; }

			.japs-appl-hero {
				padding:14px 16px; border-radius:10px; margin-bottom:14px;
				background:linear-gradient(135deg, color-mix(in srgb, var(--co) 9%, transparent),
					color-mix(in srgb, var(--as) 9%, transparent));
				border:1px solid color-mix(in srgb, var(--as) 18%, transparent);
			}
			.japs-appl-hero-title { font-size:15px; font-weight:600; color:var(--text-color); }
			.japs-appl-hero-sub { font-size:12px; color:var(--text-muted); margin-top:4px; line-height:1.55; }
			.japs-appl-hero-sub b { color:var(--text-color); }

			.japs-appl-grid { display:grid; grid-template-columns: minmax(0,1.15fr) minmax(0,1fr); gap:16px; }
			@media (max-width: 860px) { .japs-appl-grid { grid-template-columns: 1fr; } }
			.japs-appl-label {
				font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase;
				color:var(--text-muted); margin:0 0 7px;
			}

			.japs-appl-tabs { display:flex; gap:6px; margin-bottom:10px; }
			.japs-appl-tab {
				--c: var(--co);
				flex:1; display:inline-flex; align-items:center; justify-content:center; gap:6px;
				border:1px solid var(--border-color); background:transparent; border-radius:8px;
				padding:7px 10px; font-size:12.5px; font-weight:600; cursor:pointer; color:var(--text-muted);
				transition: background .12s, border-color .12s, color .12s;
			}
			.japs-appl-tab[data-type="Assignment"] { --c: var(--as); }
			.japs-appl-tab:hover { color:var(--c); }
			.japs-appl-tab.active {
				border-color:var(--c); color:var(--c); background:color-mix(in srgb, var(--c) 9%, transparent);
			}
			.japs-appl-tab-n {
				min-width:18px; padding:0 6px; border-radius:999px; font-size:10.5px; line-height:17px;
				background:color-mix(in srgb, var(--c) 16%, transparent); color:var(--c);
			}

			.japs-appl-search { margin-bottom:8px; }
			.japs-appl-list {
				height:286px; overflow-y:auto; border:1px solid var(--border-color);
				border-radius:8px; padding:4px;
			}
			.japs-appl-opt {
				--c: var(--co);
				display:flex; align-items:flex-start; gap:9px; padding:7px 9px; border-radius:6px;
				font-weight:400; margin:0; cursor:pointer; border:1px solid transparent;
			}
			.japs-appl-opt.is-assignment { --c: var(--as); }
			.japs-appl-opt:hover { background:color-mix(in srgb, var(--c) 6%, transparent); }
			.japs-appl-opt.is-picked {
				background:color-mix(in srgb, var(--c) 9%, transparent);
				border-color:color-mix(in srgb, var(--c) 30%, transparent);
			}
			.japs-appl-opt input { margin:2px 0 0; accent-color:var(--c); flex:none; }
			.japs-appl-opt-main { min-width:0; }
			.japs-appl-opt-name { font-size:13px; color:var(--text-color); font-weight:500; }
			.japs-appl-opt-sub { font-size:11px; color:var(--text-muted); margin-top:2px; line-height:1.45; }
			.japs-appl-opt-sub b { font-weight:600; color:var(--c); }
			.japs-appl-opt.is-dead { opacity:.55; cursor:not-allowed; }
			.japs-appl-empty { font-size:12px; color:var(--text-muted); padding:16px 10px; text-align:center; }

			.japs-appl-selected { display:flex; flex-wrap:wrap; gap:6px; min-height:30px; align-content:flex-start; }
			.japs-appl-chip {
				--c: var(--co);
				display:inline-flex; align-items:center; gap:5px; max-width:100%; padding:3px 5px 3px 9px;
				border-radius:999px; font-size:11.5px; font-weight:600; color:var(--c);
				border:1px solid color-mix(in srgb, var(--c) 30%, transparent);
				background:color-mix(in srgb, var(--c) 10%, transparent);
			}
			.japs-appl-chip.is-assignment { --c: var(--as); }
			.japs-appl-chip span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
			.japs-appl-chip button {
				border:none; background:transparent; cursor:pointer; color:inherit; flex:none;
				font-size:15px; line-height:1; padding:0 3px; border-radius:50%;
			}
			.japs-appl-chip button:hover { background:color-mix(in srgb, var(--c) 18%, transparent); }
			.japs-appl-none { font-size:12px; color:var(--text-muted); padding:5px 0; }

			.japs-appl-preview {
				margin-top:14px; border:1px solid var(--border-color); border-radius:10px; padding:12px;
			}
			.japs-appl-meter { height:8px; border-radius:999px; overflow:hidden; display:flex;
				background:color-mix(in srgb, var(--no) 22%, transparent); margin:8px 0 6px; }
			.japs-appl-meter > i { display:block; height:100%; background:var(--ok); transition: width .25s; }
			.japs-appl-stat { font-size:12.5px; color:var(--text-color); }
			.japs-appl-stat b.ok { color:var(--ok); } .japs-appl-stat b.no { color:var(--no); }
			.japs-appl-plist { margin:8px 0 0; padding:0; list-style:none; max-height:196px; overflow-y:auto; }
			.japs-appl-plist li { display:flex; gap:7px; align-items:flex-start; font-size:11.5px; padding:3px 0; color:var(--text-color); }
			.japs-appl-plist li .why { color:var(--text-muted); }
			.japs-appl-plist li.no { color:var(--text-muted); }
			.japs-appl-dot { width:7px; height:7px; border-radius:50%; margin-top:5px; flex:none; background:var(--ok); }
			.japs-appl-plist li.no .japs-appl-dot { background:var(--no); }
			.japs-appl-loading { opacity:.5; transition:opacity .15s; }
		`;
		document.head.appendChild(el);
	}

	// ------------------------------------------------------------ applicability --

	/** Exclusion list + labels for the values rules use, in one call, cached on `frm`. */
	function loadApplicabilityMeta(frm) {
		if (frm._applMeta) return Promise.resolve(frm._applMeta);
		return frappe.xcall(`${APPL}.get_applicability_bootstrap`)
			.then((b) => {
				frm._applMeta = {
					excluded: new Set((b && b.excluded) || []),
					labels: {
						Company: Object.assign({}, (b && b.labels && b.labels.Company) || {}),
						Assignment: Object.assign({}, (b && b.labels && b.labels.Assignment) || {}),
					},
					configRoute: (b && b.config_route) || "/app/job-applicant-applicability-configuration",
				};
				return frm._applMeta;
			})
			.catch(() => {
				// The grid still works without this column.
				frm._applMeta = { excluded: new Set(), labels: { Company: {}, Assignment: {} }, configRoute: "" };
				return frm._applMeta;
			});
	}

	/** The `opts` every renderRow/headerRows call on this page shares. */
	function rowOpts(frm, state) {
		const meta = frm._applMeta;
		return {
			// `lockable` — this is the one page that may set or lift a lock.
			lockable: true,
			applicability: true,
			// PROFILE VIEW PERMISSIONS instead of GENERAL / PRE-OFFER RULES, which
			// are per-opening and live on the Job Opening.
			profilePermissions: true,
			searching: !!(state && (state.search || "").trim()),
			applicabilityExcluded: meta ? meta.excluded : new Set(),
			applicabilityLabels: meta ? meta.labels : {},
			applicabilityConfigRoute: meta ? meta.configRoute : "",
		};
	}

	/**
	 * Applicability dialog: pick Companies / Assignments, see a live preview of the
	 * open openings affected. Only the list, chips and preview redraw, so the search
	 * box keeps focus. `onDone(applied)` runs on close.
	 */
	function openApplicabilityDialog(host, frm, state, ref, onDone) {
		const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === ref);
		if (!row) return;

		const I = AFU.APPL_ICON;
		const meta = frm._applMeta || { labels: { Company: {}, Assignment: {} } };
		const picked = new Map(); // "Type::value" → {type, value}
		AFU.parseApplicability(row.applicability_config).forEach((e) => picked.set(`${e.type}::${e.value}`, e));

		let activeType = "Company";
		let query = "";
		let applied = false;
		const cache = {};   // "Type|query" → choices
		let listSeq = 0, previewSeq = 0, previewTimer = null, searchTimer = null;

		const labelOf = (e) => (meta.labels[e.type] || {})[e.value] || e.value;
		const countOf = (type) => [...picked.values()].filter((e) => e.type === type).length;

		const d = new frappe.ui.Dialog({
			title: __("Applicability · {0}", [escapeHtml(row.display_name || ref)]),
			size: "extra-large",
			fields: [{ fieldtype: "HTML", fieldname: "body" }],
			primary_action_label: __("Apply"),
			primary_action() {
				const entries = [...picked.values()]
					.map((e) => ({ type: e.type, value: e.value }))
					.sort((a, b) => (a.type + a.value).localeCompare(b.type + b.value));
				const next = entries.length ? JSON.stringify(entries) : "";
				// Nothing selected = no restriction: switch the field back off.
				const enabled = entries.length ? 1 : 0;
				if (next !== (row.applicability_config || "") || enabled !== (row.applicable_enabled ? 1 : 0)) {
					row.applicability_config = next;
					row.applicable_enabled = enabled;
					frm.refresh_field("default_application_fields");
					frm.dirty();
				}
				applied = true;
				d.hide();
			},
			secondary_action_label: __("Clear all"),
			secondary_action() {
				picked.clear();
				drawTabs(); drawList(); drawChips(); schedulePreview();
			},
		});
		d.onhide = () => {
			if (onDone) onDone(applied);
			renderUI(host, frm, state);
		};

		const $body = d.fields_dict.body.$wrapper;
		$body.html(`
			<div class="japs-appl">
				<div class="japs-appl-hero">
					<div class="japs-appl-hero-title">${__("Who should see {0}?", [
						`<b>${escapeHtml(row.display_name || ref)}</b>`,
					])}</div>
					<div class="japs-appl-hero-sub">${__(
						"Pick companies and/or assignments. The field is shown on a Job Opening that matches <b>any one</b> of them, and left out of the application form on every other opening — on Careers, IJP, Refer, Campus and Pre-offer alike."
					)}</div>
				</div>
				<div class="japs-appl-grid">
					<div>
						<div class="japs-appl-tabs"></div>
						<input class="japs-appl-search form-control" type="text"/>
						<div class="japs-appl-list"></div>
					</div>
					<div>
						<div class="japs-appl-label japs-appl-sel-label"></div>
						<div class="japs-appl-selected"></div>
						<div class="japs-appl-preview"></div>
					</div>
				</div>
			</div>`);

		const $tabs = $body.find(".japs-appl-tabs");
		const $search = $body.find(".japs-appl-search");
		const $list = $body.find(".japs-appl-list");
		const $selLabel = $body.find(".japs-appl-sel-label");
		const $chips = $body.find(".japs-appl-selected");
		const $preview = $body.find(".japs-appl-preview");

		function drawTabs() {
			$tabs.html(["Company", "Assignment"].map((t) => `
				<button class="japs-appl-tab${t === activeType ? " active" : ""}" data-type="${t}">
					${t === "Company" ? I.company : I.assignment}
					${t === "Company" ? __("Companies") : __("Assignments")}
					<span class="japs-appl-tab-n">${countOf(t)}</span>
				</button>`).join(""));
			$tabs.find(".japs-appl-tab").on("click", (e) => {
				activeType = e.currentTarget.getAttribute("data-type");
				query = "";
				$search.val("").attr("placeholder", activeType === "Company"
					? __("Search companies…") : __("Search assignments…"));
				drawTabs(); drawList();
			});
		}

		function describeConditions(o) {
			if (!o.conditions || !o.conditions.length) {
				return __("Has no Job Opening conditions — it would match every opening, so it can't narrow anything.");
			}
			const joiner = o.joiner === "or" ? ` ${__("or")} ` : ` ${__("and")} `;
			return o.conditions.map((c) =>
				`${escapeHtml(c.label)} ${__("is")} <b>${escapeHtml(c.values.join(" / "))}</b>`
			).join(joiner);
		}

		function drawList() {
			const type = activeType, q = query, key = `${type}|${q}`, seq = ++listSeq;
			const paint = (choices) => {
				if (seq !== listSeq) return; // a newer search already answered
				if (!choices.length) {
					$list.html(`<div class="japs-appl-empty">${q
						? __("Nothing matches “{0}”.", [escapeHtml(q)])
						: type === "Assignment"
							? __("No Attributes assignments apply to Job Opening yet.")
							: __("No companies found.")}</div>`);
					return;
				}
				// Chosen items first.
				const ordered = choices.slice().sort((a, b) =>
					picked.has(`${type}::${b.value}`) - picked.has(`${type}::${a.value}`));
				$list.html(ordered.map((o) => {
					const k = `${type}::${o.value}`;
					const dead = type === "Assignment" && !o.narrows;
					const on = picked.has(k);
					// Show id / abbreviation only when they differ from the name.
					const extras = type === "Company"
						? [o.value !== o.label ? o.value : "", o.abbr && o.abbr !== o.value ? o.abbr : ""].filter(Boolean)
						: [];
					const sub = type === "Assignment" ? describeConditions(o) : escapeHtml(extras.join(" · "));
					return `<label class="japs-appl-opt is-${type.toLowerCase()}${on ? " is-picked" : ""}${dead ? " is-dead" : ""}"
						title="${dead ? escapeHtml(__("This assignment has no Job Opening conditions")) : ""}">
						<input type="checkbox" data-key="${escapeHtml(k)}" data-label="${escapeHtml(o.label || o.value)}"
							${on ? "checked" : ""}${dead && !on ? " disabled" : ""}/>
						<span class="japs-appl-opt-main">
							<div class="japs-appl-opt-name">${escapeHtml(o.label || o.value)}</div>
							${sub ? `<div class="japs-appl-opt-sub">${sub}</div>` : ""}
						</span>
					</label>`;
				}).join(""));
				$list.find("input[type=checkbox]").on("change", (e) => {
					const k = e.currentTarget.getAttribute("data-key");
					const [t, ...rest] = k.split("::");
					const value = rest.join("::");
					if (e.currentTarget.checked) {
						picked.set(k, { type: t, value });
						// Keep the label for the grid chip.
						(meta.labels[t] = meta.labels[t] || {})[value] = e.currentTarget.getAttribute("data-label");
					} else {
						picked.delete(k);
					}
					e.currentTarget.closest(".japs-appl-opt").classList.toggle("is-picked", e.currentTarget.checked);
					drawTabs(); drawChips(); schedulePreview();
				});
			};
			if (cache[key]) return paint(cache[key]);
			$list.addClass("japs-appl-loading");
			frappe.xcall(`${APPL}.get_applicability_choices`, { applicable_type: type, txt: q, limit: 80 })
				.then((r) => { cache[key] = r || []; $list.removeClass("japs-appl-loading"); paint(cache[key]); })
				.catch(() => { $list.removeClass("japs-appl-loading"); paint([]); });
		}

		function drawChips() {
			const all = [...picked.values()];
			$selLabel.text(__("Selected ({0})", [all.length]));
			$chips.html(all.length
				? all.map((e) => `<span class="japs-appl-chip is-${e.type.toLowerCase()}" title="${escapeHtml(`${e.type}: ${labelOf(e)}`)}">
						${e.type === "Company" ? I.company : I.assignment}<span>${escapeHtml(labelOf(e))}</span>
						<button data-key="${escapeHtml(`${e.type}::${e.value}`)}" title="${__("Remove")}">&times;</button>
					</span>`).join("")
				: `<div class="japs-appl-none">${__("Nothing selected — the field is shown on every opening.")}</div>`);
			$chips.find("button").on("click", (e) => {
				picked.delete(e.currentTarget.getAttribute("data-key"));
				drawTabs(); drawList(); drawChips(); schedulePreview();
			});
		}

		function schedulePreview() {
			clearTimeout(previewTimer);
			$preview.addClass("japs-appl-loading");
			previewTimer = setTimeout(drawPreview, 250);
		}

		function drawPreview() {
			const seq = ++previewSeq;
			const config = JSON.stringify([...picked.values()]);
			frappe.xcall(`${APPL}.preview_applicability`, { config }).then((p) => {
				if (seq !== previewSeq || !p) return;
				$preview.removeClass("japs-appl-loading");
				const pct = p.total ? Math.round((p.shown_count / p.total) * 100) : 0;
				const shown = (p.shown || []).map((o) => `<li><span class="japs-appl-dot"></span><span>
					<b>${escapeHtml(o.title)}</b> <span class="why">· ${escapeHtml(o.company)}${
						o.reason ? ` · ${escapeHtml(o.reason)}` : ""}</span></span></li>`).join("");
				const hidden = (p.hidden || []).map((o) => `<li class="no"><span class="japs-appl-dot"></span><span>
					${escapeHtml(o.title)} <span class="why">· ${escapeHtml(o.company)}</span></span></li>`).join("");
				const more = (n, listed) => (n > listed ? `<li class="no" style="padding-left:14px">${
					__("…and {0} more", [n - listed])}</li>` : "");
				$preview.html(`
					<div class="japs-appl-label" style="margin:0">${__("Live preview · open Job Openings")}</div>
					<div class="japs-appl-meter"><i style="width:${pct}%"></i></div>
					<div class="japs-appl-stat">${picked.size
						? __("Shown on {0} of {1} · hidden on {2}", [
							`<b class="ok">${p.shown_count}</b>`, p.total, `<b class="no">${p.hidden_count}</b>`])
						: __("No restriction — shown on all {0}", [`<b class="ok">${p.total}</b>`])}${
						p.capped ? ` <span class="text-muted">(${__("first {0} checked", [p.limit])})</span>` : ""}</div>
					<ul class="japs-appl-plist">
						${shown}${more(p.shown_count, (p.shown || []).length)}
						${picked.size ? hidden + more(p.hidden_count, (p.hidden || []).length) : ""}
					</ul>`);
			}).catch(() => {
				if (seq !== previewSeq) return;
				$preview.removeClass("japs-appl-loading").html(
					`<div class="japs-appl-none">${__("Preview unavailable.")}</div>`);
			});
		}

		$search.attr("placeholder", __("Search companies…")).on("input", () => {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(() => { query = ($search.val() || "").trim(); drawList(); }, 220);
		});

		drawTabs(); drawList(); drawChips(); drawPreview();
		// An assignment-only rule opens on the Assignments tab.
		if (!countOf("Company") && countOf("Assignment")) $tabs.find('[data-type="Assignment"]').trigger("click");
		d.show();
		setTimeout(() => $search.trigger("focus"), 250);
	}


	function renderUI(host, frm, state) {
		const rows = frm.doc.default_application_fields || [];

		const sectionsList = [];
		const counts = {};
		rows.forEach((r) => {
			const s = r.section || "General";
			if (!(s in counts)) { sectionsList.push(s); counts[s] = 0; }
			counts[s] += 1;
		});

		// Sections are derived from the rows, so emptying one would delete the only
		// drop target that could put its fields back. Keep every section seen this
		// session listed, at the position it held.
		(state.knownSections || []).forEach((s, i) => {
			if (sectionsList.includes(s)) return;
			sectionsList.splice(Math.min(i, sectionsList.length), 0, s);
			counts[s] = 0;
		});
		state.knownSections = sectionsList.slice();

		if (!rows.length) {
			host.innerHTML = AFU.emptyState(
				__("No fields configured. Use <b>Add Custom Field</b> to add Job Applicant fields.")
			);
			return;
		}

		const active = state.activeSection && sectionsList.includes(state.activeSection)
			? state.activeSection
			: sectionsList[0];
		state.activeSection = active;

		const sideHtml = `<div class="apf-side-head">${__("Sections")}</div>` + sectionsList.map((s) => `
			<div class="apf-side-item ${s === active ? "active" : ""}" data-section="${escapeHtml(s)}" title="${escapeHtml(s)}">
				<span>${escapeHtml(s)}</span>
				<span class="apf-count">${counts[s]}</span>
			</div>
		`).join("") + `<div class="apf-side-hint">${
			__("Drag a field's ⠿ handle onto a section to move it there, or drop it between rows to reorder.")
		}</div>`;

		// Search spans every section; an empty query shows the active section.
		const q = (state.search || "").trim().toLowerCase();
		const sectionRows = q
			? rows.filter((r) => `${r.display_name || ""} ${r.reference_name || ""}`.toLowerCase().includes(q))
			: rows.filter((r) => (r.section || "General") === active);
		const opts = Object.assign(rowOpts(frm, state), { searching: !!q });
		const bodyHtml = sectionRows.length
			? sectionRows.map((r, i) => AFU.renderRow(r, i, opts)).join("")
			: `<tr><td colspan="${AFU.totalCols(opts)}">${AFU.emptyState(
					q ? __("No field matches “{0}”.", [state.search]) : __("No fields in this section.")
				)}</td></tr>`;

		host.innerHTML = `
			<div class="apf-container">
				<div class="apf-side">${sideHtml}</div>
				<div class="apf-main">
					<div class="apf-head">
						<div>
							<div class="apf-head-sub">${__("Application Fields")}</div>
							<div class="apf-head-title">${
								q ? __("Search results") : escapeHtml(active)
							}</div>
						</div>
						<button class="apf-add-field" data-section="${escapeHtml(active)}">+ ${__("Add Custom Field")}</button>
					</div>
					${AFU.toolbarHtml(sectionsList, { search: state.search || "" })}
					<div class="apf-scroll">
						<table class="apf-table">
							<thead>${AFU.headerRows(opts)}</thead>
							<tbody>${bodyHtml}</tbody>
						</table>
					</div>
				</div>
			</div>`;

		bindEvents(host, frm, state);
	}

	function bindEvents(host, frm, state) {
		host.querySelectorAll(".apf-add-field").forEach((btn) => {
			btn.addEventListener("click", () => {
				openFieldFlowDialog(frm, btn.getAttribute("data-section"));
			});
		});

		host.querySelectorAll(".apf-side-item").forEach((el) => {
			el.addEventListener("click", () => {
				state.activeSection = el.getAttribute("data-section");
				// Picking a section clears the search.
				state.search = "";
				renderUI(host, frm, state);
			});
		});

		// Editable label
		host.querySelectorAll("input.apf-label-input").forEach((inp) => {
			inp.addEventListener("change", () => {
				const ref = inp.getAttribute("data-ref");
				const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === ref);
				if (!row) return;
				row.display_name = inp.value.trim() || ref;
				inp.value = row.display_name;
				frm.refresh_field("default_application_fields");
				frm.dirty();
			});
		});

		host.querySelectorAll(".apf-appl-edit, .apf-appl-summary").forEach((btn) => {
			btn.addEventListener("click", () => {
				openApplicabilityDialog(host, frm, state, btn.getAttribute("data-ref"));
			});
		});

		// PROFILE VIEW PERMISSIONS, written straight onto the settings row.
		AFU.bindRoleCells(
			host,
			(ref, col) => {
				const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === ref);
				return row ? row[col] : "";
			},
			(ref, col, json) => {
				const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === ref);
				if (!row) return;
				row[col] = json;
				frm.refresh_field("default_application_fields");
				frm.dirty();
			}
		);

		// Applicable To needs a redraw, not just a value write.
		host.querySelectorAll("input.apf-appl-toggle").forEach((cb) => {
			cb.addEventListener("change", () => {
				const ref = cb.getAttribute("data-ref");
				const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === ref);
				if (!row) return;
				row.applicable_enabled = cb.checked ? 1 : 0;
				frm.refresh_field("default_application_fields");
				frm.dirty();
				if (cb.checked && !AFU.parseApplicability(row.applicability_config).length) {
					// Nothing chosen yet — open the picker now.
					openApplicabilityDialog(host, frm, state, ref, (applied) => {
						if (!applied && !AFU.parseApplicability(row.applicability_config).length) {
							row.applicable_enabled = 0;
							frm.refresh_field("default_application_fields");
							frappe.show_alert({
								message: __("Nothing chosen — {0} stays on all openings.", [escapeHtml(row.display_name || ref)]),
								indicator: "orange",
							});
						}
					});
					return;
				}
				renderUI(host, frm, state);
			});
		});

		host.querySelectorAll("input[type=checkbox][data-ref][data-col]").forEach((cb) => {
			if (cb.classList.contains("apf-child-toggle")) return;
			if (cb.classList.contains("apf-appl-toggle")) return;
			cb.addEventListener("change", () => {
				const ref = cb.getAttribute("data-ref");
				const col = cb.getAttribute("data-col");
				const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === ref);
				if (!row) return;
				row[col] = cb.checked ? 1 : 0;
				frm.refresh_field("default_application_fields");
				frm.dirty();
				AFU.refreshCounts(host);
			});
		});

		host.querySelectorAll("select[data-ref][data-col]").forEach((sel) => {
			sel.addEventListener("change", () => {
				const ref = sel.getAttribute("data-ref");
				const col = sel.getAttribute("data-col");
				const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === ref);
				if (!row) return;
				row[col] = sel.value;
				frm.refresh_field("default_application_fields");
				frm.dirty();
			});
		});

		// Child table field visibility toggles
		host.querySelectorAll("input.apf-child-toggle").forEach((cb) => {
			cb.addEventListener("change", () => {
				const parentRef = cb.getAttribute("data-parent-ref");
				const childRef  = cb.getAttribute("data-child-ref");
				const col       = cb.getAttribute("data-col");
				const row = (frm.doc.default_application_fields || []).find((r) => r.reference_name === parentRef);
				if (!row) return;
				let config = {};
				try { config = JSON.parse(row.child_field_config || "{}"); } catch (e) { /* ignore */ }
				if (config[childRef]) config[childRef][col] = cb.checked ? 1 : 0;
				row.child_field_config = JSON.stringify(config);
				frm.refresh_field("default_application_fields");
				frm.dirty();
			});
		});

		// Expand / collapse child field config panels
		host.querySelectorAll(".apf-expand").forEach((btn) => {
			btn.addEventListener("click", () => {
				const ref = btn.getAttribute("data-ref");
				const childRow = host.querySelector(`.apf-child-row[data-parent-ref="${ref}"]`);
				if (!childRow) return;
				const open = childRow.style.display !== "none";
				childRow.style.display = open ? "none" : "";
				btn.textContent = open ? "▶ Child Fields" : "▼ Child Fields";
			});
		});

		host.querySelectorAll(".apf-delete").forEach((btn) => {
			btn.addEventListener("click", () => {
				const ref = btn.getAttribute("data-ref");
				const idx = (frm.doc.default_application_fields || []).findIndex((r) => r.reference_name === ref);
				if (idx < 0) return;
				frappe.confirm(`Remove ${ref}?`, () => {
					frm.doc.default_application_fields.splice(idx, 1);
					frm.refresh_field("default_application_fields");
					frm.dirty();
					renderUI(host, frm, state);
				});
			});
		});

		// Search, per-channel tallies, the bulk bar and drag-to-move. `applyBulk`
		// and `moveRows` are the only per-page parts: they write the change into
		// this singleton's own table.
		AFU.bindToolbar(host, {
			totalFields: (frm.doc.default_application_fields || []).length,
			searchActive: !!(state.search || "").trim(),
			onSearch(value) {
				state.search = value;
				renderUI(host, frm, state);
			},
			moveRows(refs, dest) { moveRows(host, frm, state, refs, dest); },
			applyBulk(col, value, refs) {
				const byRef = new Map(
					(frm.doc.default_application_fields || []).map((r) => [r.reference_name, r])
				);
				refs.forEach((ref) => {
					const row = byRef.get(ref);
					if (row) row[col] = value;
				});
				frm.refresh_field("default_application_fields");
				frm.dirty();
			},
		});
	}

	function mountUI(frm) {
		const wrapper = frm.fields_dict.default_fields_ui;
		if (!wrapper) return;
		const host = wrapper.$wrapper && wrapper.$wrapper.find("#japs-fields-host")[0];
		if (!host) return;
		injectStyles();
		injectApplicabilityStyles();
		const state = { activeSection: null };
		// Render after the applicability data loads, to avoid a flicker.
		loadApplicabilityMeta(frm).then(() => renderUI(host, frm, state));
	}

	frappe.ui.form.on("Job Applicant Profile Settings", {
		refresh(frm) { mountUI(frm); },
	});
})();
