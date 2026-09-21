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
	//
	// Channel bands (both pages): which candidate forms show a field, and where it's required.
	AFU.CHANNEL_GROUPS = [
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
	];

	// PROFILE VIEW PERMISSIONS (settings page only): roles that may see the field on
	// the applicant profile — the one rule that is global rather than per-opening.
	AFU.PROFILE_PERMISSION_GROUPS = [
		{ key: "profile-perms", label: "PROFILE VIEW PERMISSIONS", cls: "profile-perms", cols: [
			{ label: "VIEW ACCESS", col: "profile_view_roles", type: "roles",
			  hint: "Roles that may see this field on the applicant profile" },
		]},
	];

	/**
	 * GENERAL and PRE-OFFER RULES (Job Opening only) — role lists, see
	 * field_role_permissions.py.
	 *
	 * editableWhenLocked: stays editable on a locked field — locking freezes the
	 *   field's shape, but each opening decides who may see/edit/approve it.
	 * gateCols: the cells are read-only until one of these VIEW switches is on, so
	 *   a rule can't be set on a field no source collects. The stored rule is kept.
	 */
	AFU.OPENING_RULE_GROUPS = [
		{ key: "general",  label: "GENERAL",  cls: "general", editableWhenLocked: true,
		  gateCols: ["view_careers", "view_ijp", "view_refer", "view_campus", "view_preoffer"],
		  gateHint: "Turn this field on for at least one source (Careers, IJP, Refer, Campus Hiring or Pre-offer) before choosing who may see or edit it.",
		  cols: [
			{ label: "VISIBILITY",   col: "visibility",   type: "roles",
			  hint: "Roles that may see this field on this opening" },
			{ label: "EDITABILITY",  col: "editability",  type: "roles",
			  hint: "Roles that may edit this field on this opening" },
		]},
		{ key: "preoffer-rules", label: "PRE-OFFER RULES", cls: "preoffer-rules", editableWhenLocked: true,
		  gateCols: ["view_preoffer"],
		  gateHint: "Turn PRE-OFFER → VIEW on for this field before choosing who may see or approve it.",
		  cols: [
			{ label: "VISIBILITY",   col: "preoffer_visibility",   type: "roles",
			  hint: "Roles that may see this field on the pre-offer form" },
			{ label: "EDIT/APPROVE", col: "preoffer_edit_approve", type: "roles",
			  hint: "Roles that may edit or approve this field on the pre-offer form" },
		]},
	];

	/** Whether `row` satisfies `g.gateCols` — an ungated band is always open. */
	AFU.gateOpen = function (g, row) {
		if (!g.gateCols || !g.gateCols.length) return true;
		return g.gateCols.some((c) => !!(row || {})[c]);
	};

	// Bands to render: `opts.profilePermissions` = the settings page, otherwise the Job Opening.
	AFU.groupsFor = function (opts) {
		return AFU.CHANNEL_GROUPS.concat(
			(opts && opts.profilePermissions) ? AFU.PROFILE_PERMISSION_GROUPS : AFU.OPENING_RULE_GROUPS
		);
	};

	// Every band either page can render — the union, for anything that needs to
	// reason about columns without knowing which page it is on.
	AFU.COLUMN_GROUPS = AFU.CHANNEL_GROUPS
		.concat(AFU.PROFILE_PERMISSION_GROUPS)
		.concat(AFU.OPENING_RULE_GROUPS);

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

	// Applicability column (settings page only, `opts.applicability`). Kept out of
	// COLUMN_GROUPS, which drives the tallies and bulk bar.
	AFU.APPLICABILITY_COLS = [
		{ label: "APPLICABLE TO" },
	];

	// Colspan for this page. Pass the same `opts` the rows were rendered with —
	// the two pages have different column counts.
	AFU.totalCols = function (opts) {
		return 4
			+ AFU.groupsFor(opts).reduce((s, g) => s + g.cols.length, 0)
			+ ((opts && opts.applicability) ? AFU.APPLICABILITY_COLS.length : 0);
	};
	AFU.CHILD_TOTAL_COLS = 1 + AFU.CHILD_CHANNEL_GROUPS.reduce((s, g) => s + g.cols.length, 0);

	// Only switches can be bulk-flipped and tallied; role bands use a picker.
	AFU.TOGGLE_GROUPS = AFU.CHANNEL_GROUPS;

	// Lock affordances. Kept next to the other shared styles so both pages get
	// them from the one stylesheet injectStyles() writes.
	AFU.LOCK_CSS = `
		.apf-lock{display:inline-flex;align-items:center;gap:4px;margin-left:8px;font-size:10px;
			font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);cursor:pointer;}
		.apf-lock input{margin:0;cursor:pointer;}
		.apf-lock-badge{display:inline-flex;align-items:center;gap:3px;margin-left:8px;padding:1px 6px;
			border-radius:9px;font-size:10px;font-weight:600;letter-spacing:.03em;
			background:var(--gray-200,#e6e9ec);color:var(--gray-700,#4a5157);white-space:nowrap;}
		tr.apf-frozen{background:var(--subtle-fg,rgba(0,0,0,.02));}
		tr.apf-frozen input:disabled,tr.apf-frozen select:disabled{opacity:.55;cursor:not-allowed;}
		.apf-grip-off{opacity:.3;cursor:not-allowed;}
	`;

	AFU.escapeHtml = function (s) {
		if (s === null || s === undefined) return "";
		return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	};

	const esc = AFU.escapeHtml;

	// Sentinel option in every section picker: pick it and you're asked for a name.
	const NEW_SECTION = "+ New section…";

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
				--apf-g-applicability: #0F766E;
				--apf-appl-company: #2563EB;
				--apf-appl-assignment: #7C3AED;
				--apf-appl-always: #15803D;
				--apf-appl-warn: #B45309;
				--apf-g-profile-perms: #7C3AED;

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
				--apf-g-applicability: #2DD4BF;
				--apf-appl-company: #60A5FA;
				--apf-appl-assignment: #A78BFA;
				--apf-appl-always: #4ADE80;
				--apf-appl-warn: #FBBF24;
				--apf-g-profile-perms: #C4B5FD;
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
			.apf-bulk-sep { color: var(--apf-border); font-size: 12px; }
			.apf-bulk-section {
				border: 1px solid var(--apf-border); background: var(--apf-bg); color: var(--apf-text);
				border-radius: 6px; padding: 4px 6px; font-size: 12px; max-width: 200px;
			}
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

			   Sized for the WIDER of the two layouts, the Job Opening's:
			   34 + 56 + 208 + (11 x 92 channel) + (4 x 148 role) + 38 = 1940.
			   Job Applicant Profile Settings trades three of those role columns for
			   the applicability band and comes out narrower, so its columns simply
			   share the slack — nothing truncates either way. */
			.apf-table {
				width: 100%; border-collapse: separate; border-spacing: 0;
				font-size: 12px; min-width: 1940px; table-layout: fixed;
			}
			/* Both header rows freeze against the top of .apf-scroll: a toggle a
			   hundred rows down is unreadable once the channel band above it has
			   scrolled away. The second row parks directly beneath the first —
			   --apf-group-h is measured by AFU.freezeHeader, the band's height
			   being font-dependent. The fallback holds until that first measure. */
			.apf-table thead .apf-group-row th {
				padding: 9px 4px 6px; text-align: center; font-weight: 700;
				font-size: 10px; letter-spacing: .07em; color: var(--apf-text-dim);
				background: var(--apf-bg); border-bottom: 1px solid var(--apf-border-soft);
				position: sticky; top: 0; z-index: 3;
			}
			.apf-table thead .apf-col-row th {
				padding: 7px 4px; text-align: center; font-weight: 600;
				font-size: 9.5px; letter-spacing: .05em; color: var(--apf-text-dim);
				background: var(--apf-bg-head); border-bottom: 1px solid var(--apf-border);
				white-space: nowrap; position: sticky; top: var(--apf-group-h, 46px);
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
			.apf-g-applicability  { --g: var(--apf-g-applicability); }
			.apf-g-profile-perms  { --g: var(--apf-g-profile-perms); }

			/* ---------------------------------------------------- applicability -- */
			/* Applicability band. blue = Company, violet = Assignment, green = always
			   shown, amber = on but nothing chosen. Cells stay on one line. */
			.apf-col-appl {
				--g: var(--apf-g-applicability);
				width: 272px; min-width: 272px; max-width: 272px;
				text-align: left; vertical-align: middle; white-space: nowrap; padding: 6px 10px;
			}
			.apf-appl-start { border-left: 2px solid color-mix(in srgb, var(--g) 35%, transparent); }
			/* table-layout:fixed sizes columns from the first header row, so the width goes there. */
			.apf-table th.apf-appl-w { width: 272px; min-width: 272px; max-width: 272px; }
			th.apf-col-appl { color: var(--g); }
			.apf-appl-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
			.apf-appl-cell > .apf-toggle { flex: none; }
			.apf-appl-ico { width: 12px; height: 12px; flex: none; }

			/* Off: the default, so it recedes. */
			.apf-appl-all {
				display: inline-flex; align-items: center; gap: 5px;
				font-size: 11px; color: var(--apf-text-dim);
			}
			/* Excluded in Applicability Configuration: no switch, a reason. */
			.apf-appl-always {
				display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px;
				border-radius: 999px; font-size: 10.5px; font-weight: 600;
				color: var(--apf-appl-always);
				background: color-mix(in srgb, var(--apf-appl-always) 10%, transparent);
				border: 1px solid color-mix(in srgb, var(--apf-appl-always) 25%, transparent);
			}

			.apf-appl-edit {
				display: inline-flex; align-items: center; gap: 5px;
				border: 1px dashed color-mix(in srgb, var(--g) 55%, transparent); background: transparent;
				color: var(--g); border-radius: 6px; padding: 3px 9px; font-size: 11px; font-weight: 600;
				cursor: pointer; white-space: nowrap;
			}
			.apf-appl-edit:hover { background: color-mix(in srgb, var(--g) 10%, transparent); }
			/* Switched on with nothing chosen. */
			.apf-appl-edit-warn {
				--g: var(--apf-appl-warn); border-style: solid;
				background: color-mix(in srgb, var(--apf-appl-warn) 8%, transparent);
			}

			/* Configured: a button holding one chip per type. */
			.apf-appl-summary {
				display: flex; align-items: center; gap: 5px; min-width: 0; flex: 1;
				border: none; background: transparent; padding: 0; cursor: pointer; text-align: left;
			}
			.apf-appl-summary:hover .apf-appl-chip { filter: brightness(.96); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 18%, transparent); }
			.apf-appl-chip {
				--c: var(--apf-appl-company);
				display: inline-flex; align-items: center; gap: 4px; min-width: 0;
				padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; line-height: 1.5;
				color: var(--c); background: color-mix(in srgb, var(--c) 11%, transparent);
				border: 1px solid color-mix(in srgb, var(--c) 28%, transparent);
			}
			.apf-appl-chip.is-assignment { --c: var(--apf-appl-assignment); }
			/* Two chips share the width evenly. */
			.apf-appl-summary > .apf-appl-chip { flex: 1 1 0; max-width: fit-content; }
			.apf-appl-chip.is-missing { --c: var(--apf-g-preoffer-rules); text-decoration: line-through; }
			.apf-appl-chip-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
			.apf-appl-chip-more {
				flex: none; font-size: 9.5px; font-weight: 700; padding: 0 5px; border-radius: 999px;
				background: color-mix(in srgb, var(--c) 20%, transparent);
			}

			/* Header: what the band is, and where the always-shown list lives. */
			.apf-appl-head { display: inline-flex; align-items: center; gap: 6px; }
			.apf-appl-info {
				display: inline-flex; width: 15px; height: 15px; border-radius: 50%; align-items: center;
				justify-content: center; font-size: 10px; font-weight: 700; cursor: help;
				color: var(--g); border: 1px solid color-mix(in srgb, var(--g) 45%, transparent);
			}
			.apf-appl-cfg-link {
				display: block; margin-top: 3px; font-size: 9.5px; font-weight: 600; letter-spacing: .02em;
				color: var(--apf-text-faint); text-decoration: none;
			}
			.apf-appl-cfg-link:hover { color: var(--g); text-decoration: underline; }

			/* Job Opening: why a candidate on THIS opening will or won't see a field. */
			.apf-appl-badge {
				display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; margin-right: 4px;
				padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .02em;
			}
			.apf-appl-badge.is-shown {
				color: var(--apf-appl-always);
				background: color-mix(in srgb, var(--apf-appl-always) 10%, transparent);
			}
			.apf-appl-badge.is-hidden {
				color: var(--apf-appl-warn);
				background: color-mix(in srgb, var(--apf-appl-warn) 12%, transparent);
			}
			.apf-appl-note {
				margin-top: 6px; max-width: 640px; padding: 5px 10px; border-radius: 6px;
				font-size: 11.5px; line-height: 1.45; color: var(--apf-appl-warn);
				background: color-mix(in srgb, var(--apf-appl-warn) 9%, transparent);
				border-left: 3px solid var(--apf-appl-warn);
			}
			/* Not shown on this opening: dim its switches. */
			tr.apf-appl-offrow td.apf-band { opacity: .45; }

			/* Section badge, shown only in cross-section search results. */
			.apf-row-section {
				display: inline-block; margin-top: 4px; padding: 1px 7px; border-radius: 999px;
				font-size: 9.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
				color: var(--apf-text-dim); background: var(--apf-bg-head);
				border: 1px solid var(--apf-border);
			}

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
			/* Wide enough for the drag handle AND the number side by side. */
			.apf-col-no     { width: 56px; }
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

			/* ------------------------------------------------------ role lists -- */
			/* One line, so a long role list can't stretch the row. */
			.apf-roles {
				display: inline-flex; align-items: center; gap: 5px; max-width: 100%;
				border: 1px solid color-mix(in srgb, var(--g, var(--apf-accent)) 30%, transparent);
				background: color-mix(in srgb, var(--g, var(--apf-accent)) 10%, transparent);
				color: var(--g, var(--apf-accent)); border-radius: 999px;
				padding: 3px 5px 3px 10px; font-size: 11px; font-weight: 600;
				cursor: pointer; white-space: nowrap;
			}
			.apf-roles:hover { background: color-mix(in srgb, var(--g, var(--apf-accent)) 18%, transparent); }
			.apf-roles:disabled { opacity: .55; cursor: not-allowed; }
			.apf-roles-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
			.apf-roles-count {
				flex: none; min-width: 17px; text-align: center; border-radius: 999px;
				background: color-mix(in srgb, var(--g, var(--apf-accent)) 22%, transparent);
				padding: 1px 5px; font-size: 10px; font-weight: 700;
			}
			/* Unrestricted is the resting state and should not shout. */
			.apf-roles-all {
				border-style: dashed; background: transparent;
				color: var(--apf-text-dim); border-color: var(--apf-border);
			}
			.apf-roles-all:hover { background: var(--apf-hover); }
			/* "No one" — amber, as it's most likely an accident. */
			.apf-roles-none {
				--g: var(--apf-warn);
				border-style: solid;
			}
			/* Gated: no source collects the field, so the rule can't apply. */
			.apf-roles-gated {
				--g: var(--apf-text-faint);
				border-style: dashed; background: transparent;
				color: var(--apf-text-faint); border-color: var(--apf-border);
				opacity: .8;
			}
			.apf-roles-gated .apf-roles-count {
				background: var(--apf-off); color: var(--apf-text-faint);
			}

			/* Picker dialog — outside .apf-container, so no --apf-* tokens. */
			.apf-roles-help { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.5; }
			.apf-roles-everyone {
				display: flex; align-items: center; gap: 8px; font-size: 13px;
				font-weight: 600; margin: 0; cursor: pointer;
			}
			.apf-roles-everyone input { margin: 0; cursor: pointer; }
			.apf-roles-sub { font-size: 11.5px; color: var(--text-muted); margin: 6px 0 0 24px; }
			.apf-roles-add-label {
				margin-top: 16px; margin-bottom: 8px; font-size: 10px; font-weight: 700;
				letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted);
				border-top: 1px solid var(--border-color); padding-top: 12px;
			}
			.apf-roles-search { margin-bottom: 10px; }
			/* Scrolls, so Apply stays on screen. */
			.apf-roles-list {
				max-height: 240px; overflow-y: auto; border: 1px solid var(--border-color);
				border-radius: 6px; padding: 6px;
			}
			.apf-roles-list-off { opacity: .45; pointer-events: none; }
			.apf-roles-opt {
				display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 4px;
				font-size: 13px; font-weight: 400; margin: 0; cursor: pointer;
			}
			.apf-roles-opt:hover { background: var(--bg-light-gray, rgba(0, 0, 0, .04)); }
			.apf-roles-opt input { margin: 0; }
			.apf-roles-empty { font-size: 12px; color: var(--text-muted); padding: 8px; }
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
			/* The row is only a marker now — its panel has been moved to the dock, so
			   showing it would draw a stray 2px border under the parent row. The
			   caller still toggles its inline display, and bindChildDock reads that
			   to decide which panel to show. */
			.apf-child-row { display: none !important; }
			.apf-child-row td {
				background: var(--apf-bg-sub) !important;
				border-bottom: 2px solid var(--apf-border) !important; padding: 0 !important;
			}
			/* Panels live here, below the scrolling grid — see AFU.dockChildPanels.
			   Being outside .apf-scroll is what makes the frozen FIELD column work:
			   the panel no longer moves with the grid's horizontal scroll. */
			.apf-child-dock:empty { display: none; }
			.apf-child-container {
				margin: 10px 12px 12px; border: 1px solid var(--apf-border);
				border-radius: 10px; overflow: hidden; background: var(--apf-bg);
			}
			.apf-child-container[hidden] { display: none; }
			/* The child's own scroller: its columns scroll here, independently of the
			   parent, and it is the ancestor BOTH frozen edges stick to — the FIELD
			   column to its left, the header row to its top.
			   It has to scroll vertically as well as horizontally: with overflow-y
			   hidden the panel simply grew as tall as its rows, so a child table with
			   twenty stages pushed the page itself into scrolling and took its own
			   header off-screen with it. Capped so the parent grid stays in view
			   above it. */
			.apf-child-scroll { overflow: auto; max-height: 320px; }
			.apf-child-header {
				background: color-mix(in srgb, var(--apf-g-campus) 12%, transparent); color: var(--apf-g-campus);
				font-size: 10.5px; font-weight: 700; padding: 7px 12px; letter-spacing: .06em; text-transform: uppercase;
			}
			/* separate, not collapse: a collapsed table shares its borders between
			   neighbouring cells, so a sticky cell scrolls away from the border it is
			   drawn with. The parent table uses separate for the same reason.
			   min-width must exceed the container so there is something to scroll:
			   298 field + 10 channel columns x 108. */
			.apf-child-table {
				width: 100%; min-width: 1378px;
				border-collapse: separate; border-spacing: 0;
				font-size: 11.5px; background: var(--apf-bg);
			}
			/* Frozen header — the same reasoning as the parent grid's: a toggle far
			   down a child table is unreadable once its channel column heading has
			   scrolled away. Sticks to the top of .apf-child-scroll, which is the
			   panel's own scrollport, so it never travels with the page. */
			.apf-child-table thead th {
				padding: 6px 8px; background: var(--apf-bg-head); color: var(--apf-text-dim); font-size: 9.5px;
				font-weight: 700; text-align: center; border-bottom: 1px solid var(--apf-border); letter-spacing: .05em;
				position: sticky; z-index: 2;
			}
			/* BOTH rows freeze, and each needs its own offset — pinned at a shared
			   top:0 they land on top of each other, and the column row (later in the
			   DOM) paints over the channel band, so the first scroll loses exactly
			   the CAREERS / IJP / REFER heading the freeze was there to keep. The
			   band's height is font-dependent, so --apf-child-group-h is measured by
			   AFU.freezeChildHeader; the fallback holds until that first measure. */
			.apf-child-table thead tr.apf-child-group-row th { top: 0; }
			.apf-child-table thead tr.apf-child-col-row th { top: var(--apf-child-group-h, 26px); }
			.apf-child-table thead th.apf-child-col-field { text-align: left; }
			.apf-child-group-header { color: var(--g); letter-spacing: .06em; }
			.apf-child-table tbody td {
				padding: 7px 8px; border-bottom: 1px solid var(--apf-border-soft);
				text-align: center; vertical-align: middle; color: var(--apf-text);
			}
			.apf-child-table tbody tr:last-child td { border-bottom: none; }
			.apf-child-table tbody td.apf-child-col-field { text-align: left; }

			/* Frozen FIELD column — the toggles scroll under it, exactly as they do
			   in the parent table. Needs an opaque background (sticky cells are
			   painted over otherwise) and a z-index above the scrolling cells; the
			   header sits one level higher again so it wins where the two overlap. */
			/* 298px = the parent's frozen block (34 check + 56 no. + 208 field), so the
			   freeze boundary is one straight line down the whole table. */
			.apf-child-table th.apf-child-col-field,
			.apf-child-table td.apf-child-col-field {
				position: sticky; left: 0; width: 298px; min-width: 298px;
				box-shadow: 1px 0 0 var(--apf-border);
			}
			/* Three layers, and the order matters now that the header is sticky too:
			   scrolling cells (auto) < frozen FIELD cells (1) < header row (2) <
			   the corner cell where both freezes meet (3). Left at the old 2, the
			   body's FIELD cells tied with the header row and — coming later in the
			   DOM — painted straight over it on the first vertical scroll. */
			.apf-child-table tbody td.apf-child-col-field { background: var(--apf-bg); z-index: 1; }
			.apf-child-table thead th.apf-child-col-field { background: var(--apf-bg-head); z-index: 3; }
			.apf-child-table tbody tr:hover td.apf-child-col-field { background: var(--apf-hover); }
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
				position: sticky; left: 90px; box-shadow: 1px 0 0 var(--apf-border);
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

			/* ------------------------------------------------ drag & drop -- */
			/* The handle sits beside the row number and is ALWAYS drawn — a control
			   that only appears on hover is a control most people never find. It is
			   dimmed until the row is hovered so 40 of them don't shout. */
			.apf-no-cell { display: flex; align-items: center; justify-content: center; gap: 3px; }
			.apf-grip {
				cursor: grab; color: var(--apf-text-faint); opacity: .55;
				font-size: 13px; line-height: 1; padding: 2px 2px; border-radius: 4px;
				user-select: none; transition: opacity .12s, color .12s, background .12s;
			}
			.apf-table tbody tr:hover .apf-grip { opacity: 1; }
			.apf-grip:hover { color: var(--apf-accent); background: var(--apf-accent-soft); opacity: 1; }
			.apf-grip:active { cursor: grabbing; }
			.apf-table tbody tr.apf-dragging td { opacity: .4; }

			/* Insertion line. An inset shadow, not a border: a 2px border would shift
			   every row below it. The frozen FIELD cell restates its own divider
			   shadow, which the shorthand would otherwise replace. */
			.apf-table tbody tr.apf-drop-before td { box-shadow: inset 0 2px 0 var(--apf-accent); }
			.apf-table tbody tr.apf-drop-after  td { box-shadow: inset 0 -2px 0 var(--apf-accent); }
			.apf-table tbody tr.apf-drop-before td.apf-col-field {
				box-shadow: inset 0 2px 0 var(--apf-accent), 1px 0 0 var(--apf-border);
			}
			.apf-table tbody tr.apf-drop-after td.apf-col-field {
				box-shadow: inset 0 -2px 0 var(--apf-accent), 1px 0 0 var(--apf-border);
			}

			/* A section in the sidebar, while a field is hovering over it. */
			.apf-side-item.apf-drop-into {
				background: var(--apf-accent-soft); color: var(--apf-accent);
				outline: 2px dashed var(--apf-accent); outline-offset: -2px;
			}
			.apf-side-hint {
				font-size: 10.5px; color: var(--apf-text-faint); line-height: 1.45;
				padding: 8px 10px 2px; border-top: 1px solid var(--apf-border);
				margin-top: 8px;
			}
		` + AFU.LOCK_CSS;
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

	// ------------------------------------------------------ role-list cells --
	// Stored as JSON: ["All"] or empty = everyone, [] = nobody. Understands the old
	// Select words too. Mirrors parse_roles() in field_role_permissions.py.
	AFU.ROLE_ALL = "All";
	const LEGACY_ROLE_WORDS = {
		"All": [AFU.ROLE_ALL],
		"Editable": [AFU.ROLE_ALL],
		"Same as visibility": [AFU.ROLE_ALL],
		"Approval Required": [AFU.ROLE_ALL],
		"Hiring Team": [AFU.ROLE_ALL],
		"Recruiter Only": [AFU.ROLE_ALL],
		"Read Only": [],
		"Hidden": [],
	};

	AFU.parseRoles = function (raw) {
		if (raw === null || raw === undefined || raw === "") return [AFU.ROLE_ALL];
		if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
		const str = String(raw).trim();
		if (!str) return [AFU.ROLE_ALL];
		if (Object.prototype.hasOwnProperty.call(LEGACY_ROLE_WORDS, str)) {
			return LEGACY_ROLE_WORDS[str].slice();
		}
		let parsed;
		try { parsed = JSON.parse(str); } catch (e) { return [AFU.ROLE_ALL]; }
		if (!Array.isArray(parsed)) return [AFU.ROLE_ALL];
		return parsed.filter(Boolean).map(String);
	};

	AFU.serializeRoles = function (roles) {
		const cleaned = [];
		(roles || []).forEach((r) => {
			const v = String(r || "").trim();
			if (v && !cleaned.includes(v)) cleaned.push(v);
		});
		// "All" absorbs the rest — a cell reading "All +3" would look like a
		// restriction it is not.
		return JSON.stringify(cleaned.includes(AFU.ROLE_ALL) ? [AFU.ROLE_ALL] : cleaned);
	};

	// A one-line button (first role + count) rather than an inline multi-select,
	// so a long rule can't stretch the row; the picker holds the detail.
	AFU.renderRoles = function (ref, col, raw, gcls, hint) {
		const roles = AFU.parseRoles(raw);
		const all = roles.includes(AFU.ROLE_ALL);
		let label = __("All");
		let cls = "apf-roles apf-roles-all";
		if (!all) {
			if (!roles.length) {
				label = __("No one");
				cls = "apf-roles apf-roles-none";
			} else {
				label = roles.length > 1 ? `${roles[0]} +${roles.length - 1}` : roles[0];
				cls = "apf-roles apf-roles-some";
			}
		}
		const count = (!all && roles.length > 1)
			? `<span class="apf-roles-count">${roles.length}</span>` : "";
		// data-value lets refreshRuleGates restore the tooltip without a re-render.
		return `<button class="${cls}" data-ref="${esc(ref)}" data-col="${col}"
			data-value="${esc(AFU.serializeRoles(roles))}"
			${gcls ? `data-gcls="${esc(gcls)}"` : ""} title="${esc(AFU.roleTooltip(hint, roles))}">
			<span class="apf-roles-text">${esc(label)}</span>${count}
		</button>`;
	};

	/** Hover text for a role cell. */
	AFU.roleTooltip = function (hint, raw) {
		const roles = AFU.parseRoles(raw);
		return [
			hint ? __(hint) : "",
			roles.includes(AFU.ROLE_ALL)
				? __("Everyone")
				: (roles.length ? roles.join(", ") : __("No role selected")),
			__("Click to change"),
		].filter(Boolean).join("\n");
	};

	/** Disable a rendered role button and say why (the field isn't collected yet). */
	AFU.gateRoleButton = function (html, gateHint) {
		return html
			.replace("<button ", "<button disabled ")
			.replace('class="apf-roles', 'class="apf-roles apf-roles-gated')
			.replace(/title="[^"]*"/, `title="${esc(__(gateHint || "Not applicable while the field is off."))}"`);
	};

	/**
	 * Re-gate rule cells against the current switches. Runs from refreshCounts and
	 * updates in place — a re-render would collapse open panels and reset scroll.
	 */
	AFU.refreshRuleGates = function (host) {
		const gated = AFU.COLUMN_GROUPS.filter((g) => g.gateCols && g.gateCols.length);
		if (!gated.length) return;

		host.querySelectorAll("tbody tr[data-ref]").forEach((tr) => {
			gated.forEach((g) => {
				const open = g.gateCols.some((c) => {
					const input = tr.querySelector(`input[type=checkbox][data-col="${c}"]`);
					return !!(input && input.checked);
				});
				g.cols.forEach((c) => {
					const btn = tr.querySelector(`button.apf-roles[data-col="${c.col}"]`);
					if (!btn) return;
					btn.disabled = !open;
					btn.classList.toggle("apf-roles-gated", !open);
					btn.title = open
						? AFU.roleTooltip(c.hint, btn.getAttribute("data-value"))
						: __(g.gateHint || "Not applicable while the field is off.");
				});
			});
		});
	};

	// Role options, fetched once per page for every picker.
	let rolesPromise = null;
	AFU.loadRoleOptions = function () {
		if (!rolesPromise) {
			rolesPromise = frappe
				.xcall("recruitment.recruitment.field_role_permissions.get_role_options")
				.then((rows) => rows || [])
				.catch(() => []); // "All" / "No one" still work without the list
		}
		return rolesPromise;
	};

	/**
	 * Role picker. "Everyone" is a separate switch, not a checkbox in the list —
	 * "All" plus named roles isn't storable (see serializeRoles).
	 *
	 * @param {object} o  {title, hint, value, onSubmit(serializedJson)}
	 */
	AFU.openRolesDialog = function (o) {
		const selected = new Set(AFU.parseRoles(o.value).filter((r) => r !== AFU.ROLE_ALL));
		let everyone = AFU.parseRoles(o.value).includes(AFU.ROLE_ALL);
		let search = "";
		let options = [];

		const d = new frappe.ui.Dialog({
			title: o.title || __("Permissions"),
			size: "small",
			fields: [{ fieldtype: "HTML", fieldname: "body" }],
			primary_action_label: __("Apply"),
			primary_action() {
				o.onSubmit(AFU.serializeRoles(everyone ? [AFU.ROLE_ALL] : [...selected]));
				d.hide();
			},
		});
		const $body = d.fields_dict.body.$wrapper;

		function draw() {
			const shown = options.filter((r) =>
				!search || `${r.label} ${r.value}`.toLowerCase().includes(search.toLowerCase())
			);
			const list = shown.length
				? shown.map((r) => `<label class="apf-roles-opt">
						<input type="checkbox" data-role="${esc(r.value)}"
							${selected.has(r.value) ? "checked" : ""}${everyone ? " disabled" : ""}/>
						<span>${esc(r.label || r.value)}</span>
					</label>`).join("")
				: `<div class="apf-roles-empty">${
						options.length ? __("No role matches that search.") : __("No roles available.")
					}</div>`;

			// The count is the point of the summary line: "No one" is a legitimate
			// setting and has to be distinguishable from "not finished yet".
			const summary = everyone
				? __("Everyone — no restriction.")
				: (selected.size
					? __("{0} role(s) selected.", [selected.size])
					: `<b>${__("No one")}</b> — ${__("this field is hidden from every user.")}`);

			$body.html(`
				<div class="apf-roles-dlg">
					${o.hint ? `<div class="apf-roles-help">${esc(o.hint)}</div>` : ""}
					<label class="apf-roles-everyone">
						<input type="checkbox" class="apf-roles-all-chk"${everyone ? " checked" : ""}/>
						<span>${__("Everyone")}</span>
					</label>
					<div class="apf-roles-sub">${summary}</div>
					<div class="apf-roles-add-label">${__("Or choose specific roles")}</div>
					<input class="apf-roles-search form-control" type="text"
						placeholder="${__("Search roles")}" value="${esc(search)}"${everyone ? " disabled" : ""}/>
					<div class="apf-roles-list${everyone ? " apf-roles-list-off" : ""}">${list}</div>
				</div>`);

			$body.find(".apf-roles-all-chk").on("change", (e) => {
				everyone = e.currentTarget.checked;
				draw();
			});
			// `change` rather than `input`: redrawing on every keystroke drops focus.
			$body.find(".apf-roles-search").on("change", (e) => {
				search = e.currentTarget.value || "";
				draw();
			});
			$body.find(".apf-roles-list input[type=checkbox]").on("change", (e) => {
				const role = e.currentTarget.getAttribute("data-role");
				if (e.currentTarget.checked) selected.add(role);
				else selected.delete(role);
				draw();
			});
		}

		draw();
		d.show();
		AFU.loadRoleOptions().then((rows) => {
			options = rows;
			// Keep a stored role that no longer exists visible, so Apply doesn't drop it silently.
			const known = new Set(options.map((r) => r.value));
			[...selected].filter((r) => !known.has(r)).forEach((r) => {
				options.push({ value: r, label: `${r} (${__("not a role")})` });
			});
			draw();
		});
	};

	/**
	 * Bind role cells to the picker; pages differ only in `write(ref, col, json)`.
	 * Buttons are marked once bound — re-binding after a cell is replaced would
	 * otherwise stack listeners on every other button.
	 */
	AFU.bindRoleCells = function (host, getValue, write) {
		host.querySelectorAll("button.apf-roles").forEach((btn) => {
			if (btn.dataset.apfRolesBound) return;
			btn.dataset.apfRolesBound = "1";
			btn.addEventListener("click", () => {
				const ref = btn.getAttribute("data-ref");
				const col = btn.getAttribute("data-col");
				const meta = AFU.roleColumn(col) || {};
				AFU.openRolesDialog({
					title: meta.dialogTitle || __("Permissions"),
					hint: meta.hint ? __(meta.hint) : "",
					value: getValue(ref, col),
					onSubmit(json) {
						write(ref, col, json);
						// Redraw just this cell: a full re-render would collapse any open
						// child-field panel and scroll the grid back to the left.
						btn.outerHTML = AFU.renderRoles(
							ref, col, json, btn.getAttribute("data-gcls"), meta.hint
						);
						AFU.bindRoleCells(host, getValue, write);
						// The replacement is rendered ungated; restate the row's gates
						// on it so it matches every other cell in the band.
						AFU.refreshRuleGates(host);
					},
				});
			});
		});
	};

	/** The column definition behind a role cell, with a title for its dialog. */
	AFU.roleColumn = function (col) {
		for (const g of AFU.COLUMN_GROUPS) {
			for (const c of g.cols) {
				if (c.col === col) return { ...c, dialogTitle: `${g.label} · ${c.label}` };
			}
		}
		return null;
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

	/**
	 * Park the VIEW / MANDATORY header row directly under the channel band.
	 *
	 * Both rows are `position: sticky`, but the second needs to know how tall the
	 * first is to stop in the right place, and CSS has no way to ask. The band
	 * carries a pill label plus (for toggle groups) a count line, so its height
	 * moves with the font — a hardcoded offset shows up either as a seam of
	 * scrolling rows between the two, or as the second row covering the first.
	 */
	AFU.freezeHeader = function (host) {
		const table = host && host.querySelector(".apf-table");
		const band = table && table.querySelector("thead .apf-group-row");
		if (!band) return;

		// Re-rendered on every section switch: without this each render leaves
		// another live observer measuring a table no longer on the page.
		if (host._apfHeaderRO) host._apfHeaderRO.disconnect();

		const apply = () => {
			const h = Math.round(band.getBoundingClientRect().height);
			// 0 while the tab is hidden (Job Opening mounts this behind one) — keep
			// the CSS fallback; the observer re-measures on reveal.
			if (h) table.style.setProperty("--apf-group-h", h + "px");
		};

		apply();
		if (window.ResizeObserver) {
			host._apfHeaderRO = new ResizeObserver(apply);
			host._apfHeaderRO.observe(band);
		}
	};

	/**
	 * Same measure as freezeHeader, for a docked child panel: park the child's
	 * column row directly beneath its channel band instead of on top of it.
	 *
	 * Measured on reveal, not at render time — a docked panel is hidden until its
	 * Child Fields button is clicked, and a hidden box measures 0.
	 */
	AFU.freezeChildHeader = function (panel) {
		const table = panel && panel.querySelector(".apf-child-table");
		const band = table && table.querySelector("thead .apf-child-group-row");
		if (!band) return;
		// ceil, not round: half a pixel short and a sliver of the row scrolling
		// underneath shows through the seam between the two frozen rows.
		const h = Math.ceil(band.getBoundingClientRect().height);
		if (h) table.style.setProperty("--apf-child-group-h", h + "px");
	};

	/**
	 * Lift the child-field panels out of the scrolling table and dock them beneath
	 * it.
	 *
	 * Inline under their row, the panels sit inside a <td> of a table that is
	 * 1922px wide inside an 1150px scrollport — so scrolling right to reach a
	 * channel drags the panel's field names off-screen. Three attempts to pin them
	 * in place with position:sticky failed: a sticky box can only travel inside its
	 * containing block, and every arrangement inside that cell either had no travel
	 * or lost the scrollport to a nested one.
	 *
	 * Docked below the scroller the problem disappears rather than being worked
	 * around: the panel is no longer inside the horizontal scroll at all, it owns
	 * its own scrollbar, and its FIELD column freezes against a plain div — the
	 * ordinary case sticky is built for.
	 */
	AFU.dockChildPanels = function (host) {
		const pane = host && host.querySelector(".apf-scroll");
		if (!pane) return;

		let dock = host.querySelector(".apf-child-dock");
		if (!dock) {
			dock = document.createElement("div");
			dock.className = "apf-child-dock";
			pane.insertAdjacentElement("afterend", dock);
		}

		// Panels are rendered inside their row (renderChildConfigRow) and moved here
		// once, so the row markup stays the single source of truth.
		host.querySelectorAll(".apf-child-row .apf-child-container").forEach((panel) => {
			const row = panel.closest(".apf-child-row");
			panel.setAttribute("data-parent-ref", row.getAttribute("data-parent-ref") || "");
			panel.hidden = true;
			dock.appendChild(panel);
		});

		// Every panel is closed on a fresh render, so the grid gets its full height
		// back — otherwise a section switched away from while a panel was open would
		// hand its shortened pane to the next section.
		AFU.anchorDock(host);
	};

	/* The grid never collapses below this while a panel is anchored to a row near
	   the top — a 100px sliver of table reads as broken, and the two frozen header
	   rows would take most of it. */
	AFU.DOCK_MIN_H = 200;

	/**
	 * End the grid just below the row whose panel is open.
	 *
	 * The panel is docked beneath the whole scroller (see dockChildPanels), which is
	 * what keeps its FIELD column frozen — but it also meant a table field sitting
	 * eighth in a section of twenty opened its config below all twenty, with no
	 * visible connection to the row that owns it.
	 *
	 * Rather than move the panel back inside the horizontal scrollport, the grid is
	 * ended where the panel should start: the pane is capped so the owning row is its
	 * last visible row, and scrolled so that row sits against the bottom edge. The
	 * panel then reads as belonging to the row directly above it, wherever in the
	 * section that row happens to be, and the rows below stay reachable by scrolling
	 * the (now shorter) pane.
	 *
	 * Reads its state from the DOM rather than taking arguments, so every caller —
	 * the expand toggle, a re-render, the search filter — can just call it and get
	 * the right answer, including "nothing is open, put the grid back".
	 */
	AFU.anchorDock = function (host) {
		const pane = host && host.querySelector(".apf-scroll");
		if (!pane) return;

		const panel = host.querySelector(".apf-child-dock > .apf-child-container:not([hidden])");
		const ref = panel && panel.getAttribute("data-parent-ref");
		const childRow = ref && host.querySelector(`.apf-child-row[data-parent-ref="${ref}"]`);
		// The marker row is display:none, so it has no box to measure — the field row
		// that owns it is the one immediately before it (see renderRow).
		const fieldRow = childRow && childRow.previousElementSibling;

		// Nothing open, or nothing measurable: the grid goes back to its full height.
		if (!fieldRow) {
			pane.style.maxHeight = "";
			return;
		}

		pane.style.maxHeight = "";                       // measure at natural height
		const full = pane.clientHeight;
		const rowBottom = Math.round(
			fieldRow.getBoundingClientRect().bottom
			- pane.getBoundingClientRect().top
			+ pane.scrollTop
		);
		if (!full || rowBottom <= 0) return;             // hidden tab: leave it alone

		const height = Math.max(AFU.DOCK_MIN_H, Math.min(full, rowBottom));
		pane.style.maxHeight = height + "px";
		pane.scrollTop = Math.max(0, rowBottom - height);
	};

	/**
	 * Mirror the caller's expand toggle onto the docked panel.
	 *
	 * Both screens toggle the child <tr> themselves; that row is now empty, so this
	 * reads the state it just set and shows the matching panel. One delegated
	 * listener per host, in the bubble phase so it runs after their handler.
	 */
	AFU.bindChildDock = function (host) {
		if (!host || host._apfDockBound) return;
		host._apfDockBound = true;

		host.addEventListener("click", (e) => {
			const btn = e.target.closest && e.target.closest(".apf-expand");
			if (!btn) return;
			const ref = btn.getAttribute("data-ref");
			const panel = host.querySelector(`.apf-child-dock > [data-parent-ref="${ref}"]`);
			if (!panel) return;

			// The panel's own visibility IS the state. This used to read the marker
			// row's inline display, on the assumption that the screen toggled it —
			// which only job_opening.js ever did. Here nothing did, so `open` was
			// permanently false: the panel could never be shown, and anchorDock was
			// always told nothing was open.
			const open = panel.hidden;

			// One panel at a time — two docked panels would push the grid off-screen.
			host.querySelectorAll(".apf-child-dock > .apf-child-container").forEach((p) => {
				p.hidden = p !== panel || !open;
			});
			host.querySelectorAll(".apf-expand").forEach((b) => {
				const shown = b === btn && open;
				b.textContent = `${shown ? "▼" : "▶"} ${__("Child Fields")}`;
			});
			if (!panel.hidden) AFU.freezeChildHeader(panel);
			// ...and end the grid just above whichever one is now showing.
			AFU.anchorDock(host);
		});
	};

	AFU.renderChildConfigRow = function (row, frozen, opts) {
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
					${AFU.CHILD_CHANNEL_GROUPS.map((g) => g.cols.map((c) => {
						const t = AFU.renderChildToggle(ref, cfn, c.col, cfc[c.col], g.cls);
						return `<td>${frozen ? t.replace("<input ", "<input disabled ") : t}</td>`;
					}).join("")).join("")}
				</tr>`
			).join("")
			: `<tr><td colspan="${AFU.CHILD_TOTAL_COLS}" class="apf-child-empty">No configurable child fields.</td></tr>`;

		const groupHeaderRow = `<tr class="apf-child-group-row">
			<th class="apf-child-col-field"></th>
			${AFU.CHILD_CHANNEL_GROUPS.map((g) =>
				`<th colspan="${g.cols.length}" class="apf-child-group-header apf-g-${g.cls}">${g.label}</th>`
			).join("")}
		</tr>`;
		const colHeaderRow = `<tr class="apf-child-col-row">
			<th class="apf-child-col-field">FIELD</th>
			${AFU.CHILD_CHANNEL_GROUPS.map((g) => g.cols.map((c) =>
				`<th>${c.label}</th>`
			).join("")).join("")}
		</tr>`;

		// The container is pinned to the left of the parent's viewport and carries
		// its OWN horizontal scroller. Without that the child table is just more
		// content inside the parent's 1922px row, so scrolling to reach a channel
		// drags the child's field names off-screen with it.
		return `<tr class="apf-child-row" data-parent-ref="${esc(ref)}" style="display:none">
			<td colspan="${AFU.totalCols(opts)}">
				<div class="apf-child-container">
					<div class="apf-child-header">Child Fields — ${esc(row.display_name || ref)}</div>
					<div class="apf-child-scroll">
						<table class="apf-child-table">
							<thead>${groupHeaderRow}${colHeaderRow}</thead>
							<tbody>${bodyHtml}</tbody>
						</table>
					</div>
				</div>
			</td>
		</tr>`;
	};

	// ----------------------------------------------------------------- rows --
	// Inline SVG icons; currentColor so they take the chip's colour.
	const ICON = {
		company: '<svg class="apf-appl-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="2" width="10" height="12" rx="1"/><path d="M6 5h1M9 5h1M6 8h1M9 8h1M7 14v-2.5h2V14"/></svg>',
		assignment: '<svg class="apf-appl-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="5.5" r="2.3"/><path d="M1.8 13.5c.5-2.4 2.2-3.7 4.2-3.7s3.7 1.3 4.2 3.7"/><circle cx="11.3" cy="6.3" r="1.8"/><path d="M11.6 9.9c1.4.2 2.4 1.3 2.7 3.1"/></svg>',
		all: '<svg class="apf-appl-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 2 1.8 10 0 12M8 2c-1.8 2-1.8 10 0 12"/></svg>',
		lock: '<svg class="apf-appl-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="7" width="9" height="7" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>',
		warn: '<svg class="apf-appl-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 2.5 14 13H2z"/><path d="M8 6.5v3M8 11.2v.3"/></svg>',
		eye: '<svg class="apf-appl-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
		eyeOff: '<svg class="apf-appl-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 2l12 12M6.4 6.5A2 2 0 0 0 9.5 9.6M4.2 4.6C2.6 5.8 1.5 8 1.5 8S4 12.5 8 12.5c1.3 0 2.4-.4 3.4-1M7 3.6c.3 0 .7-.1 1-.1 4 0 6.5 4.5 6.5 4.5s-.5 1-1.4 2"/></svg>',
	};
	AFU.APPL_ICON = ICON;

	/**
	 * Applicability cell. States: excluded → green "Always shown" (no switch);
	 * off → "All openings"; on but empty → amber "Choose who"; on → blue Company /
	 * violet Assignment chips. A value missing from `opts.applicabilityLabels` no
	 * longer exists and renders struck through.
	 */
	AFU.renderApplicabilityCells = function (row, opts) {
		const ref = row.reference_name || "";
		const excluded = opts.applicabilityExcluded && opts.applicabilityExcluded.has(ref);

		if (excluded) {
			return `
				<td class="apf-col-appl apf-appl-start">
					<div class="apf-appl-cell"><span class="apf-appl-always" title="${__(
						"Listed in Job Applicant Applicability Configuration — this field is shown on every opening and cannot be narrowed."
					)}">${ICON.lock}${__("Always shown")}</span></div>
				</td>`;
		}

		const on = !!cintjs(row.applicable_enabled);
		const entries = parseApplicability(row.applicability_config);

		// The extra class lets the settings page bind it to a redraw.
		const toggle = AFU.renderToggle(ref, "applicable_enabled", on, "applicability")
			.replace("<input ", `<input class="apf-appl-toggle" title="${__(
				"Show this field only on openings of chosen companies or assignments"
			)}" `);

		let body;
		if (!on) {
			body = `<span class="apf-appl-all">${ICON.all}${__("All openings")}</span>`;
		} else if (!entries.length) {
			body = `<button class="apf-appl-edit apf-appl-edit-warn" data-ref="${esc(ref)}" title="${__(
				"Applicable To is on but nothing is chosen — the field is still shown on every opening. Click to choose."
			)}">${ICON.warn}${__("Choose who")}</button>`;
		} else {
			const labels = opts.applicabilityLabels || {};
			const chip = (type, list) => {
				if (!list.length) return "";
				const map = labels[type] || {};
				const first = list[0];
				const missing = list.some((v) => !map[v]);
				const more = list.length > 1 ? `<span class="apf-appl-chip-more">+${list.length - 1}</span>` : "";
				return `<span class="apf-appl-chip is-${type.toLowerCase()}${missing ? " is-missing" : ""}">
					${type === "Company" ? ICON.company : ICON.assignment}
					<span class="apf-appl-chip-text">${esc(map[first] || first)}</span>${more}
				</span>`;
			};
			const companies = entries.filter((e) => e.type === "Company").map((e) => e.value);
			const assignments = entries.filter((e) => e.type === "Assignment").map((e) => e.value);
			const nameOf = (type) => (v) => ((labels[type] || {})[v]) || `${v} (${__("deleted")})`;
			const tooltip = [
				__("Shown only on openings matching ANY of:"),
				...companies.map((v) => `  • ${__("Company")}: ${nameOf("Company")(v)}`),
				...assignments.map((v) => `  • ${__("Assignment")}: ${nameOf("Assignment")(v)}`),
				"",
				__("Click to edit"),
			].join("\n");
			body = `<button class="apf-appl-summary" data-ref="${esc(ref)}" title="${esc(tooltip)}">
				${chip("Company", companies)}${chip("Assignment", assignments)}
			</button>`;
		}

		return `
			<td class="apf-col-appl apf-appl-start">
				<div class="apf-appl-cell">${toggle}${body}</div>
			</td>`;
	};

	/** Job Opening badge: does this opening's company / assignment admit the field? */
	AFU.renderOpeningApplicabilityBadge = function (info) {
		if (!info) return "";
		return info.applicable
			? `<span class="apf-appl-badge is-shown" title="${esc(info.reason || "")}">${ICON.eye}${__("Scoped · shown here")}</span>`
			: `<span class="apf-appl-badge is-hidden" title="${esc(info.reason || "")}">${ICON.eyeOff}${__("Not for this opening")}</span>`;
	};

	/** Tolerant parse of a row's stored config — mirrors field_applicability.parse_config. */
	function parseApplicability(raw) {
		if (!raw) return [];
		let parsed = raw;
		if (typeof raw === "string") {
			try { parsed = JSON.parse(raw); } catch (e) { return []; }
		}
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(e) => e && (e.type === "Company" || e.type === "Assignment") && e.value
		);
	}
	AFU.parseApplicability = parseApplicability;

	function cintjs(v) { return v ? 1 : 0; }

	/**
	 * One field's row. `opts.lockable`: this page may change the lock (settings
	 * only). Disabled controls are presentation only — enforce_locked_fields is
	 * the actual rule.
	 */
	AFU.renderRow = function (row, idx, opts) {
		opts = opts || {};
		const ref = row.reference_name || "";
		const isTable = row.fieldtype === "Table" || row.fieldtype === "Table MultiSelect";
		// Frozen only where the lock cannot be lifted — on the settings page the
		// admin has to be able to untick it, so the row stays live there.
		const frozen = !!row.locked && !opts.lockable;
		// Search results span every section, so a row's position in the list means
		// nothing; dragging it would reorder against rows that are not on screen.
		const searching = !!opts.searching;
		// Job Opening only: whether this opening's company / assignments admit the
		// field. Absent for unscoped fields and on the settings page.
		const applInfo = (opts.openingApplicability || {})[ref] || null;
		const dis = frozen ? " disabled" : "";
		const groupCells = AFU.groupsFor(opts).map((g) => {
			// GENERAL / PRE-OFFER RULES stay live on a locked row (editableWhenLocked).
			const cellsFrozen = frozen && !g.editableWhenLocked;
			// A rule the field's own sources make unreachable — see `gateCols`.
			const gated = !AFU.gateOpen(g, row);
			return g.cols.map((c, ci) => {
				const cls = [
					c.type === "toggle" ? "apf-col-toggle" : "apf-col-select",
					"apf-band", `apf-g-${g.cls}`,
					ci === 0 ? "apf-gstart" : "",
				].filter(Boolean).join(" ");
				if (c.type === "toggle") {
					// A MANDATORY switch is only meaningful while its channel's VIEW is on.
					const viewCol = g.cols[0].col;
					const conflict = c.col !== viewCol && row[c.col] && !row[viewCol];
					let toggle = AFU.renderToggle(ref, c.col, row[c.col], g.cls);
					if (conflict) toggle = toggle.replace("apf-toggle ", "apf-toggle apf-conflict ");
					if (cellsFrozen) toggle = toggle.replace("<input ", "<input disabled ");
					return `<td class="${cls}">${toggle}</td>`;
				}
				if (c.type === "roles") {
					let btn = AFU.renderRoles(ref, c.col, row[c.col], g.cls, c.hint);
					if (gated) btn = AFU.gateRoleButton(btn, g.gateHint);
					return `<td class="${cls}">${
						cellsFrozen ? btn.replace("<button ", "<button disabled ") : btn
					}</td>`;
				}
				const select = AFU.renderSelect(ref, c.col, row[c.col] || c.options[0], c.options);
				return `<td class="${cls}">${
					cellsFrozen ? select.replace("<select ", "<select disabled ") : select
				}</td>`;
			}).join("");
		}).join("");

		const tableBadge = isTable ? `<span class="apf-table-badge">TABLE</span>` : "";

		// The lock itself: a live checkbox on the settings page, a padlock badge on
		// the Job Opening. Same `data-col` either way, so the settings page needs no
		// handler of its own — the existing [data-ref][data-col] binding picks it up.
		const lockCell = opts.lockable
			? `<label class="apf-lock" title="${__("Lock this field — every Job Opening shows it read-only")}">
					<input type="checkbox" data-ref="${esc(ref)}" data-col="locked"${row.locked ? " checked" : ""}/>
					<span>${__("Lock")}</span>
				</label>`
			: (row.locked
				? `<span class="apf-lock-badge" title="${__("Locked in Job Applicant Profile Settings — configure it there")}">🔒 ${__("Locked")}</span>`
				: "");
		const expandBtn = isTable
			? `<button class="apf-expand" data-ref="${esc(ref)}" title="Configure child table fields">▶ Child Fields</button>`
			: "";

		const mainRow = `
			<tr data-ref="${esc(ref)}" class="${[
				frozen ? "apf-frozen" : "",
				(applInfo && !applInfo.applicable) ? "apf-appl-offrow" : "",
			].filter(Boolean).join(" ")}" data-search="${esc(
				`${row.display_name || ""} ${ref}`.toLowerCase()
			)}">
				<td class="apf-col-check"><input type="checkbox" class="apf-row-check" data-ref="${esc(ref)}"${dis}/></td>
				<td class="apf-col-no apf-no">
					<div class="apf-no-cell">
						${(frozen || searching) ? `<span class="apf-grip apf-grip-off" title="${
							searching
								? __("Clear the search to reorder fields")
								: __("Locked — placement is set in Job Applicant Profile Settings")
						}">⠿</span>`
							: `<span class="apf-grip" draggable="true" data-ref="${esc(ref)}"
							title="${__("Drag to reposition · click to move to another section")}">⠿</span>`}
						<span class="apf-no-num">${idx + 1}</span>
					</div>
				</td>
				<td class="apf-col-field apf-text">
					<div>
						<input class="apf-label-input" type="text"
							data-ref="${esc(ref)}"
							value="${esc(row.display_name || ref)}"
							title="Click to edit label"${dis}/>
						${tableBadge}
						${lockCell}
					</div>
					<div class="apf-ref">${esc(ref)}</div>
					${searching
						? `<span class="apf-row-section" title="${__("Section")}">${esc(row.section || "General")}</span>`
						: ""}
					${AFU.renderOpeningApplicabilityBadge(applInfo)}
					${expandBtn}
				</td>
				${opts.applicability ? AFU.renderApplicabilityCells(row, opts) : ""}
				${groupCells}
				<td class="apf-col-actions">${frozen ? ""
					: `<button class="apf-delete" data-ref="${esc(ref)}" title="Remove">×</button>`}</td>
			</tr>`;

		return mainRow + (isTable ? AFU.renderChildConfigRow(row, frozen, opts) : "");
	};

	// --------------------------------------------------------------- header --
	AFU.headerRows = function (opts) {
		opts = opts || {};
		const applGroupTh = opts.applicability
			? `<th colspan="${AFU.APPLICABILITY_COLS.length}" class="apf-band apf-appl-start apf-appl-w apf-g-applicability">
					<span class="apf-appl-head">
						<span class="apf-group-label">${__("APPLICABILITY")}</span>
						<span class="apf-appl-info" title="${esc(__(
							"Switch on to show a field only on Job Openings of chosen Companies, or openings an Assignment admits. Off = every opening. Applies on every source (Careers, IJP, Refer, Campus, Pre-offer) — the field is left out of the form, and out of validation, everywhere else."
						))}">i</span>
					</span>
					<a class="apf-appl-cfg-link" href="${esc(opts.applicabilityConfigRoute || "/app/job-applicant-applicability-configuration")}"
						target="_blank" title="${esc(__("Fields listed there are always shown and get no switch"))}">${
						__("Manage always-shown fields")} ↗</a>
				</th>`
			: "";
		const applColTh = opts.applicability
			? AFU.APPLICABILITY_COLS.map((c, ci) =>
					`<th class="apf-col-appl${ci === 0 ? " apf-appl-start" : ""}">${c.label}</th>`
				).join("")
			: "";

		const groupRow = `
			<tr class="apf-group-row">
				<th class="apf-col-check"></th>
				<th class="apf-col-no"></th>
				<th class="apf-col-field"></th>
				${applGroupTh}
				${AFU.groupsFor(opts).map((g) => `<th colspan="${g.cols.length}" class="apf-band apf-gstart apf-g-${g.cls}">
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
				${applColTh}
				${AFU.groupsFor(opts).map((g) => g.cols.map((c, ci) => {
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

	/**
	 * Search box + per-channel tallies + the (initially hidden) bulk bar.
	 *
	 * @param {string[]} [sections]  section names offered in the bulk "Move to"
	 *                               picker. Omit it and the picker is left out.
	 */
	AFU.toolbarHtml = function (sections, opts) {
		opts = opts || {};
		const bulkOptions = AFU.TOGGLE_GROUPS.map((g) =>
			g.cols.map((c) => `<option value="${c.col}">${g.label} · ${c.label}</option>`).join("")
		).join("");

		// Move several ticked rows at once — the drag-free path to a section change.
		const moveHtml = (sections && sections.length)
			? `<span class="apf-bulk-sep">|</span>
				<select class="apf-bulk-section" title="${__("Move selected fields to section")}">
					${sections.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
					<option value="${NEW_SECTION}">${NEW_SECTION}</option>
				</select>
				<button class="apf-bulk-btn" data-bulk-move>${__("Move")}</button>`
			: "";

		return `
			<div class="apf-toolbar">
				<div class="apf-search-wrap">
					<input type="text" class="apf-search" value="${esc(opts.search || "")}"
						placeholder="${__("Search every section…")}"/>
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
					${moveHtml}
					<button class="apf-bulk-clear" data-bulk-clear>${__("Clear selection")}</button>
				</div>
			</div>`;
	};

	// ------------------------------------------------------------ move/DnD --
	/**
	 * The no-drag path to the same operation: pick a section (or name a new one)
	 * for `refs`. Backs the grip click and the bulk bar's Move button, so a long
	 * list never has to be dragged across a scrolling pane.
	 */
	AFU.promptMoveSection = function (host, refs, apply) {
		const sections = Array.from(host.querySelectorAll(".apf-side-item"))
			.map((el) => el.getAttribute("data-section"))
			.filter(Boolean);
		const d = new frappe.ui.Dialog({
			title: __("Move {0} field(s)", [refs.length]),
			fields: [
				{
					fieldname: "section", fieldtype: "Select", reqd: 1,
					label: __("Move to section"),
					options: sections.concat([NEW_SECTION]).join("\n"),
					default: sections[0] || NEW_SECTION,
				},
				{
					fieldname: "new_section", fieldtype: "Data", label: __("New section name"),
					depends_on: `eval:doc.section=="${NEW_SECTION}"`,
				},
			],
			primary_action_label: __("Move"),
			primary_action(v) {
				const target = v.section === NEW_SECTION ? (v.new_section || "").trim() : v.section;
				if (!target) {
					frappe.msgprint(__("Enter a name for the new section."));
					return;
				}
				d.hide();
				apply(target);
			},
		});
		d.show();
	};

	/**
	 * Drag a field to reposition it inside its section, or onto a sidebar section
	 * to move it there; clicking the grip opens the same move as a dialog.
	 *
	 * Only the active section's rows are rendered, so a drop on a row is always a
	 * reorder and a drop on the sidebar is always a section change. Ticked rows
	 * move together: grabbing one of them drags the whole selection.
	 *
	 * Positions are reported as (targetRef, before|after) rather than as an index,
	 * so the caller resolves them against its own model — which keeps the result
	 * right while the search box is filtering rows out of the table.
	 *
	 * Every handler is delegated to the table body / sidebar rather than bound per
	 * row: this runs again on every re-render, and the grid can hold 100+ rows.
	 * dragover fires continuously, so the highlighted row and section are tracked
	 * in closures — re-scanning the table 60 times a second to clear a class is
	 * exactly the kind of work that makes a drag feel heavy.
	 *
	 * @param {HTMLElement} host  the mounted UI root
	 * @param {object}      opts  {moveRows(refs, {targetRef, position, section})}
	 */
	AFU.bindDragDrop = function (host, opts) {
		if (!opts || !opts.moveRows) return;
		const tbody = host.querySelector(".apf-table tbody");
		const sidebar = host.querySelector(".apf-side");
		if (!tbody) return;

		let dragRefs = [];
		let dragged = null;   // the row being dragged
		let markedRow = null; // row currently showing an insertion line
		let markedSide = null; // sidebar section currently highlighted

		// Grabbing a ticked row drags the whole tick; any other row drags alone.
		function refsFor(ref) {
			const checked = Array.from(host.querySelectorAll(".apf-row-check:checked"))
				.map((cb) => cb.getAttribute("data-ref"));
			return checked.includes(ref) ? checked : [ref];
		}

		function unmark() {
			if (markedRow) markedRow.classList.remove("apf-drop-before", "apf-drop-after");
			if (markedSide) markedSide.classList.remove("apf-drop-into");
			markedRow = markedSide = null;
		}

		function endDrag() {
			unmark();
			if (dragged) dragged.classList.remove("apf-dragging");
			dragged = null;
			dragRefs = [];
		}

		function dropSide(e, tr) {
			const rect = tr.getBoundingClientRect();
			return (e.clientY - rect.top) > rect.height / 2 ? "after" : "before";
		}

		// Inert grips (locked rows, search results) have no data-ref — ignore them.
		const gripOf = (e) => {
			const grip = e.target.closest && e.target.closest(".apf-grip");
			return grip && grip.getAttribute("data-ref") ? grip : null;
		};
		const rowOf = (e) => e.target.closest && e.target.closest("tr[data-ref]");

		tbody.addEventListener("dragstart", (e) => {
			const grip = gripOf(e);
			if (!grip) return;
			dragRefs = refsFor(grip.getAttribute("data-ref"));
			dragged = grip.closest("tr");
			if (dragged) dragged.classList.add("apf-dragging");
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = "move";
				try { e.dataTransfer.setData("text/plain", dragRefs.join(",")); } catch (err) { /* noop */ }
			}
		});
		tbody.addEventListener("dragend", endDrag);

		// Click, not drag — the route for anyone who'd rather not drag at all.
		tbody.addEventListener("click", (e) => {
			const grip = gripOf(e);
			if (!grip) return;
			const refs = refsFor(grip.getAttribute("data-ref"));
			AFU.promptMoveSection(host, refs, (section) => opts.moveRows(refs, { section }));
		});

		tbody.addEventListener("dragover", (e) => {
			if (!dragRefs.length) return;
			const tr = rowOf(e);
			if (!tr) return;
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
			if (dragRefs.includes(tr.getAttribute("data-ref"))) { unmark(); return; }
			const cls = `apf-drop-${dropSide(e, tr)}`;
			if (markedRow === tr && tr.classList.contains(cls)) return;
			unmark();
			markedRow = tr;
			tr.classList.add(cls);
		});

		tbody.addEventListener("drop", (e) => {
			if (!dragRefs.length) return;
			const tr = rowOf(e);
			if (!tr) return;
			e.preventDefault();
			const targetRef = tr.getAttribute("data-ref");
			const position = dropSide(e, tr);
			const refs = dragRefs;
			endDrag();
			if (!refs.includes(targetRef)) opts.moveRows(refs, { targetRef, position });
		});

		if (!sidebar) return;
		const sectionOf = (e) => e.target.closest && e.target.closest(".apf-side-item");

		sidebar.addEventListener("dragover", (e) => {
			if (!dragRefs.length) return;
			const item = sectionOf(e);
			if (!item) return;
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
			if (markedSide === item) return;
			unmark();
			markedSide = item;
			item.classList.add("apf-drop-into");
		});

		sidebar.addEventListener("drop", (e) => {
			if (!dragRefs.length) return;
			const item = sectionOf(e);
			if (!item) return;
			e.preventDefault();
			const refs = dragRefs;
			endDrag();
			opts.moveRows(refs, { section: item.getAttribute("data-section") });
		});
	};

	/**
	 * Reposition `refs` inside `rows` and return the new array.
	 *
	 * Shared by both screens: Settings reorders the settings child table, the Job
	 * Opening reorders its merged template — the arrays differ, the arithmetic
	 * doesn't. `dest` is either {targetRef, position} (drop on a row: land beside
	 * it, in its section) or {section} (drop on the sidebar / a dialog: land at
	 * the end of that section).
	 *
	 * Returns {rows, section} — section being where the fields ended up, so the
	 * caller can switch the view to it.
	 */
	AFU.applyMove = function (rows, refs, dest, getSection, setSection) {
		const refSet = new Set(refs);
		const moving = rows.filter((r) => refSet.has(r.reference_name));
		if (!moving.length) return null;
		const rest = rows.filter((r) => !refSet.has(r.reference_name));

		let section;
		let insertAt;
		if (dest.targetRef) {
			const ti = rest.findIndex((r) => r.reference_name === dest.targetRef);
			if (ti < 0) return null;
			section = getSection(rest[ti]);
			insertAt = ti + (dest.position === "after" ? 1 : 0);
		} else {
			section = (dest.section || "").trim() || "General";
			// End of the target section — or the end of the table when the section
			// has no rows left (a brand-new one, or one just emptied).
			let last = -1;
			rest.forEach((r, i) => { if (getSection(r) === section) last = i; });
			insertAt = last < 0 ? rest.length : last + 1;
		}

		moving.forEach((r) => setSection(r, section));
		rest.splice(insertAt, 0, ...moving);
		return { rows: rest, section: section };
	};

	/**
	 * Wire the toolbar. Counts and filtering read the rendered DOM, so the two
	 * callers don't have to hand over their row model — they only supply
	 * `applyBulk`, which writes the change back to whichever document they own.
	 *
	 * @param {HTMLElement} host      the mounted UI root
	 * @param {object}      opts      {applyBulk(col, value, refs), moveRows(refs, dest)}
	 */
	AFU.bindToolbar = function (host, opts) {
		AFU.dockChildPanels(host);
		AFU.bindChildDock(host);
		// After the docking moves, so the band is measured once against a settled
		// DOM rather than being read and then invalidated.
		AFU.freezeHeader(host);

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
			// The page already rendered only the matches; just update the count.
			if (opts.onSearch) {
				const showing = host.querySelector(".apf-showing");
				if (showing) {
					const total = opts.totalFields || mainRows().length;
					showing.textContent = q
						? __("{0} of {1} fields · all sections", [mainRows().length, total])
						: __("{0} fields", [total]);
				}
				syncSelection();
				return;
			}
			let shown = 0;
			mainRows().forEach((tr) => {
				const hit = !q || (tr.getAttribute("data-search") || "").includes(q);
				tr.classList.toggle("apf-filtered-out", !hit);
				// Keep a table field's child-config row with its parent, and don't
				// leave its docked panel open once the field itself is filtered out.
				const ref = tr.getAttribute("data-ref");
				const child = host.querySelector(`.apf-child-row[data-parent-ref="${ref}"]`);
				if (child) child.classList.toggle("apf-filtered-out", !hit);
				const panel = host.querySelector(`.apf-child-dock > [data-parent-ref="${ref}"]`);
				if (panel && !hit) panel.hidden = true;
				if (hit) shown += 1;
			});
			// A filter that hid the open panel's own row leaves the grid capped just
			// below a row that is no longer there — re-anchor against what's left.
			AFU.anchorDock(host);
			const showing = host.querySelector(".apf-showing");
			if (showing) {
				const total = mainRows().length;
				showing.textContent = q
					? __("{0} of {1} fields", [shown, total])
					: __("{0} fields", [total]);
			}
			syncSelection();
		}

		if (search && opts.onSearch) {
			// Debounced: each keystroke re-renders the whole grid, and doing that
			// synchronously per character makes typing feel like it is dragging.
			let timer = null;
			search.addEventListener("input", () => {
				clearTimeout(timer);
				timer = setTimeout(() => opts.onSearch(search.value), 140);
			});
			// The re-render replaced the input the user was typing in, so put the
			// caret back where it was rather than at the start.
			if (opts.searchActive) {
				search.focus();
				const end = search.value.length;
				try { search.setSelectionRange(end, end); } catch (e) { /* not a text input */ }
			}
			applyFilter();
		} else if (search) {
			search.addEventListener("input", applyFilter);
		}

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
			const moveBtn = bulk.querySelector("[data-bulk-move]");
			if (moveBtn && opts && opts.moveRows) {
				moveBtn.addEventListener("click", () => {
					const refs = checkedRefs();
					if (!refs.length) return;
					const sel = bulk.querySelector(".apf-bulk-section");
					const value = sel ? sel.value : "";
					if (!value || value === NEW_SECTION) {
						AFU.promptMoveSection(host, refs, (section) => opts.moveRows(refs, { section }));
						return;
					}
					opts.moveRows(refs, { section: value });
				});
			}
			const clear = bulk.querySelector("[data-bulk-clear]");
			if (clear) {
				clear.addEventListener("click", () => {
					host.querySelectorAll(".apf-row-check").forEach((cb) => { cb.checked = false; });
					if (selectAll) selectAll.checked = false;
					syncSelection();
				});
			}
		}

		AFU.bindDragDrop(host, opts);

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

		// A VIEW switch is also what opens or closes the GENERAL / PRE-OFFER RULES
		// cells beside it, and every caller of this function has just moved one.
		AFU.refreshRuleGates(host);

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
