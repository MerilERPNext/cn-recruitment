/* global frappe, $, __ */
/**
 * Campus Drive — Candidates tab.
 *
 * A drive MERGES its Campus Invites: once the drive is running, the institute a
 * candidate came from no longer splits the pipeline, so the default view rolls
 * every institute + invite up per ROLE (Job Opening). Counts are shown for every
 * status on the Job Applicant status field.
 *
 * The "By Institute" toggle splits each role into a per-institute table on demand.
 * Every number opens the matching filtered Job Applicant list; role / institute
 * names open their forms.
 */

// Colour, avatar and style primitives — and the group board itself — now live in
// campus_gd_board.js (hooks.app_include_js). The Group Discussion doctype renders the
// identical cards for the panel conducting ONE group, and a second copy of them here
// is a second thing to keep in step. They are globals, so everything below still
// refers to CD_FALLBACK / cdStatusColor / cdTint / cdColorFor / cdAvatar /
// cdInjectStyles by name.

frappe.ui.form.on("Campus Drive", {
	setup(frm) {
		cdSetQueries(frm);
	},
	refresh(frm) {
		cdSetQueries(frm);
		// The two data-backed boards each cost a server round-trip, so they load only
		// when their tab is actually opened. Opening the form (or saving it) fetches
		// nothing. GD is now rendered INSIDE its round card in Round Tracking (not a
		// separate section), so the whole interview pipeline lives in one place.
		cdWhenVisible(frm, "institute_candidates_html", () => cdRenderCandidates(frm));
		cdWhenVisible(frm, "interview_rounds_html", () => cdRenderRounds(frm));
		if (!frm.is_new()) {
			frm.add_custom_button(__("Re-run Eligibility"), () => cdRerunEligibility(frm), __("Actions"));
		}
	},
});

/**
 * Scope the drive's link pickers to what this drive actually runs, so HR can't pick
 * an unrelated record out of the whole site.
 */
function cdSetQueries(frm) {
	// A panel can only cover a ROLE this drive is hiring for — i.e. an opening that
	// came in through one of its campus invites.
	frm.set_query("job_opening", "round_panelists", () => {
		const openings = (frm.doc.linked_job_openings || [])
			.map((r) => r.job_opening)
			.filter(Boolean);
		return { filters: { name: ["in", openings.length ? openings : [""]] } };
	});

	// Same for GD groups / group members if they're ever edited by hand.
	["gd_groups", "gd_group_members"].forEach((table) => {
		if (frm.fields_dict[table]) {
			frm.set_query("job_opening", table, () => {
				const openings = (frm.doc.linked_job_openings || [])
					.map((r) => r.job_opening)
					.filter(Boolean);
				return { filters: { name: ["in", openings.length ? openings : [""]] } };
			});
		}
	});

	// Only invites that have actually been sent (submitted) and are still live can be
	// run as a drive — a draft invite has no registered candidates behind it.
	frm.set_query("campus_invite", "campus_invites", () => ({
		filters: { docstatus: 1, status: ["!=", "Completed"] },
	}));

	// HR chooses which of the invites' colleges this drive runs — sized by candidate
	// count, so a big college goes on its own and two small ones are merged. The picker
	// offers only what is still schedulable: invited on one of this drive's invites,
	// active, and not already frozen by another LIVE drive (a college's registration
	// closes when its drive goes live, so it can belong to only one).
	frm.set_query("institute", "participating_institutes", () => ({
		query: "recruitment.recruitment.doctype.campus_drive.campus_drive.drive_institute_query",
		filters: {
			campus_invites: (frm.doc.campus_invites || [])
				.map((r) => r.campus_invite)
				.filter(Boolean),
			campus_drive: frm.is_new() ? null : frm.doc.name,
		},
	}));
}

/**
 * Re-check the drive's candidates (invited and walk-in) against each opening's
 * current eligibility conditions — for when an opening's rules changed mid-drive.
 */
function cdRerunEligibility(frm) {
	frappe.confirm(
		__("Re-check this drive's eligibility-rejected and held candidates against their opening's current conditions?<br><br>"
			+ "Only candidates Rejected or put on Hold by an eligibility condition are re-checked; those who now pass become Shortlisted. "
			+ "Candidates already Shortlisted or further along, or rejected for another reason, are not touched."),
		() => frappe.call({
			method: "recruitment.recruitment.eligibility_engine.rerun_eligibility_for_drive",
			args: { campus_drive: frm.doc.name },
			freeze: true,
			freeze_message: __("Re-running eligibility…"),
		}).then((r) => {
			const s = r && r.message;
			if (!s) return;
			const line = (label, n) => (n ? `<li>${label}: <b>${n}</b></li>` : "");
			frappe.msgprint({
				title: __("Eligibility re-run"),
				indicator: s.failed ? "orange" : "green",
				message: `<p>${__("{0} candidate(s) re-checked, {1} changed status.", [s.evaluated, s.changed])}</p>
					<ul>
						${line(__("Rejected"), s.rejected)}
						${line(__("On Hold"), s.hold)}
						${line(__("Shortlisted"), s.shortlisted)}
						${line(__("Not touched — not held back by eligibility"), s.skipped_stage)}
						${line(__("Skipped — opening has no conditions"), s.skipped_no_rules)}
						${line(__("Failed (see Error Log)"), s.failed)}
					</ul>`,
			});
			// The candidate board's counts are now stale.
			frm.reload_doc();
		})
	);
}

/**
 * Run `fn` once the given HTML field is genuinely on screen (its tab opened).
 * Re-armed on every refresh, so a reload re-renders when you return to the tab.
 */
function cdWhenVisible(frm, fieldname, fn) {
	const field = frm.fields_dict[fieldname];
	if (!field || !field.wrapper) return;
	const el = field.wrapper;

	if (el.offsetParent !== null) return fn(); // already visible
	if (el._cdObserver) el._cdObserver.disconnect();
	if (!("IntersectionObserver" in window)) return fn(); // no support -> just load

	const io = new IntersectionObserver((entries) => {
		if (entries.some((e) => e.isIntersecting)) {
			io.disconnect();
			el._cdObserver = null;
			fn();
		}
	});
	io.observe(el);
	el._cdObserver = io;
}

// ---------------------------------------------------------------------------
// Round tracking
//
// Interviewers are configured ONCE per round + position (Round Panelists), so
// scheduling reuses them every time. This board shows, per round: who is waiting
// at its hiring stage, the standing panels, what is scheduled, what is still
// awaiting interviewer feedback, and how it concluded.
// ---------------------------------------------------------------------------

function cdRenderRounds(frm) {
	const field = frm.fields_dict.interview_rounds_html;
	if (!field) return;
	const $wrap = $(field.wrapper).empty();
	cdInjectStyles();
	const $root = $('<div class="campus-dash"></div>').appendTo($wrap);

	if (frm.is_new()) {
		$root.html(`<div class="cd-empty text-muted">${__("Save the drive to track rounds.")}</div>`);
		return;
	}

	$root.on("click", "[data-rd-schedule]", function () {
		cdScheduleRound(frm, $(this).attr("data-rd-schedule"), () => cdRenderRounds(frm));
	});
	$root.on("click", "[data-rd-nudge]", function () {
		cdNudgeFeedback(frm, $(this).attr("data-rd-nudge"), () => cdRenderRounds(frm));
	});
	$root.on("click", "[data-rd-extra]", function () {
		cdAddCandidateInterview(frm, $(this).attr("data-rd-extra"), () => cdRenderRounds(frm));
	});
	// Open an additional round's interview — where its feedback and verdict live.
	// Open the Job Offer a candidate already has, straight from the round card.
	$root.on("click", "[data-offer-doc]", function (e) {
		e.preventDefault();
		e.stopPropagation();
		frappe.set_route("Form", "Job Offer", $(this).attr("data-offer-doc"));
	});

	$root.on("click", "[data-rd-interview]", function () {
		frappe.set_route("Form", "Interview", $(this).attr("data-rd-interview"));
	});
	// Assign candidates across panels -> creates their Interview records
	$root.on("click", "[data-rd-assign]", function () {
		cdAssignPanels(frm, $(this).attr("data-rd-assign"), () => cdRenderRounds(frm));
	});

	// HR picks the interviewer per candidate.
	$root.on("click", "[data-rd-manual]", function () {
		cdAssignManually(frm, $(this).attr("data-rd-manual"), () => cdRenderRounds(frm));
	});

	// An interviewer takes waiting candidates for themselves. Only rendered for
	// someone already on the round's roster; the server checks it again anyway.
	$root.on("click", "[data-rd-take]", function () {
		cdTakeCandidates(frm, $(this).attr("data-rd-take"), () => cdRenderRounds(frm));
	});
	// Read-only view of the panels and each candidate's interview status
	$root.on("click", "[data-rd-open]", function () {
		cdOpenPanelsDialog(frm, $(this).attr("data-rd-open"));
	});
	// "⋯" — round housekeeping (the additional round has its own button on its card)
	$root.on("click", "[data-rd-more]", function () {
		const code = $(this).attr("data-rd-more");
		const r = (cdRoundsData.rounds || []).find((x) => x.round_code === code) || {};
		const items = [
			{ label: __("Sync results from interviews (fix stuck candidates)"), action: () => cdReconcileRound(frm, code, () => cdRenderRounds(frm)) },
		];
		if (r.awaiting_feedback) {
			items.push({ label: __("Nudge {0} pending feedback", [r.awaiting_feedback]), action: () => cdNudgeFeedback(frm, code, () => cdRenderRounds(frm)) });
		}
		const d = new frappe.ui.Dialog({ title: __("Round options — {0}", [code]), fields: [{ fieldname: "b", fieldtype: "HTML" }] });
		const $b = d.fields_dict.b.$wrapper;
		items.forEach((it) => {
			$(`<button class="btn btn-default btn-sm" style="display:block;width:100%;text-align:left;margin-bottom:6px">${frappe.utils.escape_html(it.label)}</button>`)
				.appendTo($b).on("click", () => { d.hide(); it.action(); });
		});
		d.show();
	});
	$root.on("click", "[data-rd-list]", function () {
		const filters = { custom_campus_drive: frm.doc.name, custom_campus_round_code: $(this).attr("data-rd-list") };
		const st = $(this).attr("data-rd-status");
		if (st) {
			// A comma list (e.g. the awaiting tile: "Appeared,Under Review") becomes an
			// "in" filter so the list matches the tile's count exactly.
			filters.status = st.includes(",") ? ["in", st.split(",")] : st;
		}
		frappe.set_route("List", "Interview", filters);
	});
	$root.on("click", "[data-rd-pool]", function () {
		const stage = $(this).attr("data-rd-pool");
		frappe.set_route("List", "Job Applicant", {
			custom_campus_invite: ["in", cdRoundsData.invites || []],
			custom_current_stage: stage,
		});
	});

	$root.html('<div class="cd-loading text-muted">' + __("Loading…") + "</div>");
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_rounds_overview",
		args: { campus_drive: frm.doc.name },
		callback: (r) => {
			cdRoundsData = r.message || { rounds: [] };
			cdApplyStageOptions(frm, cdRoundsData.stage_options || {});
			cdDrawRounds($root, frm, cdRoundsData);
		},
	});
}

// Feed the round grid's Hiring Stage picker from the linked openings' actual
// stages — a typo there would silently strand every candidate. The options ride
// along on the rounds payload, so this costs no extra round-trip.
function cdApplyStageOptions(frm, m) {
	cdRoundsData.stage_options = m.stages || [];
	const grid = frm.fields_dict.rounds && frm.fields_dict.rounds.grid;
	if (grid && grid.update_docfield_property) {
		grid.update_docfield_property("hiring_stage", "options", ["", ...(m.stages || [])].join("\n"));
	}
	// Openings that don't all share a stage name can only be partly scheduled by a
	// round mapped to it — worth saying out loud.
	if ((m.partial || []).length && m.openings > 1) {
		cdRoundsData.stage_warning = __(
			"These stages exist on only some of the linked openings: {0}. A round mapped to one of them will schedule only those candidates.",
			[m.partial.join(", ")]
		);
	}
}

