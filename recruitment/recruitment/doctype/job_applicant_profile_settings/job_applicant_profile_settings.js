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

	// Field-type list mirrors the nextai Data Element options.
	const FIELD_TYPE_OPTIONS = [
		"Data", "Small Text", "Text", "Select", "Date", "Datetime",
		"Int", "Float", "Currency", "Check", "Link",
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

	function renderUI(host, frm, state) {
		const rows = frm.doc.default_application_fields || [];

		const sectionsList = [];
		const counts = {};
		rows.forEach((r) => {
			const s = r.section || "General";
			if (!(s in counts)) { sectionsList.push(s); counts[s] = 0; }
			counts[s] += 1;
		});

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
		`).join("");

		const sectionRows = rows.filter((r) => (r.section || "General") === active);
		const bodyHtml = sectionRows.length
			? sectionRows.map((r, i) => AFU.renderRow(r, i)).join("")
			: `<tr><td colspan="${AFU.TOTAL_COLS}">${AFU.emptyState(__("No fields in this section."))}</td></tr>`;

		host.innerHTML = `
			<div class="apf-container">
				<div class="apf-side">${sideHtml}</div>
				<div class="apf-main">
					<div class="apf-head">
						<div>
							<div class="apf-head-sub">${__("Application Fields")}</div>
							<div class="apf-head-title">${escapeHtml(active)}</div>
						</div>
						<button class="apf-add-field" data-section="${escapeHtml(active)}">+ ${__("Add Custom Field")}</button>
					</div>
					${AFU.toolbarHtml()}
					<div class="apf-scroll">
						<table class="apf-table">
							<thead>${AFU.headerRows()}</thead>
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

		host.querySelectorAll("input[type=checkbox][data-ref][data-col]").forEach((cb) => {
			if (cb.classList.contains("apf-child-toggle")) return;
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

		// Search, per-channel tallies and the bulk bar. `applyBulk` is the only
		// per-page part: it writes the change into this singleton's own table.
		AFU.bindToolbar(host, {
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
		renderUI(host, frm, { activeSection: null });
	}

	frappe.ui.form.on("Job Applicant Profile Settings", {
		refresh(frm) { mountUI(frm); },
	});
})();
