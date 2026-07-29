/* global frappe */
/**
 * applicant_fields_ui.js — the shared Application Fields grid.
 *
 * Job Applicant Profile Settings (the defaults) and the Job Opening's Job
 * application tab (per-opening overrides) render the SAME table: sections on the
 * left, channel columns on the right. Everything that was byte-identical in the
 * two form scripts lives here — column definitions, the stylesheet, the cell
 * renderers and the toolbar — so a change lands on both pages at once. Only the
 * bits that genuinely differ (which document the rows are read from and written
 * back to) stay in the two callers.
 *
 * Loaded via `app_include_js` rather than `doctype_js` so it is guaranteed to be
 * present before either form script runs — a doctype's own JS is evaluated
 * before any hook JS, so a doctype_js include would be too late for the
 * top-level constants below.
 *
 * Design notes for the grid itself:
 *   - Each channel owns an accent colour that runs through its group header, its
 *     column band and its ON toggles. With five channels × two or three columns,
 *     a wall of identical blue switches is unreadable — the colour is what tells
 *     you which channel a switch belongs to without counting columns.
 *   - The identity columns (checkbox / no. / field) are frozen; only the channel
 *     columns scroll, so a toggle can never be read against the wrong field.
 *   - A mandatory-but-not-visible cell is a configuration bug (the candidate can
 *     never satisfy it), so it is ringed in amber rather than silently accepted.
 */

frappe.provide("recruitment.applicant_fields_ui");