let cdRoundsData = { rounds: [], invites: [] };

// The three regions a campus candidate can be pulled between, as table cells.
//
//   Applied      the region of the invite they came in on
//   Recommended  what an interview panel argued for — still waiting on HR, so it
//                changes nothing yet, which is exactly why it has to be visible
//   Requested    where HR actually moved them; only this region's panel may take them
//
// Tinted rather than plain text: the whole point of the columns is that a mismatch
// is spotted before someone clicks Schedule and the round refuses.
function cdRegionCells(c, esc) {
	const chip = (label, tone, title) =>
		label
			? `<span class="cd-region cd-region-${tone}"${
					title ? ` title="${esc(title)}"` : ""
			  }>${esc(label)}</span>`
			: `<span class="text-muted">—</span>`;
	const why = c.recommendation_reason
		? __("Panel's reason: {0}", [c.recommendation_reason])
		: __("Recommended by an interview panel — awaiting HR, so they are still interviewed by their own region.");
	return (
		`<td class="text-muted">${chip(c.applied_region_name, "home")}</td>` +
		`<td>${chip(c.recommended_region_name, "rec", why)}</td>` +
		`<td>${chip(
			c.requested_region_name,
			"req",
			__("HR moved this candidate — only this region's panel can interview them.")
		)}</td>`
	);
}

