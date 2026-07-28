/**
 * job_opening_eligibility_ui.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Inline, field-first, type-aware eligibility condition builder for Job Opening,
 * rendered into `custom_eligibility_rules_ui` (the raw grid is hidden).
 *
 *   [ Field ▾ ] [ Operator ▾ ] [ Value (adapts) ] [ Action ▾ ] [✕]
 *
 *   Field    = one grouped list — Job Applicant · Education · Work Experience.
 *   Operator = adapts to the field type (numbers get ≥/≤/…, choices get =/≠/one of).
 *   Value    = a real Frappe control for the field type: Link → search picker,
 *              Select → its options, number → number box, Date → datepicker.
 *   Action   = Knock out (fail → Reject) · Flag (fail → Hold).
 *
 * All AND: any Knock-out fail → Rejected · any Flag fail → Hold · all pass →
 * Shortlisted. Education child-row matching is encoded in the option value
 * ("edu|<stage>|<target>") and never shown to the user.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
	const HOST = "custom_eligibility_rules_ui";
	const TABLE = "custom_eligibility_rules";
	const EDU_TABLE = "custom_educational_qualification";
	const WORK_TABLE = "custom_previous_work_experience";
	const esc = frappe.utils.escape_html;

	let CAT = null;      // catalog
	let FLAT = {};       // namespaced value -> entry

	function injectStyles() {
		if (document.getElementById("elig-ui-styles")) return;
		const css = `
		.elig-wrap{padding:4px 2px;}
		.elig-hint{font-size:.78rem;color:var(--text-muted);margin-bottom:12px;}
		.elig-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;}
		.elig-row select{border:1px solid var(--border-color);border-radius:6px;padding:6px 9px;font-size:.83rem;
			background:var(--control-bg,var(--fg-color));color:var(--text-color);height:32px;}
		.elig-row select:focus{outline:none;border-color:var(--blue-500,#2490ef);}
		.elig-fld{min-width:210px;flex:1;} .elig-op{width:76px;text-align:center;} .elig-act{min-width:120px;}
		.elig-act.ko{color:var(--red-600,#c0392b);} .elig-act.flag{color:var(--yellow-700,#9a7a11);}
		.elig-val-mount{min-width:150px;flex:1;}
		.elig-val-mount .form-group{margin:0;} .elig-val-mount .control-input-wrapper .control-input{margin:0;}
		.elig-val-mount input,.elig-val-mount .awesomplete{width:100%;} .elig-val-mount input{height:32px;font-size:.83rem;}
		.elig-del{border:none;background:none;color:var(--red-500,#e24c4c);cursor:pointer;font-size:1rem;padding:4px;}
		.elig-del:hover{color:var(--red-700,#b02a2a);}
		.elig-empty{padding:14px;text-align:center;color:var(--text-muted);font-size:.85rem;
			border:1px dashed var(--border-color);border-radius:8px;margin-bottom:10px;}
		.elig-add{border:1px solid var(--blue-500,#2490ef);background:none;color:var(--blue-500,#2490ef);
			padding:6px 14px;border-radius:6px;font-size:.83rem;cursor:pointer;margin-top:2px;}
		.elig-add:hover{background:var(--blue-50,#eaf4fe);}
		`;
		const el = document.createElement("style");
		el.id = "elig-ui-styles"; el.textContent = css; document.head.appendChild(el);
	}

	function loadCatalog() {
		if (CAT) return Promise.resolve(CAT);
		return frappe.call({ method: "recruitment.recruitment.eligibility_engine.get_eligibility_field_catalog" })
			.then((r) => {
				CAT = (r && r.message) || { sources: [], fields: {}, operators: {} };
				FLAT = {};
				(CAT.sources || []).forEach((s) => (CAT.fields[s.key] || []).forEach((f) => { FLAT[f.value] = f; }));
				return CAT;
			});
	}

	// ── field-type helpers ───────────────────────────────────────────────────
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

	// ── stored rule ↔ namespaced field value ─────────────────────────────────
	function decode(row) {
		const fn = row.field_name || "";
		if (fn.indexOf(EDU_TABLE + "::") === 0) {
			// stage is a controlled Education Stage value — preserve it exactly.
			const target = fn.split("::")[1];
			return "edu|" + (row.match_value || "").trim() + "|" + target;
		}
		if (fn.indexOf(WORK_TABLE + "::") === 0) return "we|" + fn.split("::")[1];
		if (fn) return "ja|" + fn;
		return "";
	}
	function encode(row, ns) {
		row.match_field = ""; row.match_value = "";
		if (!ns) { row.field_name = ""; return; }
		if (ns.indexOf("ja|") === 0) { row.field_name = ns.slice(3); return; }
		if (ns.indexOf("we|") === 0) { row.field_name = WORK_TABLE + "::" + ns.slice(3); return; }
		if (ns.indexOf("edu|") === 0) {
			const p = ns.split("|"); const stage = p[1] || "", target = p[2] || "";
			row.field_name = EDU_TABLE + "::" + target;
			if (stage) { row.match_field = EDU_TABLE + "::qualification"; row.match_value = stage; }
		}
	}
	const entryOf = (ns) => FLAT[ns] || null;

	function opt(v, label, sel) {
		return `<option value="${esc(v)}"${sel === v ? " selected" : ""}>${esc(label)}</option>`;
	}

	function render(frm) {
		const field = frm.fields_dict[HOST];
		if (!field || !field.$wrapper) return;
		const $w = field.$wrapper;
		const rules = frm.doc[TABLE] || [];

		const rows = rules.map((r, i) => renderRow(r, i)).join("");
		$w.html(`<div class="elig-wrap">
			<div class="elig-hint">${__("All conditions must pass. A failed <b>Knock out</b> Rejects the candidate, a failed <b>Flag</b> puts them On Hold, all passed → Shortlisted. The reason is logged in the applicant's activity.")}</div>
			${rows || `<div class="elig-empty">${__("No conditions yet — add one below.")}</div>`}
			<button class="elig-add">+ ${__("Add Condition")}</button>
		</div>`);

		bind(frm, $w);
		rules.forEach((row, i) => {
			const $mount = $w.find(`.elig-val-mount[data-i="${i}"]`);
			if ($mount.length) mountValue(frm, row, i, $mount);
		});
	}

	function renderRow(row, i) {
		const ns = decode(row);
		// grouped field dropdown
		let fldSel = `<option value="">${esc(__("Select a field…"))}</option>`;
		(CAT.sources || []).forEach((s) => {
			const list = CAT.fields[s.key] || [];
			if (!list.length) return;
			fldSel += `<optgroup label="${esc(s.label)}">` + list.map((f) => opt(f.value, f.label, ns)).join("") + `</optgroup>`;
		});
		const entry = entryOf(ns);
		const opSel = opsFor(entry).map((o) => opt(o, o, row.operator)).join("");
		const ko = (row.action || "Knock out") === "Knock out";
		return `<div class="elig-row" data-i="${i}">
			<select class="elig-fld" data-role="field" data-i="${i}">${fldSel}</select>
			<select class="elig-op" data-role="operator" data-i="${i}">${opSel}</select>
			<span class="elig-val-mount" data-i="${i}"></span>
			<select class="elig-act ${ko ? "ko" : "flag"}" data-role="action" data-i="${i}">
				${opt("Knock out", __("Reject (Knock out)"), row.action || "Knock out")}
				${opt("Flag", __("Hold (Flag)"), row.action || "Knock out")}
			</select>
			<button class="elig-del" data-role="del" data-i="${i}" title="${__("Remove")}">✕</button>
		</div>`;
	}

	// A real Frappe control for the Value, matched to the field type.
	function mountValue(frm, row, i, $mount) {
		$mount.empty();
		const entry = entryOf(decode(row));
		const op = row.operator || "=";
		let df;
		if (!entry) {
			df = { fieldtype: "Data", label: "", placeholder: __("Pick a field first") };
		} else if (op === "one of") {
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
			ctrl.set_value(row.value != null ? row.value : "");
			ctrl.refresh();
		} catch (e) {
			$mount.html(`<input type="text" class="elig-val" value="${esc(row.value || "")}">`);
			$mount.find("input").on("change", function () { row.value = $(this).val(); frm.dirty(); });
			return;
		}
		const save = () => { row.value = ctrl.get_value(); frm.dirty(); };
		if (ctrl.$input) ctrl.$input.on("change awesomplete-selectcomplete blur", save);
	}

	function bind(frm, $w) {
		const rules = frm.doc[TABLE] || [];
		const rowOf = (el) => rules[parseInt($(el).data("i"), 10)];

		$w.find('[data-role="field"]').on("change", function () {
			const row = rowOf(this); if (!row) return;
			encode(row, $(this).val());
			// reset operator to a sensible default for the new type + clear value
			const ops = opsFor(entryOf($(this).val()));
			row.operator = ops[0]; row.value = "";
			markAndRerender(frm);
		});
		$w.find('[data-role="operator"]').on("change", function () {
			const row = rowOf(this); if (row) { row.operator = $(this).val(); frm.dirty(); markAndRerender(frm); }
		});
		$w.find('[data-role="action"]').on("change", function () {
			const row = rowOf(this); if (row) { row.action = $(this).val(); frm.dirty(); markAndRerender(frm); }
		});
		$w.find('[data-role="del"]').on("click", function () {
			(frm.doc[TABLE] || []).splice(parseInt($(this).data("i"), 10), 1);
			markAndRerender(frm);
		});
		$w.find(".elig-add").on("click", function () {
			frm.add_child(TABLE, { operator: "=", action: "Knock out" });
			markAndRerender(frm);
		});
	}

	function markAndRerender(frm) {
		frm.dirty();
		frm.refresh_field(TABLE);
		render(frm);
	}

	frappe.ui.form.on("Job Opening", {
		refresh(frm) {
			injectStyles();
			loadCatalog().then(() => { if (!frm.is_new()) render(frm); else setTimeout(() => render(frm), 300); });
		},
	});
})();
