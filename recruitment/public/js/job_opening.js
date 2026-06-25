/* global frappe, $ */
/**
 * Job Opening form — Application Fields UI on the Job application tab.
 * Mirrors the Job Applicant Profile Settings layout (section list LEFT,
 * grouped column table RIGHT, only the active section renders) so the two
 * pages look and behave identically.
 *
 * Rows come from get_job_applicant_profile_template (settings defaults
 * merged with any opening-specific overrides). Toggling a control upserts
 * the matching row in cur_frm.doc.custom_application_fields and dirties
 * the form so Save persists.
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
		// Reuse the same .apf-* style block as Job Applicant Profile Settings so
		// the two pages stay visually identical. The CSS id `apf-styles` is
		// shared and idempotent across the two form scripts.
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
					<div class="apf-display">${escapeHtml(row.display_name || ref)}${tableBadge}</div>
					<div class="apf-ref">${escapeHtml(ref)}</div>
					${expandBtn}
				</td>
				${groupCells}
				<td class="apf-col-actions"><button class="apf-delete" data-ref="${escapeHtml(ref)}" title="Remove">×</button></td>
			</tr>`;

		return mainRow + (isTable ? renderChildConfigRow(row) : "");
	}

	function upsertOpeningRow(frm, ref, state) {
		let docRow = (frm.doc.custom_application_fields || []).find((r) => r.reference_name === ref);
		if (docRow) return docRow;
		const tpl = state.rows.find((r) => r.reference_name === ref) || {};
		docRow = frm.add_child("custom_application_fields", {
			section: tpl.section,
			reference_name: ref,
			display_name: tpl.display_name,
			fieldtype: tpl.fieldtype || "",
			child_field_config: tpl.child_field_config || "",
			visibility: tpl.visibility || "All",
			editability: tpl.editability || "Editable",
			preoffer_visibility: tpl.preoffer_visibility || "Same as visibility",
			preoffer_edit_approve: tpl.preoffer_edit_approve || "Editable",
		});
		return docRow;
	}

	function renderUI(host, state, frm) {
		const rows = state.rows || [];

		const sectionsList = [];
		const counts = {};
		rows.forEach((r) => {
			const s = r.section || "General";
			if (!(s in counts)) { sectionsList.push(s); counts[s] = 0; }
			counts[s] += 1;
		});

		if (!rows.length) {
			host.innerHTML = `<div class="apf-empty">No fields to configure.</div>`;
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
					</div>
					<div class="apf-scroll">
						<table class="apf-table">
							<thead>${groupRow}${colRow}</thead>
							<tbody>${bodyHtml}</tbody>
						</table>
					</div>
				</div>
			</div>`;

		bindEvents(host, state, frm);
	}

	function bindEvents(host, state, frm) {
		// Section switching
		host.querySelectorAll(".apf-side-item").forEach((el) => {
			el.addEventListener("click", () => {
				state.activeSection = el.getAttribute("data-section");
				renderUI(host, state, frm);
			});
		});

		// Parent field toggles
		host.querySelectorAll("input[type=checkbox][data-ref][data-col]").forEach((cb) => {
			if (cb.classList.contains("apf-child-toggle")) return;
			cb.addEventListener("change", () => {
				const ref = cb.getAttribute("data-ref");
				const col = cb.getAttribute("data-col");
				const checked = cb.checked ? 1 : 0;
				const stateRow = state.rows.find((r) => r.reference_name === ref);
				if (stateRow) stateRow[col] = checked;
				const docRow = upsertOpeningRow(frm, ref, state);
				docRow[col] = checked;
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			});
		});

		// Parent field selects
		host.querySelectorAll("select[data-ref][data-col]").forEach((sel) => {
			sel.addEventListener("change", () => {
				const ref = sel.getAttribute("data-ref");
				const col = sel.getAttribute("data-col");
				const stateRow = state.rows.find((r) => r.reference_name === ref);
				if (stateRow) stateRow[col] = sel.value;
				const docRow = upsertOpeningRow(frm, ref, state);
				docRow[col] = sel.value;
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			});
		});

		// Child table field visibility toggles
		host.querySelectorAll("input.apf-child-toggle").forEach((cb) => {
			cb.addEventListener("change", () => {
				const parentRef = cb.getAttribute("data-parent-ref");
				const childRef  = cb.getAttribute("data-child-ref");
				const col       = cb.getAttribute("data-col");
				const checked   = cb.checked ? 1 : 0;

				// Update state
				const stateRow = state.rows.find((r) => r.reference_name === parentRef);
				if (stateRow) {
					let cfg = {};
					try { cfg = JSON.parse(stateRow.child_field_config || "{}"); } catch (e) { /* ignore */ }
					if (cfg[childRef]) cfg[childRef][col] = checked;
					stateRow.child_field_config = JSON.stringify(cfg);
				}

				// Update doc row
				const docRow = upsertOpeningRow(frm, parentRef, state);
				let cfg = {};
				try { cfg = JSON.parse(docRow.child_field_config || "{}"); } catch (e) { /* ignore */ }
				if (cfg[childRef]) cfg[childRef][col] = checked;
				docRow.child_field_config = JSON.stringify(cfg);

				frm.refresh_field("custom_application_fields");
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

		// Delete
		host.querySelectorAll(".apf-delete").forEach((btn) => {
			btn.addEventListener("click", () => {
				const ref = btn.getAttribute("data-ref");
				frappe.confirm(`Remove ${ref}?`, () => {
					state.rows = state.rows.filter((r) => r.reference_name !== ref);
					const idx = (frm.doc.custom_application_fields || []).findIndex((r) => r.reference_name === ref);
					if (idx >= 0) {
						frm.doc.custom_application_fields.splice(idx, 1);
						frm.refresh_field("custom_application_fields");
					}
					frm.dirty();
					renderUI(host, state, frm);
				});
			});
		});

		// Select-all
		const selectAll = host.querySelector(".apf-select-all");
		if (selectAll) {
			selectAll.addEventListener("change", () => {
				host.querySelectorAll(".apf-row-check").forEach((cb) => { cb.checked = selectAll.checked; });
			});
		}
	}

	function mountUI(frm) {
		const wrapper = frm.fields_dict.custom_application_fields_ui;
		if (!wrapper) return;
		const host = wrapper.$wrapper && wrapper.$wrapper.find("#jo-app-fields-host")[0];
		if (!host) return;

		injectStyles();
		host.innerHTML = `<div class="apf-empty">Loading application fields…</div>`;

		frappe.call({
			method: "recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings.get_job_applicant_profile_template",
			args: { opening: frm.is_new() ? null : frm.doc.name },
			callback: (r) => {
				const msg = (r && r.message) || { sections: [], rows: [] };
				const state = { rows: msg.rows || [], activeSection: null };

				// Overlay any unsaved edits the user already made on this opening.
				(frm.doc.custom_application_fields || []).forEach((docRow) => {
					const stateRow = state.rows.find((sr) => sr.reference_name === docRow.reference_name);
					if (!stateRow) return;
					["view_careers", "mandatory_careers", "view_ijp", "mandatory_ijp",
					 "view_refer", "mandatory_refer", "view_preoffer", "mandatory_preoffer",
					 "ctq_flag"].forEach((col) => { stateRow[col] = docRow[col] ? 1 : 0; });
					["visibility", "editability", "preoffer_visibility", "preoffer_edit_approve"].forEach((col) => {
						if (docRow[col]) stateRow[col] = docRow[col];
					});
					if (docRow.child_field_config) stateRow.child_field_config = docRow.child_field_config;
				});

				renderUI(host, state, frm);
			},
			error: () => {
				host.innerHTML = `<div class="apf-empty">Failed to load application fields.</div>`;
			},
		});
	}

	frappe.ui.form.on("Job Opening", {
		refresh(frm) { mountUI(frm); },
	});
})();