// The same three regions, squeezed into ONE cell — for lists that are already wide
// (the panel view). The region that owns the interview reads first; a pending
// recommendation follows it as an arrow, because that is the thing nobody sees
// otherwise: it is written by the feedback on these very interviews.
function cdRegionSummary(c, esc) {
	const parts = [];
	const current = c.region_name || c.applied_region_name;
	if (current) {
		const moved = !!c.requested_region_name;
		parts.push(
			`<span class="cd-region cd-region-${moved ? "req" : "home"}"${
				moved
					? ` title="${esc(__("HR moved this candidate — only this region's panel can interview them."))}"`
					: ""
			}>${esc(current)}</span>`
		);
	}
	if (c.recommended_region_name) {
		const why = c.recommendation_reason
			? __("Panel's reason: {0}", [c.recommendation_reason])
			: __("Recommended by an interview panel — awaiting HR.");
		parts.push(
			`<span class="cd-region cd-region-rec" title="${esc(why)}">→ ${esc(
				c.recommended_region_name
			)}</span>`
		);
	}
	return parts.join(" ") || "—";
}

function cdScheduleRound(frm, roundCode, done) {
	// Load the eligible pool first so HR can pick who to schedule (e.g. 30 today,
	// the rest tomorrow) instead of being forced into all-or-nothing.
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_round_pool",
		args: { campus_drive: frm.doc.name, round_code: roundCode },
		callback: (r) => cdScheduleDialog(frm, roundCode, r.message || { pool: [] }, done),
	});
}

function cdScheduleDialog(frm, roundCode, poolData, done) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const pool = poolData.pool || [];
	if (!pool.length) {
		frappe.msgprint({
			title: __("Nothing to schedule"),
			indicator: "orange",
			message: __("No candidate is waiting at stage {0}. ({1} already scheduled.)", [
				esc(poolData.stage || ""),
				poolData.already_scheduled || 0,
			]),
		});
		return;
	}

	const roleTitle = (op) => cdRoleTitle(frm, op);
	const rows = pool
		.map(
			(c, i) => `<tr>
			<td><input type="checkbox" class="cd-pick" data-i="${i}" data-name="${esc(c.name)}" checked></td>
			<td class="cd-pick-name">${esc(c.applicant_name || c.name)}</td>
			<td class="text-muted">${esc(c.institute || "—")}</td>
			<td class="text-muted">${esc(roleTitle(c.job_opening))}</td>
			${cdRegionCells(c, esc)}
		</tr>`
		)
		.join("");

	const d = new frappe.ui.Dialog({
		title: __("Schedule Interviews — {0}", [roundCode]),
		size: "large",
		fields: [
			{
				fieldname: "scheduled_on", label: __("Interview Date"), fieldtype: "Date",
				reqd: 1, default: frappe.datetime.get_today(),
				description: __(
					"Campus interviews are walk-in: candidates are seen in any order, so only the date is needed."
				),
			},
			{
				fieldname: "mode", label: __("Mode of Interview"), fieldtype: "Select",
				options: ["On-Site", "Online"], reqd: 1,
				default: frm.doc.drive_type || "On-Site",
				description: __(
					"Defaults to this drive's Drive Type. Change it to run this batch the other way — each interview keeps its own mode, so a single one can still be switched later."
				),
			},
			{ fieldname: "sec", fieldtype: "Section Break", label: __("Optional day window") },
			{ fieldname: "from_time", label: __("From"), fieldtype: "Time", default: "09:00:00" },
			{ fieldname: "col", fieldtype: "Column Break" },
			{ fieldname: "to_time", label: __("To"), fieldtype: "Time", default: "18:00:00" },
			{ fieldname: "sec2", fieldtype: "Section Break", label: __("Candidates") },
			{
				fieldname: "picker", fieldtype: "HTML",
				options: `<div class="cd-picker">
					<div class="cd-picker-bar">
						<button class="btn btn-xs btn-default" data-cd-all>${__("Select all")}</button>
						<button class="btn btn-xs btn-default" data-cd-none>${__("Clear")}</button>
						<span class="cd-picker-count"></span>
					</div>
					<div class="cd-picker-scroll"><table class="cd-table cd-picker-table">
						<thead><tr><th></th><th class="cd-inst-col">${__("Candidate")}</th>
						<th class="cd-inst-col">${__("Institute")}</th><th class="cd-inst-col">${__("Role")}</th>
						<th>${__("Applied")}</th><th>${__("Recommended")}</th>
						<th>${__("Requested")}</th></tr></thead>
						<tbody>${rows}</tbody>
					</table></div>
				</div>`,
			},
		],
		primary_action_label: __("Schedule Selected"),
		primary_action(v) {
			const picked = d.$wrapper.find(".cd-pick:checked").map((_i, el) => $(el).data("name")).get();
			if (!picked.length) {
				frappe.msgprint(__("Select at least one candidate."));
				return;
			}
			d.hide();
			frappe.dom.freeze(__("Creating interviews…"));
			frappe.call({
				method: "recruitment.recruitment.doctype.campus_drive.campus_drive.schedule_round_interviews",
				args: {
					campus_drive: frm.doc.name, round_code: roundCode,
					scheduled_on: v.scheduled_on, from_time: v.from_time, to_time: v.to_time,
					mode: v.mode,
					applicants: JSON.stringify(picked),
				},
				callback: (r) => {
					frappe.dom.unfreeze();
					const m = r.message;
					if (!m) return;
					// A skip means those candidates have NO panel for their role or their
					// region — surface it loudly, otherwise HR assumes everyone got
					// scheduled. The per-candidate reason below says which of the two.
					if (m.skipped_count) {
						frappe.msgprint({
							title: __("{0} scheduled, {1} skipped", [m.created, m.skipped_count]),
							indicator: "orange",
							message:
								__("These candidates have no panel covering their role or their region. Add a panel for their position/region — or leave a panel's Role and Region blank, which covers everyone — and schedule again.") +
								"<ul>" + (m.skipped || []).map((s) => `<li>${frappe.utils.escape_html(s.applicant)} — ${frappe.utils.escape_html(s.reason)}</li>`).join("") + "</ul>",
						});
					} else {
						frappe.show_alert({
							message: __("{0} interviews scheduled.", [m.created]), indicator: "green",
						});
					}
					if (done) done();
				},
				error: () => frappe.dom.unfreeze(),
			});
		},
	});

	// picker wiring: select-all / clear / live count
	const sync = () => {
		const n = d.$wrapper.find(".cd-pick:checked").length;
		d.$wrapper.find(".cd-picker-count").text(__("{0} of {1} selected", [n, pool.length]));
	};
	d.$wrapper.on("click", "[data-cd-all]", (e) => {
		e.preventDefault();
		d.$wrapper.find(".cd-pick").prop("checked", true);
		sync();
	});
	d.$wrapper.on("click", "[data-cd-none]", (e) => {
		e.preventDefault();
		d.$wrapper.find(".cd-pick").prop("checked", false);
		sync();
	});
	d.$wrapper.on("change", ".cd-pick", sync);
	d.show();
	sync();
}

// Add an ADDITIONAL ROUND for a single candidate on this round — a second look at
// someone borderline — without touching the opening's workflow for everyone else.
// The interview type is fixed ("Additional Round", server-side); what HR chooses is
// the candidate, which of this round's panels takes it, when, and why.
function cdAddCandidateInterview(frm, roundCode, done) {
	const round = (cdRoundsData.rounds || []).find((x) => x.round_code === roundCode) || {};
	// Who may be given one, and every panel that could take it — resolved server-side,
	// in one call, because both answers span records the board doesn't carry.
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_extra_round_options",
		args: { campus_drive: frm.doc.name, round_code: roundCode },
		callback: (r) => cdExtraDialog(frm, roundCode, round, r.message || {}, done),
	});
}

function cdExtraDialog(frm, roundCode, round, options, done) {
	const roundLabel = round.round_name || roundCode;
	const candidates = options.candidates || [];
	const panels = options.panels || [];

	if (!candidates.length) {
		// Two different reasons, and telling them apart is the whole message: "nobody
		// has cleared it yet" is a wait, "everyone has moved on" is a closed round.
		const movedOn = options.moved_on || 0;
		frappe.msgprint({
			title: movedOn
				? __("This round is behind its candidates")
				: __("Nobody has cleared this round yet"),
			indicator: "orange",
			message: movedOn
				? __("{0} candidate(s) cleared {1}, but every one of them has already moved on to the next round. An additional round is a second look at the round a candidate is sitting at now, so it can only be added while they are still on it — add it on the round they are at instead.", [
						movedOn,
						`<b>${roundLabel}</b>`,
				  ])
				: __("An additional round is a second look at a candidate who has finished {0}. Once someone clears it, they can be given one here.", [
						roundLabel,
				  ]),
		});
		return;
	}
	// An additional round is judged by its OWN panel, filed under this round's extra
	// code. Naming that code is the whole message: round_code on Round Panelists is
	// free text, so "add a panel" alone leaves HR guessing what to type.
	if (!panels.length) {
		const code = options.extra_panel_round_code || `${roundCode}-EXTRA`;
		const missing = (options.missing_user || []).length;
		frappe.msgprint({
			title: __("Add an Additional Round panel"),
			indicator: "orange",
			message:
				__("No panel is set up for the Additional Round on {0}.", [`<b>${roundLabel}</b>`]) +
				"<br><br>" +
				__("Open <b>Round Panelists</b> on this drive and add a row with Round Code {0} and the interviewer(s) who should take it, then save.", [
					`<b>${code}</b>`,
				]) +
				(missing
					? "<br><br>" +
					  __("({0} panelist(s) are already on {1} but their Employee has no User account, so they cannot be put on an interview.)", [
							missing,
							code,
					  ])
					: ""),
		});
		return;
	}

	// Only this round's Additional Round panels reach here, so a label no longer needs
	// to name a round — every option belongs to the same roster. The value still
	// carries that roster's code, because it is what the server re-resolves the panel
	// against. The separator is a control character, which no round code or panel name
	// contains.
	const KEY = "\u001f";
	const panelOptions = panels.map((p) => ({
		value: `${p.round_code}${KEY}${p.panel}`,
		label: `${p.panel}${p.interviewers.length ? " — " + p.interviewers.join(", ") : ""}`,
		panel: p.panel,
	}));
	// A candidate may be given several additional rounds, but never twice in front of
	// the same panel — a second look from the same interviewers is the first look
	// again. The server refuses it either way; hiding those panels here means HR picks
	// from what is actually allowed instead of being turned back on submit.
	const blockedFor = (ja) => (options.blocked_panels || {})[ja] || [];
	const extraCode = options.extra_panel_round_code || `${roundCode}-EXTRA`;
	const panelDesc = __("Panels rostered for the Additional Round on {0} (Round Code {1}).", [
		roundLabel,
		extraCode,
	]);

	const d = new frappe.ui.Dialog({
		title: __("Additional Round — {0}", [roundLabel]),
		fields: [
			{
				fieldname: "job_applicant", label: __("Candidate"), fieldtype: "Select", reqd: 1,
				options: candidates.map((c) => ({
					value: c.name,
					label: [c.applicant_name, c.job_title, c.institute].filter(Boolean).join(" · "),
				})),
				default: candidates[0].name,
				description: __("Candidates who cleared {0} and are still sitting at it.", [
					roundLabel,
				]),
				onchange: () => syncPanels(),
			},
			{
				fieldname: "panel", label: __("Panel"), fieldtype: "Select", reqd: 1,
				options: panelOptions, default: panelOptions[0].value,
				description: panelDesc,
			},
			{
				fieldname: "reason", label: __("Reason"), fieldtype: "Small Text", reqd: 1,
				description: __("Why this candidate gets a round beyond the standard pipeline. Recorded on the interview and on their hiring workflow."),
			},
			{ fieldname: "scheduled_on", label: __("Date"), fieldtype: "Date", reqd: 1,
			  default: frappe.datetime.get_today() },
		],
		primary_action_label: __("Create Interview"),
		primary_action(v) {
			const [panelRound, panelName] = String(v.panel).split(KEY);
			d.hide();
			frappe.call({
				method: "recruitment.recruitment.doctype.campus_drive.campus_drive.add_candidate_interview",
				args: {
					campus_drive: frm.doc.name, round_code: roundCode,
					job_applicant: v.job_applicant, panel: panelName, panel_round: panelRound,
					scheduled_on: v.scheduled_on, reason: v.reason,
				},
				callback: (r) => {
					if (!r.message) return;
					frappe.show_alert({
						message: __("{0} created for {1} ({2} interviewer(s)).", [
							r.message.stage, r.message.interview, r.message.interviewers,
						]),
						indicator: "green",
					});
					if (done) done();
				},
			});
		},
	});

	// Offer only the panels that have not already judged the chosen candidate, and say
	// what to do when that leaves none — rostering another panel, not picking one of
	// these again, is the way forward.
	function syncPanels() {
		const used = blockedFor(d.get_value("job_applicant"));
		const avail = panelOptions.filter((o) => !used.includes(o.panel));
		d.set_df_property("panel", "options",
			avail.length ? avail : [{ value: "", label: __("No panel left") }]);
		d.set_value("panel", avail.length ? avail[0].value : "");
		d.set_df_property("panel", "description",
			avail.length
				? panelDesc +
					(used.length
						? " " +
						  __("{0} panel(s) hidden — they have already given this candidate an additional round.", [
								used.length,
						  ])
						: "")
				: __("Every panel on {0} has already given this candidate an additional round. A second look needs interviewers who have not judged them before — add another panel in <b>Round Panelists</b> under Round Code {1}, save the drive, then try again.", [
						`<b>${roundLabel}</b>`,
						`<b>${extraCode}</b>`,
				  ]));
		if (avail.length) d.enable_primary_action();
		else d.disable_primary_action();
	}

	d.show();
	syncPanels();
}

function cdReconcileRound(frm, roundCode, done) {
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_drive.campus_drive.reconcile_round",
		args: { campus_drive: frm.doc.name, round_code: roundCode },
		callback: (r) => {
			const m = r.message || {};
			frappe.msgprint({
				title: __("Synced from interviews"),
				indicator: m.advanced || m.rejected ? "green" : "blue",
				message: (m.advanced || m.rejected)
					? __("Advanced {0} cleared candidate(s), rejected {1}. Any who cleared earlier but got stuck are now moved on.", [m.advanced, m.rejected])
					: __("Everything already in sync — no stuck candidates."),
			});
			if (done) done();
		},
	});
}

function cdNudgeFeedback(frm, roundCode, done) {
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_drive.campus_drive.nudge_pending_feedback",
		args: { campus_drive: frm.doc.name, round_code: roundCode },
		callback: (r) => {
			const m = r.message || {};
			frappe.msgprint({
				title: __("Feedback nudge"),
				indicator: m.nudged ? "green" : "blue",
				message: m.nudged
					? __("Assigned {0} pending interview(s) to {1} interviewer(s). They'll see it under “Assigned to me” — no email was sent.", [m.nudged, m.interviewers])
					: __("Nothing pending — every interviewer on this round has submitted feedback."),
			});
			if (done) done();
		},
	});
}

function cdDrawRounds($root, frm, data) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const rounds = data.rounds || [];
	if (!rounds.length) {
		$root.html(
			`<div class="cd-empty text-muted">${__(
				"No rounds yet. Add rounds (Group Discussion, Technical, HR …) in the table above."
			)}</div>`
		);
		return;
	}

	const card = (r) => {
		const accent = cdColorFor(r.round_code);
		const panels = (r.panels || [])
			.map((p) => {
				const c = cdColorFor(p.panel);
				const who = p.interviewers
					.map((i) => `<span class="cd-pill" title="${esc(i.user)}">${esc(i.name)}</span>`)
					.join("");
				return `<div class="cd-rd-panel">
					<span class="cd-pill" style="background:${cdTint(c, 0.16)};color:${c}">${esc(p.panel)}</span>
					<span class="cd-rd-role">${p.role ? esc(p.role_title) : __("all roles")}</span>
					<span class="cd-rd-who">${who}</span>
				</div>`;
			})
			.join("");

		const cnt = (label, val, color, status) =>
			`<div class="cd-tile" data-rd-list="${esc(r.round_code)}" ${
				status ? `data-rd-status="${esc(status)}"` : ""
			} style="background:${cdTint(color, 0.13)};color:${color}">
				<div class="cd-tile-val">${val || 0}</div><div class="cd-tile-lbl">${esc(label)}</div></div>`;

		const warn = r.missing_user && r.missing_user.length
			? `<div class="cd-rd-warn">${__("No User login for: {0} — they cannot be interviewers.", [
					esc(r.missing_user.join(", ")),
			  ])}</div>`
			: "";
		const noStage = !r.hiring_stage && !r.is_gd
			? `<div class="cd-rd-warn">${__(
					"Set a Hiring Stage on this round so candidates can flow into it."
			  )}</div>`
			: "";
		// A region an interviewer recommended on THIS round, with no panel able to take
		// the candidate for it. Said here rather than in the banner above the board:
		// the Additional Round that answers it hangs off this round and is staffed from
		// this round's own extra roster.
		const regionNotes = (r.region_notes || [])
			.map(
				(n) => `<div class="cd-rd-warn"><b>${esc(n.title)}</b><br>${esc(n.detail)}</div>`
			)
			.join("");

		// Terminal rounds ("offer" / "pre_offer") are resolved server-side from the
		// stage the round maps to — the Job Opening's pre-offer checkbox is what
		// decides which of the two a drive can have. See _round_kind().
		const isTerminal = r.round_kind === "offer" || r.round_kind === "pre_offer";

		// Header action buttons differ by round kind. GD and terminal rounds drive
		// their own bodies (grouping / candidate list), so no header buttons there.
		const headActions = (r.is_gd || isTerminal)
			? ""
			: `<button class="btn btn-xs btn-primary cd-rd-btn" data-rd-assign="${esc(r.round_code)}"
					title="${__("Divide waiting candidates across this round's panels and create their interviews")}">${
					r.interviews ? __("Assign More") : __("Assign to Panels")
				}</button>
				<button class="btn btn-xs btn-default cd-rd-btn" data-rd-manual="${esc(r.round_code)}"
					title="${__("Choose the interviewer for each candidate yourself")}">${__(
					"Assign Manually"
				)}</button>
				${
					(r.panels || []).some((p) =>
						(p.interviewers || []).some((i) => i.user === frappe.session.user)
					)
						? `<button class="btn btn-xs btn-default cd-rd-btn" data-rd-take="${esc(
								r.round_code
						  )}" title="${__("Take waiting candidates onto your own panel")}">${__(
								"Take Candidates"
						  )}</button>`
						: ""
				}
				${r.interviews ? `<button class="btn btn-xs btn-default cd-rd-btn" data-rd-open="${esc(
					r.round_code)}">${__("View Panels")}</button>` : ""}
				<button class="btn btn-xs btn-default cd-rd-btn" data-rd-more="${esc(r.round_code)}"
					title="${__("Other options")}">⋯</button>`;

		// Body differs by round kind.
		let body;
		if (r.is_gd) {
			// GD grouping workspace mounts here (was a separate section).
			body = `<div class="campus-dash cd-gd-host" data-gd-round="${esc(r.round_code)}"></div>`;
		} else if (isTerminal) {
			// Cleared candidates who reached this stage → select & raise Job Offers,
			// or send them the pre-offer form.
			body = `<div class="cd-offer-host" data-offer-round="${esc(r.round_code)}"
				data-offer-kind="${esc(r.round_kind)}">
				<div class="cd-loading text-muted">${__("Loading candidates…")}</div></div>`;
		} else {
			body =
				(panels ? `<div class="cd-rd-panels">${panels}</div>` :
					`<div class="cd-rd-warn">${__("No panel set up for this round yet — add Round Panelists (round + panel + interviewers) once; every drive reuses them.")}</div>`) +
				`<div class="cd-tiles">
					${cnt(__("Interviews"), r.interviews, "#6366f1", null)}
					${cnt(__("Pending"), r.pending, "#6B7280", "Pending")}
					${cnt(__("Awaiting Feedback"), r.awaiting_feedback, "#F59E0B", "Appeared,Under Review")}
					${cnt(__("Cleared"), r.cleared, "#10B981", "Cleared")}
					${cnt(__("Rejected"), r.rejected, "#EF4444", "Rejected")}
				</div>`;
		}

		return `<div class="cd-card cd-card-accent" style="--cd-accent:${accent}">
			<div class="cd-card-head">
				<span class="cd-card-title"><span class="cd-role-dot" style="background:${accent}"></span>${esc(
			r.round_name || r.round_code
		)}
					<span class="cd-badge" style="background:${cdTint(accent, 0.14)};color:${accent}">${esc(
			r.round_type || ""
		)}</span></span>
				<span>
					${r.hiring_stage ? `<span class="cd-chip cd-chip-tot" data-rd-pool="${esc(r.hiring_stage)}">${
						r.waiting
					} ${__("waiting")}</span>` : ""}
					${headActions}
				</span>
			</div>
			${noStage}${warn}${regionNotes}
			<div class="cd-rd-meta">
				<span class="cd-pill">${__("Stage")}: ${esc(r.hiring_stage || "—")}</span>
				${r.scheduled_at ? `<span class="cd-pill">${esc(r.scheduled_at)}</span>` : ""}
				<span class="cd-pill">${esc(r.round_status || "")}</span>
			</div>
			${body}
		</div>${isTerminal ? "" : cdExtraCard(r, accent, esc)}`;
	};

	// Additional rounds sit in their own card directly under the round they were added
	// to, so the board reads Technical R1 → Additional Round → Technical R2 and a
	// second look given to one candidate is never buried inside a round's totals.
	// Always rendered (empty = one line), because a hidden action is one nobody finds.
	function cdExtraCard(r, accent, esc) {
		const extras = r.extras || [];
		// Cleared this round and not yet scheduled for a later one. Zero means the
		// round is behind every candidate on it, so the action is disabled rather than
		// opening a dialog with an empty picker — Technical Round 1 stops offering a
		// second look the moment its candidates are put into Technical Round 2.
		const eligible = r.extra_eligible || 0;
		const verdict = (e) => {
			const map = { Cleared: "#10B981", Rejected: "#EF4444", Pending: "#6B7280" };
			const c = map[e.status] || "#F59E0B";
			return `<span class="cd-pill" style="background:${cdTint(c, 0.16)};color:${c}">${esc(
				e.status || "Pending"
			)}</span>`;
		};
		const rows = extras
			.map(
				(e) => `<div class="cd-rd-extra-row">
					<span class="cd-link cd-rd-extra-name" data-rd-interview="${esc(e.interview)}">${esc(
					e.applicant_name
				)}</span>
					<span class="cd-pill">${esc(e.panel || __("no panel"))}</span>
					<span class="cd-rd-extra-who">${esc(
						(e.interviewers || []).join(", ") || "—"
					)}</span>
					<span class="cd-rd-extra-when">${esc(e.scheduled_on || "")}</span>
					${verdict(e)}
					<span class="cd-rd-extra-why" title="${esc(e.reason || "")}">${esc(e.reason || "")}</span>
				</div>`
			)
			.join("");

		return `<div class="cd-card cd-card-accent cd-rd-extra" style="--cd-accent:${accent}">
			<div class="cd-card-head">
				<span class="cd-card-title cd-rd-extra-title">↳ ${__("Additional Round")}
					<span class="cd-hint text-muted">${__("after {0}", [
						esc(r.round_name || r.round_code),
					])}</span>
				</span>
				<span>
					${extras.length ? `<span class="cd-chip cd-chip-tot">${extras.length} ${__(
						"candidate(s)"
					)}</span>` : ""}
					<button class="btn btn-xs btn-default cd-rd-btn" data-rd-extra="${esc(r.round_code)}"
						${eligible ? "" : "disabled"}
						title="${
							eligible
								? __("Give one candidate another round on top of this one")
								: __("Nobody is sitting at this round right now — everyone who cleared it has already moved on to the next round. An additional round is added on the round a candidate is currently at.")
						}">${__("Add candidate")}</button>
				</span>
			</div>
			${
				extras.length
					? `<div class="cd-rd-extra-list">${rows}</div>`
					: `<div class="cd-rd-extra-empty text-muted">${__(
							"None. Use this to give one candidate a second look on this round — clearing it moves them to the next round, rejecting it rejects them."
					  )}</div>`
			}
		</div>`;
	}

	// Health banner — surfaces misconfigurations (a round mapped to a stage no opening
	// has, wrong stage type, candidates stranded on an uncovered stage) so HR sees the
	// cause of a silent "0 waiting" instead of guessing.
	const health = data.health || [];
	const healthHtml = health.length
		? `<div class="cd-health">${health
				.map(
					(h) => `<div class="cd-health-item cd-health-${h.level === "error" ? "err" : "warn"}">
						<span class="cd-health-icon">${h.level === "error" ? "⛔" : "⚠️"}</span>
						<span class="cd-health-text"><b>${esc(h.title)}</b><br>${esc(h.detail)}</span>
					</div>`
				)
				.join("")}</div>`
		: `<div class="cd-health cd-health-ok">✓ ${__("All rounds are wired to valid stages — no pipeline issues detected.")}</div>`;

	$root.html(
		`<div class="cd-toolbar"><div class="cd-toolbar-title">${__("Round Tracking")}
			<span class="cd-hint text-muted">${__(
				"panels are set up once per round; on-site, deal candidates into them — interviews are created and feedback drives the result"
			)}</span></div></div>` + healthHtml + rounds.map(card).join("")
	);

	// Mount the GD grouping workspace inside each GD round's card. The board already
	// carries every round's panels (name + interviewers), so the GD cards can show who
	// takes each group without a second server call.
	cdGdState.panels = {};
	rounds.forEach((r) => {
		if (r.is_gd) cdGdState.panels[r.round_code] = r.panels || [];
	});
	$root.find(".cd-gd-host").each(function () {
		cdMountGd(frm, this);
	});
	// Load the cleared-candidate list inside each Offer / Pre Offer round's card.
	$root.find(".cd-offer-host").each(function () {
		cdMountTerminal(frm, this, $(this).attr("data-offer-round"), $(this).attr("data-offer-kind"));
	});
}

// Terminal round bodies (Offer / Pre Offer): list the candidates who reached this
// stage (cleared everything before it), let HR tick them and act on the whole set
// straight from the drive. Which of the two a round is comes from the stage it maps
// to, so the Job Opening's pre-offer checkbox is the only switch — see _round_kind().
//
// The two differ in one behaviour that matters: a Job Offer can't be raised twice,
// so an already-offered candidate is locked out; a pre-offer is legitimately
// re-sendable (each send is a new round), so an already-sent one stays selectable
// but starts unticked — a "Select all" then can't silently re-spam them.
const CD_TERMINAL = {
	offer: {
		fetch: "get_offer_candidates",
		act: "create_offers_for_candidates",
		flag: "has_offer",
		lock_flagged: true,
		col: () => __("Offer"),
		flagged_pill: () => __("Offer exists"),
		action_label: () => __("Create Job Offers"),
		confirm: (n) => __("Create Job Offers for {0} candidate(s)?", [n]),
		freeze: () => __("Creating offers…"),
		done: () => __("Job Offers created."),
	},
	pre_offer: {
		fetch: "get_pre_offer_candidates",
		act: "send_pre_offers_for_candidates",
		flag: "pre_offer_sent",
		lock_flagged: false,
		col: () => __("Pre Offer"),
		flagged_pill: () => __("Already sent"),
		action_label: () => __("Send Pre Offer Forms"),
		confirm: (n) => __("Send the Pre Offer form to {0} candidate(s)?", [n]),
		freeze: () => __("Sending pre offer forms…"),
		done: () => __("Pre Offer forms sent."),
	},
};

function cdMountTerminal(frm, hostEl, roundCode, kind) {
	const $host = $(hostEl);
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const cfg = CD_TERMINAL[kind] || CD_TERMINAL.offer;

	frappe.call({
		method: `recruitment.recruitment.doctype.campus_drive.campus_drive.${cfg.fetch}`,
		args: { campus_drive: frm.doc.name, round_code: roundCode },
		callback: (r) => {
			const cands = (r.message || {}).candidates || [];
			if (!cands.length) {
				$host.html(`<div class="cd-empty text-muted">${__(
					"No candidates have reached this stage yet — they’ll appear here once they clear the previous round."
				)}</div>`);
				return;
			}
			const rows = cands
				.map((c) => {
					const flagged = !!c[cfg.flag];
					// An undecided second look outranks everything: the panel is still
					// being asked to judge this candidate, so neither an offer nor a
					// pre-offer may go out. Locked here AND refused server-side.
					const waiting = c.pending_extra_round;
					const locked = waiting || (flagged && cfg.lock_flagged);
					// When the flag carries the document it refers to, the pill opens it.
					// "Offer exists" with no way to reach the offer is a dead end — HR
					// then has to go and find it in the Job Offer list by hand.
					const doc = c.job_offer;
					const flaggedPill = doc
						? `<a class="cd-pill cd-pill-green cd-pill-link" data-offer-doc="${esc(
								doc
						  )}" title="${esc(
								__("Open {0}{1}", [doc, c.job_offer_status ? ` · ${c.job_offer_status}` : ""])
						  )}">${cfg.flagged_pill()} ↗</a>`
						: `<span class="cd-pill cd-pill-green">${cfg.flagged_pill()}</span>`;
					const state = waiting
						? `<span class="cd-pill cd-pill-fail" title="${esc(waiting)}">${__(
								"Additional Round pending"
						  )}</span>`
						: flagged
						? flaggedPill
						: `<span class="cd-pill">${__("Ready")}</span>`;
					return `<tr${waiting ? ' class="cd-row-blocked"' : ""}>
					<td><input type="checkbox" class="cd-offer-pick" data-name="${esc(c.name)}" ${
						locked ? "disabled" : ""
					} ${flagged || waiting ? "" : "checked"}></td>
					<td class="cd-pick-name">${esc(c.applicant_name || c.name)}</td>
					<td class="text-muted">${esc(c.institute || "—")}</td>
					<td class="text-muted">${esc(c.designation || "—")}</td>
					<td>${state}</td>
				</tr>`;
				})
				.join("");
			$host.html(`
				<div class="cd-offer-bar">
					<button class="btn btn-xs btn-default" data-offer-all>${__("Select all")}</button>
					<button class="btn btn-xs btn-default" data-offer-none>${__("Clear")}</button>
					<span class="cd-offer-count"></span>
					<button class="btn btn-xs btn-primary" data-offer-create="${esc(roundCode)}">${
				cfg.action_label()
			}</button>
				</div>
				<div class="cd-table-wrap"><table class="cd-table">
					<thead><tr><th></th><th class="cd-inst-col">${__("Candidate")}</th>
					<th class="cd-inst-col">${__("Institute")}</th><th class="cd-inst-col">${__("Designation")}</th>
					<th>${cfg.col()}</th></tr></thead>
					<tbody>${rows}</tbody>
				</table></div>`);

			const sync = () =>
				$host.find(".cd-offer-count").text(
					__("{0} selected", [$host.find(".cd-offer-pick:checked").length])
				);
			$host.off("click.cdoffer change.cdoffer");
			$host.on("click.cdoffer", "[data-offer-all]", () => {
				$host.find(".cd-offer-pick:not(:disabled)").prop("checked", true);
				sync();
			});
			$host.on("click.cdoffer", "[data-offer-none]", () => {
				$host.find(".cd-offer-pick").prop("checked", false);
				sync();
			});
			$host.on("change.cdoffer", ".cd-offer-pick", sync);
			$host.on("click.cdoffer", "[data-offer-create]", () => {
				const picked = $host.find(".cd-offer-pick:checked").map((_i, el) => $(el).data("name")).get();
				if (!picked.length) {
					frappe.msgprint(__("Select at least one candidate."));
					return;
				}
				frappe.confirm(cfg.confirm(picked.length), () => {
					frappe.dom.freeze(cfg.freeze());
					frappe.call({
						method: `recruitment.recruitment.doctype.campus_drive.campus_drive.${cfg.act}`,
						args: { campus_drive: frm.doc.name, applicants: JSON.stringify(picked) },
						callback: (res) => {
							frappe.dom.unfreeze();
							frappe.show_alert({ message: cfg.done(), indicator: "green" });
							cdMountTerminal(frm, hostEl, roundCode, kind); // refresh the list
						},
						error: () => frappe.dom.unfreeze(),
					});
				});
			});
			sync();
		},
	});
}

