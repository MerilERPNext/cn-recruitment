/* global frappe, $, __ */
/**
 * Campus Drive — Institute-wise Candidates (Candidates tab).
 *
 * Renders, for every Campus Invite selected on this drive, a card per invited
 * Institute with Candidates / Shortlisted / On Hold counts. Every count opens
 * the filtered Job Applicant list; the invite and institute names open their
 * forms. Data comes from the saved drive, so it refreshes on load/save.
 */

frappe.ui.form.on("Campus Drive", {
	refresh(frm) {
		render_institute_breakdown(frm);
	},
});

function render_institute_breakdown(frm) {
	const field = frm.fields_dict.institute_candidates_html;
	if (!field) return;
	const $wrap = $(field.wrapper).empty();
	inject_cd_styles();

	const $root = $('<div class="campus-dash"></div>').appendTo($wrap);

	if (frm.is_new()) {
		$root.html(
			`<div class="cd-empty text-muted">${__(
				"Save the drive to see institute-wise candidate counts."
			)}</div>`
		);
		return;
	}

	// Navigation (delegated)
	$root.on("click", "[data-cd-action]", function () {
		const el = $(this);
		const action = el.attr("data-cd-action");
		const invite = el.attr("data-invite");
		const institute = el.attr("data-institute");
		const opening = el.attr("data-opening");
		const status = el.attr("data-status");
		if (action === "invite") {
			frappe.set_route("Form", "Campus Invite", invite);
		} else if (action === "institute") {
			frappe.set_route("Form", "Institute", institute);
		} else if (action === "opening") {
			frappe.set_route("Form", "Job Opening", opening);
		} else if (action === "list") {
			const filters = { custom_campus_invite: invite };
			if (institute) filters.custom_institute = institute;
			if (opening) filters.job_title = opening;
			if (status) filters.status = status;
			frappe.set_route("List", "Job Applicant", filters);
		}
	});

	$root.html('<div class="cd-loading text-muted">' + __("Loading…") + "</div>");
	frappe.call({
		method: "recruitment.recruitment.doctype.campus_drive.campus_drive.get_institute_breakdown",
		args: { campus_drive: frm.doc.name },
		callback: (r) => cd_render($root, r.message || { summary: {}, invites: [] }),
	});
}

