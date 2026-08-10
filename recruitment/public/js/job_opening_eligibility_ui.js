/**
 * job_opening_eligibility_ui.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The eligibility condition builder. Renders into an HTML field and writes the
 * rule child table behind it (the raw grid stays hidden).
 *
 * One card per condition, read top to bottom as the sentence it means:
 *
 *     WHEN   Educational Qualification            ← a Job Applicant field
 *     IN     GPA/Percentage   [only rows where Highest Qualification = Graduation]
 *     IS     is less than · 60
 *     THEN   ⛔ Reject  /  ⏸ Hold
 *
 * Fields come straight from the Job Applicant's own meta, grouped by the section
 * they sit in on that form. Pick a CHILD TABLE and the builder asks which column
 * inside it to test, plus an optional row filter — so "Graduation percentage below
 * 60" is built by choosing the table, the column, and the row it applies to,
 * rather than hunting through a pre-expanded "<stage> — <column>" list.
 *
 * A condition is a trigger: a matching Knock out rejects, a matching Flag holds,
 * and a candidate nothing matches is Shortlisted (see eligibility_engine.py).
 *
 * The same builder serves the Job Opening's own conditions and the Campus
 * Eligibility Settings defaults new campus openings start from (see FORMS).
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
	// Where the builder lives on each form: the HTML host and the table behind it.
	// `defaults` marks the form that can pull the settings defaults in.
	const FORMS = {
		"Job Opening": {
			host: "custom_eligibility_rules_ui",
			table: "custom_eligibility_rules",
			defaults: true,
		},
		"Campus Eligibility Settings": {
			host: "eligibility_rules_ui",
			table: "eligibility_rules",
			defaults: false,
		},
	};

	const SETTINGS_DOCTYPE = "Campus Eligibility Settings";
	const ENGINE = "recruitment.recruitment.eligibility_engine";
	const DEFAULTS_METHOD =
		"recruitment.recruitment.doctype.campus_eligibility_settings.campus_eligibility_settings.get_default_eligibility_rules";

	const esc = frappe.utils.escape_html;

	// Operators are stored as symbols but read as words — "is at least 60" is a
	// sentence, "≥ 60" is a formula.
	const OP_LABEL = {
		"=": "is",
		"≠": "is not",
		"≥": "is at least",
		"≤": "is at most",
		">": "is more than",
		"<": "is less than",
		"one of": "is one of",
		"not one of": "is not one of",
		"contains": "contains",
		"does not contain": "does not contain",
	};

	// What the operator list is derived from, said in the user's words — a "6"
	// beside it is the only way to see there is more than "is" behind the dropdown.
	const TYPE_LABEL = {
		number: "number",
		choice: "choice",
		date: "date",
		check: "yes/no",
		text: "text",
	};

	let CAT = null;          // {groups: [{label, fields:[…]}], operators:{}}
	let FLAT = {};           // fieldname -> Job Applicant field entry
	const CHILD = {};        // child doctype -> [column entries]

	function injectStyles() {
		if (document.getElementById("elig-ui-styles")) return;
		const css = `
		.elig{--e-reject:#DC2626;--e-hold:#D97706;--e-pass:#059669;--e-accent:#2563EB;
			--e-card:var(--card-bg,#fff);--e-line:var(--border-color,#E5E7EB);
			--e-ink:var(--text-color,#111827);--e-dim:var(--text-muted,#6B7280);
			--e-faint:var(--text-light,#9CA3AF);--e-sub:var(--bg-color,#F9FAFB);}
		[data-theme="dark"] .elig{--e-reject:#F87171;--e-hold:#FBBF24;--e-pass:#34D399;--e-accent:#60A5FA;}

		/* ── explainer ─────────────────────────────────────────────────────── */
		.elig-head{border:1px solid var(--e-line);border-radius:12px;padding:12px 14px;margin-bottom:14px;
			background:linear-gradient(135deg,color-mix(in srgb,var(--e-accent) 7%,transparent),transparent 65%);}
		.elig-head-t{font-size:.83rem;font-weight:600;color:var(--e-ink);margin-bottom:8px;
			display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
		.elig-tally{margin-left:auto;font-size:.72rem;font-weight:600;color:var(--e-dim);
			background:var(--e-card);border:1px solid var(--e-line);border-radius:999px;padding:3px 10px;}
		.elig-flow{display:flex;gap:8px;flex-wrap:wrap;}
		.elig-chip{display:inline-flex;align-items:center;gap:6px;font-size:.74rem;font-weight:600;
			border-radius:999px;padding:4px 11px;border:1px solid transparent;white-space:nowrap;}
		.elig-chip.re{color:var(--e-reject);background:color-mix(in srgb,var(--e-reject) 11%,transparent);
			border-color:color-mix(in srgb,var(--e-reject) 26%,transparent);}
		.elig-chip.ho{color:var(--e-hold);background:color-mix(in srgb,var(--e-hold) 12%,transparent);
			border-color:color-mix(in srgb,var(--e-hold) 26%,transparent);}
		.elig-chip.pa{color:var(--e-pass);background:color-mix(in srgb,var(--e-pass) 11%,transparent);
			border-color:color-mix(in srgb,var(--e-pass) 26%,transparent);}

		/* ── one condition ─────────────────────────────────────────────────── */
		/* The accent bar is an INSET SHADOW, not an absolutely-positioned ::before.
		   A pseudo-element with square corners needs overflow:hidden to sit inside
		   the rounded card — and that same overflow clips any Link picker opened in
		   the card, cutting the list off at the card edge with no way to scroll to
		   the rest of it. An inset shadow follows the radius on its own. */
		.elig-card{position:relative;z-index:1;border:1px solid var(--e-line);border-radius:12px;
			background:var(--e-card);padding:12px 14px 12px 18px;margin-bottom:10px;
			box-shadow:inset 4px 0 0 var(--c);transition:box-shadow .14s,border-color .14s;}
		.elig-card:hover{border-color:color-mix(in srgb,var(--c) 45%,var(--e-line));
			box-shadow:inset 4px 0 0 var(--c),0 1px 2px rgba(16,24,40,.05),
				0 4px 12px color-mix(in srgb,var(--c) 10%,transparent);}
		/* An open dropdown belongs to its card, so that card has to paint above the
		   cards after it — later siblings would otherwise cover the list. */
		.elig-card:focus-within{z-index:5;}
		.elig-card.ko{--c:var(--e-reject);} .elig-card.flag{--c:var(--e-hold);}
		.elig-card.todo{--c:var(--e-faint);border-style:dashed;}

		.elig-card-top{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
		.elig-no{flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;
			font-size:.72rem;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 13%,transparent);}
		.elig-sentence{flex:1;min-width:0;font-size:.79rem;color:var(--e-dim);line-height:1.5;}
		.elig-sentence b{color:var(--e-ink);font-weight:600;}
		.elig-sentence .v{color:var(--c);font-weight:600;}
		.elig-del{flex:none;border:none;background:none;color:var(--e-faint);cursor:pointer;font-size:1rem;
			padding:2px 6px;border-radius:6px;line-height:1;}
		.elig-del:hover{color:var(--e-reject);background:color-mix(in srgb,var(--e-reject) 10%,transparent);}

		/* label + controls, one line per step */
		.elig-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px;}
		.elig-line:last-child{margin-bottom:0;}
		.elig-kw{flex:none;width:52px;font-size:.66rem;letter-spacing:.09em;text-transform:uppercase;
			font-weight:700;color:var(--e-faint);padding-top:1px;}
		.elig select,.elig .elig-val-mount input{border:1px solid var(--e-line);border-radius:8px;padding:0 9px;
			font-size:.82rem;height:32px;background:var(--control-bg,var(--fg-color,#fff));color:var(--e-ink);}
		.elig select:focus,.elig .elig-val-mount input:focus{outline:none;border-color:var(--e-accent);
			box-shadow:0 0 0 3px color-mix(in srgb,var(--e-accent) 16%,transparent);}
		.elig-fld{flex:1 1 240px;min-width:200px;}
		.elig-col{flex:1 1 190px;min-width:170px;}
		.elig-op{flex:0 0 auto;min-width:152px;}
		.elig-op[disabled]{opacity:.55;cursor:not-allowed;}
		.elig-val-mount{flex:1 1 160px;min-width:140px;}
		.elig-val-mount .form-group{margin:0;}
		.elig-val-mount .control-input-wrapper .control-input{margin:0;}
		.elig-val-mount input,.elig-val-mount .awesomplete{width:100%;}

		/* the row filter, visually nested under its table */
		.elig-filter{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 7px 60px;
			padding:7px 10px;border-radius:9px;background:var(--e-sub);border:1px dashed var(--e-line);}
		.elig-filter-lbl{font-size:.7rem;font-weight:600;color:var(--e-dim);white-space:nowrap;}
		.elig-filter select,.elig-filter input{height:28px;font-size:.78rem;}
		.elig-filter input{border:1px solid var(--e-line);border-radius:8px;padding:0 9px;flex:1 1 120px;
			min-width:110px;background:var(--control-bg,var(--fg-color,#fff));color:var(--e-ink);}
		/* the filter's value is a real control (Link picker, Select, …) — same size
		   as the plain input it replaces, so the row doesn't jump when it mounts. */
		.elig-filter-mount{flex:1 1 140px;min-width:120px;}
		.elig-filter-mount .form-group{margin:0;}
		.elig-filter-mount .control-input-wrapper .control-input{margin:0;}
		.elig-filter-mount input,.elig-filter-mount .awesomplete{width:100%;}
		.elig-filter-mount input{height:28px;font-size:.78rem;}
		/* the type behind the operator list, so "is" never looks like the only choice */
		.elig-type{flex:none;font-size:.68rem;font-weight:600;letter-spacing:.03em;color:var(--e-dim);
			background:var(--e-sub);border:1px solid var(--e-line);border-radius:999px;padding:2px 8px;
			white-space:nowrap;cursor:help;}
		.elig-warn{font-size:.7rem;font-weight:600;color:var(--e-hold);white-space:nowrap;}
		.elig-filter-x{border:none;background:none;color:var(--e-faint);cursor:pointer;font-size:.8rem;
			padding:2px 5px;border-radius:6px;line-height:1;flex:none;}
		.elig-filter-x:hover{color:var(--e-reject);background:color-mix(in srgb,var(--e-reject) 10%,transparent);}
		/* the quiet way in to the row filter — offered, not imposed */
		.elig-link{border:none;background:none;padding:0;font-size:.76rem;font-weight:600;cursor:pointer;
			color:var(--e-accent);}
		.elig-link:hover{text-decoration:underline;}

		/* action as a segmented control — the choice is two outcomes, not a list */
		.elig-seg{display:inline-flex;border:1px solid var(--e-line);border-radius:9px;overflow:hidden;}
		.elig-seg button{border:none;background:none;cursor:pointer;font-size:.78rem;font-weight:600;
			padding:6px 13px;color:var(--e-dim);display:inline-flex;align-items:center;gap:6px;}
		.elig-seg button+button{border-left:1px solid var(--e-line);}
		.elig-seg button:hover{background:var(--e-sub);}
		.elig-seg button.on.ko{background:color-mix(in srgb,var(--e-reject) 13%,transparent);color:var(--e-reject);}
		.elig-seg button.on.flag{background:color-mix(in srgb,var(--e-hold) 14%,transparent);color:var(--e-hold);}

		/* A long master (Education Stage, Designation, …) scrolls inside its own list
		   instead of running off the card. */
		.elig .awesomplete > ul{max-height:240px;overflow-y:auto;}

		.elig-empty{padding:26px 16px;text-align:center;color:var(--e-dim);font-size:.85rem;
			border:1px dashed var(--e-line);border-radius:12px;margin-bottom:12px;background:var(--e-sub);}
		.elig-empty .i{display:block;font-size:1.5rem;margin-bottom:6px;opacity:.6;}
		.elig-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
		.elig-add,.elig-btn{border:1px solid var(--e-accent);background:none;color:var(--e-accent);
			padding:7px 15px;border-radius:9px;font-size:.82rem;font-weight:600;cursor:pointer;}
		.elig-add{background:var(--e-accent);color:#fff;border-color:var(--e-accent);}
		.elig-add:hover{filter:brightness(1.08);}
		.elig-btn:hover{background:color-mix(in srgb,var(--e-accent) 10%,transparent);}
		.elig-btn.ghost{border-color:var(--e-line);color:var(--e-dim);}
		.elig-btn.ghost:hover{background:var(--e-sub);color:var(--e-ink);}
		`;
		const el = document.createElement("style");
		el.id = "elig-ui-styles"; el.textContent = css; document.head.appendChild(el);
	}

	// ── catalog ──────────────────────────────────────────────────────────────
	function loadCatalog() {
		if (CAT) return Promise.resolve(CAT);
		return frappe.call({ method: `${ENGINE}.get_eligibility_field_catalog` }).then((r) => {
			CAT = (r && r.message) || { groups: [], operators: {} };
			FLAT = {};
			(CAT.groups || []).forEach((g) => (g.fields || []).forEach((f) => { FLAT[f.value] = f; }));
			return CAT;
		});
	}

	/** Columns of a child table, fetched once per child doctype. */
	function loadChild(childDoctype) {
		if (!childDoctype) return Promise.resolve([]);
		if (CHILD[childDoctype]) return Promise.resolve(CHILD[childDoctype]);
		return frappe.call({
			method: `${ENGINE}.get_child_table_fields`,
			args: { child_doctype: childDoctype },
		}).then((r) => {
			CHILD[childDoctype] = (r && r.message) || [];
			return CHILD[childDoctype];
		});
	}

	// ── stored rule ↔ builder state ──────────────────────────────────────────
	/**
	 * A rule row is stored exactly as the engine reads it:
	 *   scalar → field_name = "<fieldname>"
	 *   table  → field_name = "<table>::<column>", and an optional row filter in
	 *            match_field = "<table>::<column>" + match_value.
	 * A table with no column chosen yet is kept as "<table>::" so the pick survives
	 * a re-render; the engine ignores a rule with no column.
	 */
	function parse(row) {
		const fn = row.field_name || "";
		if (fn.indexOf("::") > -1) {
			const p = fn.split("::");
			const mf = row.match_field || "";
			return {
				field: p[0],
				column: p[1] || "",
				filterCol: mf.indexOf("::") > -1 ? mf.split("::")[1] : "",
				filterOp: row.match_operator || "=",
				filterVal: row.match_value || "",
			};
		}
		return { field: fn, column: "", filterCol: "", filterOp: "=", filterVal: "" };
	}

	function write(row, st) {
		const entry = FLAT[st.field];
		if (!st.field) {
			row.field_name = ""; row.match_field = ""; row.match_operator = ""; row.match_value = "";
			return;
		}
		if (!entry || !entry.is_table) {
			row.field_name = st.field; row.match_field = ""; row.match_operator = ""; row.match_value = "";
			return;
		}
		row.field_name = `${st.field}::${st.column || ""}`;
		row.match_field = st.filterCol ? `${st.field}::${st.filterCol}` : "";
		row.match_operator = st.filterCol ? (st.filterOp || "=") : "";
		row.match_value = st.filterCol ? (st.filterVal || "") : "";
	}

	const colsOf = (st) => {
		const entry = FLAT[st.field];
		return (entry && entry.is_table && CHILD[entry.child_doctype]) || [];
	};

	/** The entry whose type drives the operator list and the Value control. */
	function targetEntry(st) {
		const entry = FLAT[st.field];
		if (!entry) return null;
		if (!entry.is_table) return entry;
		return colsOf(st).find((c) => c.value === st.column) || null;
	}

	function typeFamily(ft) {
		if (["Float", "Int", "Currency", "Percent"].includes(ft)) return "number";
		if (["Select", "Link"].includes(ft)) return "choice";
		if (["Date", "Datetime"].includes(ft)) return "date";
		if (ft === "Check") return "check";
		return "text";
	}
	function opsFor(entry) {
		const fam = entry ? typeFamily(entry.fieldtype) : "text";
		return (CAT.operators && CAT.operators[fam]) || CAT.operators.text || ["=", "≠"];
	}

	function opt(v, label, sel) {
		return `<option value="${esc(v)}"${sel === v ? " selected" : ""}>${esc(label)}</option>`;
	}

	// ── rendering ────────────────────────────────────────────────────────────
	const cfgFor = (frm) => FORMS[frm.doctype];

	function headHtml(cfg, rules) {
		const scope = cfg.defaults
			? __("Applies to this opening only.")
			: __("New campus openings start from these — each then keeps its own editable copy.");
		const ko = rules.filter((r) => (r.action || "Knock out") === "Knock out").length;
		const tally = rules.length
			? `<span class="elig-tally">${__("{0} reject · {1} hold", [ko, rules.length - ko])}</span>`
			: "";
		return `<div class="elig-head">
			<div class="elig-head-t">${__("A condition fires on the candidates it describes.")}${tally}</div>
			<div class="elig-flow">
				<span class="elig-chip re">⛔ ${__("Matched Reject → application rejected")}</span>
				<span class="elig-chip ho">⏸ ${__("Matched Hold → held for review")}</span>
				<span class="elig-chip pa">✓ ${__("Nothing matched → Shortlisted")}</span>
			</div>
			<div class="elig-head-t" style="margin:9px 0 0;font-weight:400;color:var(--e-dim);">${scope}</div>
		</div>`;
	}

	/** The card's plain-English recap — what this condition will actually do. */
	function sentence(row, st) {
		const entry = FLAT[st.field];
		if (!entry) return `<i>${__("Pick a field to start")}</i>`;
		const target = targetEntry(st);
		if (entry.is_table && !target) {
			return `<b>${esc(entry.label)}</b> — <i>${__("choose which column to check")}</i>`;
		}
		const op = OP_LABEL[row.operator] || row.operator || "is";
		const val = (row.value === 0 || row.value) ? String(row.value) : "…";
		const act = (row.action || "Knock out") === "Knock out" ? __("Reject") : __("Hold");
		const test = `<b>${esc(target.label)}</b> ${esc(op)} <b>${esc(val)}</b>`;

		// A table condition is about the candidate's ROWS, and says so — otherwise
		// "Highest Qualification of 10th" reads like two different questions.
		let clause = test;
		if (entry.is_table) {
			const filterCol = colsOf(st).find((c) => c.value === st.filterCol);
			const filterOp = OP_LABEL[st.filterOp] || st.filterOp || "is";
			clause = filterCol
				? __("any {0} row whose {1} {2} {3} has {4}", [
					`<b>${esc(entry.label)}</b>`, esc(filterCol.label), esc(filterOp),
					`<b>${esc(st.filterVal || "…")}</b>`, test])
				: __("any {0} row has {1}", [`<b>${esc(entry.label)}</b>`, test]);
		}
		return `${__("When")} ${clause} → <span class="v">${act}</span>`;
	}

	function fieldSelect(st, i) {
		let html = `<option value="">${esc(__("Select a field…"))}</option>`;
		(CAT.groups || []).forEach((g) => {
			if (!(g.fields || []).length) return;
			html += `<optgroup label="${esc(g.label)}">` + g.fields.map((f) =>
				opt(f.value, f.is_table ? `${f.label} ⋯` : f.label, st.field)
			).join("") + `</optgroup>`;
		});
		return `<select class="elig-fld" data-role="field" data-i="${i}"
			title="${__("Fields marked ⋯ are tables — you'll pick a column inside next")}">${html}</select>`;
	}

	function renderCard(row, i) {
		const st = parse(row);
		const entry = FLAT[st.field];
		const target = targetEntry(st);
		const isTable = !!(entry && entry.is_table);
		const cols = colsOf(st);
		const ko = (row.action || "Knock out") === "Knock out";
		// A filter with no value narrows nothing — the engine ignores it. Say so on
		// the card rather than letting it sit there looking like a live restriction.
		const danglingFilter = !!(st.filterCol && !String(st.filterVal || "").trim());
		const incomplete = !entry || (isTable && !target) || danglingFilter;

		// The row filter never offers the column being tested — narrowing to
		// "rows where Highest Qualification = 10th" and then testing Highest
		// Qualification asks the same question twice. It is also kept out of sight
		// until it is asked for: most conditions want any row, not a specific one.
		const filterCols = cols.filter((c) => c.value !== st.column);
		// The filter is a comparison in its own right, so its operators are typed by
		// ITS column: "Education Stage is Graduation", "GPA/Percentage is at least 60".
		const filterEntry = cols.find((c) => c.value === st.filterCol) || null;
		const filterHtml = !st.column ? "" : (st.filterCol ? `
			<div class="elig-filter">
				<span class="elig-filter-lbl">${__("only in rows where")}</span>
				<select data-role="filter-col" data-i="${i}">
					${filterCols.map((c) => opt(c.value, c.label, st.filterCol)).join("")}
				</select>
				<select data-role="filter-op" data-i="${i}">
					${opsFor(filterEntry).map((o) => opt(o, OP_LABEL[o] || o, st.filterOp)).join("")}
				</select>
				<span class="elig-filter-mount" data-i="${i}"></span>
				<button class="elig-filter-x" data-role="filter-clear" data-i="${i}"
					title="${__("Check every row instead")}">✕</button>
				${danglingFilter ? `<span class="elig-warn">${__("needs a value, or remove it")}</span>` : ""}
			</div>` : (filterCols.length ? `
			<div class="elig-line">
				<span class="elig-kw"></span>
				<button class="elig-link" data-role="filter-add" data-i="${i}">
					+ ${__("only check certain rows")}</button>
			</div>` : ""));

		const colSel = isTable ? `
			<div class="elig-line">
				<span class="elig-kw">${__("In")}</span>
				<select class="elig-col" data-role="column" data-i="${i}">
					<option value="">${esc(__("Which column?"))}</option>
					${cols.map((c) => opt(c.value, c.label, st.column)).join("")}
				</select>
			</div>
			${filterHtml}` : "";

		// The comparison the chosen field actually supports. Until a field (or a
		// table's column) is picked there is no type to derive it from, so the
		// control says so instead of quietly offering the text operators — which is
		// what made the list look like it never adapted.
		const ops = target ? opsFor(target) : [];
		const opSel = ops.length
			? `<select class="elig-op" data-role="operator" data-i="${i}">
					${ops.map((o) => opt(o, OP_LABEL[o] || o, row.operator)).join("")}
				</select>
				<span class="elig-type" title="${__("The operators above are the ones a {0} field supports", [target.fieldtype])}">
					${esc(TYPE_LABEL[typeFamily(target.fieldtype)] || target.fieldtype)} · ${ops.length}
				</span>`
			: `<select class="elig-op" disabled><option>${esc(__("—"))}</option></select>`;

		return `<div class="elig-card ${incomplete ? "todo" : (ko ? "ko" : "flag")}" data-i="${i}">
			<div class="elig-card-top">
				<span class="elig-no">${i + 1}</span>
				<span class="elig-sentence">${sentence(row, st)}</span>
				<button class="elig-del" data-role="del" data-i="${i}" title="${__("Remove")}">✕</button>
			</div>
			<div class="elig-line">
				<span class="elig-kw">${__("When")}</span>
				${fieldSelect(st, i)}
			</div>
			${colSel}
			<div class="elig-line">
				<span class="elig-kw">${__("Is")}</span>
				${opSel}
				<span class="elig-val-mount" data-i="${i}"></span>
			</div>
			<div class="elig-line">
				<span class="elig-kw">${__("Then")}</span>
				<span class="elig-seg">
					<button type="button" class="ko ${ko ? "on" : ""}" data-role="action" data-act="Knock out" data-i="${i}">
						⛔ ${__("Reject")}</button>
					<button type="button" class="flag ${ko ? "" : "on"}" data-role="action" data-act="Flag" data-i="${i}">
						⏸ ${__("Hold")}</button>
				</span>
			</div>
		</div>`;
	}

	function render(frm) {
		const cfg = cfgFor(frm);
		if (!cfg) return;
		const field = frm.fields_dict[cfg.host];
		if (!field || !field.$wrapper) return;
		const rules = frm.doc[cfg.table] || [];

		// Any table already referenced needs its columns before it can render.
		const pending = [];
		rules.forEach((row) => {
			const entry = FLAT[parse(row).field];
			if (entry && entry.is_table && !CHILD[entry.child_doctype]) pending.push(entry.child_doctype);
		});
		if (pending.length) {
			Promise.all(pending.map(loadChild)).then(() => render(frm));
			return;
		}

		field.$wrapper.html(`<div class="elig">
			${headHtml(cfg, rules)}
			${rules.map((r, i) => renderCard(r, i)).join("")
				|| `<div class="elig-empty"><span class="i">🎯</span>
					${__("No conditions yet — every candidate who applies is Shortlisted.")}</div>`}
			<div class="elig-actions">
				<button class="elig-add">+ ${__("Add Condition")}</button>
				${cfg.defaults ? `<button class="elig-btn ghost" data-role="load-defaults">${__("Load campus defaults")}</button>
					<button class="elig-btn ghost" data-role="open-settings">${__("Edit defaults")}</button>` : ""}
			</div>
		</div>`);

		bind(frm, field.$wrapper, cfg);
		rules.forEach((row, i) => {
			const $val = field.$wrapper.find(`.elig-val-mount[data-i="${i}"]`);
			if ($val.length) mountValue(frm, row, $val);
			const $filter = field.$wrapper.find(`.elig-filter-mount[data-i="${i}"]`);
			if ($filter.length) mountFilterValue(frm, row, $filter);
		});
	}

	/**
	 * A real Frappe control for a value box, typed by the field it belongs to — so
	 * an Education Stage is picked from the master, a Select from its own options,
	 * a number from a number box. Used for BOTH the condition's value and the row
	 * filter's value ("only rows where Highest Qualification = …"), which is a Link
	 * for exactly the same reason the field itself is.
	 *
	 * `op` only matters for the condition value: "one of" takes a comma list, so it
	 * falls back to free text whatever the field type.
	 */
	function mountControl($mount, entry, value, op, onChange) {
		$mount.empty();
		let df;
		if (!entry) {
			df = { fieldtype: "Data", label: "", placeholder: __("Pick a field first") };
		} else if (op === "one of" || op === "not one of") {
			df = { fieldtype: "Data", label: "", placeholder: __("value1, value2, …") };
		} else if (entry.fieldtype === "Link") {
			df = { fieldtype: "Link", options: entry.options, label: "", placeholder: __("Search…") };
		} else if (entry.fieldtype === "Select") {
			df = { fieldtype: "Select", options: entry.options, label: "" };
		} else if (["Float", "Currency", "Percent"].includes(entry.fieldtype)) {
			df = { fieldtype: "Float", label: "" };
		} else if (entry.fieldtype === "Int") {
			df = { fieldtype: "Int", label: "" };
		} else if (["Date", "Datetime"].includes(entry.fieldtype)) {
			df = { fieldtype: entry.fieldtype, label: "" };
		} else {
			df = { fieldtype: "Data", label: "" };
		}

		let ctrl;
		try {
			ctrl = frappe.ui.form.make_control({ df, parent: $mount.get(0), render_input: true, only_input: true });
			ctrl.set_value(value != null ? value : "");
			ctrl.refresh();
		} catch (e) {
			// A control type that can't mount here must still be editable.
			$mount.html(`<input type="text" value="${esc(value == null ? "" : value)}">`);
			$mount.find("input").on("change", function () { onChange($(this).val()); });
			return;
		}
		if (ctrl.$input) {
			ctrl.$input.on("change awesomplete-selectcomplete", () => {
				const v = ctrl.get_value();
				if (v === value) return;   // a repaint per keystroke-less change only
				onChange(v);
			});
		}
	}

	function mountValue(frm, row, $mount) {
		mountControl($mount, targetEntry(parse(row)), row.value, row.operator || "=", (v) => {
			row.value = v;
			markAndRerender(frm, cfgFor(frm));
		});
	}

	/** The row filter's value — same treatment, always an equality match. */
	function mountFilterValue(frm, row, $mount) {
		const st = parse(row);
		const entry = colsOf(st).find((c) => c.value === st.filterCol);
		mountControl($mount, entry, st.filterVal, st.filterOp || "=", (v) => {
			st.filterVal = v;
			write(row, st);
			markAndRerender(frm, cfgFor(frm));
		});
	}

	/** Pull the Campus Eligibility Settings defaults onto this opening. */
	function loadDefaults(frm, cfg) {
		frappe.call({ method: DEFAULTS_METHOD }).then((r) => {
			const defaults = (r && r.message) || [];
			if (!defaults.length) {
				frappe.msgprint({
					title: __("No defaults set"),
					indicator: "orange",
					message: __("Campus Eligibility Settings has no conditions yet. Open it from <b>Edit defaults</b> and add them there."),
				});
				return;
			}
			const apply = () => {
				frm.doc[cfg.table] = [];
				defaults.forEach((d) => frm.add_child(cfg.table, d));
				markAndRerender(frm, cfg);
				frappe.show_alert({
					message: __("{0} default condition(s) loaded", [defaults.length]),
					indicator: "green",
				});
			};
			if ((frm.doc[cfg.table] || []).length) {
				frappe.confirm(
					__("Replace the {0} condition(s) on this opening with the {1} campus default(s)?",
						[(frm.doc[cfg.table] || []).length, defaults.length]),
					apply
				);
			} else {
				apply();
			}
		});
	}

	function bind(frm, $w, cfg) {
		const rules = frm.doc[cfg.table] || [];
		const rowOf = (el) => rules[parseInt($(el).data("i"), 10)];

		$w.find('[data-role="field"]').on("change", function () {
			const row = rowOf(this); if (!row) return;
			const picked = $(this).val();
			const entry = FLAT[picked];
			write(row, { field: picked, column: "", filterCol: "", filterVal: "" });
			row.operator = opsFor(entry && entry.is_table ? null : entry)[0];
			row.value = "";
			// A table's columns must be in hand before its second step can render.
			if (entry && entry.is_table) {
				loadChild(entry.child_doctype).then(() => markAndRerender(frm, cfg));
			} else {
				markAndRerender(frm, cfg);
			}
		});

		$w.find('[data-role="column"]').on("change", function () {
			const row = rowOf(this); if (!row) return;
			const st = parse(row);
			st.column = $(this).val();
			// Testing the column the rows were narrowed by is the same question
			// asked twice — drop the filter rather than render the duplicate.
			if (st.filterCol === st.column) { st.filterCol = ""; st.filterVal = ""; }
			write(row, st);
			row.operator = opsFor(targetEntry(st))[0];
			row.value = "";
			markAndRerender(frm, cfg);
		});

		$w.find('[data-role="filter-add"]').on("click", function () {
			const row = rowOf(this); if (!row) return;
			const st = parse(row);
			// Rows are almost always narrowed by a controlled column — the education
			// stage, the course type — so offer one of those rather than whatever
			// happens to sort first (which is how "only in rows where Completion
			// Date = ___" ended up on screen).
			const usable = colsOf(st).filter((c) => c.value !== st.column);
			const first = usable.find((c) => c.fieldtype === "Link")
				|| usable.find((c) => c.fieldtype === "Select")
				|| usable[0];
			if (!first) return;
			st.filterCol = first.value;
			st.filterOp = opsFor(first)[0];
			st.filterVal = "";
			write(row, st);
			markAndRerender(frm, cfg);
		});

		$w.find('[data-role="filter-clear"]').on("click", function () {
			const row = rowOf(this); if (!row) return;
			const st = parse(row);
			st.filterCol = ""; st.filterOp = "="; st.filterVal = "";
			write(row, st);
			markAndRerender(frm, cfg);
		});

		$w.find('[data-role="filter-col"]').on("change", function () {
			const row = rowOf(this); if (!row) return;
			const st = parse(row);
			st.filterCol = $(this).val();
			// New column, new type — its first operator, and a value box to match.
			const col = colsOf(st).find((c) => c.value === st.filterCol);
			st.filterOp = opsFor(col)[0];
			st.filterVal = "";
			write(row, st);
			markAndRerender(frm, cfg);
		});

		$w.find('[data-role="filter-op"]').on("change", function () {
			const row = rowOf(this); if (!row) return;
			const st = parse(row);
			st.filterOp = $(this).val();
			write(row, st);
			markAndRerender(frm, cfg);
		});

		$w.find('[data-role="operator"]').on("change", function () {
			const row = rowOf(this); if (row) { row.operator = $(this).val(); markAndRerender(frm, cfg); }
		});

		$w.find('[data-role="action"]').on("click", function () {
			const row = rowOf(this); if (!row) return;
			row.action = $(this).data("act");
			markAndRerender(frm, cfg);
		});

		$w.find('[data-role="del"]').on("click", function () {
			(frm.doc[cfg.table] || []).splice(parseInt($(this).data("i"), 10), 1);
			markAndRerender(frm, cfg);
		});

		$w.find(".elig-add").on("click", function () {
			frm.add_child(cfg.table, { operator: "=", action: "Knock out" });
			markAndRerender(frm, cfg);
		});

		$w.find('[data-role="load-defaults"]').on("click", () => loadDefaults(frm, cfg));
		$w.find('[data-role="open-settings"]').on("click", () => frappe.set_route("Form", SETTINGS_DOCTYPE));
	}

	function markAndRerender(frm, cfg) {
		frm.dirty();
		frm.refresh_field(cfg.table);
		render(frm);
	}

	Object.keys(FORMS).forEach((doctype) => {
		frappe.ui.form.on(doctype, {
			refresh(frm) {
				injectStyles();
				loadCatalog().then(() => {
					// A brand-new Job Opening's HTML field is not in the DOM yet on the
					// first refresh — give the layout a tick before rendering into it.
					if (!frm.is_new()) render(frm);
					else setTimeout(() => render(frm), 300);
				});
			},
		});
	});
})();