// "Assign to Panels": divide the waiting candidates across this round's panels and
// create a standard Interview per candidate with that panel's interviewers. From
// there it's the normal Interview + Interview Feedback flow — the drive only shows
// the status. Reuses cdScheduleRound (date + candidate pick + deals across panels).
function cdAssignPanels(frm, roundCode, done) {
	cdScheduleRound(frm, roundCode, done);
}

// ---------------------------------------------------------------------------
// Assigning by hand.
//
// "Assign to Panels" deals the waiting candidates across the round's interviewers
// automatically. These two are the manual routes to the SAME single-interviewer
// interview, because two different people need one:
//
//   cdAssignManually  — HR chooses the interviewer for each candidate.
//   cdTakeCandidates  — an interviewer takes candidates for themselves. The server
//                       books the session user, never a passed-in name, so this can
//                       only ever pull work the person was already eligible for.
// ---------------------------------------------------------------------------

function cdAssignManually(frm, roundCode, done) {
	frappe.call({
		method:
			"recruitment.recruitment.doctype.campus_drive.campus_drive.get_round_assignment_options",
		args: { campus_drive: frm.doc.name, round_code: roundCode },
		callback: (r) => cdManualDialog(frm, roundCode, r.message || {}, done),
	});
}

function cdManualDialog(frm, roundCode, opts, done) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const candidates = opts.candidates || [];
	const interviewers = opts.interviewers || [];

	if (!candidates.length) {
		frappe.msgprint({
			title: __("Nobody is waiting"),
			indicator: "orange",
			message: __("Every candidate at stage {0} already has an interview on this round.", [
				opts.stage || roundCode,
			]),
		});
		return;
	}
	if (!interviewers.length) {
		frappe.msgprint({
			title: __("No interviewers on this round"),
			indicator: "orange",
			message: __("Add rows to Round Panelists with Round Code {0}, then try again.", [
				`<b>${esc(roundCode)}</b>`,
			]),
		});
		return;
	}

	// One row per waiting candidate, each with its own interviewer picker. Leaving a
	// row blank leaves that candidate waiting — a half-assigned round is normal (30
	// today, the rest tomorrow), so it must not be an error.
	const options =
		`<option value="">${__("— leave waiting —")}</option>` +
		interviewers
			.map(
				(i) =>
					`<option value="${esc(i.user)}">${esc(i.name)} · ${esc(i.panel)}</option>`
			)
			.join("");

	const rows = candidates
		.map(
			(c) => `<tr>
				<td class="cd-gd-cand">${cdAvatar(c.applicant_name || c.name, cdColorFor(c.name))}
					<span>${esc(c.applicant_name || c.name)}</span></td>
				${cdRegionCells(c, esc)}
				<td><select class="cd-input cd-ma-pick" data-ma-applicant="${esc(
					c.name
				)}">${options}</select></td>
			</tr>`
		)
		.join("");

	const d = new frappe.ui.Dialog({
		title: __("Assign candidates — {0}", [roundCode]),
		size: "large",
		fields: [
			{
				fieldname: "scheduled_on",
				label: __("Interview date"),
				fieldtype: "Date",
				reqd: 1,
				default: frappe.datetime.get_today(),
			},
			{
				fieldname: "mode",
				label: __("Mode of Interview"),
				fieldtype: "Select",
				options: opts.modes || ["On-Site", "Online"],
				reqd: 1,
				default: opts.drive_mode || frm.doc.drive_type || "On-Site",
				description: __("Defaults to this drive's Drive Type."),
			},
			{ fieldname: "body", fieldtype: "HTML" },
		],
		primary_action_label: __("Create Interviews"),
		primary_action(v) {
			const picks = {};
			d.fields_dict.body.$wrapper.find(".cd-ma-pick").each(function () {
				const user = $(this).val();
				if (user) picks[$(this).attr("data-ma-applicant")] = user;
			});
			const chosen = Object.keys(picks);
			if (!chosen.length) {
				frappe.msgprint(__("Pick an interviewer for at least one candidate."));
				return;
			}
			d.hide();
			frappe.dom.freeze(__("Creating interviews…"));
			// One call per interviewer: the endpoint books a named person, so the
			// picks are grouped by whoever was chosen.
			const byUser = {};
			chosen.forEach((a) => (byUser[picks[a]] = byUser[picks[a]] || []).push(a));
			const calls = Object.keys(byUser).map((user) =>
				frappe.call({
					method:
						"recruitment.recruitment.doctype.campus_drive.campus_drive.assign_round_interviewer",
					args: {
						campus_drive: frm.doc.name,
						round_code: roundCode,
						interviewer: user,
						applicants: byUser[user],
						scheduled_on: v.scheduled_on,
						mode: v.mode,
					},
				})
			);
			Promise.all(calls)
				.then((res) => {
					frappe.dom.unfreeze();
					const made = res.reduce((n, r) => n + (((r || {}).message || {}).created || 0), 0);
					frappe.show_alert({
						message: __("{0} interview(s) created.", [made]),
						indicator: "green",
					});
					if (done) done();
					frm.reload_doc();
				})
				.catch(() => frappe.dom.unfreeze());
		},
	});

	d.fields_dict.body.$wrapper.html(`
		<div class="cd-ma-hint text-muted">${__(
			"One interviewer per candidate. Leave a row blank to keep that candidate waiting."
		)}</div>
		<table class="table table-sm cd-ma-table">
			<thead><tr>
				<th>${__("Candidate")}</th><th>${__("Applied")}</th><th>${__("Recommended")}</th>
				<th>${__("Requested")}</th><th>${__("Interviewer")}</th>
			</tr></thead>
			<tbody>${rows}</tbody>
		</table>`);
	d.show();
}

