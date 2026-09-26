/* global frappe, __, $, format_currency, flt */

/*
 * Job Offer — wizard view.
 *
 * Renders the form's own Tab Breaks as a step-by-step flow: a vertical stepper
 * on the left, a summary bar above the step, and Back / Continue at the bottom.
 * The five tabs in recruitment/custom/job_offer.json are the steps (Basic
 * Details, Offer Letter Template, Salary, Preview, Approval), but nothing here
 * lists fields or tabs by position: the stepper is read from `frm.layout.tabs`
 * and each field is placed by the tab it sits in. Move a field to another tab or
 * section in Customize Form, or add a tab, and the steps follow with no code
 * change — then "Export Customizations" (module Recruitment, Sync on Migrate) so
 * the layout ships, since that file is re-applied on every migrate. A tab's
 * Description becomes its step subtitle.
 *
 * Behaviour
 *  - New offer: guided. Continue checks the step's required fields and unlocks
 *    the next step; later steps stay locked until reached. It never saves —
 *    saving is still Save / Ctrl+S, so the recruitment flow sees exactly the
 *    saves it saw before (see go_next).
 *  - Purely a view: no field is renamed, made mandatory or given a value here,
 *    and the new Basic Details fields use custom_jo_* names so Frappe's
 *    same-fieldname mapping (Create Employee, onboarding prefill) ignores them.
 *  - Saved offer: every step can be clicked. Opening one lands where it is
 *    useful — the first step with something missing, else Preview for a draft,
 *    Approval once submitted.
 *  - Continue only checks the step in view. Saving a draft is never blocked on a
 *    later step (see the Job Offer hooks: completeness is enforced at send).
 *  - The last step's button runs the offer's real next action — Save, Notify HR
 *    Ops, Submit or Send Job Offer — by pressing the same toolbar buttons
 *    job_offer.js adds, so there is one code path for each action.
 *
 * Off switch: Recruitment Settings → Use Classic Job Offer Form. Read once per
 * page load; a change there shows after a reload.
 */
