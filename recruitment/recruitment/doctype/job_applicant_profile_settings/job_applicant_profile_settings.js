/* global frappe, $ */
/**
 * Job Applicant Profile Settings — section list on the LEFT, grouped column
 * table on the RIGHT (only the active section's rows render). Backs the
 * hidden `default_application_fields` table.
 */

(function () {
	const COLUMN_GROUPS = [
		{ key: "careers",  label: "CAREERS",  cls: "careers", cols: [
			{ label: "VIEW",      col: "view_careers",      type: "toggle" },
			{ label: "MANDATORY", col: "mandatory_careers", type: "toggle" },
		]},
		{ key: "ijp",      label: "IJP",      cls: "ijp", cols: [
			{ label: "VIEW",      col: "view_ijp",      type: "toggle" },
			{ label: "MANDATORY", col: "mandatory_ijp", type: "toggle" },
		]},
		{ key: "refer",    label: "REFER",    cls: "refer", cols: [
			{ label: "VIEW",      col: "view_refer",      type: "toggle" },
			{ label: "MANDATORY", col: "mandatory_refer", type: "toggle" },
		]},
		{ key: "preoffer", label: "PRE-OFFER", cls: "preoffer", cols: [
			{ label: "VIEW",      col: "view_preoffer",      type: "toggle" },
			{ label: "MANDATORY", col: "mandatory_preoffer", type: "toggle" },
			{ label: "CTQ",       col: "ctq_flag",           type: "toggle" },
		]},
		{ key: "general",  label: "GENERAL",  cls: "general", cols: [
			{ label: "VISIBILITY",   col: "visibility",   type: "select",
			  options: ["All", "Hiring Team", "Recruiter Only", "Hidden"] },
			{ label: "EDITABILITY",  col: "editability",  type: "select",
			  options: ["Editable", "Read Only"] },
		]},
		{ key: "preoffer-rules", label: "PRE-OFFER RULES", cls: "preoffer-rules", cols: [
			{ label: "PRE-OFFER VISIBILITY",     col: "preoffer_visibility",     type: "select",
			  options: ["Same as visibility", "All", "Hiring Team", "Hidden"] },
			{ label: "PRE-OFFER EDIT/APPROVE",   col: "preoffer_edit_approve",   type: "select",
			  options: ["Editable", "Approval Required", "Read Only"] },
		]},
	];

	const TOTAL_COLS = 4 + COLUMN_GROUPS.reduce((s, g) => s + g.cols.length, 0);
	const CHILD_CHANNEL_GROUPS = [
		{ label: "CAREERS",   cols: [
			{ col: "view_careers",      label: "VIEW" },
			{ col: "mandatory_careers", label: "MANDATORY" },
		]},
		{ label: "IJP",       cols: [
			{ col: "view_ijp",          label: "VIEW" },
			{ col: "mandatory_ijp",     label: "MANDATORY" },
		]},
		{ label: "REFER",     cols: [
			{ col: "view_refer",        label: "VIEW" },
			{ col: "mandatory_refer",   label: "MANDATORY" },
		]},
		{ label: "PRE-OFFER", cols: [
			{ col: "view_preoffer",      label: "VIEW" },
			{ col: "mandatory_preoffer", label: "MANDATORY" },
		]},
	];
	const CHILD_TOTAL_COLS = 1 + CHILD_CHANNEL_GROUPS.reduce((s, g) => s + g.cols.length, 0);

	function escapeHtml(s) {
		if (s === null || s === undefined) return "";
		return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}

	function injectStyles() {
		if (document.getElementById("apf-styles")) return;
		const style = document.createElement("style");
		style.id = "apf-styles";
		style.textContent = `
			.apf-container {
				background: #fff; border: 1px solid #E5E7EB; border-radius: 10px;
				overflow: hidden; display: flex; min-height: 540px;
			}
			.apf-side {
				flex: 0 0 220px; border-right: 1px solid #E5E7EB; background: #FAFAFA;
				overflow-y: auto; max-height: 720px; padding: 8px;
			}
			.apf-side-item {
				display: flex; justify-content: space-between; align-items: center;
				padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
				color: #374151; margin: 2px 0;
			}
			.apf-side-item:hover { background: #E5E7EB; }
			.apf-side-item.active { background: #EFF6FF; color: #1D4ED8; font-weight: 500; border-left: 3px solid #2563EB; }
			.apf-side-item .apf-count {
				font-size: 11px; background: #fff; color: #6B7280;
				padding: 1px 7px; border-radius: 999px; border: 1px solid #E5E7EB;
			}
			.apf-side-item.active .apf-count { background: #DBEAFE; color: #1D4ED8; border-color: transparent; }

			.apf-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
			.apf-head {
				padding: 14px 18px; border-bottom: 1px solid #F3F4F6;
				display: flex; justify-content: space-between; align-items: center;
			}
			.apf-head-title { font-size: 16px; color: #111827; font-weight: 600; }
			.apf-add-field {
				border: none; background: #2563EB; color: #fff; cursor: pointer;
				font-size: 12.5px; font-weight: 600; padding: 7px 14px; border-radius: 6px;
				white-space: nowrap;
			}
			.apf-add-field:hover { background: #1D4ED8; }

			/* Bulk field-flow dialog grid */
			.ffd-flowbar {
				display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
				padding: 8px 2px 12px; border-bottom: 1px solid #F3F4F6; margin-bottom: 10px;
			}
			.ffd-flow-label { font-size: 10.5px; font-weight: 700; color: #6B7280; letter-spacing: 0.06em; margin-right: 4px; }
			.ffd-chip {
				display: inline-flex; align-items: center; gap: 4px; background: #EFF6FF;
				color: #1D4ED8; border: 1px solid #BFDBFE; border-radius: 999px;
				padding: 3px 10px; font-size: 12px; font-weight: 500;
			}
			.ffd-chip-x { border: none; background: transparent; color: #1D4ED8; cursor: pointer; font-size: 14px; line-height: 1; padding: 0 0 0 2px; }
			.ffd-chip-x:hover { color: #B91C1C; }
			.ffd-arrow { color: #9CA3AF; font-size: 13px; }
			.ffd-add-dt {
				border: 1px dashed #93C5FD; background: #fff; color: #2563EB; cursor: pointer;
				font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; margin-left: 4px;
			}
			.ffd-add-dt:hover { background: #EFF6FF; }
			.ffd-hint { font-size: 11.5px; color: #6B7280; margin: 0 0 8px; }
			.ffd-grid-wrap { overflow-x: auto; border: 1px solid #E5E7EB; border-radius: 8px; }
			.ffd-grid { width: 100%; border-collapse: collapse; font-size: 12px; }
			.ffd-grid thead th {
				background: #F9FAFB; color: #6B7280; font-size: 10.5px; font-weight: 600;
				letter-spacing: 0.04em; text-align: left; padding: 7px 8px; border-bottom: 1px solid #E5E7EB;
				white-space: nowrap;
			}
			.ffd-grid tbody td { padding: 5px 8px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
			.ffd-grid tbody tr:last-child td { border-bottom: none; }
			.ffd-cell, .ffd-grid .ffd-in {
				width: 100%; min-width: 130px; border: 1px solid #E5E7EB; border-radius: 5px;
				padding: 4px 6px; font-size: 12px; background: #fff; box-sizing: border-box;
			}
			.ffd-cell:focus, .ffd-grid .ffd-in:focus { border-color: #93C5FD; outline: none; }
			.ffd-opts-btn {
				width: 100%; min-width: 130px; border: 1px solid #D1D5DB; background: #F9FAFB;
				color: #374151; cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: 5px;
				text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
			}
			.ffd-opts-btn:hover { background: #EFF6FF; border-color: #93C5FD; color: #1D4ED8; }
			.ffd-opts-na { color: #9CA3AF; font-size: 12px; padding-left: 6px; }
			.ffd-row-del { border: none; background: transparent; color: #9CA3AF; cursor: pointer; font-size: 15px; padding: 2px 6px; border-radius: 4px; }
			.ffd-row-del:hover { color: #EF4444; background: #FEF2F2; }
			.ffd-add-row {
				border: 1px dashed #D1D5DB; background: #fff; color: #374151; cursor: pointer;
				font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; margin-top: 10px;
			}
			.ffd-add-row:hover { background: #F9FAFB; border-color: #9CA3AF; }
			.apf-head-sub {
				font-size: 11px; color: #6B7280; letter-spacing: 0.05em;
				text-transform: uppercase; margin-top: 2px;
			}
			.apf-scroll { overflow-x: auto; max-height: 660px; }
			.apf-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 1180px; table-layout: fixed; }
			.apf-table thead .apf-group-row th {
				padding: 6px 4px; text-align: center; font-weight: 600;
				font-size: 10.5px; letter-spacing: 0.04em; color: #6B7280;
				border-bottom: 1px solid #E5E7EB;
			}
			.apf-table thead .apf-col-row th {
				padding: 6px 4px; text-align: center; font-weight: 500;
				font-size: 10px; letter-spacing: 0.03em; color: #6B7280;
				background: #F9FAFB; border-bottom: 1px solid #E5E7EB; white-space: nowrap;
				position: sticky; top: 0; z-index: 1;
			}
			.apf-group-careers       { color: #B45309 !important; }
			.apf-group-ijp           { color: #1D4ED8 !important; }
			.apf-group-refer         { color: #047857 !important; }
			.apf-group-preoffer      { color: #C2410C !important; }
			.apf-group-general       { color: #4B5563 !important; }
			.apf-group-preoffer-rules{ color: #B91C1C !important; }

			/* Widened so full column labels fit without truncation */
			.apf-col-check  { width: 32px; }
			.apf-col-no     { width: 36px; }
			.apf-col-field  { width: 200px; }
			.apf-col-toggle { width: 78px; }
			.apf-col-select { width: 140px; }
			.apf-col-actions{ width: 36px; }

			.apf-table tbody td {
				padding: 8px 4px; border-bottom: 1px solid #F3F4F6; vertical-align: middle;
				text-align: center;
			}
			.apf-table tbody tr:hover { background: #FAFAFA; }
			.apf-table tbody td.apf-text { text-align: left; padding-left: 10px; }
			.apf-no { color: #9CA3AF; font-size: 11px; }
			.apf-ref { color: #9CA3AF; font-size: 10.5px; }
			.apf-display { color: #111827; font-weight: 500; font-size: 12px; }
			.apf-label-input {
				border: 1px solid transparent; outline: none; background: transparent;
				color: #111827; font-weight: 500; font-size: 12px;
				width: 100%; padding: 1px 3px; margin: 0; border-radius: 3px; box-sizing: border-box;
			}
			.apf-label-input:hover { background: #F9FAFB; border-color: #D1D5DB; cursor: text; }
			.apf-label-input:focus { background: #EFF6FF; border-color: #93C5FD; cursor: text; }

			.apf-toggle { position: relative; display: inline-block; width: 28px; height: 15px; vertical-align: middle; }
			.apf-toggle input { opacity: 0; width: 0; height: 0; margin: 0; }
			.apf-toggle-slider {
				position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
				background: #E5E7EB; border-radius: 16px; transition: .15s;
			}
			.apf-toggle-slider::before {
				position: absolute; content: ""; height: 11px; width: 11px;
				left: 2px; top: 2px; background: #fff; border-radius: 50%;
				transition: .15s; box-shadow: 0 1px 2px rgba(0,0,0,.15);
			}
			.apf-toggle input:checked + .apf-toggle-slider { background: #3B82F6; }
			.apf-toggle input:checked + .apf-toggle-slider::before { transform: translateX(13px); }

			.apf-select {
				border: 1px solid #E5E7EB; border-radius: 5px; padding: 3px 4px;
				font-size: 11.5px; background: #fff; width: 100%; max-width: 130px;
			}
			.apf-delete {
				border: none; background: transparent; color: #9CA3AF;
				cursor: pointer; padding: 2px 4px; border-radius: 4px; font-size: 14px;
			}
			.apf-delete:hover { color: #EF4444; background: #FEF2F2; }
			.apf-empty { padding: 60px 20px; text-align: center; color: #6B7280; font-size: 13px; }

			/* Child table expand button */
			.apf-expand {
				border: none; background: transparent; color: #6B7280; cursor: pointer;
				font-size: 10px; padding: 1px 4px; border-radius: 3px; margin-top: 2px;
				display: inline-flex; align-items: center; gap: 3px;
			}
			.apf-expand:hover { background: #EFF6FF; color: #1D4ED8; }
			.apf-table-badge {
				display: inline-block; font-size: 9px; font-weight: 600;
				background: #EDE9FE; color: #7C3AED; border-radius: 3px;
				padding: 1px 4px; margin-left: 4px; vertical-align: middle; letter-spacing: 0.03em;
			}

			/* Child config expansion row */
			.apf-child-row td { background: #F8F8FF; border-bottom: 2px solid #E5E7EB !important; padding: 0 !important; }
			.apf-child-container {
				margin: 8px 16px; border: 1px solid #DDD6FE; border-radius: 8px; overflow: hidden;
			}
			.apf-child-header {
				background: #EDE9FE; color: #5B21B6; font-size: 11px; font-weight: 600;
				padding: 6px 12px; letter-spacing: 0.04em; text-transform: uppercase;
			}
			.apf-child-table {
				width: 100%; border-collapse: collapse; font-size: 11.5px;
			}
			.apf-child-table thead th {
				padding: 5px 8px; background: #F5F3FF; color: #6D28D9; font-size: 10px;
				font-weight: 600; text-align: center; border-bottom: 1px solid #DDD6FE;
				letter-spacing: 0.04em;
			}
			.apf-child-table thead th.apf-child-col-field { text-align: left; }
			.apf-child-group-header {
				background: #EDE9FE; color: #5B21B6; font-size: 10px; font-weight: 700;
				border-bottom: 1px solid #C4B5FD; letter-spacing: 0.05em;
			}
			.apf-child-table tbody td {
				padding: 6px 8px; border-bottom: 1px solid #EDE9FE;
				text-align: center; vertical-align: middle;
			}
			.apf-child-table tbody tr:last-child td { border-bottom: none; }
			.apf-child-table tbody td.apf-child-col-field { text-align: left; }
			.apf-child-field-label { color: #111827; font-weight: 500; font-size: 11.5px; }
			.apf-child-field-ref   { color: #9CA3AF; font-size: 10px; }
			.apf-child-empty { padding: 14px; text-align: center; color: #9CA3AF; font-size: 12px; }
		`;
		document.head.appendChild(style);
	}

	function renderToggle(ref, col, checked) {
		return `<label class="apf-toggle">
			<input type="checkbox" data-ref="${escapeHtml(ref)}" data-col="${col}" ${checked ? "checked" : ""}/>
			<span class="apf-toggle-slider"></span>
		</label>`;
	}

	function renderSelect(ref, col, value, options) {
		const opts = options.map((o) =>
			`<option value="${escapeHtml(o)}" ${value === o ? "selected" : ""}>${escapeHtml(o)}</option>`
		).join("");
		return `<select class="apf-select" data-ref="${escapeHtml(ref)}" data-col="${col}">${opts}</select>`;
	}

	function renderChildToggle(parentRef, childRef, col, checked) {
		return `<label class="apf-toggle">
			<input type="checkbox" class="apf-child-toggle"
				data-parent-ref="${escapeHtml(parentRef)}"
				data-child-ref="${escapeHtml(childRef)}"
				data-col="${col}" ${checked ? "checked" : ""}/>
			<span class="apf-toggle-slider"></span>
		</label>`;
	}

	function renderChildConfigRow(row) {
		const ref = row.reference_name || "";
		let config = {};
		try { config = JSON.parse(row.child_field_config || "{}"); } catch (e) { /* ignore */ }

		const entries = Object.entries(config);
		const bodyHtml = entries.length
			? entries.map(([cfn, cfc]) => `
				<tr>
					<td class="apf-child-col-field">
						<div class="apf-child-field-label">${escapeHtml(cfc.label || cfn)}</div>
						<div class="apf-child-field-ref">${escapeHtml(cfn)}</div>
					</td>
					${CHILD_CHANNEL_GROUPS.map((g) => g.cols.map((c) =>
						`<td>${renderChildToggle(ref, cfn, c.col, cfc[c.col])}</td>`
					).join("")).join("")}
				</tr>`
			).join("")
			: `<tr><td colspan="${CHILD_TOTAL_COLS}" class="apf-child-empty">No configurable child fields.</td></tr>`;

		const groupHeaderRow = `<tr>
			<th class="apf-child-col-field"></th>
			${CHILD_CHANNEL_GROUPS.map((g) =>
				`<th colspan="${g.cols.length}" class="apf-child-group-header">${g.label}</th>`
			).join("")}
		</tr>`;
		const colHeaderRow = `<tr>
			<th class="apf-child-col-field">FIELD</th>
			${CHILD_CHANNEL_GROUPS.map((g) => g.cols.map((c) =>
				`<th>${c.label}</th>`
			).join("")).join("")}
		</tr>`;

		return `<tr class="apf-child-row" data-parent-ref="${escapeHtml(ref)}" style="display:none">
			<td colspan="${TOTAL_COLS}">
				<div class="apf-child-container">
					<div class="apf-child-header">Child Fields — ${escapeHtml(row.display_name || ref)}</div>
					<table class="apf-child-table">
						<thead>${groupHeaderRow}${colHeaderRow}</thead>
						<tbody>${bodyHtml}</tbody>
					</table>
				</div>
			</td>
		</tr>`;
	}

	function renderRow(row, idx) {
		const ref = row.reference_name || "";
		const isTable = row.fieldtype === "Table" || row.fieldtype === "Table MultiSelect";
		const groupCells = COLUMN_GROUPS.map((g) => g.cols.map((c) => {
			const colCls = c.type === "toggle" ? "apf-col-toggle" : "apf-col-select";
			if (c.type === "toggle") return `<td class="${colCls}">${renderToggle(ref, c.col, row[c.col])}</td>`;
			return `<td class="${colCls}">${renderSelect(ref, c.col, row[c.col] || c.options[0], c.options)}</td>`;
		}).join("")).join("");

		const tableBadge = isTable ? `<span class="apf-table-badge">TABLE</span>` : "";
		const expandBtn = isTable
			? `<button class="apf-expand" data-ref="${escapeHtml(ref)}" title="Configure child table fields">▶ Child Fields</button>`
			: "";

		const mainRow = `
			<tr data-ref="${escapeHtml(ref)}">
				<td class="apf-col-check"><input type="checkbox" class="apf-row-check" data-ref="${escapeHtml(ref)}"/></td>
				<td class="apf-col-no apf-no">${idx + 1}</td>
				<td class="apf-col-field apf-text">
					<div>
						<input class="apf-label-input" type="text"
							data-ref="${escapeHtml(ref)}"
							value="${escapeHtml(row.display_name || ref)}"
							title="Click to edit label"/>
						${tableBadge}
					</div>
					<div class="apf-ref">${escapeHtml(ref)}</div>
					${expandBtn}
				</td>
				${groupCells}
				<td class="apf-col-actions"><button class="apf-delete" data-ref="${escapeHtml(ref)}" title="Remove">×</button></td>
			</tr>`;

		return mainRow + (isTable ? renderChildConfigRow(row) : "");
	}

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
	function openFieldFlowDialog(frm) {
		const state = { flow_name: "", flow: [], mode: "Create New Field", rows: [] };
		let d;

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
					onchange() { state.mode = d.get_value("source_mode"); state.rows = [emptyRow()]; render(); },
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
			host.innerHTML = `<div class="apf-empty">No fields configured. Use <b>Add Row</b> to add Job Applicant fields.</div>`;
			return;
		}

		const active = state.activeSection && sectionsList.includes(state.activeSection)
			? state.activeSection
			: sectionsList[0];
		state.activeSection = active;

		const sideHtml = sectionsList.map((s) => `
			<div class="apf-side-item ${s === active ? "active" : ""}" data-section="${escapeHtml(s)}">
				<span>${escapeHtml(s)}</span>
				<span class="apf-count">${counts[s]}</span>
			</div>
		`).join("");

		const groupRow = `
			<tr class="apf-group-row">
				<th class="apf-col-check"></th>
				<th class="apf-col-no"></th>
				<th class="apf-col-field"></th>
				${COLUMN_GROUPS.map((g) => `<th colspan="${g.cols.length}" class="apf-group-${g.cls}">${g.label}</th>`).join("")}
				<th class="apf-col-actions"></th>
			</tr>`;

		const colRow = `
			<tr class="apf-col-row">
				<th class="apf-col-check"><input type="checkbox" class="apf-select-all"/></th>
				<th class="apf-col-no">NO.</th>
				<th class="apf-col-field">FIELD</th>
				${COLUMN_GROUPS.map((g) => g.cols.map((c) => {
					const colCls = c.type === "toggle" ? "apf-col-toggle" : "apf-col-select";
					return `<th class="${colCls}">${c.label}</th>`;
				}).join("")).join("")}
				<th class="apf-col-actions"></th>
			</tr>`;

		const sectionRows = rows.filter((r) => (r.section || "General") === active);
		const bodyHtml = sectionRows.length
			? sectionRows.map((r, i) => renderRow(r, i)).join("")
			: `<tr><td colspan="${TOTAL_COLS}" class="apf-empty">No fields in this section.</td></tr>`;

		host.innerHTML = `
			<div class="apf-container">
				<div class="apf-side">${sideHtml}</div>
				<div class="apf-main">
					<div class="apf-head">
						<div>
							<div class="apf-head-sub">APPLICATION FIELDS</div>
							<div class="apf-head-title">${escapeHtml(active)}</div>
						</div>
						<button class="apf-add-field" data-section="${escapeHtml(active)}">+ Add Custom Field</button>
					</div>
					<div class="apf-scroll">
						<table class="apf-table">
							<thead>${groupRow}${colRow}</thead>
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

		const selectAll = host.querySelector(".apf-select-all");
		if (selectAll) {
			selectAll.addEventListener("change", () => {
				host.querySelectorAll(".apf-row-check").forEach((cb) => { cb.checked = selectAll.checked; });
			});
		}
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