function cdTakeCandidates(frm, roundCode, done) {
	frappe.call({
		method:
			"recruitment.recruitment.doctype.campus_drive.campus_drive.get_round_assignment_options",
		args: { campus_drive: frm.doc.name, round_code: roundCode },
		callback: (r) => {
			const opts = r.message || {};
			const me = frappe.session.user;
			const mine = (opts.interviewers || []).find((i) => i.user === me);
			if (!mine) {
				frappe.msgprint({
					title: __("You are not on this round"),
					indicator: "orange",
					message: __("Only interviewers rostered on round {0} can take candidates.", [
						roundCode,
					]),
				});
				return;
			}
			const candidates = opts.candidates || [];
			if (!candidates.length) {
				frappe.msgprint({
					title: __("Nobody is waiting"),
					indicator: "orange",
					message: __("Every candidate at this stage already has an interview."),
				});
				return;
			}
			const d = new frappe.ui.Dialog({
				title: __("Take candidates — {0}", [roundCode]),
				fields: [
					{
						fieldname: "who",
						fieldtype: "HTML",
						options: `<div class="text-muted">${__(
							"They will be booked with you ({0}), one interview each.",
							[frappe.utils.escape_html(mine.name)]
						)}</div>`,
					},
					{
						fieldname: "scheduled_on",
						label: __("Interview date"),
						fieldtype: "Date",
						reqd: 1,
						default: frappe.datetime.get_today(),
					},
					{
						fieldname: "applicants",
						label: __("Candidates"),
						fieldtype: "MultiSelectPills",
						reqd: 1,
						get_data: () =>
							candidates.map((c) => ({
								value: c.name,
								// The region rides along: an interviewer taking candidates
								// is taking them onto their OWN panel, and a candidate
								// moved to another region is not theirs to take.
								description: [
									c.applicant_name || c.name,
									c.requested_region_name
										? __("moved to {0}", [c.requested_region_name])
										: c.applied_region_name,
									c.recommended_region_name
										? __("recommended for {0}", [c.recommended_region_name])
										: "",
								]
									.filter(Boolean)
									.join(" · "),
							})),
					},
				],
				primary_action_label: __("Take them"),
				primary_action(v) {
					const picked = (v.applicants || []).filter(Boolean);
					if (!picked.length) {
						frappe.msgprint(__("Pick at least one candidate."));
						return;
					}
					d.hide();
					frappe.dom.freeze(__("Creating interviews…"));
					frappe.call({
						method:
							"recruitment.recruitment.doctype.campus_drive.campus_drive.claim_round_candidates",
						args: {
							campus_drive: frm.doc.name,
							round_code: roundCode,
							applicants: picked,
							scheduled_on: v.scheduled_on,
						},
						callback: (res) => {
							frappe.dom.unfreeze();
							const m = res.message || {};
							frappe.show_alert({
								message: __("{0} interview(s) created for you.", [m.created || 0]),
								indicator: "green",
							});
							if (done) done();
							frm.reload_doc();
						},
					}).catch(() => frappe.dom.unfreeze());
				},
			});
			d.show();
		},
	});
}

// Panel view: each panel, its interviewers, and its candidates with their live
// INTERVIEW status. No Pass/Fail here — that comes from Interview Feedback.
//
// Panels are dealt evenly but never FINISH evenly: one panelist gets three quick
// candidates and is free while another is still on their first. So each row carries
// a Reassign action that moves that candidate to whoever is free (and can switch the
// interview's mode at the same time). The picker shows each interviewer's live load
// — done vs still pending — which is the whole point: it is how HR spots the panel
// that has run dry. Rows whose feedback is already in are not offered: that feedback
// belongs to the person who gave it.
function cdOpenPanelsDialog(frm, roundCode) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const d = new frappe.ui.Dialog({
		title: __("Panels — {0}", [roundCode]),
		size: "extra-large",
		fields: [{ fieldname: "body", fieldtype: "HTML" }],
	});
	const $body = () => d.fields_dict.body.$wrapper;

	const statusColor = (st) =>
		({ Cleared: "#10B981", Rejected: "#EF4444", "Under Review": "#F59E0B", Pending: "#6B7280" }[st] ||
			"#6B7280");

	// The last payload, so the Reassign dialog can read the roster and the row it is
	// acting on without a second round trip.
	let last = { panels: [] };

	function load() {
		$body().html('<div class="cd-loading text-muted">' + __("Loading…") + "</div>");
		frappe.call({
			method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_round_interviews",
			args: { campus_drive: frm.doc.name, round_code: roundCode },
			callback: (r) => {
				last = r.message || { panels: [] };
				render(last);
			},
		});
	}

	function render(data) {
		const panels = (data.panels || []).filter((p) => p.candidates.length || p.interviewers.length);
		if (!panels.length) {
			$body().html(
				`<div class="cd-empty text-muted">${__(
					"No interviews yet. Close this and click “Assign to Panels”."
				)}</div>`
			);
			return;
		}
		const panelCard = (p) => {
			const who = p.interviewers.length
				? p.interviewers.map((i) => `<span class="cd-pill" title="${esc(i.user)}">${esc(i.name)}</span>`).join("")
				: `<span class="cd-pill cd-pill-fail">${__("no interviewer")}</span>`;
			const rows = p.candidates
				.map((c) => {
					const col = statusColor(c.status);
					const fb = c.feedback_expected
						? `${c.feedback_got}/${c.feedback_expected}`
						: "—";
					const action = c.can_reassign
						? `<button class="btn btn-xs btn-default cd-pv-move" data-pv-move="${esc(
								c.interview
						  )}">${__("Reassign")}</button>`
						: `<span class="text-muted" title="${__(
								"Feedback is in — reassigning would orphan it. Use an Additional Round instead."
						  )}">${__("done")}</span>`;
					return `<tr>
						<td class="cd-gd-cand">${cdAvatar(c.applicant_name || c.job_applicant, cdColorFor(c.job_applicant))}
							<span class="cd-link" data-pv-applicant="${esc(c.job_applicant)}">${esc(
						c.applicant_name || c.job_applicant
					)}</span></td>
						<td class="text-muted">${cdRegionSummary(c, esc)}</td>
						<td class="text-muted">${esc(c.interviewer_name || c.interviewer || "—")}</td>
						<td><span class="cd-badge" style="background:${cdTint(col, 0.15)};color:${col}">${esc(
						c.status
					)}</span></td>
						<td class="text-muted">${esc(c.mode || "—")}</td>
						<td class="text-muted">${__("feedback")}: ${fb}</td>
						<td><span class="cd-link" data-pv-interview="${esc(c.interview)}">${esc(c.interview)}</span></td>
						<td>${action}</td>
					</tr>`;
				})
				.join("");
			return `<div class="cd-card cd-card-accent" style="--cd-accent:${cdColorFor(p.panel)}">
				<div class="cd-card-head">
					<span class="cd-card-title">${esc(p.panel)}
						<span class="cd-pill">${p.candidates.length} ${__("candidates")}</span></span>
					<span class="cd-rd-who">${who}</span>
				</div>
				${p.candidates.length ? `<div class="cd-table-wrap"><table class="cd-table cd-gd-table">
					<thead><tr><th class="cd-inst-col">${__("Candidate")}</th><th>${__("Region")}</th>
					<th>${__("Interviewer")}</th>
					<th>${__("Interview Status")}</th><th>${__("Mode")}</th>
					<th>${__("Feedback")}</th><th>${__("Interview")}</th><th></th></tr></thead>
					<tbody>${rows}</tbody></table></div>`
					: `<div class="cd-empty text-muted">${__("No candidates dealt to this panel yet.")}</div>`}
			</div>`;
		};
		$body().html(
			`<div class="cd-hint text-muted" style="margin-bottom:10px">${__(
				"Interviewers submit feedback on the Interview record; the result and stage move update automatically. Use Reassign to hand a waiting candidate to a panelist who has finished early."
			)}</div>` +
			cdRosterBar(data.roster || []) +
			`<div class="campus-dash">${panels.map(panelCard).join("")}</div>`
		);
	}

	$body().on("click", "[data-pv-applicant]", function () {
		frappe.set_route("Form", "Job Applicant", $(this).attr("data-pv-applicant"));
	});
	$body().on("click", "[data-pv-interview]", function () {
		frappe.set_route("Form", "Interview", $(this).attr("data-pv-interview"));
	});
	$body().on("click", "[data-pv-move]", function () {
		const interview = $(this).attr("data-pv-move");
		const row = (last.panels || [])
			.flatMap((p) => p.candidates || [])
			.find((c) => c.interview === interview);
		cdReassignDialog(frm, roundCode, row || { interview: interview }, last, load);
	});

	cdInjectStyles();
	d.show();
	load();
}