(function () {
	const AFU = recruitment.applicant_fields_ui;

	// key   — used for the per-group enabled count
	// cls   — drives the accent colour (see --apf-g-* in the stylesheet)
	// cols  — the columns rendered under the group header
	AFU.COLUMN_GROUPS = [
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
		{ key: "campus",   label: "CAMPUS HIRING", cls: "campus", cols: [
			{ label: "VIEW",      col: "view_campus",      type: "toggle" },
			{ label: "MANDATORY", col: "mandatory_campus", type: "toggle" },
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
		// Labels stay short — the group chip above already says PRE-OFFER RULES, and
		// a header wider than its column just truncates to nonsense ("PRE-OFFE…").
		{ key: "preoffer-rules", label: "PRE-OFFER RULES", cls: "preoffer-rules", cols: [
			{ label: "VISIBILITY",   col: "preoffer_visibility",     type: "select",
			  options: ["Same as visibility", "All", "Hiring Team", "Hidden"] },
			{ label: "EDIT/APPROVE", col: "preoffer_edit_approve",   type: "select",
			  options: ["Editable", "Approval Required", "Read Only"] },
		]},
	];

	AFU.CHILD_CHANNEL_GROUPS = [
		{ label: "CAREERS",   cls: "careers",  cols: [
			{ col: "view_careers",      label: "VIEW" },
			{ col: "mandatory_careers", label: "MANDATORY" },
		]},
		{ label: "IJP",       cls: "ijp", cols: [
			{ col: "view_ijp",          label: "VIEW" },
			{ col: "mandatory_ijp",     label: "MANDATORY" },
		]},
		{ label: "REFER",     cls: "refer", cols: [
			{ col: "view_refer",        label: "VIEW" },
			{ col: "mandatory_refer",   label: "MANDATORY" },
		]},
		{ label: "CAMPUS HIRING", cls: "campus", cols: [
			{ col: "view_campus",        label: "VIEW" },
			{ col: "mandatory_campus",   label: "MANDATORY" },
		]},
		{ label: "PRE-OFFER", cls: "preoffer", cols: [
			{ col: "view_preoffer",      label: "VIEW" },
			{ col: "mandatory_preoffer", label: "MANDATORY" },
		]},
	];

	// checkbox + no. + field + actions, plus every channel column.
	AFU.TOTAL_COLS = 4 + AFU.COLUMN_GROUPS.reduce((s, g) => s + g.cols.length, 0);
	AFU.CHILD_TOTAL_COLS = 1 + AFU.CHILD_CHANNEL_GROUPS.reduce((s, g) => s + g.cols.length, 0);

	// Channel groups that carry a VIEW column — the ones worth counting and worth
	// offering in the bulk bar. GENERAL / PRE-OFFER RULES hold selects, not switches.
	AFU.TOGGLE_GROUPS = AFU.COLUMN_GROUPS.filter((g) => g.cols.every((c) => c.type === "toggle"));

	AFU.escapeHtml = function (s) {
		if (s === null || s === undefined) return "";
		return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	};

	const esc = AFU.escapeHtml;

	// ---------------------------------------------------------------- styles --
	AFU.injectStyles = function () {
		if (document.getElementById("apf-styles")) return;
		const style = document.createElement("style");
		style.id = "apf-styles";
		style.textContent = `
			.apf-container {
				--apf-bg: #fff;
				--apf-bg-sub: #FAFAFA;
				--apf-bg-head: #F9FAFB;
				--apf-border: #E5E7EB;
				--apf-border-soft: #F3F4F6;
				--apf-text: #111827;
				--apf-text-dim: #6B7280;
				--apf-text-faint: #9CA3AF;
				--apf-hover: #F5F7FA;
				--apf-accent: #2563EB;
				--apf-accent-soft: #EFF6FF;
				--apf-off: #E5E7EB;
				--apf-warn: #F59E0B;

				--apf-g-careers: #B45309;
				--apf-g-ijp: #1D4ED8;
				--apf-g-refer: #047857;
				--apf-g-campus: #6D28D9;
				--apf-g-preoffer: #C2410C;
				--apf-g-general: #4B5563;
				--apf-g-preoffer-rules: #B91C1C;

				background: var(--apf-bg); border: 1px solid var(--apf-border);
				border-radius: 12px; overflow: hidden; display: flex; min-height: 540px;
				box-shadow: 0 1px 2px rgba(16, 24, 40, .04), 0 1px 3px rgba(16, 24, 40, .06);
			}
			[data-theme="dark"] .apf-container {
				--apf-bg: var(--card-bg, #1C2126);
				--apf-bg-sub: var(--bg-color, #171B1F);
				--apf-bg-head: var(--bg-color, #171B1F);
				--apf-border: var(--border-color, #333A40);
				--apf-border-soft: var(--border-color, #2A3036);
				--apf-text: var(--text-color, #E8EAED);
				--apf-text-dim: var(--text-muted, #9CA3AF);
				--apf-text-faint: var(--text-light, #7A828A);
				--apf-hover: rgba(255, 255, 255, .04);
				--apf-accent: #60A5FA;
				--apf-accent-soft: rgba(96, 165, 250, .14);
				--apf-off: #4B5563;

				--apf-g-careers: #F59E0B;
				--apf-g-ijp: #60A5FA;
				--apf-g-refer: #34D399;
				--apf-g-campus: #A78BFA;
				--apf-g-preoffer: #FB923C;
				--apf-g-general: #9CA3AF;
				--apf-g-preoffer-rules: #F87171;
				box-shadow: none;
			}

			/* ------------------------------------------------------- sidebar -- */
			.apf-side {
				flex: 0 0 232px; border-right: 1px solid var(--apf-border);
				background: var(--apf-bg-sub); overflow-y: auto; max-height: 760px; padding: 10px;
			}
			.apf-side-head {
				font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
				color: var(--apf-text-faint); padding: 4px 10px 8px;
			}
			.apf-side-item {
				display: flex; justify-content: space-between; align-items: center; gap: 8px;
				padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 13px;
				color: var(--apf-text-dim); margin: 2px 0; position: relative;
				border-left: 3px solid transparent; transition: background .12s, color .12s;
			}
			.apf-side-item span:first-child {
				overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			}
			.apf-side-item:hover { background: var(--apf-hover); color: var(--apf-text); }
			.apf-side-item.active {
				background: var(--apf-accent-soft); color: var(--apf-accent);
				font-weight: 600; border-left-color: var(--apf-accent);
			}
			.apf-side-item .apf-count {
				flex: none; font-size: 11px; background: var(--apf-bg); color: var(--apf-text-dim);
				padding: 1px 8px; border-radius: 999px; border: 1px solid var(--apf-border);
			}
			.apf-side-item.active .apf-count {
				background: var(--apf-accent); color: #fff; border-color: transparent;
			}

			/* --------------------------------------------------------- header -- */
			.apf-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
			.apf-head {
				padding: 14px 18px 12px; border-bottom: 1px solid var(--apf-border-soft);
				display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
			}
			.apf-head-title { font-size: 17px; color: var(--apf-text); font-weight: 650; line-height: 1.3; }
			.apf-head-sub {
				font-size: 10px; color: var(--apf-text-faint); letter-spacing: .08em;
				text-transform: uppercase; font-weight: 700; margin-bottom: 2px;
			}
			.apf-add-field {
				border: none; background: var(--apf-accent); color: #fff; cursor: pointer;
				font-size: 12.5px; font-weight: 600; padding: 8px 14px; border-radius: 8px;
				white-space: nowrap; transition: filter .12s, transform .06s;
			}
			.apf-add-field:hover { filter: brightness(1.08); }
			.apf-add-field:active { transform: translateY(1px); }

			/* -------------------------------------------------------- toolbar -- */
			.apf-toolbar {
				display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
				padding: 9px 18px; border-bottom: 1px solid var(--apf-border-soft);
				background: var(--apf-bg-sub);
			}
			.apf-search-wrap { position: relative; flex: 0 1 260px; min-width: 170px; }
			.apf-search-wrap::before {
				content: "⌕"; position: absolute; left: 9px; top: 50%; transform: translateY(-52%);
				color: var(--apf-text-faint); font-size: 14px; pointer-events: none;
			}
			.apf-search {
				width: 100%; box-sizing: border-box; border: 1px solid var(--apf-border);
				background: var(--apf-bg); color: var(--apf-text); border-radius: 8px;
				padding: 6px 10px 6px 24px; font-size: 12.5px; outline: none;
				transition: border-color .12s, box-shadow .12s;
			}
			.apf-search::placeholder { color: var(--apf-text-faint); }
			.apf-search:focus {
				border-color: var(--apf-accent);
				box-shadow: 0 0 0 3px color-mix(in srgb, var(--apf-accent) 18%, transparent);
			}
			.apf-showing { font-size: 11.5px; color: var(--apf-text-dim); white-space: nowrap; }
			.apf-toolbar-spacer { flex: 1 1 auto; }

			/* Per-channel enabled tally — how much of this section each channel shows. */
			.apf-legend { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
			.apf-legend-item {
				display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px;
				font-weight: 600; letter-spacing: .03em; color: var(--apf-text-dim);
				background: var(--apf-bg); border: 1px solid var(--apf-border);
				border-radius: 999px; padding: 3px 9px 3px 6px; white-space: nowrap;
			}
			.apf-legend-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--g); flex: none; }
			.apf-legend-num { color: var(--apf-text); font-variant-numeric: tabular-nums; }

			/* Bulk bar — appears only when rows are ticked. */
			.apf-bulk {
				display: none; align-items: center; gap: 8px; width: 100%;
				padding: 8px 10px; margin-top: 2px; border-radius: 8px;
				background: var(--apf-accent-soft);
				border: 1px solid color-mix(in srgb, var(--apf-accent) 30%, transparent);
			}
			.apf-bulk.on { display: flex; }
			.apf-bulk-count { font-size: 12px; font-weight: 600; color: var(--apf-accent); white-space: nowrap; }
			.apf-bulk-col {
				border: 1px solid var(--apf-border); background: var(--apf-bg); color: var(--apf-text);
				border-radius: 6px; padding: 4px 6px; font-size: 12px; max-width: 220px;
			}
			.apf-bulk-btn {
				border: 1px solid var(--apf-border); background: var(--apf-bg); color: var(--apf-text);
				border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
			}
			.apf-bulk-btn:hover { border-color: var(--apf-accent); color: var(--apf-accent); }
			.apf-bulk-btn.primary { background: var(--apf-accent); border-color: var(--apf-accent); color: #fff; }
			.apf-bulk-btn.primary:hover { filter: brightness(1.08); color: #fff; }
			.apf-bulk-clear {
				margin-left: auto; border: none; background: transparent; color: var(--apf-text-dim);
				font-size: 12px; cursor: pointer; text-decoration: underline;
			}

			/* ---------------------------------------------------------- table -- */
			.apf-scroll { overflow: auto; max-height: 660px; }
			/* min-width MUST be the true sum of the column widths below. With
			   table-layout:fixed, width:100% and a smaller min-width, the browser
			   scales every column down to fit the pane — which is what was clipping
			   the headers to "MANDATO" / "EDITABILI". At the real sum the table
			   simply overflows and .apf-scroll scrolls it, which is exactly what the
			   frozen identity columns are there to make comfortable.
			   34 + 38 + 208 + (11 x 92) + (4 x 148) + 38 = 1922 */
			.apf-table {
				width: 100%; border-collapse: separate; border-spacing: 0;
				font-size: 12px; min-width: 1922px; table-layout: fixed;
			}
			.apf-table thead .apf-group-row th {
				padding: 9px 4px 6px; text-align: center; font-weight: 700;
				font-size: 10px; letter-spacing: .07em; color: var(--apf-text-dim);
				background: var(--apf-bg); border-bottom: 1px solid var(--apf-border-soft);
			}
			.apf-table thead .apf-col-row th {
				padding: 7px 4px; text-align: center; font-weight: 600;
				font-size: 9.5px; letter-spacing: .05em; color: var(--apf-text-dim);
				background: var(--apf-bg-head); border-bottom: 1px solid var(--apf-border);
				white-space: nowrap; position: sticky; top: 0;
			}
			/* The group's accent, carried by its header chip, its column band and
			   its ON switches — this is what makes a column readable at a glance. */
			.apf-g-careers        { --g: var(--apf-g-careers); }
			.apf-g-ijp            { --g: var(--apf-g-ijp); }
			.apf-g-refer          { --g: var(--apf-g-refer); }
			.apf-g-campus         { --g: var(--apf-g-campus); }
			.apf-g-preoffer       { --g: var(--apf-g-preoffer); }
			.apf-g-general        { --g: var(--apf-g-general); }
			.apf-g-preoffer-rules { --g: var(--apf-g-preoffer-rules); }

			.apf-group-label {
				display: inline-block; color: var(--g); background: color-mix(in srgb, var(--g) 12%, transparent);
				border-radius: 999px; padding: 3px 11px; font-size: 10px; font-weight: 700; letter-spacing: .07em;
			}
			.apf-group-count {
				display: block; margin-top: 3px; font-size: 9.5px; font-weight: 600;
				color: var(--apf-text-faint); font-variant-numeric: tabular-nums; letter-spacing: .02em;
			}
			/* Tint the whole band so each channel reads as one block, and rule a line
			   at every group boundary so adjacent channels never blur together. */
			.apf-table td.apf-band, .apf-table th.apf-band {
				background-image: linear-gradient(color-mix(in srgb, var(--g) 4%, transparent),
				                                  color-mix(in srgb, var(--g) 4%, transparent));
			}
			.apf-table td.apf-gstart, .apf-table th.apf-gstart {
				border-left: 1px solid color-mix(in srgb, var(--g) 28%, transparent);
			}
			.apf-table thead .apf-col-row th.apf-gstart { border-left-color: var(--apf-border); }

			/* Wide enough that no column header has to truncate — "MANDATORY" and
			   "EDIT/APPROVE" are the widest labels each type has to hold. */
			.apf-col-check  { width: 34px; }
			.apf-col-no     { width: 38px; }
			.apf-col-field  { width: 208px; }
			.apf-col-toggle { width: 92px; }
			.apf-col-select { width: 148px; }
			.apf-col-actions{ width: 38px; }

			.apf-table tbody td {
				padding: 9px 4px; border-bottom: 1px solid var(--apf-border-soft);
				vertical-align: middle; text-align: center; color: var(--apf-text);
			}
			.apf-table tbody tr:hover td { background-color: var(--apf-hover); }
			.apf-table tbody td.apf-text { text-align: left; padding-left: 12px; }
			.apf-no { color: var(--apf-text-faint); font-size: 11px; font-variant-numeric: tabular-nums; }
			.apf-ref {
				color: var(--apf-text-faint); font-size: 10.5px; font-family: var(--font-stack-mono, monospace);
			}
			.apf-display { color: var(--apf-text); font-weight: 500; font-size: 12px; }
			.apf-label-input {
				border: 1px solid transparent; outline: none; background: transparent;
				color: var(--apf-text); font-weight: 550; font-size: 12.5px;
				width: 100%; padding: 2px 4px; margin: 0; border-radius: 5px; box-sizing: border-box;
			}
			.apf-label-input:hover { background: var(--apf-bg-sub); border-color: var(--apf-border); cursor: text; }
			.apf-label-input:focus {
				background: var(--apf-bg); border-color: var(--apf-accent); cursor: text;
				box-shadow: 0 0 0 3px color-mix(in srgb, var(--apf-accent) 15%, transparent);
			}

			/* --------------------------------------------------------- switch -- */
			.apf-toggle { position: relative; display: inline-block; width: 30px; height: 16px; vertical-align: middle; }
			.apf-toggle input { opacity: 0; width: 0; height: 0; margin: 0; }
			.apf-toggle-slider {
				position: absolute; cursor: pointer; inset: 0;
				background: var(--apf-off); border-radius: 16px; transition: background .15s;
			}
			.apf-toggle-slider::before {
				position: absolute; content: ""; height: 12px; width: 12px;
				left: 2px; top: 2px; background: #fff; border-radius: 50%;
				transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.25);
			}
			.apf-toggle input:checked + .apf-toggle-slider { background: var(--g, var(--apf-accent)); }
			.apf-toggle input:checked + .apf-toggle-slider::before { transform: translateX(14px); }
			.apf-toggle input:focus-visible + .apf-toggle-slider {
				box-shadow: 0 0 0 3px color-mix(in srgb, var(--g, var(--apf-accent)) 30%, transparent);
			}
			/* Mandatory with VIEW off: the candidate can never satisfy it. */
			.apf-toggle.apf-conflict .apf-toggle-slider {
				box-shadow: 0 0 0 2px var(--apf-warn);
			}

			.apf-select {
				border: 1px solid var(--apf-border); border-radius: 6px; padding: 4px 5px;
				font-size: 11.5px; background: var(--apf-bg); color: var(--apf-text);
				width: 100%; max-width: 132px; outline: none;
			}
			.apf-select:focus {
				border-color: var(--apf-accent);
				box-shadow: 0 0 0 3px color-mix(in srgb, var(--apf-accent) 15%, transparent);
			}
			.apf-delete {
				border: none; background: transparent; color: var(--apf-text-faint);
				cursor: pointer; padding: 2px 5px; border-radius: 5px; font-size: 15px; line-height: 1;
			}
			.apf-delete:hover { color: #EF4444; background: color-mix(in srgb, #EF4444 12%, transparent); }
			.apf-empty { padding: 60px 20px; text-align: center; color: var(--apf-text-dim); font-size: 13px; }
			.apf-empty-icon { display: block; font-size: 26px; margin-bottom: 8px; opacity: .5; }

			/* --------------------------------------------------- child tables -- */
			.apf-expand {
				border: 1px solid var(--apf-border); background: var(--apf-bg); color: var(--apf-text-dim);
				cursor: pointer; font-size: 10px; padding: 2px 8px; border-radius: 999px; margin-top: 4px;
				display: inline-flex; align-items: center; gap: 4px;
			}
			.apf-expand:hover { background: var(--apf-accent-soft); color: var(--apf-accent); border-color: var(--apf-accent); }
			.apf-table-badge {
				display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .04em;
				background: color-mix(in srgb, var(--apf-g-campus) 14%, transparent); color: var(--apf-g-campus);
				border-radius: 4px; padding: 1px 5px; margin-left: 5px; vertical-align: middle;
			}
			.apf-child-row td {
				background: var(--apf-bg-sub) !important;
				border-bottom: 2px solid var(--apf-border) !important; padding: 0 !important;
			}
			.apf-child-container {
				margin: 10px 16px; border: 1px solid var(--apf-border); border-radius: 10px; overflow: hidden;
			}
			.apf-child-header {
				background: color-mix(in srgb, var(--apf-g-campus) 12%, transparent); color: var(--apf-g-campus);
				font-size: 10.5px; font-weight: 700; padding: 7px 12px; letter-spacing: .06em; text-transform: uppercase;
			}
			.apf-child-table { width: 100%; border-collapse: collapse; font-size: 11.5px; background: var(--apf-bg); }
			.apf-child-table thead th {
				padding: 6px 8px; background: var(--apf-bg-head); color: var(--apf-text-dim); font-size: 9.5px;
				font-weight: 700; text-align: center; border-bottom: 1px solid var(--apf-border); letter-spacing: .05em;
			}
			.apf-child-table thead th.apf-child-col-field { text-align: left; }
			.apf-child-group-header { color: var(--g); letter-spacing: .06em; }
			.apf-child-table tbody td {
				padding: 7px 8px; border-bottom: 1px solid var(--apf-border-soft);
				text-align: center; vertical-align: middle; color: var(--apf-text);
			}
			.apf-child-table tbody tr:last-child td { border-bottom: none; }
			.apf-child-table tbody td.apf-child-col-field { text-align: left; }
			.apf-child-field-label { color: var(--apf-text); font-weight: 500; font-size: 11.5px; }
			.apf-child-field-ref {
				color: var(--apf-text-faint); font-size: 10px; font-family: var(--font-stack-mono, monospace);
			}
			.apf-child-empty { padding: 14px; text-align: center; color: var(--apf-text-faint); font-size: 12px; }

			/* ------------------------------------------- frozen identity cols -- */
			/* The checkbox / NO. / FIELD columns stay pinned while ONLY the channel
			   columns scroll, so a toggle is never read against the wrong field.
			   \`left\` offsets are the running sum of the fixed widths above. */
			.apf-table thead tr th.apf-col-check,
			.apf-table tbody tr td.apf-col-check { position: sticky; left: 0; }
			.apf-table thead tr th.apf-col-no,
			.apf-table tbody tr td.apf-col-no    { position: sticky; left: 34px; }
			.apf-table thead tr th.apf-col-field,
			.apf-table tbody tr td.apf-col-field {
				position: sticky; left: 72px; box-shadow: 1px 0 0 var(--apf-border);
			}
			.apf-table tbody tr td.apf-col-check,
			.apf-table tbody tr td.apf-col-no,
			.apf-table tbody tr td.apf-col-field { background: var(--apf-bg); z-index: 2; }
			.apf-table tbody tr:hover td.apf-col-check,
			.apf-table tbody tr:hover td.apf-col-no,
			.apf-table tbody tr:hover td.apf-col-field { background: var(--apf-hover); }
			.apf-table thead tr.apf-col-row th { z-index: 3; }
			.apf-table thead tr.apf-group-row th.apf-col-check,
			.apf-table thead tr.apf-group-row th.apf-col-no,
			.apf-table thead tr.apf-group-row th.apf-col-field { background: var(--apf-bg); z-index: 4; }
			.apf-table thead tr.apf-col-row th.apf-col-check,
			.apf-table thead tr.apf-col-row th.apf-col-no,
			.apf-table thead tr.apf-col-row th.apf-col-field { background: var(--apf-bg-head); z-index: 4; }

			/* A row hidden by the search box. */
			.apf-table tbody tr.apf-filtered-out { display: none; }
		`;
		document.head.appendChild(style);
	};

	// --------------------------------------------------------------- cells --
	AFU.renderToggle = function (ref, col, checked, gcls) {
		return `<label class="apf-toggle${gcls ? ` apf-g-${gcls}` : ""}">
			<input type="checkbox" data-ref="${esc(ref)}" data-col="${col}" ${checked ? "checked" : ""}/>
			<span class="apf-toggle-slider"></span>
		</label>`;
	};

	AFU.renderSelect = function (ref, col, value, options) {
		const opts = options.map((o) =>
			`<option value="${esc(o)}" ${value === o ? "selected" : ""}>${esc(o)}</option>`
		).join("");
		return `<select class="apf-select" data-ref="${esc(ref)}" data-col="${col}">${opts}</select>`;
	};

	AFU.renderChildToggle = function (parentRef, childRef, col, checked, gcls) {
		return `<label class="apf-toggle${gcls ? ` apf-g-${gcls}` : ""}">
			<input type="checkbox" class="apf-child-toggle"
				data-parent-ref="${esc(parentRef)}"
				data-child-ref="${esc(childRef)}"
				data-col="${col}" ${checked ? "checked" : ""}/>
			<span class="apf-toggle-slider"></span>
		</label>`;
	};

	AFU.renderChildConfigRow = function (row) {
		const ref = row.reference_name || "";
		let config = {};
		try { config = JSON.parse(row.child_field_config || "{}"); } catch (e) { /* ignore */ }

		const entries = Object.entries(config);
		const bodyHtml = entries.length
			? entries.map(([cfn, cfc]) => `
				<tr>
					<td class="apf-child-col-field">
						<div class="apf-child-field-label">${esc(cfc.label || cfn)}</div>
						<div class="apf-child-field-ref">${esc(cfn)}</div>
					</td>
					${AFU.CHILD_CHANNEL_GROUPS.map((g) => g.cols.map((c) =>
						`<td>${AFU.renderChildToggle(ref, cfn, c.col, cfc[c.col], g.cls)}</td>`
					).join("")).join("")}
				</tr>`
			).join("")
			: `<tr><td colspan="${AFU.CHILD_TOTAL_COLS}" class="apf-child-empty">No configurable child fields.</td></tr>`;

		const groupHeaderRow = `<tr>
			<th class="apf-child-col-field"></th>
			${AFU.CHILD_CHANNEL_GROUPS.map((g) =>
				`<th colspan="${g.cols.length}" class="apf-child-group-header apf-g-${g.cls}">${g.label}</th>`
			).join("")}
		</tr>`;
		const colHeaderRow = `<tr>
			<th class="apf-child-col-field">FIELD</th>
			${AFU.CHILD_CHANNEL_GROUPS.map((g) => g.cols.map((c) =>
				`<th>${c.label}</th>`
			).join("")).join("")}
		</tr>`;

		return `<tr class="apf-child-row" data-parent-ref="${esc(ref)}" style="display:none">
			<td colspan="${AFU.TOTAL_COLS}">
				<div class="apf-child-container">
					<div class="apf-child-header">Child Fields — ${esc(row.display_name || ref)}</div>
					<table class="apf-child-table">
						<thead>${groupHeaderRow}${colHeaderRow}</thead>
						<tbody>${bodyHtml}</tbody>
					</table>
				</div>
			</td>
		</tr>`;
	};

	// ----------------------------------------------------------------- rows --
	AFU.renderRow = function (row, idx) {
		const ref = row.reference_name || "";
		const isTable = row.fieldtype === "Table" || row.fieldtype === "Table MultiSelect";
		const groupCells = AFU.COLUMN_GROUPS.map((g) => g.cols.map((c, ci) => {
			const cls = [
				c.type === "toggle" ? "apf-col-toggle" : "apf-col-select",
				"apf-band", `apf-g-${g.cls}`,
				ci === 0 ? "apf-gstart" : "",
			].filter(Boolean).join(" ");
			if (c.type === "toggle") {
				// A MANDATORY switch is only meaningful while its channel's VIEW is on.
				const viewCol = g.cols[0].col;
				const conflict = c.col !== viewCol && row[c.col] && !row[viewCol];
				const toggle = AFU.renderToggle(ref, c.col, row[c.col], g.cls);
				return `<td class="${cls}">${
					conflict ? toggle.replace("apf-toggle ", "apf-toggle apf-conflict ") : toggle
				}</td>`;
			}
			return `<td class="${cls}">${AFU.renderSelect(ref, c.col, row[c.col] || c.options[0], c.options)}</td>`;
		}).join("")).join("");

		const tableBadge = isTable ? `<span class="apf-table-badge">TABLE</span>` : "";
		const expandBtn = isTable
			? `<button class="apf-expand" data-ref="${esc(ref)}" title="Configure child table fields">▶ Child Fields</button>`
			: "";

		const mainRow = `
			<tr data-ref="${esc(ref)}" data-search="${esc(
				`${row.display_name || ""} ${ref}`.toLowerCase()
			)}">
				<td class="apf-col-check"><input type="checkbox" class="apf-row-check" data-ref="${esc(ref)}"/></td>
				<td class="apf-col-no apf-no">${idx + 1}</td>
				<td class="apf-col-field apf-text">
					<div>
						<input class="apf-label-input" type="text"
							data-ref="${esc(ref)}"
							value="${esc(row.display_name || ref)}"
							title="Click to edit label"/>
						${tableBadge}
					</div>
					<div class="apf-ref">${esc(ref)}</div>
					${expandBtn}
				</td>
				${groupCells}
				<td class="apf-col-actions"><button class="apf-delete" data-ref="${esc(ref)}" title="Remove">×</button></td>
			</tr>`;

		return mainRow + (isTable ? AFU.renderChildConfigRow(row) : "");
	};

	// --------------------------------------------------------------- header --
	AFU.headerRows = function () {
		const groupRow = `
			<tr class="apf-group-row">
				<th class="apf-col-check"></th>
				<th class="apf-col-no"></th>
				<th class="apf-col-field"></th>
				${AFU.COLUMN_GROUPS.map((g) => `<th colspan="${g.cols.length}" class="apf-band apf-gstart apf-g-${g.cls}">
					<span class="apf-group-label">${g.label}</span>
					${g.cols[0].type === "toggle"
						? `<span class="apf-group-count" data-count-group="${g.key}">—</span>` : ""}
				</th>`).join("")}
				<th class="apf-col-actions"></th>
			</tr>`;

		const colRow = `
			<tr class="apf-col-row">
				<th class="apf-col-check"><input type="checkbox" class="apf-select-all" title="Select all rows"/></th>
				<th class="apf-col-no">NO.</th>
				<th class="apf-col-field">FIELD</th>
				${AFU.COLUMN_GROUPS.map((g) => g.cols.map((c, ci) => {
					const cls = [
						c.type === "toggle" ? "apf-col-toggle" : "apf-col-select",
						`apf-g-${g.cls}`, ci === 0 ? "apf-gstart" : "",
					].filter(Boolean).join(" ");
					return `<th class="${cls}">${c.label}</th>`;
				}).join("")).join("")}
				<th class="apf-col-actions"></th>
			</tr>`;

		return groupRow + colRow;
	};

	/** Search box + per-channel tallies + the (initially hidden) bulk bar. */
	AFU.toolbarHtml = function () {
		const bulkOptions = AFU.TOGGLE_GROUPS.map((g) =>
			g.cols.map((c) => `<option value="${c.col}">${g.label} · ${c.label}</option>`).join("")
		).join("");

		return `
			<div class="apf-toolbar">
				<div class="apf-search-wrap">
					<input type="text" class="apf-search" placeholder="${__("Search field or fieldname…")}"/>
				</div>
				<span class="apf-showing"></span>
				<span class="apf-toolbar-spacer"></span>
				<div class="apf-legend">
					${AFU.TOGGLE_GROUPS.map((g) => `<span class="apf-legend-item apf-g-${g.cls}">
						<span class="apf-legend-dot"></span>${g.label}
						<span class="apf-legend-num" data-legend-group="${g.key}">0</span>
					</span>`).join("")}
				</div>
				<div class="apf-bulk">
					<span class="apf-bulk-count"></span>
					<select class="apf-bulk-col">${bulkOptions}</select>
					<button class="apf-bulk-btn primary" data-bulk="1">${__("Enable")}</button>
					<button class="apf-bulk-btn" data-bulk="0">${__("Disable")}</button>
					<button class="apf-bulk-clear" data-bulk-clear>${__("Clear selection")}</button>
				</div>
			</div>`;
	};

	// -------------------------------------------------------------- toolbar --
	/**
	 * Wire the toolbar. Counts and filtering read the rendered DOM, so the two
	 * callers don't have to hand over their row model — they only supply
	 * `applyBulk`, which writes the change back to whichever document they own.
	 *
	 * @param {HTMLElement} host      the mounted UI root
	 * @param {object}      opts      {applyBulk(col, value, refs)}
	 */
	AFU.bindToolbar = function (host, opts) {
		const search = host.querySelector(".apf-search");
		const bulk = host.querySelector(".apf-bulk");
		const selectAll = host.querySelector(".apf-select-all");

		const mainRows = () => Array.from(host.querySelectorAll("tbody tr[data-ref]"));
		const visibleRows = () => mainRows().filter((tr) => !tr.classList.contains("apf-filtered-out"));
		const checkedRefs = () =>
			Array.from(host.querySelectorAll(".apf-row-check:checked")).map((cb) => cb.getAttribute("data-ref"));

		function syncSelection() {
			const refs = checkedRefs();
			if (bulk) {
				bulk.classList.toggle("on", refs.length > 0);
				const count = bulk.querySelector(".apf-bulk-count");
				if (count) count.textContent = __("{0} selected", [refs.length]);
			}
			if (selectAll) {
				const vis = visibleRows().length;
				selectAll.checked = vis > 0 && refs.length >= vis;
			}
		}

		function applyFilter() {
			const q = (search ? search.value : "").trim().toLowerCase();
			let shown = 0;
			mainRows().forEach((tr) => {
				const hit = !q || (tr.getAttribute("data-search") || "").includes(q);
				tr.classList.toggle("apf-filtered-out", !hit);
				// Keep a table field's child-config row with its parent.
				const child = host.querySelector(`.apf-child-row[data-parent-ref="${tr.getAttribute("data-ref")}"]`);
				if (child) child.classList.toggle("apf-filtered-out", !hit);
				if (hit) shown += 1;
			});
			const showing = host.querySelector(".apf-showing");
			if (showing) {
				const total = mainRows().length;
				showing.textContent = q
					? __("{0} of {1} fields", [shown, total])
					: __("{0} fields", [total]);
			}
			syncSelection();
		}

		if (search) search.addEventListener("input", applyFilter);

		if (selectAll) {
			selectAll.addEventListener("change", () => {
				// Only ever act on what the user can actually see.
				visibleRows().forEach((tr) => {
					const cb = tr.querySelector(".apf-row-check");
					if (cb) cb.checked = selectAll.checked;
				});
				syncSelection();
			});
		}

		host.querySelectorAll(".apf-row-check").forEach((cb) =>
			cb.addEventListener("change", syncSelection)
		);

		if (bulk) {
			bulk.querySelectorAll("[data-bulk]").forEach((btn) => {
				btn.addEventListener("click", () => {
					const refs = checkedRefs();
					if (!refs.length) return;
					const col = bulk.querySelector(".apf-bulk-col").value;
					const value = btn.getAttribute("data-bulk") === "1" ? 1 : 0;

					refs.forEach((ref) => {
						const input = host.querySelector(
							`tr[data-ref="${ref}"] input[type=checkbox][data-col="${col}"]`
						);
						if (input) input.checked = !!value;
					});
					if (opts && opts.applyBulk) opts.applyBulk(col, value, refs);
					AFU.refreshCounts(host);
					frappe.show_alert({
						message: __("{0} field(s) updated", [refs.length]),
						indicator: "green",
					});
				});
			});
			const clear = bulk.querySelector("[data-bulk-clear]");
			if (clear) {
				clear.addEventListener("click", () => {
					host.querySelectorAll(".apf-row-check").forEach((cb) => { cb.checked = false; });
					if (selectAll) selectAll.checked = false;
					syncSelection();
				});
			}
		}

		applyFilter();
		AFU.refreshCounts(host);
	};

	/**
	 * Recompute the per-channel tallies (toolbar chips + group headers) and the
	 * mandatory-without-view warning rings, straight from the rendered switches.
	 * Call after anything that changes a toggle.
	 */
	AFU.refreshCounts = function (host) {
		const total = host.querySelectorAll("tbody tr[data-ref]").length;

		AFU.TOGGLE_GROUPS.forEach((g) => {
			const viewCol = g.cols[0].col;
			const on = host.querySelectorAll(
				`tbody tr[data-ref] input[type=checkbox][data-col="${viewCol}"]:checked`
			).length;

			host.querySelectorAll(`[data-legend-group="${g.key}"]`).forEach((el) => {
				el.textContent = `${on}`;
			});
			host.querySelectorAll(`[data-count-group="${g.key}"]`).forEach((el) => {
				el.textContent = `${on}/${total} ${__("shown")}`;
			});

			// Ring any switch that its channel can never act on: with VIEW off the
			// field is not rendered on that form at all, so MANDATORY / CTQ do nothing.
			g.cols.slice(1).forEach((c) => {
				host.querySelectorAll(`tbody tr[data-ref] input[data-col="${c.col}"]`).forEach((input) => {
					const tr = input.closest("tr");
					const view = tr && tr.querySelector(`input[data-col="${viewCol}"]`);
					const conflict = !!(input.checked && view && !view.checked);
					const label = input.closest(".apf-toggle");
					if (!label) return;
					label.classList.toggle("apf-conflict", conflict);
					label.title = conflict
						? __("{0} is on but the field is hidden on {1} — it has no effect until VIEW is on.",
							[c.label, g.label])
						: "";
				});
			});
		});
	};

	AFU.emptyState = function (message) {
		return `<div class="apf-empty"><span class="apf-empty-icon">⌗</span>${message}</div>`;
	};
})();