(function () {
	const DOCTYPE = "Job Offer";
	const SETTINGS = "Recruitment Settings";
	const PREVIEW_TAB = "custom_offer_letter_tab";
	const APPROVAL_HTML = "custom_ow_approval_html";
	const TEMPLATE_FIELD = "custom_offer_letter_template";
	const AUTO_BY_GRADE = "Auto by Grade";
	// Fields the letter-template picker is matched against (mirrors
	// recruitment_offer_template_context in job_offer.js).
	const TEMPLATE_CONTEXT = ["company", "designation", "custom_employment_type", "job_applicant", "custom_location"];
	// A step's Continue waits for these — wherever they sit on the form — on top
	// of the fields that are mandatory to save. Not made mandatory in the meta:
	// that would block saving a draft on step 1 for a field on step 3.
	const STEP_REQUIRED = ["applicant_email", "custom_jo_expiry_date"];
	const AFTER_SAVE_TTL = 60 * 1000;

	let settings = null;

	function load_settings() {
		if (settings) return Promise.resolve(settings);
		return frappe.db
			.get_value(SETTINGS, SETTINGS, ["use_classic_job_offer_form", "send_offer_via_document_template"])
			.then((r) => {
				const m = (r && r.message) || {};
				settings = {
					enabled: !Number(m.use_classic_job_offer_form || 0),
					doc_template: !!Number(m.send_offer_via_document_template || 0),
				};
				return settings;
			})
			.catch(() => {
				settings = { enabled: true, doc_template: false };
				return settings;
			});
	}

	// ── Helpers ─────────────────────────────────────────────────────────────────

	const esc = (v) => frappe.utils.escape_html(v == null ? "" : String(v));
	const is_empty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
	const money = (v) => (v ? format_currency(v, frappe.boot.sysdefaults.currency, 0) : "");
	const total = (rows) => (rows || []).reduce((s, r) => s + (flt(r.amount) || 0), 0);
	const fixed_ctc = (d) => (d.custom_compensation_method === AUTO_BY_GRADE ? d.custom_ctc : d.custom_base_salary);
	const date = (v) => (v ? frappe.datetime.str_to_user(v) : "");

	function visible_tabs(frm) {
		return ((frm.layout && frm.layout.tabs) || []).filter((t) => !t.hidden && t.df);
	}

	function active_index(tabs) {
		const i = tabs.findIndex((t) => t.is_active());
		return i < 0 ? 0 : i;
	}

	function tab_of(frm, control) {
		// Fields above the first Tab Break carry no tab; they render on the first.
		return control.tab || (frm.layout.tabs || [])[0];
	}

	function step_required(frm) {
		const list = STEP_REQUIRED.slice();
		if (frm.doc.custom_compensation_method !== AUTO_BY_GRADE) list.push("custom_base_salary");
		// Only when offers are rendered from Document Templates — with that path
		// off the field decides nothing (see offer_document_template.py).
		if (settings && settings.doc_template) list.push(TEMPLATE_FIELD);
		return new Set(list);
	}

	// Required controls on `tab` the user could fill but has not.
	function missing_in(frm, tab) {
		const gate = step_required(frm);
		return (frm.fields || []).filter((c) => {
			const df = c.df;
			if (!df || !df.fieldname || !c.$wrapper) return false;
			if (frappe.model.no_value_type.includes(df.fieldtype)) return false;
			if (!(df.reqd || gate.has(df.fieldname))) return false;
			if (c.disp_status !== "Write") return false;
			if (tab_of(frm, c) !== tab) return false;
			return is_empty(frm.doc[df.fieldname]);
		});
	}

	// What a Link field shows the user — the linked record's title (Designation
	// "Professor", not "ACD_D&A_EXAMS_TEACHING"), from the same cache the form's
	// link controls fill. A title not cached yet is fetched once and the wizard
	// re-renders; until then nothing is shown rather than the raw id.
	//
	// A few doctypes keep an id as their name without showing a title in links
	// (Company "PW"). Turning that on for them would also change every letter
	// that prints {{company}}, so here only, their display field is read
	// directly. Kept in a cache of our own so the form's link fields are untouched.
	const DISPLAY_FIELDS = { Company: "company_name" };
	const display_titles = {};
	const title_requests = new Set();
	function title_of(frm, fieldname) {
		const value = frm.doc[fieldname];
		const df = value && frappe.meta.get_docfield(frm.doctype, fieldname, frm.doc.name);
		if (!df || df.fieldtype !== "Link") return value || "";

		const key = df.options + "::" + value;
		const own = DISPLAY_FIELDS[df.options];
		const cached = own ? display_titles[key] : frappe.utils.get_link_title(df.options, value);
		if (cached) return cached;

		if (!title_requests.has(key)) {
			title_requests.add(key);
			const req = own
				? frappe.db.get_value(df.options, value, own).then((r) => ((r && r.message) || {})[own])
				: frappe.utils.fetch_link_title(df.options, value);
			if (req && req.then) {
				req.then((title) => {
					// Doctypes that do not show titles answer with the name itself.
					if (own) display_titles[key] = title || value;
					else frappe.utils.add_link_title(df.options, value, title || value);
					schedule(frm);
				}, () => {
					if (own) display_titles[key] = value;
				});
			}
		}
		return "";
	}

	const SUBTITLES = {
		custom_ow_basic_tab: (frm) =>
			[frm.doc.applicant_name, frm.doc.custom_jo_designation_title || title_of(frm, "designation")]
				.filter(Boolean).join(" · "),
		custom_ow_template_tab: (frm) =>
			[
				title_of(frm, TEMPLATE_FIELD),
				frm.doc.custom_jo_expiry_date && __("expires {0}", [date(frm.doc.custom_jo_expiry_date)]),
			].filter(Boolean).join(" · "),
		custom_ow_salary_tab: (frm) => (fixed_ctc(frm.doc) ? __("Fixed CTC {0}", [money(fixed_ctc(frm.doc))]) : ""),
		custom_ow_approval_tab: (frm) =>
			[frm.doc.status && __(frm.doc.status), frm.doc.email_status && __("Email {0}", [__(frm.doc.email_status)])]
				.filter(Boolean).join(" · "),
	};

	function subtitle(frm, tab) {
		const fn = SUBTITLES[tab.df.fieldname];
		return (fn && fn(frm)) || tab.df.description || "";
	}

	// ── Navigation ──────────────────────────────────────────────────────────────

	function activate(frm, tab, scroll) {
		if (!tab) return;
		if (!tab.is_active()) {
			// Clicking the (hidden) tab link rather than set_active() alone, so
			// anything bound to it runs — the Preview tab paints its letter on it.
			tab.tab_link.find(".nav-link").trigger("click");
			if (!tab.is_active()) tab.set_active();
		}
		if (scroll !== false) window.scrollTo({ top: 0, behavior: "smooth" });
		schedule(frm);
	}

	function landing_tab(frm, tabs) {
		if (frm.is_new()) return tabs[0];
		if (frm.doc.docstatus > 0) return tabs[tabs.length - 1];
		return (
			tabs.find((t) => missing_in(frm, t).length) ||
			tabs.find((t) => t.df.fieldname === PREVIEW_TAB) ||
			tabs[0]
		);
	}

	function flag_missing(frm, controls) {
		controls.forEach((c) => {
			c.$wrapper.addClass("has-error");
			frm.__ow.flagged.add(c.df.fieldname);
		});
		frm.__ow.tried = active_index(visible_tabs(frm));
		frm.scroll_to_field(controls[0].df.fieldname);
		frappe.show_alert(
			{
				message: __("Fill in {0} to continue.", [controls.map((c) => esc(__(c.df.label))).join(", ")]),
				indicator: "orange",
			},
			6
		);
		schedule(frm);
	}

	function go_next(frm) {
		const tabs = visible_tabs(frm);
		const cur = active_index(tabs);
		const gaps = missing_in(frm, tabs[cur]);
		if (gaps.length) return flag_missing(frm, gaps);

		const target = tabs[cur + 1];
		if (!target) return;
		frm.__ow.max = Math.max(frm.__ow.max, cur + 1);
		// Moving between steps never saves. Saving stays the recruiter's call
		// (Save / Ctrl+S), exactly as on the plain form: the first save creates
		// the offer, and with "Create Candidate Action Item: On Offer Creation"
		// that is the moment the candidate sees it — never after step 1 by accident.
		activate(frm, target);
	}

	function go_back(frm) {
		const tabs = visible_tabs(frm);
		activate(frm, tabs[active_index(tabs) - 1]);
	}

	// The offer's real next action on the last step — one of the buttons the
	// form already carries, so the rules (HR Ops gate, send lock …) stay there.
	function last_step_action(frm) {
		const button = (label) => frm.custom_buttons && frm.custom_buttons[__(label)];
		if (frm.doc.docstatus === 0) {
			if (frm.is_dirty()) return { label: __("Save"), run: () => frm.save() };
			const notify = button("Notify HR Ops");
			if (notify) return { label: __("Notify HR Ops"), run: () => notify.trigger("click") };
			if (frm.perm && frm.perm[0] && frm.perm[0].submit) {
				return { label: __("Submit"), run: () => frm.savesubmit() };
			}
			return null;
		}
		if (frm.doc.docstatus === 1) {
			// An "allow on submit" field was edited.
			if (frm.is_dirty()) return { label: __("Update"), run: () => frm.save("Update") };
			const send = button("Send Job Offer");
			if (send) return { label: __("Send Job Offer"), run: () => send.trigger("click") };
		}
		return null;
	}

	// ── Rendering ───────────────────────────────────────────────────────────────

	// Colours come from the desk theme (primary for the step in view, green for
	// done, orange for missing) so the wizard sits inside the form like any other
	// Frappe control. Each step gets an icon by tab; unknown tabs get a generic one.
	const ICON_PATHS = {
		user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
		file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
		wallet: '<rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 10h20M16 15h2"/>',
		eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
		shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
		layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
		briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
		building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
		calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
		trend: '<path d="M22 7 13.5 15.5l-5-5L2 17"/><path d="M16 7h6v6"/>',
		flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
		check: '<path d="M20 6 9 17l-5-5"/>',
	};
	const TAB_ICONS = {
		custom_ow_basic_tab: "user",
		custom_ow_template_tab: "file",
		custom_ow_salary_tab: "wallet",
		[PREVIEW_TAB]: "eye",
		custom_ow_approval_tab: "shield",
	};

	const svg = (name, size) =>
		`<svg width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
		`stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.layers}</svg>`;
	const icon_of = (tab) => TAB_ICONS[tab.df.fieldname] || "layers";

	function render_rail(frm, tabs, cur, missing) {
		const $page = frm.layout.page;
		let $rail = $page.children(".ow-rail");
		if (!$rail.length) {
			$rail = $('<nav class="ow-rail"></nav>').prependTo($page);
			$rail.on("click keydown", ".ow-step:not(.locked)", function (e) {
				if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
				e.preventDefault();
				const tab = visible_tabs(frm).find((t) => t.df.fieldname === this.dataset.tab);
				activate(frm, tab);
			});
		}

		const st = frm.__ow;
		const first_gap = missing.findIndex((m) => m.length);
		const complete_upto = first_gap < 0 ? tabs.length : first_gap;
		const ready = missing.filter((m) => !m.length).length;
		const pct = Math.round((ready / tabs.length) * 100);

		const steps = tabs.map((t, i) => {
			const locked = st.guided && i > st.max;
			const current = i === cur;
			const done = !current && !locked && i < complete_upto && (!st.guided || i < st.max);
			const warn = !locked && missing[i].length && (!st.guided || i < cur || st.tried === i);
			const last = i === tabs.length - 1;
			const cls = ["ow-step", current && "current", done && "done", locked && "locked", warn && "warn", last && "last"]
				.filter(Boolean).join(" ");
			return `
				<div class="${cls}" data-tab="${esc(t.df.fieldname)}" role="button"
					tabindex="${locked ? -1 : 0}" ${current ? 'aria-current="step"' : ""} ${locked ? 'aria-disabled="true"' : ""}>
					<div class="ow-num">${done ? svg("check", 14) : svg(icon_of(t), 14)}</div>
					<div class="ow-text">
						<div class="ow-title"><span class="ow-idx">${i + 1}</span>${esc(__(t.label || ""))}</div>
						<div class="ow-sub">${esc(subtitle(frm, t))}</div>
						${warn ? `<span class="ow-badge">${esc(__("{0} missing", [missing[i].length]))}</span>` : ""}
					</div>
				</div>`;
		});

		const foot = [
			__("Continue only moves between steps; nothing is saved until you press Save (Ctrl+S)."),
			__("This offer is submitted. Earlier steps are read-only."),
			__("This offer is cancelled."),
		][frm.doc.docstatus] || "";
		$rail.html(`
			<div class="ow-progress">
				<div class="ow-ring" style="--p:${pct}"><span>${pct}%</span></div>
				<div>
					<div class="ow-progress-title">${esc(__("Offer readiness"))}</div>
					<div class="ow-progress-sub">${esc(__("{0} of {1} steps complete", [ready, tabs.length]))}</div>
				</div>
			</div>
			<div class="ow-steps">${steps.join("")}</div>
			<div class="ow-rail-foot">${esc(foot)}</div>`);
	}

	// Coloured banner for the step in view, then the offer's key facts as chips.
	function render_summary(frm, tabs, cur) {
		const $page = frm.layout.page;
		let $bar = $page.children(".ow-summary");
		if (!$bar.length) $bar = $('<div class="ow-summary"></div>').insertBefore(frm.layout.tabs_content);

		const tab = tabs[cur];
		const d = frm.doc;
		const earn = total(d.custom_earnings);
		const ded = total(d.custom_deduction);
		const chips = [
			["user", __("Candidate"), d.applicant_name || title_of(frm, "job_applicant")],
			["briefcase", __("Role"), d.custom_jo_designation_title || title_of(frm, "designation")],
			["building", __("Company"), title_of(frm, "company")],
			["wallet", __("Fixed CTC"), money(fixed_ctc(d))],
			["trend", __("Net (earnings − deductions)"), (d.custom_earnings || []).length ? money(earn - ded) : ""],
			["calendar", __("Expires"), date(d.custom_jo_expiry_date)],
			["flag", __("Status"), d.status && __(d.status)],
		];
		$bar.html(`
			<div class="ow-hero">
				<div class="ow-hero-icon">${svg(icon_of(tab), 22)}</div>
				<div class="ow-hero-text">
					<div class="ow-hero-eyebrow">${esc(__("Step {0} of {1}", [cur + 1, tabs.length]))}</div>
					<div class="ow-hero-title">${esc(__(tab.label || ""))}</div>
					${tab.df.description ? `<div class="ow-hero-desc">${esc(__(tab.df.description))}</div>` : ""}
				</div>
				<div class="ow-hero-dots">
					${tabs.map((t, i) => `<span class="${i < cur ? "past" : i === cur ? "now" : ""}"></span>`).join("")}
				</div>
			</div>
			<div class="ow-chips">
				${chips.map(([icon, k, v]) => `
					<div class="ow-chip ${v ? "" : "empty"}">
						<span class="ow-chip-icon">${svg(icon, 15)}</span>
						<span class="ow-chip-text">
							<span class="ow-k">${esc(k)}</span>
							<span class="ow-v">${esc(v || "—")}</span>
						</span>
					</div>`).join("")}
			</div>`);
	}

	function render_footer(frm, tabs, cur) {
		const $page = frm.layout.page;
		let $foot = $page.children(".ow-footer");
		if (!$foot.length) {
			$foot = $('<div class="ow-footer"></div>').appendTo($page);
			$foot.on("click", ".ow-back", () => go_back(frm));
			$foot.on("click", ".ow-next", () => go_next(frm));
			$foot.on("click", ".ow-final", () => frm.__ow.final && frm.__ow.final.run());
		}

		const last = cur >= tabs.length - 1;
		const action = last ? last_step_action(frm) : null;
		frm.__ow.final = action;

		const back = cur > 0
			? `<button class="btn btn-default btn-sm ow-back">← ${esc(__("Back"))}</button>`
			: "<span></span>";
		let right = "";
		if (!last) {
			const next = tabs[cur + 1];
			right = `<button class="btn btn-primary btn-sm ow-next">${esc(__("Continue to {0}", [__(next.label || "")]))} →</button>`;
		} else if (action) {
			right = `<button class="btn btn-primary btn-sm ow-final">${esc(action.label)}</button>`;
		}
		$foot.html(`
			${back}
			<div class="ow-foot-right">
				<span class="ow-foot-note">${esc(__("Step {0} of {1}", [cur + 1, tabs.length]))}</span>
				${right}
			</div>`);
	}

	// Spec checklist on the Preview step: each line jumps to what is missing.
	function render_checklist(frm) {
		const tab = visible_tabs(frm).find((t) => t.df.fieldname === PREVIEW_TAB);
		if (!tab) return;
		let $list = tab.wrapper.children(".ow-checklist");
		if (!$list.length) {
			$list = $('<div class="ow-checklist"></div>').prependTo(tab.wrapper);
			$list.on("click", ".ow-check.pending", function () {
				frm.scroll_to_field(this.dataset.field);
			});
		}

		const d = frm.doc;
		const first_empty = (fields) => fields.find((f) => frm.fields_dict[f] && is_empty(d[f]));
		const fixed_field = d.custom_compensation_method === AUTO_BY_GRADE ? "custom_total_fixed_pay" : "custom_base_salary";
		const template_fields = ["custom_jo_expiry_date"].concat(settings && settings.doc_template ? [TEMPLATE_FIELD] : []);
		const checks = [
			[__("Candidate details complete"), first_empty(["applicant_name", "applicant_email", "company", "designation"])],
			[__("Template & expiry set"), first_empty(template_fields)],
			[__("Fixed CTC set"), fixed_ctc(d) ? null : fixed_field],
			[__("At least 1 earning line"), (d.custom_earnings || []).length ? null : "custom_earnings"],
		];
		$list.html(
			`<div class="ow-check-head">${esc(__("Quick checklist"))}</div>` +
			checks.map(([label, gap]) => `
				<div class="ow-check ${gap ? "pending" : "ok"}" data-field="${esc(gap || "")}">
					<span class="ow-check-mark">${gap ? "" : svg("check", 12)}</span>
					<span>${esc(label)}</span>
					<span class="ow-check-state">${esc(gap ? __("Pending") : __("Done"))}</span>
				</div>`).join("")
		);
	}

	// Asterisk on fields a step waits for but the meta does not make mandatory,
	// and clear the red outline once a flagged field has a value.
	function mark_fields(frm) {
		const gate = step_required(frm);
		gate.forEach((f) => {
			const c = frm.fields_dict[f];
			if (c && c.$wrapper) c.$wrapper.find(".control-label").first().toggleClass("reqd", c.disp_status === "Write");
		});
		frm.__ow.flagged.forEach((f) => {
			const c = frm.fields_dict[f];
			if (!c || !is_empty(frm.doc[f])) {
				c && c.$wrapper.removeClass("has-error");
				frm.__ow.flagged.delete(f);
			}
		});
	}

	function render(frm) {
		if (!frm.__ow || !frm.$wrapper.hasClass("ow-on")) return;
		const tabs = visible_tabs(frm);
		if (tabs.length < 2) return teardown(frm);
		const cur = active_index(tabs);
		frm.__ow.max = Math.max(frm.__ow.max, cur);
		const missing = tabs.map((t) => missing_in(frm, t));
		render_rail(frm, tabs, cur, missing);
		render_summary(frm, tabs, cur);
		render_footer(frm, tabs, cur);
		render_checklist(frm);
		mark_fields(frm);
	}

	function schedule(frm) {
		clearTimeout(frm.__ow_timer);
		frm.__ow_timer = setTimeout(() => render(frm), 120);
	}

	// ── Step 2: template cards ──────────────────────────────────────────────────
	//
	// The templates the offer qualifies for under the Document Template User
	// Assignments — the same server query as the link picker, so the cards and
	// the picker can never disagree. The picker stays below for searching.

	function template_context(frm) {
		if (typeof recruitment_offer_template_context === "function") {
			// eslint-disable-next-line no-undef
			return recruitment_offer_template_context(frm);
		}
		const ctx = { job_offer: frm.is_new() ? "" : frm.doc.name };
		TEMPLATE_CONTEXT.forEach((f) => frm.doc[f] && (ctx[f] = frm.doc[f]));
		return ctx;
	}

	function render_template_cards(frm, force) {
		const field = frm.fields_dict[TEMPLATE_FIELD];
		if (!field || !field.$wrapper) return;
		const $w = field.$wrapper;
		if (!frm.$wrapper.hasClass("ow-on") || frm.doc.docstatus !== 0 || field.disp_status !== "Write") {
			$w.children(".ow-tpl").remove();
			return;
		}

		const ctx = template_context(frm);
		const key = JSON.stringify(ctx);
		if (!force && frm.__ow_tpl && frm.__ow_tpl.key === key) return paint_template_cards(frm);

		frappe.call({
			method: "recruitment.recruitment.offer_document_template.offer_document_template_query",
			args: { doctype: "Document Template", txt: "", searchfield: "name", start: 0, page_len: 12, filters: ctx },
		}).then((r) => {
			frm.__ow_tpl = { key, rows: (r && r.message) || [] };
			paint_template_cards(frm);
		});
	}

	function paint_template_cards(frm) {
		const field = frm.fields_dict[TEMPLATE_FIELD];
		const rows = (frm.__ow_tpl && frm.__ow_tpl.rows) || [];
		let $box = field.$wrapper.children(".ow-tpl");
		if (!rows.length) return $box.remove();
		if (!$box.length) {
			$box = $('<div class="ow-tpl"></div>').prependTo(field.$wrapper);
			$box.on("click keydown", ".ow-tpl-card", function (e) {
				if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
				e.preventDefault();
				frm.set_value(TEMPLATE_FIELD, this.dataset.name);
			});
		}
		const selected = frm.doc[TEMPLATE_FIELD];
		$box.html(`
			<div class="ow-tpl-head">${esc(__("Letters available for this offer"))}</div>
			<div class="ow-tpl-grid">
				${rows.map(([name, title]) => `
					<div class="ow-tpl-card ${name === selected ? "selected" : ""}" data-name="${esc(name)}" role="button" tabindex="0">
						<div class="ow-tpl-icon">${svg("file", 18)}</div>
						<div class="ow-tpl-name">${esc(title || name)}</div>
						${title && title !== name ? `<div class="ow-tpl-id">${esc(name)}</div>` : ""}
					</div>`).join("")}
			</div>`);
	}

	// ── Step 5: approval matrix ─────────────────────────────────────────────────

	const PILL = { Approved: "green", Rejected: "red", Revoked: "gray", Skipped: "gray", "Send Back": "orange" };

	function pill(status) {
		return `<span class="indicator-pill ${PILL[status] || "orange"}">${esc(__(status || "Pending"))}</span>`;
	}

	function initials(text) {
		return (text || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
	}

	function render_approvals(frm) {
		const field = frm.fields_dict[APPROVAL_HTML];
		if (!field || !field.$wrapper) return;
		const $w = field.$wrapper;
		const empty = (msg) => $w.html(`<div class="ow-empty">${esc(msg)}</div>`);

		if (frm.is_new()) return empty(__("Save the offer to see its approvals."));
		const name = frm.doc.name;
		frappe.call({
			method: "recruitment.recruitment.offer_wizard.get_offer_approvals",
			args: { job_offer: name },
		}).then((r) => {
			if (frm.doc.name !== name) return;
			const trackers = (r && r.message) || [];
			if (!trackers.length) {
				return empty(__("No approval has started for this offer. Approvals start on their own when a rule applies to it, for example a duplicity exception."));
			}
			$w.html(trackers.map((t) => {
				let stage = null;
				const rows = t.approvers.map((a) => {
					const who = a.names.length ? a.names.join(", ") : a.roles.join(", ");
					const head = a.stage && a.stage !== stage ? `<div class="ow-appr-stage">${esc(a.stage)}</div>` : "";
					stage = a.stage;
					return `${head}
						<div class="ow-appr-row">
							<div class="ow-avatar">${esc(initials(a.names[0] || a.roles[0]))}</div>
							<div class="ow-appr-info">
								<div class="ow-appr-name">${esc(who || __("Unassigned"))}</div>
								<div class="ow-appr-role">${esc(a.names.length ? a.roles.join(", ") : __("Any user with this role"))}</div>
							</div>
							<div class="ow-appr-status">
								${pill(a.status)}
								${a.decided_on ? `<div class="ow-appr-time">${esc(frappe.datetime.str_to_user(a.decided_on))}</div>` : ""}
							</div>
						</div>`;
				}).join("");
				return `
					<div class="ow-appr">
						<div class="ow-appr-head">
							<div>
								<div class="ow-appr-title">${esc(t.title)}</div>
								<div class="ow-appr-meta">${esc([t.tracker, t.mode, frappe.datetime.str_to_user(t.created)].filter(Boolean).join(" · "))}</div>
							</div>
							${pill(t.status)}
						</div>
						${rows || `<div class="ow-empty">${esc(__("No approvers resolved yet."))}</div>`}
					</div>`;
			}).join(""));
		});
	}

	// ── Lifecycle ───────────────────────────────────────────────────────────────

	function teardown(frm) {
		if (!frm.$wrapper) return;
		frm.$wrapper.removeClass("ow-on");
		if (frm.layout && frm.layout.page) {
			frm.layout.page.children(".ow-rail, .ow-summary, .ow-footer").remove();
			frm.layout.page.find(".ow-checklist, .ow-tpl").remove();
		}
	}

	function bind_tab_events(frm) {
		(frm.layout.tabs || []).forEach((t) => {
			t.tab_link.find(".nav-link").off("shown.bs.tab.ow").on("shown.bs.tab.ow", () => schedule(frm));
		});
	}

	// Toolbar buttons (Notify HR Ops, Send Job Offer …) arrive asynchronously
	// after refresh; re-render when they do so the last step offers them.
	function observe_toolbar(frm) {
		if (frm.__ow_observer || !window.MutationObserver) return;
		const head = frm.page && frm.page.wrapper && frm.page.wrapper.find(".page-head")[0];
		if (!head) return;
		frm.__ow_observer = new MutationObserver(() => schedule(frm));
		frm.__ow_observer.observe(head, { childList: true, subtree: true });
	}

	function setup(frm) {
		load_settings().then((s) => {
			const tabs = visible_tabs(frm);
			if (!s.enabled || tabs.length < 2) return teardown(frm);

			inject_styles();
			frm.$wrapper.addClass("ow-on");

			// A save (of a new offer especially, which comes back under its real
			// name) keeps the recruiter on the step they saved from.
			const pending = frm.__ow && frm.__ow.after_save;
			const landing =
				pending && Date.now() - pending.at < AFTER_SAVE_TTL &&
				(pending.doc === frm.doc.name || (pending.was_new && !frm.is_new()))
					? pending : null;
			if (!frm.__ow || frm.__ow.doc !== frm.doc.name) {
				const guided = frm.is_new() || !!(landing && landing.guided);
				frm.__ow = { doc: frm.doc.name, max: landing ? landing.max : 0, guided, flagged: new Set(), tried: -1 };
				if (!landing) activate(frm, landing_tab(frm, tabs), false);
			}
			if (frm.doc.docstatus > 0) frm.__ow.guided = false;
			if (landing) activate(frm, tabs.find((t) => t.df.fieldname === landing.tab), false);
			frm.__ow.after_save = null;

			bind_tab_events(frm);
			observe_toolbar(frm);
			render(frm);
			render_template_cards(frm);
			render_approvals(frm);
		});
	}

	frappe.ui.form.on(DOCTYPE, {
		refresh: setup,
		before_save(frm) {
			if (!frm.__ow || !frm.$wrapper.hasClass("ow-on")) return;
			const tabs = visible_tabs(frm);
			const tab = tabs[active_index(tabs)];
			frm.__ow.after_save = tab && {
				tab: tab.df.fieldname, max: frm.__ow.max, guided: frm.__ow.guided,
				doc: frm.doc.name, was_new: frm.is_new(), at: Date.now(),
			};
		},
		custom_earnings_add: schedule,
		custom_earnings_remove: schedule,
		custom_deduction_add: schedule,
		custom_deduction_remove: schedule,
		...Object.fromEntries(TEMPLATE_CONTEXT.map((f) => [f, (frm) => render_template_cards(frm)])),
	});

	// Any value change re-renders subtitles, summary and badges. Model-level so it
	// also covers fields added later in Customize Form.
	function on_change() {
		const frm = window.cur_frm;
		if (frm && frm.doctype === DOCTYPE && frm.__ow) schedule(frm);
	}
	frappe.model.on(DOCTYPE, "*", on_change);
	frappe.model.on("Earnings", "*", on_change);
	frappe.model.on("Deductions", "*", on_change);

	// ── Styles ──────────────────────────────────────────────────────────────────
	//
	// Built only from the desk theme's variables (surfaces, borders, primary,
	// green / orange for status), so the wizard matches the rest of the form in
	// light and dark theme and follows any theme change.

	function inject_styles() {
		if (document.getElementById("ow-styles")) return;
		const style = document.createElement("style");
		style.id = "ow-styles";
		style.textContent = `
			.ow-on .form-tabs-list { display: none !important; }
			/* Frappe's form card clips with overflow:hidden, which silently turns
			   off position:sticky for everything inside it (the stepper and the
			   footer). clip keeps the rounded corners without that side effect. */
			.ow-on .layout-main-section.frappe-card { overflow: clip; }
			.ow-on .form-layout > .form-page {
				display: grid; grid-template-columns: 250px minmax(0, 1fr); column-gap: 24px;
			}
			.ow-on .form-layout > .form-page > * { grid-column: 2; min-width: 0; }
			.ow-on .form-layout > .form-page > .ow-rail { grid-column: 1; grid-row: 1 / span 12; }

			/* ── stepper ── */
			.ow-rail {
				align-self: start; position: sticky; top: calc(var(--navbar-height, 48px) + 72px);
				max-height: calc(100vh - var(--navbar-height, 48px) - 88px); overflow-y: auto;
				margin: 14px 0; padding: 14px 10px 12px;
				border-radius: var(--border-radius-lg, 12px); background: var(--subtle-fg);
			}
			.ow-progress {
				display: flex; align-items: center; gap: 12px;
				padding: 4px 6px 14px; margin-bottom: 8px; border-bottom: 1px solid var(--border-color);
			}
			.ow-ring {
				--p: 0; flex: none; width: 44px; height: 44px; border-radius: 50%;
				display: grid; place-items: center;
				background: conic-gradient(var(--green-500, #38a160) calc(var(--p) * 1%), var(--border-color) 0);
			}
			.ow-ring span {
				width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
				background: var(--subtle-fg); font-size: 11px; font-weight: 700; color: var(--text-color);
			}
			.ow-progress-title { font-size: 13px; font-weight: 600; color: var(--text-color); }
			.ow-progress-sub { font-size: 11.5px; color: var(--text-muted); }

			.ow-step {
				position: relative; display: flex; gap: 11px; align-items: flex-start;
				padding: 9px 10px 16px 8px; border-radius: var(--border-radius-md, 8px); cursor: pointer;
				transition: background .15s ease;
			}
			.ow-step:hover { background: var(--fg-hover-color, var(--gray-100)); }
			.ow-step:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
			.ow-step:not(.last)::after {
				content: ""; position: absolute; left: 22px; top: 40px; bottom: -6px;
				width: 2px; border-radius: 2px; background: var(--border-color);
			}
			.ow-step.done:not(.last)::after { background: var(--green-500, #38a160); }
			.ow-step.current { background: var(--fg-color); box-shadow: var(--shadow-sm); }
			.ow-step.locked { cursor: not-allowed; opacity: .5; }
			.ow-step.locked:hover { background: transparent; }
			.ow-num {
				flex: none; width: 30px; height: 30px; border-radius: 50%; z-index: 1;
				display: flex; align-items: center; justify-content: center;
				color: var(--text-muted); background: var(--fg-color); border: 1px solid var(--border-color);
			}
			.ow-step.current .ow-num { color: var(--fg-color); background: var(--primary); border-color: var(--primary); }
			.ow-step.done .ow-num { color: var(--white, #fff); background: var(--green-500, #38a160); border-color: var(--green-500, #38a160); }
			.ow-step.warn:not(.current) .ow-num { color: var(--orange-600, #c05621); border-color: var(--orange-400, #f5a623); }
			.ow-text { min-width: 0; padding-top: 1px; }
			.ow-title { display: flex; align-items: baseline; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-color); line-height: 1.3; }
			.ow-idx { font-size: 11px; font-weight: 600; color: var(--text-muted); }
			.ow-sub {
				font-size: 11.5px; color: var(--text-muted); margin-top: 3px; line-height: 1.35;
				overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
				-webkit-line-clamp: 2; -webkit-box-orient: vertical;
			}
			.ow-badge {
				display: inline-block; margin-top: 6px; padding: 1px 8px; border-radius: 10px;
				font-size: 11px; font-weight: 600; background: var(--bg-orange); color: var(--text-on-orange);
			}
			.ow-rail-foot {
				margin: 10px 6px 0; padding-top: 10px; border-top: 1px solid var(--border-color);
				font-size: 11.5px; line-height: 1.5; color: var(--text-muted);
			}

			/* ── step header + key facts ── */
			.ow-summary { padding: 16px 0 6px; }
			.ow-hero { display: flex; align-items: center; gap: 14px; padding: 2px 0 14px; border-bottom: 1px solid var(--border-color); }
			.ow-hero-icon {
				flex: none; width: 42px; height: 42px; border-radius: var(--border-radius-md, 8px);
				display: grid; place-items: center; color: var(--fg-color); background: var(--primary);
			}
			.ow-hero-text { flex: 1; min-width: 0; }
			.ow-hero-eyebrow { font-size: 11.5px; font-weight: 500; color: var(--text-muted); }
			.ow-hero-title { font-size: 18px; font-weight: 600; color: var(--heading-color, var(--text-color)); line-height: 1.3; }
			.ow-hero-desc { font-size: 12.5px; color: var(--text-muted); margin-top: 1px; }
			.ow-hero-dots { display: flex; gap: 5px; flex: none; }
			.ow-hero-dots span { width: 8px; height: 8px; border-radius: 8px; background: var(--border-color); transition: all .2s ease; }
			.ow-hero-dots span.past { background: var(--green-500, #38a160); }
			.ow-hero-dots span.now { width: 22px; background: var(--primary); }

			.ow-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 10px; margin-top: 14px; }
			.ow-chip {
				display: flex; align-items: center; gap: 10px; min-width: 0;
				padding: 8px 10px; border-radius: var(--border-radius-md, 8px); background: var(--control-bg);
			}
			.ow-chip-icon {
				flex: none; width: 28px; height: 28px; border-radius: var(--border-radius, 6px); display: grid; place-items: center;
				color: var(--text-muted); background: var(--fg-color);
			}
			.ow-chip-text { display: flex; flex-direction: column; min-width: 0; }
			.ow-k { font-size: 11px; color: var(--text-muted); }
			.ow-v { font-size: 13px; font-weight: 600; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
			.ow-chip.empty .ow-v { color: var(--text-light, var(--text-muted)); font-weight: 400; }

			/* ── footer ── */
			.ow-footer {
				position: sticky; bottom: 0; z-index: 3; display: flex; align-items: center;
				justify-content: space-between; gap: 12px; padding: 12px 0; margin-top: 8px;
				background: var(--fg-color); border-top: 1px solid var(--border-color);
			}
			.ow-foot-right { display: flex; align-items: center; gap: 14px; }
			.ow-foot-note { font-size: 12px; color: var(--text-muted); }

			/* ── preview checklist ── */
			.ow-checklist {
				display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px;
				margin: 16px 0 6px; padding: 14px; border-radius: var(--border-radius-md, 8px); background: var(--subtle-fg);
			}
			.ow-check-head { grid-column: 1 / -1; font-size: 12.5px; font-weight: 600; color: var(--text-color); }
			.ow-check {
				display: flex; align-items: center; gap: 8px; font-size: 12.5px;
				padding: 8px 10px; border-radius: var(--border-radius, 6px); background: var(--fg-color);
			}
			.ow-check.pending { cursor: pointer; color: var(--text-muted); }
			.ow-check.pending:hover { box-shadow: var(--shadow-sm); }
			.ow-check-mark { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; flex: none; }
			.ow-check.ok .ow-check-mark { color: var(--white, #fff); background: var(--green-500, #38a160); }
			.ow-check.pending .ow-check-mark { border: 2px solid var(--orange-400, #f5a623); }
			.ow-check-state { margin-left: auto; font-size: 11px; font-weight: 600; }
			.ow-check.ok .ow-check-state { color: var(--text-on-green); }
			.ow-check.pending .ow-check-state { color: var(--text-on-orange); }

			/* ── template cards ── */
			.ow-tpl { margin-bottom: 14px; }
			.ow-tpl-head { font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 8px; }
			.ow-tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
			.ow-tpl-card {
				position: relative; padding: 12px; border-radius: var(--border-radius-md, 8px); cursor: pointer;
				border: 1px solid var(--border-color); background: var(--fg-color);
				transition: border-color .15s ease, box-shadow .15s ease;
			}
			.ow-tpl-card:hover { box-shadow: var(--shadow-sm); border-color: var(--gray-400, #c0c6cc); }
			.ow-tpl-card.selected { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
			.ow-tpl-card.selected::after {
				content: "✓"; position: absolute; top: 10px; right: 10px; width: 18px; height: 18px;
				border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700;
				color: var(--fg-color); background: var(--primary);
			}
			.ow-tpl-icon {
				width: 32px; height: 32px; border-radius: var(--border-radius, 6px); display: grid; place-items: center;
				margin-bottom: 8px; color: var(--text-muted); background: var(--control-bg);
			}
			.ow-tpl-name { font-size: 13px; font-weight: 600; color: var(--text-color); padding-right: 18px; }
			.ow-tpl-id { font-size: 11px; color: var(--text-muted); margin-top: 2px; word-break: break-all; }

			/* ── approval matrix ── */
			.ow-appr { border: 1px solid var(--border-color); border-radius: var(--border-radius-md, 8px); padding: 4px 16px 8px; }
			.ow-appr + .ow-appr { margin-top: 12px; }
			.ow-appr-head {
				display: flex; justify-content: space-between; align-items: center; gap: 12px;
				padding: 12px 0; border-bottom: 1px solid var(--border-color);
			}
			.ow-appr-title { font-weight: 600; font-size: 13px; }
			.ow-appr-meta, .ow-appr-role, .ow-appr-time { font-size: 11.5px; color: var(--text-muted); }
			.ow-appr-stage { font-size: 11.5px; font-weight: 600; color: var(--text-muted); padding: 10px 0 2px; }
			.ow-appr-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
			.ow-avatar {
				flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
				font-size: 12px; font-weight: 600; color: var(--text-color); background: var(--control-bg);
			}
			.ow-appr-info { flex: 1; min-width: 0; }
			.ow-appr-name { font-size: 13px; font-weight: 600; }
			.ow-appr-status { text-align: right; }
			.ow-empty {
				padding: 20px; text-align: center; color: var(--text-muted); font-size: 12.5px;
				border-radius: var(--border-radius-md, 8px); background: var(--subtle-fg);
			}

			@media (max-width: 991px) {
				.ow-on .form-layout > .form-page { display: block; }
				.ow-rail { position: static; max-height: none; margin: 10px 0; }
				.ow-progress { display: none; }
				.ow-steps { display: flex; gap: 6px; overflow-x: auto; }
				.ow-step { flex: none; padding: 6px 10px; }
				.ow-step::after, .ow-sub, .ow-rail-foot { display: none !important; }
				.ow-hero-dots { display: none; }
			}
		`;
		document.head.appendChild(style);
	}
})();