/**
 * A strip of every rostered interviewer with their live load, above the panels.
 *
 * "Who is free right now" is the question the panel view exists to answer during a
 * drive, and counting rows across four panel cards to work it out is exactly the
 * delay this is meant to remove. Sorted by what is still pending, so whoever has
 * run dry is first.
 */
function cdRosterBar(roster) {
	if (!roster.length) return "";
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const sorted = roster.slice().sort((a, b) => a.pending - b.pending || b.done - a.done);
	const pills = sorted
		.map((r) => {
			const free = r.pending === 0;
			return `<span class="cd-pill ${free ? "cd-pill-free" : ""}" title="${esc(r.user)} · ${esc(
				r.panel
			)}">${esc(r.name)} — ${__("{0} pending", [r.pending])} · ${__("{0} done", [r.done])}</span>`;
		})
		.join("");
	return `<div class="cd-roster-bar">
		<span class="cd-meta-label">${__("Interviewer load")}</span>${pills}</div>`;
}

/**
 * Move one candidate's interview to a different interviewer, and/or switch its mode.
 *
 * Deliberately one interview at a time: this is the "panelist just freed up, give
 * them the next one" move, not a bulk re-deal. Bulk re-dealing is what "Assign to
 * Panels" already does for candidates who have no interview yet.
 */
function cdReassignDialog(frm, roundCode, row, data, done) {
	const roster = data.roster || [];
	if (!roster.length) {
		frappe.msgprint({
			title: __("No interviewers on this round"),
			indicator: "orange",
			message: __("Add rows to Round Panelists with Round Code {0}, then try again.", [
				`<b>${frappe.utils.escape_html(roundCode)}</b>`,
			]),
		});
		return;
	}

	// Whoever is free is listed first and their load is in the label, so the choice is
	// made from the dropdown itself rather than by cross-checking the board.
	const sorted = roster.slice().sort((a, b) => a.pending - b.pending || b.done - a.done);
	const options = sorted.map((r) => ({
		value: r.user,
		label: `${r.name} · ${r.panel} — ${__("{0} pending", [r.pending])} · ${__("{0} done", [
			r.done,
		])}`,
	}));

	const d = new frappe.ui.Dialog({
		title: __("Reassign — {0}", [row.applicant_name || row.job_applicant || row.interview]),
		fields: [
			{
				fieldname: "interviewer",
				label: __("Interviewer"),
				fieldtype: "Select",
				options: options,
				reqd: 1,
				default: row.interviewer || options[0].value,
				description: __(
					"Currently with {0}. Panelists with nothing pending have finished their queue.",
					[row.interviewer_name || row.interviewer || __("nobody")]
				),
			},
			{
				fieldname: "mode",
				label: __("Mode of Interview"),
				fieldtype: "Select",
				options: data.modes || ["On-Site", "Online"],
				reqd: 1,
				default: row.mode || data.drive_mode || "On-Site",
				description: __("Switch a single interview without changing the drive."),
			},
		],
		primary_action_label: __("Reassign"),
		primary_action(v) {
			d.hide();
			frappe.call({
				method:
					"recruitment.recruitment.doctype.campus_drive.campus_drive.reassign_round_interview",
				args: {
					campus_drive: frm.doc.name,
					interview: row.interview,
					interviewer: v.interviewer,
					mode: v.mode,
				},
				freeze: true,
				freeze_message: __("Reassigning…"),
				callback: (r) => {
					const m = r.message || {};
					frappe.show_alert({
						message: m.changed
							? __("{0}: {1}", [m.interview, m.detail])
							: __("Nothing changed — already assigned that way."),
						indicator: m.changed ? "green" : "blue",
					});
					if (done) done();
				},
			});
		},
	});
	d.show();
}

// ---------------------------------------------------------------------------
// Group Discussion workspace
//
// One place for HR: set a group size and generate, see every group, click a group
// to open it, and act on each candidate (attendance, result, move, open record).
// Candidate actions persist immediately server-side and never dirty the form.
// ---------------------------------------------------------------------------

const cdGdState = { open: null, panels: {} }; // group drilled into + panels per GD round

function cdGdRounds(frm) {
	return (frm.doc.rounds || []).filter((r) => r.requires_gd_grouping);
}

// The round this workspace belongs to: each GD round card mounts its own, and the
// host carries its round code — so two GD rounds never read each other's groups.
function cdGdRoundOf($root, frm) {
	return $root.attr("data-gd-round") || (cdGdRounds(frm)[0] || {}).round_code;
}

// Panels standing on a GD round (from the round board), and the interviewers on one.
function cdGdPanels(roundCode) {
	return (cdGdState.panels || {})[roundCode] || [];
}
function cdGdPanelWho(roundCode, panelName) {
	const p = cdGdPanels(roundCode).find((x) => x.panel === panelName);
	return p ? p.interviewers.map((i) => i.name) : [];
}

// Mount the GD grouping workspace INTO a host element inside the GD round's card
// (Round Tracking), instead of a separate section. Called after the round board is
// rendered; the host is a fresh element each render, so bindings never duplicate.
function cdMountGd(frm, hostEl) {
	const $host = $(hostEl);
	cdGdBind($host, frm);
	cdGdDraw($host, frm);
}

// --- server helpers ---------------------------------------------------------
function cdGdCall(method, args) {
	return new Promise((resolve, reject) => {
		frappe.call({
			method: `recruitment.recruitment.doctype.campus_drive.campus_drive.${method}`,
			args,
			callback: (r) => resolve(r.message),
			error: reject,
		});
	});
}

function cdGdMemberRow(frm, rowName) {
	return (frm.doc.gd_group_members || []).find((m) => m.name === rowName);
}

// --- events -----------------------------------------------------------------
function cdGdBind($root, frm) {
	const drive = frm.doc.name;

	// open / close a group
	$root.on("click", "[data-gd-open]", function () {
		cdGdState.open = { round: cdGdRoundOf($root, frm), group: $(this).attr("data-gd-open") };
		cdGdDraw($root, frm);
	});
	$root.on("click", "[data-gd-back]", function () {
		cdGdState.open = null;
		cdGdDraw($root, frm);
	});
	$root.on("click", "[data-gd-applicant]", function (e) {
		e.stopPropagation();
		frappe.set_route("Form", "Job Applicant", $(this).attr("data-gd-applicant"));
	});

	// Group NEW candidates (default) — existing groups, finished or not, are left alone.
	// "Regroup" redoes only the groups that have not run; Completed ones are frozen and
	// survive either way, which is what stops a finished GD being run twice.
	$root.on("click", "[data-gd-generate], [data-gd-regroup]", function () {
		const rebuild = $(this).is("[data-gd-regroup]") ? 1 : 0;
		const size = parseInt($root.find("[data-gd-size]").val(), 10);
		const round = cdGdRoundOf($root, frm);
		const splitBy = $root.find("[data-gd-split]").val() || "drive";
		const autoPanel = $root.find("[data-gd-autopanel]").is(":checked") ? 1 : 0;
		if (!size || size < 2) {
			frappe.msgprint(__("Enter a group size of 2 or more."));
			return;
		}
		const go = () => {
			frappe.dom.freeze(rebuild ? __("Regrouping…") : __("Building groups…"));
			cdGdCall("generate_gd_groups", {
				campus_drive: drive,
				round_code: round,
				group_size: size,
				split_by: splitBy,
				rebuild: rebuild,
				assign_panels: autoPanel,
			})
				.then((m) => {
					frappe.dom.unfreeze();
					if (!m) return;
					cdGdState.open = null;
					const parts = [
						__("{0} group(s) created for {1} candidate(s).", [m.groups, m.candidates]),
					];
					if (m.frozen_groups)
						parts.push(__("{0} completed group(s) left untouched.", [m.frozen_groups]));
					if (m.already_grouped)
						parts.push(__("{0} candidate(s) were already grouped.", [m.already_grouped]));
					parts.push(
						m.panels_assigned
							? __("Panels assigned automatically.")
							: __("No panels assigned — set them on each group.")
					);
					frappe.show_alert({ message: parts.join(" "), indicator: "green" });
					frm.reload_doc();
				})
				.catch(() => frappe.dom.unfreeze());
		};
		// Only a Regroup needs confirming — it rebuilds groups that have not run.
		// Grouping new candidates adds to the round and changes nothing existing, so
		// asking about it every time trains people to click through the dialog.
		const existing = (frm.doc.gd_groups || []).filter((g) => g.round_code === round);
		if (rebuild && existing.length) {
			const frozen = existing.filter((g) => g.group_status === "Completed").length;
			frappe.confirm(
				__("This rebuilds the {0} group(s) on round {1} that have not run yet.", [
					existing.length - frozen,
					round,
				]) +
					(frozen
						? " " +
						  __("{0} completed group(s) and their candidates are not touched.", [frozen])
						: ""),
				go
			);
		} else {
			go();
		}
	});

	// (re-)deal this round's panels across its groups
	$root.on("click", "[data-gd-panels]", function () {
		frappe.dom.freeze(__("Assigning panels…"));
		cdGdCall("assign_gd_panels", { campus_drive: drive, round_code: cdGdRoundOf($root, frm) })
			.then((m) => {
				frappe.dom.unfreeze();
				if (!m) return;
				frappe.show_alert({
					message: __("{0} panel(s) dealt across {1} group(s).", [m.panels, m.groups]),
					indicator: "green",
				});
				frm.reload_doc();
			})
			.catch(() => frappe.dom.unfreeze());
	});

	// hand one group to a different panel
	$root.on("change", "[data-gd-panel]", function () {
		const g = cdGdOpenGroup($root, frm);
		if (!g) return;
		const panel = $(this).val();
		cdGdCall("set_gd_group_panel", {
			campus_drive: drive,
			round_code: g.round_code,
			group_name: g.group_name,
			panel,
		}).then(() => {
			g.panel_name = panel || null;
			cdGdDraw($root, frm);
		});
	});

	// push GD outcomes into the hiring workflow
	$root.on("click", "[data-gd-push]", function () {
		const round = cdGdRoundOf($root, frm);
		const members = (frm.doc.gd_group_members || []).filter((m) => m.round_code === round);
		const done = cdGdGroupProgress(members);

		// Groups finish at different times, so a finished one goes on to the next round
		// without waiting for the hall: only the unmarked groups are held back. Nobody
		// is ever failed for an unticked box — they simply stay put.
		if (!done.ready.length) {
			frappe.msgprint({
				title: __("Mark a group first"),
				indicator: "orange",
				message:
					__("No group is fully marked yet. A group moves on once every candidate in it is Pass or Fail — you can push each group as it finishes.") +
					"<br><br>" + done.pendingHtml,
			});
			return;
		}

		const all = !done.pending.length;
		const scope = all
			? __("Move {0} Pass candidate(s) into the next round and reject {1}?", [done.pass, done.fail])
			: __("{0} of {1} groups are fully marked. Push those now — {2} advance, {3} rejected?", [
					done.ready.length, done.ready.length + done.pending.length, done.pass, done.fail,
			  ]) + "<br><br>" + __("Still being marked, left untouched:") + "<br>" + done.pendingHtml;

		frappe.confirm(scope, () =>
			cdGdPush(frm, round, all ? null : done.ready)
		);
	});

	// Push ONE finished group from inside it.
	$root.on("click", "[data-gd-push-group]", function () {
		const g = cdGdOpenGroup($root, frm);
		if (!g) return;
		const members = (frm.doc.gd_group_members || []).filter(
			(m) => m.round_code === g.round_code && m.group_name === g.group_name
		);
		const unmarked = members.filter((m) => m.result !== "Pass" && m.result !== "Fail");
		if (unmarked.length) {
			frappe.msgprint({
				title: __("Mark every candidate first"),
				indicator: "orange",
				message: __("{0} candidate(s) in {1} have no GD result yet. Mark them Pass or Fail and this group can go on to the next round.", [
					unmarked.length, frappe.utils.escape_html(g.group_name),
				]),
			});
			return;
		}
		const pass = members.filter((m) => m.result === "Pass").length;
		frappe.confirm(
			__("Move {0} Pass candidate(s) from {1} into the next round and reject {2}?", [
				pass, frappe.utils.escape_html(g.group_name), members.length - pass,
			]),
			() => cdGdPush(frm, g.round_code, [g.group_name])
		);
	});

	// per-candidate attendance / result
	$root.on("click", "[data-gd-set]", function () {
		const el = $(this);
		const rowName = el.attr("data-gd-row");
		const field = el.attr("data-gd-set");
		let value = el.attr("data-gd-value");
		const row = cdGdMemberRow(frm, rowName);
		if (!row) return;
		// Clicking the already-selected chip again clears it back to "Pending"
		// (the neutral / none state) so a mistaken Pass/Fail or Present/Absent
		// can be undone — otherwise there was no way to deselect.
		if (row[field] === value) value = "Pending";
		cdGdCall("set_gd_member_field", {
			campus_drive: drive,
			row_name: rowName,
			field,
			value,
		}).then(() => {
			row[field] = value; // keep local doc in step; parent stays un-dirtied
			cdGdDraw($root, frm);
		});
	});

	// bulk attendance for the open group
	$root.on("click", "[data-gd-bulk]", function () {
		const value = $(this).attr("data-gd-bulk");
		const g = cdGdOpenGroup($root, frm);
		if (!g) return;
		cdGdCall("bulk_gd_attendance", {
			campus_drive: drive,
			round_code: g.round_code,
			group_name: g.group_name,
			value,
		}).then(() => {
			(frm.doc.gd_group_members || [])
				.filter((m) => m.round_code === g.round_code && m.group_name === g.group_name)
				.forEach((m) => (m.attendance = value));
			cdGdDraw($root, frm);
		});
	});

	// group status
	$root.on("change", "[data-gd-status]", function () {
		const g = cdGdOpenGroup($root, frm);
		if (!g) return;
		const status = $(this).val();
		cdGdCall("set_gd_group_status", {
			campus_drive: drive,
			round_code: g.round_code,
			group_name: g.group_name,
			status,
		}).then(() => {
			g.group_status = status;
			cdGdDraw($root, frm);
		});
	});

	// move a candidate to another group
	$root.on("change", "[data-gd-move]", function () {
		const rowName = $(this).attr("data-gd-move");
		const target = $(this).val();
		const row = cdGdMemberRow(frm, rowName);
		if (!row || !target || target === row.group_name) return;
		cdGdCall("move_gd_member", {
			campus_drive: drive,
			row_name: rowName,
			target_group: target,
		}).then((m) => {
			if (m && m.moved) {
				row.group_name = target;
				frappe.show_alert({ message: __("Moved to {0}", [target]), indicator: "blue" });
			}
			frm.reload_doc(); // counts changed on two groups
		});
	});
}

