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

	function renderRow(row, idx) {
		const ref = row.reference_name || "";
		const groupCells = COLUMN_GROUPS.map((g) => g.cols.map((c) => {
			const colCls = c.type === "toggle" ? "apf-col-toggle" : "apf-col-select";
			if (c.type === "toggle") return `<td class="${colCls}">${renderToggle(ref, c.col, row[c.col])}</td>`;
			return `<td class="${colCls}">${renderSelect(ref, c.col, row[c.col] || c.options[0], c.options)}</td>`;
		}).join("")).join("");

		return `
			<tr data-ref="${escapeHtml(ref)}">
				<td class="apf-col-check"><input type="checkbox" class="apf-row-check" data-ref="${escapeHtml(ref)}"/></td>
				<td class="apf-col-no apf-no">${idx + 1}</td>
				<td class="apf-col-field apf-text">
					<div class="apf-display">${escapeHtml(row.display_name || ref)}</div>
					<div class="apf-ref">${escapeHtml(ref)}</div>
				</td>
				${groupCells}
				<td class="apf-col-actions"><button class="apf-delete" data-ref="${escapeHtml(ref)}" title="Remove">×</button></td>
			</tr>`;
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
			: `<tr><td colspan="${4 + COLUMN_GROUPS.reduce((s, g) => s + g.cols.length, 0)}" class="apf-empty">No fields in this section.</td></tr>`;

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

		bindEvents(host, frm, state);
	}

	function bindEvents(host, frm, state) {
		host.querySelectorAll(".apf-side-item").forEach((el) => {
			el.addEventListener("click", () => {
				state.activeSection = el.getAttribute("data-section");
				renderUI(host, frm, state);
			});
		});

		host.querySelectorAll("input[type=checkbox][data-ref][data-col]").forEach((cb) => {
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