function cd_render($root, data) {
	const esc = (s) => frappe.utils.escape_html(String(s == null ? "" : s));
	const s = data.summary || {};
	const invites = data.invites || [];

	const stat = (label, val, cls) =>
		`<div class="cd-stat cd-stat-${cls}"><div class="cd-stat-val">${
			val || 0
		}</div><div class="cd-stat-label">${esc(label)}</div></div>`;

	const statusCls = (st) =>
		({
			Draft: "draft",
			Invited: "invited",
			"In Progress": "progress",
			Completed: "completed",
			Closed: "closed",
		}[st] || "draft");

	// One count tile, scoped to invite + institute + opening.
	const tile = (inv, it, op, key, label, cls, status) => {
		const attrs =
			`data-cd-action="list" data-invite="${esc(inv)}" data-institute="${esc(
				it.institute
			)}" data-opening="${esc(op.job_opening)}"` +
			(status ? ` data-status="${esc(status)}"` : "");
		return `<div class="cd-tile cd-tile-${cls}" ${attrs} title="${__("View candidates")}">
			<div class="cd-tile-val">${op[key] || 0}</div>
			<div class="cd-tile-lbl">${esc(label)}</div></div>`;
	};

	const openingRow = (inv, it, op) =>
		`<div class="cd-opening">
			<div class="cd-opening-name cd-link" data-cd-action="opening" data-opening="${esc(
				op.job_opening
			)}" title="${__("Open job opening")}">${esc(op.job_title)}</div>
			<div class="cd-tiles">
				${tile(inv, it, op, "applied", __("Candidates"), "app", null)}
				${tile(inv, it, op, "shortlisted", __("Shortlisted"), "sl", "Shortlisted")}
				${tile(inv, it, op, "hold", __("On Hold"), "hold", "Hold")}
			</div>
		</div>`;

	const instituteCard = (inv, it) => {
		const openings =
			(it.openings || []).map((op) => openingRow(inv, it, op)).join("") ||
			`<div class="cd-noinst text-muted">${__("No openings on this invite.")}</div>`;
		return `<div class="cd-inst">
			<div class="cd-inst-head">
				<span class="cd-inst-name cd-link" data-cd-action="institute" data-institute="${esc(
					it.institute
				)}" title="${__("Open institute")}">${esc(it.institute_name)}</span>
				<span class="cd-inst-tot">
					<span class="cd-chip cd-chip-app">${it.applied} ${__("Applied")}</span>
					<span class="cd-chip cd-chip-sl">${it.shortlisted} ${__("Shortlisted")}</span>
					<span class="cd-chip cd-chip-hold">${it.hold} ${__("On Hold")}</span>
				</span>
			</div>
			<div class="cd-openings">${openings}</div>
		</div>`;
	};

	const inviteSection = (inv) => {
		const cards =
			(inv.institutes || []).map((it) => instituteCard(inv.invite, it)).join("") ||
			`<div class="cd-noinst text-muted">${__("No institutes on this invite.")}</div>`;
		return `<div class="cd-invite">
			<div class="cd-invite-head">
				<div class="cd-invite-title">
					<span class="cd-link cd-invite-name" data-cd-action="invite" data-invite="${esc(
						inv.invite
					)}" title="${__("Open campus invite")}">${esc(inv.invite_name)}</span>
					<span class="cd-badge cd-region">${esc(inv.region_label)}</span>
					<span class="cd-badge cd-status-${statusCls(inv.status)}">${esc(inv.status)}</span>
				</div>
				<div class="cd-invite-meta">
					<span class="cd-chip">${inv.total_institutes} ${__("Institutes")}</span>
					<span class="cd-chip cd-chip-app">${inv.total_applied} ${__("Applied")}</span>
					<span class="cd-chip cd-chip-sl">${inv.total_shortlisted} ${__("Shortlisted")}</span>
					<span class="cd-chip cd-chip-hold">${inv.total_hold} ${__("On Hold")}</span>
				</div>
			</div>
			<div class="cd-inst-grid">${cards}</div>
		</div>`;
	};

	let html = `<div class="cd-summary">
		${stat(__("Campus Invites"), s.invites, "inv")}
		${stat(__("Institutes"), s.institutes, "ins")}
		${stat(__("Openings"), s.openings, "op")}
		${stat(__("Applied"), s.applied, "app")}
		${stat(__("Shortlisted"), s.shortlisted, "sl")}
		${stat(__("On Hold"), s.hold, "hold")}
	</div>`;

	if (!invites.length) {
		html += `<div class="cd-empty text-muted">${__(
			"No campus invites selected on this drive yet."
		)}</div>`;
	} else {
		html += invites.map(inviteSection).join("");
	}
	$root.html(html);
}