// Interviewer names on one panel of a round, from the board payload.
function cdRoundPanelWho(round, panelName) {
	const p = (round.panels || []).find((x) => x.panel === panelName);
	return p ? p.interviewers.map((i) => i.name) : [];
}

// Readable name for an Institute id, from the drive's own participating institutes
// (which carry the fetched name) — so groups read "St. Xavier's", not "INST-0668".
function cdInstituteName(frm, institute) {
	if (!institute) return "";
	const row = (frm.doc.participating_institutes || []).find((r) => r.institute === institute);
	return (row && row.institute_name) || institute;
}

// Readable title for a Job Opening id, from the drive's own linked openings.
function cdRoleTitle(frm, opening) {
	if (!opening) return __("Unassigned");
	const row = (frm.doc.linked_job_openings || []).find((r) => r.job_opening === opening);
	return (row && row.job_title) || opening;
}

// Which groups of a round are finished and which are still being marked, plus the
// verdict tallies of the finished ones — what the push offers to move.
function cdGdGroupProgress(members) {
	const byGroup = {};
	members.forEach((m) => {
		const g = (byGroup[m.group_name] = byGroup[m.group_name] || { pass: 0, fail: 0, open: 0 });
		if (m.result === "Pass") g.pass++;
		else if (m.result === "Fail") g.fail++;
		else g.open++;
	});
	const out = { ready: [], pending: [], pass: 0, fail: 0, pendingHtml: "" };
	Object.keys(byGroup).forEach((name) => {
		const g = byGroup[name];
		if (g.open) {
			out.pending.push({ name, open: g.open });
		} else {
			out.ready.push(name);
			out.pass += g.pass;
			out.fail += g.fail;
		}
	});
	out.pendingHtml = out.pending
		.map((p) => __("{0} — {1} still to mark", [frappe.utils.escape_html(p.name), p.open]))
		.join("<br>");
	return out;
}

// Send results to the pipeline: the whole round (groups = null) or named groups.
function cdGdPush(frm, round, groups) {
	frappe.dom.freeze(__("Updating candidates…"));
	cdGdCall("apply_gd_results", {
		campus_drive: frm.doc.name,
		round_code: round,
		groups: groups ? JSON.stringify(groups) : null,
	})
		.then((m) => {
			frappe.dom.unfreeze();
			if (!m) return;
			frappe.msgprint({
				title: __("GD results pushed"),
				indicator: "green",
				message:
					__("Advanced: {0} &nbsp;·&nbsp; Rejected: {1}", [m.advanced, m.rejected]) +
					(groups ? "<br>" + __("Pushed: {0}", [groups.join(", ")]) : "") +
					(m.gd_stage ? "<br>" + __("Passers moved to the stage after “{0}”.", [m.gd_stage]) : ""),
			});
			frm.reload_doc();
		})
		.catch(() => frappe.dom.unfreeze());
}

// The group drilled into, in THIS workspace's round — group names repeat across
// rounds, so both halves have to match.
function cdGdOpenGroup($root, frm) {
	const open = cdGdState.open;
	const round = cdGdRoundOf($root, frm);
	if (!open || open.round !== round) return null;
	return (frm.doc.gd_groups || []).find(
		(g) => g.round_code === round && g.group_name === open.group
	);
}

// --- drawing ----------------------------------------------------------------
function cdGdDraw($root, frm) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const rounds = cdGdRounds(frm);
	// This card owns ONE GD round, so everything below is that round's own.
	const roundCode = cdGdRoundOf($root, frm);
	const round = rounds.find((r) => r.round_code === roundCode) || {};
	const groups = (frm.doc.gd_groups || []).filter((g) => g.round_code === roundCode);
	const members = (frm.doc.gd_group_members || []).filter((m) => m.round_code === roundCode);

	// --- header: split + size + generate ---
	const defaultSize = round.gd_group_size || 5;
	// Existing groups tell us how they were built: the split's dimensions are stamped
	// on the group row (role and/or institute), so the picker reopens on that mode.
	const hadRole = groups.some((g) => g.job_opening);
	const hadInst = groups.some((g) => g.institute);
	const wasSplit = groups.length
		? (hadInst ? (hadRole ? "institute_role" : "institute") : hadRole ? "role" : "drive")
		: "drive";
	const splitOpt = (value, label) =>
		`<option value="${value}" ${wasSplit === value ? "selected" : ""}>${label}</option>`;
	const header = `<div class="cd-toolbar">
		<div class="cd-toolbar-title">${__("Group Discussion")}
			<span class="cd-hint text-muted">${
				groups.length
					? __("{0} groups · {1} candidates", [groups.length, members.length])
					: __("no groups yet")
			}</span>
		</div>
		<div class="cd-gd-create">
			<select class="cd-input" data-gd-split title="${__("Who goes into a group together")}">
				${splitOpt("drive", __("All drive candidates (mix roles)"))}
				${splitOpt("role", __("Separate per role"))}
				${splitOpt("institute", __("Separate per institute (mix roles)"))}
				${splitOpt("institute_role", __("Separate per institute + role"))}
			</select>
			<label class="cd-gd-lbl">${__("Group size")}</label>
			<input type="number" min="2" class="cd-input cd-input-num" data-gd-size value="${defaultSize}">
			<label class="cd-gd-lbl cd-gd-check" title="${__(
				"Off: groups are created without a panel, for you to assign by hand afterwards"
			)}">
				<input type="checkbox" data-gd-autopanel checked> ${__("Auto-assign panels")}
			</label>
			<button class="btn btn-primary btn-sm" data-gd-generate title="${
				groups.length
					? __("Group the candidates who are not in a group yet. Existing groups are left alone.")
					: __("Build the groups for this round")
			}">${groups.length ? __("Group New Candidates") : __("Create Groups")}</button>
			${
				groups.length
					? `<button class="btn btn-sm btn-default" data-gd-regroup title="${__(
							"Redo the groups that have not run yet. Completed groups are never touched."
					  )}">${__("Regroup")}</button>
					<button class="btn btn-sm btn-default" data-gd-panels title="${__(
							"Deal this round's panels across the groups again"
					  )}">${__("Assign Panels")}</button>
					<button class="btn btn-sm btn-default" data-gd-push title="${__(
							"Move everyone marked Pass into the next round; Fail becomes Rejected"
					  )}">${__("Push GD Results →")}</button>`
					: ""
			}
		</div>
	</div>`;

	if (!rounds.length) {
		$root.html(
			header +
				`<div class="cd-empty text-muted">${__(
					"Add a round of type “Group Discussion” on the Rounds table first."
				)}</div>`
		);
		return;
	}
	// Panels are what tell interviewers which GD they take, so say so when the round
	// has none — the same nudge the interview rounds give.
	const noPanels = cdGdPanels(roundCode).length
		? ""
		: `<div class="cd-rd-warn">${__(
				"No panel set up for this GD round yet — add Round Panelists (this round + panel name + interviewers), then click Assign Panels so every group knows who conducts it."
		  )}</div>`;

	if (!groups.length) {
		$root.html(
			header +
				noPanels +
				`<div class="cd-empty text-muted">${__(
					"No groups yet. Pick how to split them and a group size above, then click Create Groups — candidates are taken from the Shortlisted pool and each round's panels are dealt across the groups."
				)}</div>`
		);
		return;
	}

	// colour per institute so mixing is visible everywhere
	const institutes = Array.from(new Set(members.map((m) => m.institute).filter(Boolean))).sort();
	const instColor = {};
	institutes.forEach((i, idx) => (instColor[i] = CD_FALLBACK[idx % CD_FALLBACK.length]));

	const open = cdGdOpenGroup($root, frm);
	$root.html(
		header +
			noPanels +
			(open
				? cdGdDetail(frm, open, groups, members, instColor, esc)
				: cdGdList(frm, groups, members, instColor, esc))
	);
}

function cdGdList(frm, allGroups, members, instColor, esc) {
	return gdbList(cdGdCtx(frm), allGroups, members, instColor);
}

// The adapter the shared board reads a Campus Drive through: readable names for the
// ids on a group row, and who conducts each group.
function cdGdCtx(frm) {
	return {
		esc: (v) => frappe.utils.escape_html(String(v == null ? "" : v)),
		roleTitle: (opening) => cdRoleTitle(frm, opening),
		instituteName: (institute) => cdInstituteName(frm, institute),
		panelWho: (g) => (g.panel_name ? cdGdPanelWho(g.round_code, g.panel_name) : []),
		// "Group 3 - MP hiring" is stored, but you are already looking at MP hiring:
		// drop the drive half so the card title is the group and nothing else. Only
		// the LABEL is trimmed — every data-gd-* attribute still carries the full
		// stored name, which is the key the server joins on.
		groupLabel: (g) => cdGdShortName(g.group_name, frm.doc.drive_name),
	};
}

// "Group 3 - MP hiring" -> "Group 3", but only when the tail really is this drive's
// name. A group named something else by hand is left exactly as it is.
function cdGdShortName(groupName, driveName) {
	const name = String(groupName || "");
	const tail = " - " + String(driveName || "");
	return driveName && name.endsWith(tail) ? name.slice(0, -tail.length) : name;
}

function cdGdDetail(frm, g, allGroups, allMembers, instColor, esc) {
	const members = allMembers.filter((m) => m.group_name === g.group_name);
	// groups the candidate may be moved into: whatever this round was split by has to
	// match, so a per-institute split never mixes colleges by a stray move.
	const siblings = allGroups.filter(
		(x) =>
			(x.job_opening || "") === (g.job_opening || "") &&
			(x.institute || "") === (g.institute || "")
	);
	// A completed group is history — its results are pushed and its candidates have
	// moved on. Show its marks read-only rather than as buttons the server would only
	// refuse (`_assert_group_open`).
	const frozen = g.group_status === "Completed";

	const statusControl = `<select class="cd-input" data-gd-status>${[
		"Planned",
		"Scheduled",
		"In Progress",
		"Completed",
	]
		.map(
			(st) =>
				`<option value="${esc(st)}" ${(g.group_status || "Planned") === st ? "selected" : ""}>${esc(
					st
				)}</option>`
		)
		.join("")}</select>`;

	// Who takes this GD: any panel standing on the round, changeable per group.
	const panelOpts = [`<option value="">${__("No panel")}</option>`]
		.concat(
			cdGdPanels(g.round_code).map(
				(pnl) =>
					`<option value="${esc(pnl.panel)}" ${pnl.panel === g.panel_name ? "selected" : ""}>${esc(
						pnl.panel
					)}${
						pnl.interviewers.length
							? " — " + esc(pnl.interviewers.map((i) => i.name).join(", "))
							: ""
					}</option>`
			)
		)
		.join("");

	// A panel the roster no longer has (renamed / removed) would otherwise vanish
	// silently from the picker, leaving the group looking unassigned.
	const staleP =
		g.panel_name && !cdGdPanels(g.round_code).some((pnl) => pnl.panel === g.panel_name)
			? `<option value="${esc(g.panel_name)}" selected>${esc(g.panel_name)} — ${__(
					"not on the roster"
			  )}</option>`
			: "";

	const panelControl = `<label class="cd-gd-lbl">${__("Panel")}</label>
		<select class="cd-input" data-gd-panel title="${__(
			"Interviewers who conduct this group's GD"
		)}">${staleP}${panelOpts}</select>`;

	return gdbDetail(cdGdCtx(frm), g, members, {
		instColor,
		siblings,
		panelControl,
		statusControl,
		canMark: !frozen,
		// HR can open the candidate; a panel member (on the Group Discussion) cannot,
		// and would only get a permission error for their trouble.
		applicantLinks: true,
		back: true,
		pushLabel: __("Push this group →"),
	});
}

