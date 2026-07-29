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

const CD_STATUS_COLORS = {
	Draft: "#6B7280",
	Open: "#0EA5E9",
	Shortlisted: "#3B82F6",
	Interview: "#8B5CF6",
	Hold: "#F59E0B",
	Approvals: "#F97316",
	Accepted: "#10B981",
	Rejected: "#EF4444",
};
const CD_FALLBACK = ["#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#0EA5E9", "#84CC16", "#EAB308"];

function cdHash(s) {
	let h = 0;
	for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
	return h;
}
function cdStatusColor(s) {
	if (!s) return "#9CA3AF";
	return CD_STATUS_COLORS[s] || CD_FALLBACK[cdHash(s) % CD_FALLBACK.length];
}
function cdTint(hex, alpha) {
	const h = String(hex).replace("#", "");
	const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
// A stable colour for any label (role, group, institute) so the same thing is
// always the same colour across every panel.
function cdColorFor(key) {
	return CD_FALLBACK[cdHash(String(key || "")) % CD_FALLBACK.length];
}
function cdInitials(name) {
	const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return "?";
	return ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).toUpperCase();
}
function cdAvatar(name, color) {
	return `<span class="cd-avatar" style="background:${cdTint(color, 0.18)};color:${color}">${frappe.utils.escape_html(
		cdInitials(name)
	)}</span>`;
}

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

	// Institutes normally arrive from the invites; if one is added by hand, at least
	// keep it to colleges that are still active.
	frm.set_query("institute", "participating_institutes", () => ({
		filters: { is_active: 1 },
	}));
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
	// Assign candidates across panels -> creates their Interview records
	$root.on("click", "[data-rd-assign]", function () {
		cdAssignPanels(frm, $(this).attr("data-rd-assign"), () => cdRenderRounds(frm));
	});
	// Read-only view of the panels and each candidate's interview status
	$root.on("click", "[data-rd-open]", function () {
		cdOpenPanelsDialog(frm, $(this).attr("data-rd-open"));
	});
	// "⋯" — per-candidate extra interview + feedback nudge
	$root.on("click", "[data-rd-more]", function () {
		const code = $(this).attr("data-rd-more");
		const r = (cdRoundsData.rounds || []).find((x) => x.round_code === code) || {};
		const items = [
			{ label: __("Add extra interview for one candidate"), action: () => cdAddCandidateInterview(frm, code, () => cdRenderRounds(frm)) },
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
						<th class="cd-inst-col">${__("Institute")}</th><th class="cd-inst-col">${__("Role")}</th></tr></thead>
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
					applicants: JSON.stringify(picked),
				},
				callback: (r) => {
					frappe.dom.unfreeze();
					const m = r.message;
					if (!m) return;
					// A skip means those candidates have NO panel for their role — surface
					// it loudly, otherwise HR assumes everyone got scheduled.
					if (m.skipped_count) {
						frappe.msgprint({
							title: __("{0} scheduled, {1} skipped", [m.created, m.skipped_count]),
							indicator: "orange",
							message:
								__("These candidates have no panel covering their role. Add a panel for their position (or one panel with no role, which covers everyone) and schedule again.") +
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

// Add an EXTRA interview for a single candidate (a round beyond the standard
// pipeline) without touching the opening's workflow for everyone else.
function cdAddCandidateInterview(frm, roundCode, done) {
	const stages = (cdRoundsData.stage_options || []).join("\n");
	const d = new frappe.ui.Dialog({
		title: __("Extra Interview for One Candidate"),
		fields: [
			{
				fieldname: "job_applicant", label: __("Candidate"), fieldtype: "Link",
				options: "Job Applicant", reqd: 1,
				get_query: () => ({
					filters: { custom_campus_invite: ["in", cdRoundsData.invites || []] },
				}),
			},
			{
				fieldname: "stage_name", label: __("Round / Stage"), fieldtype: stages ? "Select" : "Data",
				options: stages || undefined, reqd: 1,
				description: __("Adds one more interview for this candidate only."),
			},
			{ fieldname: "scheduled_on", label: __("Date"), fieldtype: "Date", reqd: 1,
			  default: frappe.datetime.get_today() },
		],
		primary_action_label: __("Create Interview"),
		primary_action(v) {
			d.hide();
			frappe.call({
				method: "recruitment.recruitment.doctype.campus_drive.campus_drive.add_candidate_interview",
				args: {
					campus_drive: frm.doc.name, round_code: roundCode,
					job_applicant: v.job_applicant, stage_name: v.stage_name,
					scheduled_on: v.scheduled_on,
				},
				callback: (r) => {
					if (!r.message) return;
					frappe.show_alert({
						message: __("Interview {0} created ({1} interviewer(s)).", [
							r.message.interview, r.message.interviewers,
						]),
						indicator: "green",
					});
					if (done) done();
				},
			});
		},
	});
	d.show();
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
			${noStage}${warn}
			<div class="cd-rd-meta">
				<span class="cd-pill">${__("Stage")}: ${esc(r.hiring_stage || "—")}</span>
				${r.scheduled_at ? `<span class="cd-pill">${esc(r.scheduled_at)}</span>` : ""}
				<span class="cd-pill">${esc(r.round_status || "")}</span>
			</div>
			${body}
		</div>`;
	};

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

	// Mount the GD grouping workspace inside each GD round's card.
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
					const locked = flagged && cfg.lock_flagged;
					return `<tr>
					<td><input type="checkbox" class="cd-offer-pick" data-name="${esc(c.name)}" ${
						locked ? "disabled" : ""
					} ${flagged ? "" : "checked"}></td>
					<td class="cd-pick-name">${esc(c.applicant_name || c.name)}</td>
					<td class="text-muted">${esc(c.institute || "—")}</td>
					<td class="text-muted">${esc(c.designation || "—")}</td>
					<td>${
						flagged
							? `<span class="cd-pill cd-pill-green">${cfg.flagged_pill()}</span>`
							: `<span class="cd-pill">${__("Ready")}</span>`
					}</td>
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

// Read-only panel view: each panel, its interviewers, and its candidates with their
// live INTERVIEW status. No Pass/Fail here — that comes from Interview Feedback.
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

	function load() {
		$body().html('<div class="cd-loading text-muted">' + __("Loading…") + "</div>");
		frappe.call({
			method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_round_interviews",
			args: { campus_drive: frm.doc.name, round_code: roundCode },
			callback: (r) => render(r.message || { panels: [] }),
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
					return `<tr>
						<td class="cd-gd-cand">${cdAvatar(c.applicant_name || c.job_applicant, cdColorFor(c.job_applicant))}
							<span class="cd-link" data-pv-applicant="${esc(c.job_applicant)}">${esc(
						c.applicant_name || c.job_applicant
					)}</span></td>
						<td><span class="cd-badge" style="background:${cdTint(col, 0.15)};color:${col}">${esc(
						c.status
					)}</span></td>
						<td class="text-muted">${__("feedback")}: ${fb}</td>
						<td><span class="cd-link" data-pv-interview="${esc(c.interview)}">${esc(c.interview)}</span></td>
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
					<thead><tr><th class="cd-inst-col">${__("Candidate")}</th><th>${__("Interview Status")}</th>
					<th>${__("Feedback")}</th><th>${__("Interview")}</th></tr></thead>
					<tbody>${rows}</tbody></table></div>`
					: `<div class="cd-empty text-muted">${__("No candidates dealt to this panel yet.")}</div>`}
			</div>`;
		};
		$body().html(
			`<div class="cd-hint text-muted" style="margin-bottom:10px">${__(
				"Interviewers submit feedback on the Interview record; the result and stage move update automatically. This view is read-only."
			)}</div>` +
			`<div class="campus-dash">${panels.map(panelCard).join("")}</div>`
		);
	}

	$body().on("click", "[data-pv-applicant]", function () {
		frappe.set_route("Form", "Job Applicant", $(this).attr("data-pv-applicant"));
	});
	$body().on("click", "[data-pv-interview]", function () {
		frappe.set_route("Form", "Interview", $(this).attr("data-pv-interview"));
	});

	cdInjectStyles();
	d.show();
	load();
}

// ---------------------------------------------------------------------------
// Group Discussion workspace
//
// One place for HR: set a group size and generate, see every group, click a group
// to open it, and act on each candidate (attendance, result, move, open record).
// Candidate actions persist immediately server-side and never dirty the form.
// ---------------------------------------------------------------------------

const cdGdState = { open: null }; // group currently drilled into

function cdGdRounds(frm) {
	return (frm.doc.rounds || []).filter((r) => r.requires_gd_grouping);
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
		cdGdState.open = $(this).attr("data-gd-open");
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

	// generate groups
	$root.on("click", "[data-gd-generate]", function () {
		const size = parseInt($root.find("[data-gd-size]").val(), 10);
		const round = $root.find("[data-gd-round]").val() || (cdGdRounds(frm)[0] || {}).round_code;
		const splitBy = $root.find("[data-gd-split]").val() || "drive";
		if (!size || size < 2) {
			frappe.msgprint(__("Enter a group size of 2 or more."));
			return;
		}
		const go = () => {
			frappe.dom.freeze(__("Building groups…"));
			cdGdCall("generate_gd_groups", {
				campus_drive: drive,
				round_code: round,
				group_size: size,
				split_by: splitBy,
			})
				.then((m) => {
					frappe.dom.unfreeze();
					if (!m) return;
					cdGdState.open = null;
					frappe.show_alert({
						message: __("{0} groups created for {1} candidates across {2} role(s).", [
							m.groups,
							m.candidates,
							m.roles,
						]),
						indicator: "green",
					});
					frm.reload_doc();
				})
				.catch(() => frappe.dom.unfreeze());
		};
		if ((frm.doc.gd_groups || []).some((g) => g.round_code === round)) {
			frappe.confirm(
				__("This replaces the existing groups for round {0}. Continue?", [round]),
				go
			);
		} else {
			go();
		}
	});

	// switching GD round shows that round's own stored group size
	$root.on("change", "[data-gd-round]", function () {
		const r = cdGdRounds(frm).find((x) => x.round_code === $(this).val());
		if (r) $root.find("[data-gd-size]").val(r.gd_group_size || 5);
	});

	// push GD outcomes into the hiring workflow
	$root.on("click", "[data-gd-push]", function () {
		const round = $root.find("[data-gd-round]").val() || (cdGdRounds(frm)[0] || {}).round_code;
		const members = frm.doc.gd_group_members || [];
		const pass = members.filter((m) => m.result === "Pass").length;
		const fail = members.filter((m) => m.result === "Fail").length;
		const pending = members.length - pass - fail;
		frappe.confirm(
			__("Move {0} Pass candidate(s) into the next round and reject {1}?", [pass, fail]) +
				(pending
					? "<br><br>" +
					  __("{0} candidate(s) are still marked Pending and will be left untouched — you can run this again later.", [pending])
					: ""),
			() => {
				frappe.dom.freeze(__("Updating candidates…"));
				cdGdCall("apply_gd_results", { campus_drive: drive, round_code: round })
					.then((m) => {
						frappe.dom.unfreeze();
						if (!m) return;
						frappe.msgprint({
							title: __("GD results pushed"),
							indicator: "green",
							message: __(
								"Advanced: {0} &nbsp;·&nbsp; Rejected: {1} &nbsp;·&nbsp; Still pending: {2}",
								[m.advanced, m.rejected, m.pending]
							) + (m.gd_stage ? "<br>" + __("Passers moved to the stage after “{0}”.", [m.gd_stage]) : ""),
						});
						frm.reload_doc();
					})
					.catch(() => frappe.dom.unfreeze());
			}
		);
	});

	// per-candidate attendance / result
	$root.on("click", "[data-gd-set]", function () {
		const el = $(this);
		const rowName = el.attr("data-gd-row");
		const field = el.attr("data-gd-set");
		const value = el.attr("data-gd-value");
		const row = cdGdMemberRow(frm, rowName);
		if (!row || row[field] === value) return;
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
		const g = cdGdOpenGroup(frm);
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
		const g = cdGdOpenGroup(frm);
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

// Readable title for a Job Opening id, from the drive's own linked openings.
function cdRoleTitle(frm, opening) {
	if (!opening) return __("Unassigned");
	const row = (frm.doc.linked_job_openings || []).find((r) => r.job_opening === opening);
	return (row && row.job_title) || opening;
}

function cdGdOpenGroup(frm) {
	return (frm.doc.gd_groups || []).find((g) => g.group_name === cdGdState.open);
}

// --- drawing ----------------------------------------------------------------
function cdGdDraw($root, frm) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const rounds = cdGdRounds(frm);
	const groups = frm.doc.gd_groups || [];
	const members = frm.doc.gd_group_members || [];

	// --- header: round + size + generate ---
	const roundSel =
		rounds.length > 1
			? `<select class="cd-input" data-gd-round>${rounds
					.map((r) => `<option value="${esc(r.round_code)}">${esc(r.round_name || r.round_code)}</option>`)
					.join("")}</select>`
			: "";
	const defaultSize = (rounds[0] || {}).gd_group_size || 5;
	// Existing groups tell us how they were built: role-scoped groups carry a role.
	const wasRoleSplit = groups.length > 0 && groups.every((g) => g.job_opening);
	const header = `<div class="cd-toolbar">
		<div class="cd-toolbar-title">${__("Group Discussion")}
			<span class="cd-hint text-muted">${
				groups.length
					? __("{0} groups · {1} candidates", [groups.length, members.length])
					: __("no groups yet")
			}</span>
		</div>
		<div class="cd-gd-create">
			${roundSel}
			<select class="cd-input" data-gd-split title="${__("Who goes into a group together")}">
				<option value="drive" ${wasRoleSplit ? "" : "selected"}>${__(
		"All drive candidates (mix roles)"
	)}</option>
				<option value="role" ${wasRoleSplit ? "selected" : ""}>${__("Separate per role")}</option>
			</select>
			<label class="cd-gd-lbl">${__("Group size")}</label>
			<input type="number" min="2" class="cd-input cd-input-num" data-gd-size value="${defaultSize}">
			<button class="btn btn-primary btn-sm" data-gd-generate>${
				groups.length ? __("Re-generate Groups") : __("Create Groups")
			}</button>
			${
				groups.length
					? `<button class="btn btn-sm btn-default" data-gd-push title="${__(
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
	if (!groups.length) {
		$root.html(
			header +
				`<div class="cd-empty text-muted">${__(
					"No groups yet. Set a group size above and click Create Groups — candidates are taken from the Shortlisted pool, split per role and mixed across institutes."
				)}</div>`
		);
		return;
	}

	// colour per institute so mixing is visible everywhere
	const institutes = Array.from(new Set(members.map((m) => m.institute).filter(Boolean))).sort();
	const instColor = {};
	institutes.forEach((i, idx) => (instColor[i] = CD_FALLBACK[idx % CD_FALLBACK.length]));

	const open = cdGdOpenGroup(frm);
	$root.html(header + (open ? cdGdDetail(frm, open, instColor, esc) : cdGdList(frm, instColor, esc)));
}

function cdGdList(frm, instColor, esc) {
	const members = frm.doc.gd_group_members || [];
	const allGroups = frm.doc.gd_groups || [];
	const badge = (s) => {
		const map = { Planned: "#6B7280", Scheduled: "#0EA5E9", "In Progress": "#F59E0B", Completed: "#10B981" };
		const c = map[s] || "#6B7280";
		return `<span class="cd-badge" style="color:${c};background:${cdTint(c, 0.14)}">${esc(s || "Planned")}</span>`;
	};

	const membersOf = (g) =>
		members.filter((m) => m.round_code === g.round_code && m.group_name === g.group_name);

	const card = (g, accent, showRoleMix) => {
		const mem = membersOf(g);
		const present = mem.filter((m) => m.attendance === "Present").length;
		const passed = mem.filter((m) => m.result === "Pass").length;
		const failed = mem.filter((m) => m.result === "Fail").length;
		const faces = mem
			.slice(0, 6)
			.map((m) => cdAvatar(m.applicant_name || m.job_applicant, instColor[m.institute] || "#9CA3AF"))
			.join("");
		const more = mem.length > 6 ? `<span class="cd-avatar cd-avatar-more">+${mem.length - 6}</span>` : "";

		// Merged groups hold several roles — show the split (e.g. RSM 3 · CSM 3).
		let mix = "";
		if (showRoleMix) {
			const counts = {};
			mem.forEach((m) => {
				const k = m.job_opening || "";
				counts[k] = (counts[k] || 0) + 1;
			});
			mix = `<div class="cd-gd-mix">${Object.keys(counts)
				.map((k) => {
					const c = cdColorFor(k);
					return `<span class="cd-pill" style="background:${cdTint(c, 0.16)};color:${c}">${esc(
						cdRoleTitle(frm, k)
					)} ${counts[k]}</span>`;
				})
				.join("")}</div>`;
		}

		return `<div class="cd-gd-card cd-gd-clickable cd-card-accent" style="--cd-accent:${accent}"
			data-gd-open="${esc(g.group_name)}">
			<div class="cd-gd-head">
				<span class="cd-gd-title"><span class="cd-role-dot" style="background:${accent}"></span>${esc(
			g.group_name
		)}</span>
				${badge(g.group_status)}
			</div>
			${mix}
			<div class="cd-gd-faces">${faces}${more}</div>
			<div class="cd-gd-meta">
				<span class="cd-pill cd-pill-blue">${mem.length} ${__("candidates")}</span>
				<span class="cd-pill cd-pill-green">${present} ${__("present")}</span>
				<span class="cd-pill cd-pill-pass">✓ ${passed} ${__("pass")}</span>
				<span class="cd-pill cd-pill-fail">✕ ${failed} ${__("fail")}</span>
			</div>
			<div class="cd-gd-openhint">${__("Open group →")}</div>
		</div>`;
	};

	// Merged groups (no role on the group) render as one flat grid; role-scoped
	// groups stay bucketed under a per-role heading with its group count.
	const roleScoped = allGroups.length > 0 && allGroups.every((g) => g.job_opening);
	if (!roleScoped) {
		const legendFlat = Object.keys(instColor)
			.map(
				(i) =>
					`<span class="cd-gd-legend-item"><span class="cd-gd-dot" style="background:${instColor[i]}"></span>${esc(
						i
					)}</span>`
			)
			.join("");
		return `<div class="cd-gd-legend">${legendFlat}</div>
			<div class="cd-gd-grid">${allGroups
				.map((g) => card(g, cdColorFor(g.group_name), true))
				.join("")}</div>`;
	}

	// Groups are per role — bucket them so HR sees, per opening, how many groups
	// there are and how many candidates sit under it.
	const order = [];
	const byRole = {};
	allGroups.forEach((g) => {
		const key = g.job_opening || "";
		if (!byRole[key]) {
			byRole[key] = { title: g.job_title || g.job_opening || __("Unassigned"), groups: [] };
			order.push(key);
		}
		byRole[key].groups.push(g);
	});

	const sections = order
		.map((key) => {
			const role = byRole[key];
			const accent = cdColorFor(key);
			const headcount = role.groups.reduce((n, g) => n + membersOf(g).length, 0);
			return `<div class="cd-gd-role-block">
				<div class="cd-gd-role-head">
					<span class="cd-role-dot" style="background:${accent}"></span>
					<span class="cd-gd-role-title">${esc(role.title)}</span>
					<span class="cd-pill" style="background:${cdTint(accent, 0.16)};color:${accent}">${
				role.groups.length
			} ${role.groups.length === 1 ? __("group") : __("groups")}</span>
					<span class="cd-pill">${headcount} ${__("candidates")}</span>
				</div>
				<div class="cd-gd-grid">${role.groups.map((g) => card(g, accent, false)).join("")}</div>
			</div>`;
		})
		.join("");

	const legend = Object.keys(instColor)
		.map(
			(i) =>
				`<span class="cd-gd-legend-item"><span class="cd-gd-dot" style="background:${instColor[i]}"></span>${esc(
					i
				)}</span>`
		)
		.join("");
	return `<div class="cd-gd-legend">${legend}</div>${sections}`;
}

function cdGdDetail(frm, g, instColor, esc) {
	const members = (frm.doc.gd_group_members || []).filter(
		(m) => m.round_code === g.round_code && m.group_name === g.group_name
	);
	// groups the candidate may be moved into: same round + same role
	const siblings = (frm.doc.gd_groups || []).filter(
		(x) => x.round_code === g.round_code && (x.job_opening || "") === (g.job_opening || "")
	);

	const seg = (row, field, value, label, color) => {
		const active = (row[field] || "Pending") === value;
		return `<button class="cd-mini ${active ? "active" : ""}" data-gd-set="${field}"
			data-gd-row="${esc(row.name)}" data-gd-value="${value}"
			${active ? `style="background:${cdTint(color, 0.16)};color:${color};border-color:${cdTint(color, 0.4)}"` : ""}
			>${esc(label)}</button>`;
	};

	const rows = members
		.map((m) => {
			const moveOpts = siblings
				.map(
					(s) =>
						`<option value="${esc(s.group_name)}" ${
							s.group_name === m.group_name ? "selected" : ""
						}>${esc(s.group_name)}</option>`
				)
				.join("");
			const ic = instColor[m.institute] || "#9CA3AF";
			return `<tr>
				<td class="cd-gd-cand">
					${cdAvatar(m.applicant_name || m.job_applicant, ic)}
					<span class="cd-link" data-gd-applicant="${esc(m.job_applicant)}">${esc(
				m.applicant_name || m.job_applicant
			)}</span>
				</td>
				<td class="cd-gd-inst-cell"><span class="cd-pill" style="background:${cdTint(
					ic,
					0.14
				)};color:${ic}">${esc(m.institute || "—")}</span></td>
				<td class="cd-gd-inst-cell"><span class="cd-pill" style="background:${cdTint(
					cdColorFor(m.job_opening || ""),
					0.16
				)};color:${cdColorFor(m.job_opening || "")}">${esc(
				cdRoleTitle(frm, m.job_opening)
			)}</span></td>
				<td><div class="cd-mini-grp">
					${seg(m, "attendance", "Present", __("Present"), "#10B981")}
					${seg(m, "attendance", "Absent", __("Absent"), "#EF4444")}
				</div></td>
				<td><div class="cd-mini-grp">
					${seg(m, "result", "Pass", __("Pass"), "#10B981")}
					${seg(m, "result", "Fail", __("Fail"), "#EF4444")}
				</div></td>
				<td><select class="cd-input cd-input-sm" data-gd-move="${esc(m.name)}">${moveOpts}</select></td>
			</tr>`;
		})
		.join("");

	const statuses = ["Planned", "Scheduled", "In Progress", "Completed"]
		.map(
			(s) => `<option value="${s}" ${(g.group_status || "Planned") === s ? "selected" : ""}>${s}</option>`
		)
		.join("");

	return `<div class="cd-card">
		<div class="cd-gd-detail-head">
			<div>
				<span class="cd-link cd-gd-back" data-gd-back>← ${__("All groups")}</span>
				<div class="cd-gd-detail-title">${esc(g.group_name)}
					<span class="cd-chip">${members.length} ${__("candidates")}</span>
				</div>
				<div class="cd-gd-role">${esc(g.job_title || g.job_opening || "")}</div>
			</div>
			<div class="cd-gd-detail-actions">
				<select class="cd-input" data-gd-status>${statuses}</select>
				<button class="btn btn-default btn-sm" data-gd-bulk="Present">${__("All Present")}</button>
				<button class="btn btn-default btn-sm" data-gd-bulk="Pending">${__("Reset")}</button>
			</div>
		</div>
		<div class="cd-table-wrap">
			<table class="cd-table cd-gd-table">
				<thead><tr>
					<th class="cd-inst-col">${__("Candidate")}</th>
					<th class="cd-inst-col">${__("Institute")}</th>
					<th class="cd-inst-col">${__("Role")}</th>
					<th>${__("Attendance")}</th>
					<th>${__("GD Result")}</th>
					<th>${__("Group")}</th>
				</tr></thead>
				<tbody>${rows}</tbody>
			</table>
		</div>
	</div>`;
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

function cdInjectStyles() {
	if (document.getElementById("campus-dash-styles")) return;
	const css = `
.campus-dash{padding:4px 0 8px}
.cd-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.cd-toolbar-title{font-size:15px;font-weight:700;color:var(--heading-color,var(--text-color))}
.cd-hint{font-size:12px;font-weight:400;margin-left:8px}
.cd-seg{display:inline-flex;background:var(--control-bg,rgba(0,0,0,.05));border-radius:8px;padding:3px;gap:2px}
.cd-seg-btn{border:none;background:transparent;font-size:12px;font-weight:600;padding:6px 14px;border-radius:6px;cursor:pointer;color:var(--text-muted)}
.cd-seg-btn:hover{color:var(--text-color)}
.cd-seg-btn.active{background:var(--card-bg,#fff);color:var(--heading-color,var(--text-color));box-shadow:0 1px 3px rgba(0,0,0,.12)}
.cd-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
.cd-stat{border:1px solid transparent;border-radius:14px;padding:14px 16px;position:relative;overflow:hidden}
.cd-stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--cd-c,#6366f1)}
.cd-stat-val{font-size:26px;font-weight:800;line-height:1.1;color:var(--cd-c,#6366f1)}
.cd-stat-label{margin-top:4px;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:600}
.cd-stat-inv{--cd-c:#0ea5e9;background:linear-gradient(135deg,rgba(14,165,233,.16),rgba(14,165,233,.04));border-color:rgba(14,165,233,.25)}
.cd-stat-ins{--cd-c:#8b5cf6;background:linear-gradient(135deg,rgba(139,92,246,.16),rgba(139,92,246,.04));border-color:rgba(139,92,246,.25)}
.cd-stat-op{--cd-c:#0d9488;background:linear-gradient(135deg,rgba(13,148,136,.16),rgba(13,148,136,.04));border-color:rgba(13,148,136,.25)}
.cd-stat-tot{--cd-c:#6366f1;background:linear-gradient(135deg,rgba(99,102,241,.16),rgba(99,102,241,.04));border-color:rgba(99,102,241,.25)}
.cd-card-accent{border-left:4px solid var(--cd-accent,var(--border-color))}
.cd-role-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:middle}
.cd-avatar{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;font-size:10px;font-weight:800;flex:0 0 26px;letter-spacing:.02em}
.cd-avatar-more{background:var(--control-bg,rgba(0,0,0,.06));color:var(--text-muted)}
.cd-pill{display:inline-block;font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--control-bg,rgba(0,0,0,.05));color:var(--text-muted)}
.cd-pill-blue{background:rgba(59,130,246,.14);color:#3B82F6}
.cd-pill-green{background:rgba(16,185,129,.14);color:#10B981}
.cd-pill-amber{background:rgba(245,158,11,.16);color:#D97706}
.cd-pill-pass{background:rgba(16,185,129,.16);color:#059669}
.cd-pill-fail{background:rgba(239,68,68,.14);color:#DC2626}
.cd-card{background:var(--card-bg,var(--fg-color));border:1px solid var(--border-color);border-radius:14px;padding:16px 18px;margin-bottom:14px}
.cd-drive-strip{border-style:dashed}
.cd-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.cd-card-title{font-size:15px;font-weight:700;color:var(--heading-color,var(--text-color))}
.cd-chip{font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px;color:var(--text-muted);background:var(--control-bg,rgba(0,0,0,.04))}
.cd-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;letter-spacing:.02em}
.cd-chip-tot{cursor:pointer}
.cd-chip-tot:hover{color:var(--text-color);text-decoration:underline}
.cd-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px}
.cd-tile{cursor:pointer;border-radius:10px;padding:12px 6px;text-align:center;transition:transform .12s ease,box-shadow .12s ease,filter .12s ease;user-select:none}
.cd-tile:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.12);filter:saturate(1.15)}
.cd-tile-val{font-size:22px;font-weight:700;line-height:1}
.cd-tile-lbl{margin-top:5px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;opacity:.85}
.cd-table-wrap{overflow-x:auto}
.cd-table{width:100%;border-collapse:collapse;font-size:13px}
.cd-table thead th{text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--text-muted);padding:9px 6px;border-bottom:2px solid var(--border-color);white-space:nowrap;background:var(--control-bg,rgba(0,0,0,.03))}
.cd-table tbody tr:hover{background:var(--control-bg,rgba(0,0,0,.02))}
.cd-table thead th.cd-inst-col{text-align:left}
.cd-table tbody td{padding:10px 6px;border-bottom:1px solid var(--border-color);text-align:center}
.cd-table tbody tr:last-child td{border-bottom:none}
.cd-inst-cell{text-align:left!important;font-weight:600;min-width:180px}
.cd-num{color:var(--text-muted);font-weight:600}
.cd-num-on{cursor:pointer;font-weight:700}
.cd-num-on:hover{text-decoration:underline}
.cd-num-total{font-weight:700;color:var(--heading-color,var(--text-color));cursor:pointer}
.cd-num-total:hover{text-decoration:underline}
.cd-empty-row{text-align:center!important;padding:16px}
.cd-link{cursor:pointer}
.cd-link:hover{text-decoration:underline;color:var(--primary,#2563eb)}
.cd-empty{padding:24px;text-align:center;font-size:13px}
.cd-loading{padding:32px;text-align:center}
.cd-gd-legend{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}
.cd-gd-legend-item{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted)}
.cd-gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.cd-gd-role-block{margin-bottom:18px}
.cd-gd-role-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border-color)}
.cd-gd-role-title{font-size:13px;font-weight:700;color:var(--heading-color,var(--text-color))}
.cd-gd-card{border:1px solid var(--border-color);border-radius:12px;padding:12px 14px;background:var(--card-bg,var(--fg-color))}
.cd-gd-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cd-gd-title{font-size:14px;font-weight:700;color:var(--heading-color,var(--text-color))}
.cd-gd-role{font-size:11px;color:var(--text-muted);margin:2px 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-gd-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.cd-gd-member{display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:6px}
.cd-gd-member:hover{background:var(--control-bg,rgba(0,0,0,.04))}
.cd-gd-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
.cd-gd-name{font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-gd-inst{font-size:10px;color:var(--text-muted);max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-gd-create{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cd-gd-lbl{font-size:12px;color:var(--text-muted);margin:0}
.cd-input{border:1px solid var(--border-color);border-radius:6px;padding:5px 8px;font-size:12px;background:var(--control-bg,var(--card-bg));color:var(--text-color)}
.cd-input-num{width:72px}
.cd-input-sm{font-size:11px;padding:3px 6px}
.cd-gd-clickable{cursor:pointer;transition:transform .12s ease,box-shadow .12s ease}
.cd-gd-clickable:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.12)}
.cd-gd-dots{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;min-height:8px}
.cd-gd-faces{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;min-height:26px}
.cd-gd-mix{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 10px}
.cd-rd-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.cd-rd-panels{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:10px;border-radius:10px;background:var(--control-bg,rgba(0,0,0,.03))}
.cd-rd-panel{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px}
.cd-rd-role{font-size:11px;color:var(--text-muted);min-width:120px}
.cd-rd-who{display:flex;gap:4px;flex-wrap:wrap}
.cd-rd-warn{font-size:11px;color:#B45309;background:rgba(245,158,11,.13);border-radius:8px;padding:7px 10px;margin-bottom:10px}
.cd-rd-btn{margin-left:6px}
.cd-rd-batch{margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--control-bg,rgba(0,0,0,.03));border:1px solid var(--border-color)}
.cd-rd-batch-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.cd-rd-batch-title{font-size:12px;font-weight:700;color:var(--heading-color,var(--text-color));margin-right:4px}
.cd-rd-batch-actions{display:flex;gap:8px;flex-wrap:wrap}
.cd-health{margin-bottom:14px;display:flex;flex-direction:column;gap:8px}
.cd-health-ok{padding:10px 12px;border-radius:10px;font-size:12px;font-weight:600;color:#15803d;background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.25)}
.cd-health-item{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.5}
.cd-health-err{color:#b42318;background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.28)}
.cd-health-warn{color:#b45309;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3)}
.cd-health-icon{flex:0 0 auto;font-size:14px}
.cd-health-text{color:var(--text-color)}
.cd-health-err .cd-health-text b{color:#b42318}
.cd-health-warn .cd-health-text b{color:#b45309}
.cd-offer-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.cd-offer-count{font-size:12px;color:var(--text-muted);font-weight:600;margin-right:auto}
.cd-picker-bar{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.cd-picker-count{font-size:12px;color:var(--text-muted);font-weight:600}
.cd-picker-scroll{max-height:320px;overflow-y:auto;border:1px solid var(--border-color);border-radius:8px}
.cd-picker-table thead th{position:sticky;top:0;z-index:1}
.cd-picker-table tbody td{text-align:left;padding:7px 8px;font-size:12px}
.cd-pick-name{font-weight:600}
.cd-gd-meta{display:flex;gap:6px;flex-wrap:wrap}
.cd-gd-openhint{margin-top:10px;font-size:11px;font-weight:600;color:var(--primary,#2563eb)}
.cd-gd-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.cd-gd-back{font-size:12px;font-weight:600}
.cd-gd-detail-title{font-size:16px;font-weight:700;margin-top:4px;display:flex;align-items:center;gap:8px}
.cd-gd-detail-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cd-gd-table tbody td{text-align:center;vertical-align:middle}
.cd-gd-cand{text-align:left!important;display:flex;align-items:center;gap:8px;font-weight:600}
.cd-gd-inst-cell{text-align:left!important;font-size:12px;color:var(--text-muted)}
.cd-mini-grp{display:inline-flex;gap:4px}
.cd-mini{border:1px solid var(--border-color);background:transparent;color:var(--text-muted);font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;cursor:pointer}
.cd-mini:hover{color:var(--text-color);background:var(--control-bg,rgba(0,0,0,.04))}
.cd-mini.active{font-weight:700}
`;
	const style = document.createElement("style");
	style.id = "campus-dash-styles";
	style.textContent = css;
	document.head.appendChild(style);
}