function inject_cd_styles() {
	if (document.getElementById("campus-dash-styles")) return;
	const css = `
.campus-dash{--cd-app:#6366f1;--cd-app-bg:rgba(99,102,241,.12);--cd-sl:#16a34a;--cd-sl-bg:rgba(22,163,74,.14);--cd-hold:#d97706;--cd-hold-bg:rgba(217,119,6,.15);padding:4px 0 8px}
.cd-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:18px}
.cd-stat{background:var(--card-bg,var(--fg-color));border:1px solid var(--border-color);border-radius:12px;padding:14px 16px;position:relative;overflow:hidden}
.cd-stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--text-muted)}
.cd-stat-inv::before{background:#0ea5e9}.cd-stat-ins::before{background:#8b5cf6}.cd-stat-op::before{background:#0d9488}.cd-stat-app::before{background:var(--cd-app)}.cd-stat-sl::before{background:var(--cd-sl)}.cd-stat-hold::before{background:var(--cd-hold)}
.cd-stat-val{font-size:24px;font-weight:700;line-height:1.1;color:var(--heading-color,var(--text-color))}
.cd-stat-label{margin-top:4px;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em}
.cd-invite{background:var(--card-bg,var(--fg-color));border:1px solid var(--border-color);border-radius:14px;padding:16px 18px;margin-bottom:16px}
.cd-invite-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid var(--border-color)}
.cd-invite-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cd-invite-name{font-size:16px;font-weight:700;color:var(--heading-color,var(--text-color))}
.cd-badge{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;border:1px solid var(--border-color);color:var(--text-muted)}
.cd-region{color:#0369a1;background:rgba(14,165,233,.12);border-color:transparent}
.cd-status-draft{color:#6b7280;background:rgba(107,114,128,.14);border-color:transparent}
.cd-status-invited{color:#2563eb;background:rgba(37,99,235,.14);border-color:transparent}
.cd-status-progress{color:#b45309;background:rgba(217,119,6,.15);border-color:transparent}
.cd-status-completed{color:#15803d;background:rgba(22,163,74,.15);border-color:transparent}
.cd-status-closed{color:#6b7280;background:rgba(107,114,128,.14);border-color:transparent}
.cd-invite-meta{display:flex;gap:8px;flex-wrap:wrap}
.cd-chip{font-size:12px;font-weight:600;padding:4px 10px;border-radius:8px;color:var(--text-muted);background:var(--control-bg,rgba(0,0,0,.04))}
.cd-chip-app{color:var(--cd-app);background:var(--cd-app-bg)}.cd-chip-sl{color:var(--cd-sl);background:var(--cd-sl-bg)}.cd-chip-hold{color:var(--cd-hold);background:var(--cd-hold-bg)}
.cd-inst-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.cd-inst{border:1px solid var(--border-color);border-radius:12px;padding:14px;background:var(--subtle-fg,var(--control-bg,transparent))}
.cd-inst-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.cd-inst-name{font-size:14px;font-weight:600;color:var(--heading-color,var(--text-color));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-inst-tot{display:flex;gap:6px;flex-wrap:wrap}
.cd-inst-tot .cd-chip{font-size:11px;padding:3px 8px}
.cd-openings{display:flex;flex-direction:column;gap:10px}
.cd-opening{border-top:1px dashed var(--border-color);padding-top:10px}
.cd-opening:first-child{border-top:none;padding-top:0}
.cd-opening-name{font-size:13px;font-weight:600;margin-bottom:8px;color:var(--heading-color,var(--text-color))}
.cd-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cd-tile{cursor:pointer;border-radius:10px;padding:12px 6px;text-align:center;transition:transform .12s ease,box-shadow .12s ease,filter .12s ease;user-select:none}
.cd-tile:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.12);filter:saturate(1.15)}
.cd-tile-val{font-size:22px;font-weight:700;line-height:1}
.cd-tile-lbl{margin-top:5px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;opacity:.85}
.cd-tile-app{background:var(--cd-app-bg);color:var(--cd-app)}.cd-tile-sl{background:var(--cd-sl-bg);color:var(--cd-sl)}.cd-tile-hold{background:var(--cd-hold-bg);color:var(--cd-hold)}
.cd-link{cursor:pointer}.cd-link:hover{text-decoration:underline;color:var(--primary,#2563eb)}
.cd-empty,.cd-noinst{padding:22px;text-align:center;font-size:13px}
.cd-loading{padding:32px;text-align:center}
@media(max-width:768px){.cd-summary{grid-template-columns:repeat(2,1fr)}}
`;
	const style = document.createElement("style");
	style.id = "campus-dash-styles";
	style.textContent = css;
	document.head.appendChild(style);
}