// ---------------------------------------------------------------------------
// Drive candidates — merged per role, with a By-Institute toggle
// ---------------------------------------------------------------------------

function cdRenderCandidates(frm) {
	const field = frm.fields_dict.institute_candidates_html;
	if (!field) return;
	const $wrap = $(field.wrapper).empty();
	cdInjectStyles();

	const $root = $('<div class="campus-dash"></div>').appendTo($wrap);

	if (frm.is_new()) {
		$root.html(
			`<div class="cd-empty text-muted">${__("Save the drive to see candidate counts.")}</div>`
		);
		return;
	}

	// View mode is remembered per form session; merged is the drive-level default.
	let mode = $root.data("cd-mode") || "merged";
	let data = null;

	$root.on("click", "[data-cd-view]", function () {
		const next = $(this).attr("data-cd-view");
		if (next === mode) return;
		mode = next;
		$root.data("cd-mode", mode);
		draw();
	});

	$root.on("click", "[data-cd-action]", function () {
		const el = $(this);
		const action = el.attr("data-cd-action");
		const opening = el.attr("data-opening");
		const institute = el.attr("data-institute");
		const status = el.attr("data-status");
		if (action === "opening") return frappe.set_route("Form", "Job Opening", opening);
		if (action === "institute") return frappe.set_route("Form", "Institute", institute);
		if (action === "list") {
			const filters = {};
			const invites = (data && data.invites) || [];
			// Merged view spans every invite on the drive.
			if (invites.length === 1) filters.custom_campus_invite = invites[0];
			else if (invites.length > 1) filters.custom_campus_invite = ["in", invites];
			if (opening) filters.job_title = opening;
			if (institute) filters.custom_institute = institute;
			if (status) filters.status = status;
			frappe.set_route("List", "Job Applicant", filters);
		}
	});

	$root.html('<div class="cd-loading text-muted">' + __("Loading…") + "</div>");
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_drive_breakdown",
		args: { campus_drive: frm.doc.name },
		callback: (r) => {
			data = r.message || { statuses: [], invites: [], openings: [], summary: {} };
			draw();
		},
	});

	function draw() {
		cdDraw($root, data, mode);
	}
}

function cdDraw($root, data, mode) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const statuses = data.statuses || [];
	const openings = data.openings || [];
	const s = data.summary || {};
	const byStatus = s.by_status || {};

	const stat = (label, val, cls) =>
		`<div class="cd-stat cd-stat-${cls}"><div class="cd-stat-val">${
			val || 0
		}</div><div class="cd-stat-label">${esc(label)}</div></div>`;

	// A status tile, scoped to (optional) opening + institute.
	const statusTile = (st, count, opening, institute) => {
		const color = cdStatusColor(st);
		const attrs =
			`data-cd-action="list" data-status="${esc(st)}"` +
			(opening ? ` data-opening="${esc(opening)}"` : "") +
			(institute ? ` data-institute="${esc(institute)}"` : "");
		return `<div class="cd-tile" ${attrs} title="${__("View candidates")}"
			style="background:${cdTint(color, 0.13)};color:${color}">
			<div class="cd-tile-val">${count || 0}</div>
			<div class="cd-tile-lbl">${esc(st)}</div>
		</div>`;
	};

	const toolbar = `<div class="cd-toolbar">
		<div class="cd-toolbar-title">${__("Drive Candidates")}
			<span class="cd-hint text-muted">${
				mode === "merged"
					? __("merged across all invites & institutes")
					: __("split by institute")
			}</span>
		</div>
		<div class="cd-seg">
			<button type="button" class="cd-seg-btn ${mode === "merged" ? "active" : ""}"
				data-cd-view="merged">${__("Merged")}</button>
			<button type="button" class="cd-seg-btn ${mode === "institute" ? "active" : ""}"
				data-cd-view="institute">${__("By Institute")}</button>
		</div>
	</div>`;

	if (!openings.length) {
		$root.html(
			toolbar +
				`<div class="cd-empty text-muted">${__(
					"No campus invites (or openings) selected on this drive yet."
				)}</div>`
		);
		return;
	}

	const summary = `<div class="cd-summary">
		${stat(__("Campus Invites"), s.invites, "inv")}
		${stat(__("Institutes"), s.institutes, "ins")}
		${stat(__("Roles / Openings"), s.openings, "op")}
		${stat(__("Total Candidates"), s.total, "tot")}
	</div>`;

	// Drive-wide status strip (every status, across all roles)
	const driveStrip = `<div class="cd-card cd-drive-strip">
		<div class="cd-card-head"><span class="cd-card-title">${__("All Candidates by Status")}</span>
			<span class="cd-chip cd-chip-tot">${s.total || 0} ${__("total")}</span></div>
		<div class="cd-tiles">${statuses
			.map((st) => statusTile(st, byStatus[st], null, null))
			.join("")}</div>
	</div>`;

	const roleCard = (op) => {
		const accent = cdColorFor(op.job_opening);
		const head = `<div class="cd-card-head">
			<span class="cd-card-title cd-link" data-cd-action="opening" data-opening="${esc(
				op.job_opening
			)}" title="${__("Open job opening")}">
				<span class="cd-role-dot" style="background:${accent}"></span>${esc(op.job_title)}</span>
			<span class="cd-chip cd-chip-tot" data-cd-action="list" data-opening="${esc(
				op.job_opening
			)}" title="${__("View all candidates")}"
				style="background:${cdTint(accent, 0.14)};color:${accent}">${op.total || 0} ${__(
			"candidates"
		)}</span>
		</div>`;

		if (mode === "merged") {
			return `<div class="cd-card cd-card-accent" style="--cd-accent:${accent}">${head}
				<div class="cd-tiles">${statuses
					.map((st) => statusTile(st, (op.by_status || {})[st], op.job_opening, null))
					.join("")}</div>
			</div>`;
		}

		// By-institute: a compact matrix of institute x status
		const rows = (op.institutes || [])
			.map((it) => {
				const cells = statuses
					.map((st) => {
						const n = (it.by_status || {})[st] || 0;
						const color = cdStatusColor(st);
						return `<td class="cd-num ${n ? "cd-num-on" : ""}" data-cd-action="list"
							data-opening="${esc(op.job_opening)}" data-institute="${esc(it.institute)}"
							data-status="${esc(st)}" ${n ? `style="color:${color}"` : ""}>${n}</td>`;
					})
					.join("");
				const ic = cdColorFor(it.institute);
				return `<tr>
					<td class="cd-inst-cell"><span class="cd-link" data-cd-action="institute"
						data-institute="${esc(it.institute)}" title="${__("Open institute")}">
						${cdAvatar(it.institute_name, ic)}${esc(it.institute_name)}</span></td>
					${cells}
					<td class="cd-num cd-num-total" data-cd-action="list"
						data-opening="${esc(op.job_opening)}" data-institute="${esc(
					it.institute
				)}">${it.total || 0}</td>
				</tr>`;
			})
			.join("");

		const header = statuses.map((st) => `<th>${esc(st)}</th>`).join("");
		const body =
			rows ||
			`<tr><td colspan="${statuses.length + 2}" class="text-muted cd-empty-row">${__(
				"No institutes on this role."
			)}</td></tr>`;
		return `<div class="cd-card cd-card-accent" style="--cd-accent:${accent}">${head}
			<div class="cd-table-wrap">
				<table class="cd-table">
					<thead><tr><th class="cd-inst-col">${__("Institute")}</th>${header}<th>${__(
			"Total"
		)}</th></tr></thead>
					<tbody>${body}</tbody>
				</table>
			</div>
		</div>`;
	};

	$root.html(toolbar + summary + driveStrip + openings.map(roleCard).join(""));
}
