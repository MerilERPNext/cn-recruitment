/* global frappe, $, __ */
/**
 * The Group Discussion board — the group cards and the marking table.
 *
 * ONE board, TWO doors:
 *
 *   Campus Drive        HR, running the whole hall: every group of a GD round, who
 *                       conducts each, moving candidates between groups, pushing the
 *                       round.
 *   Group Discussion    a panel, running THEIR group: the same card, the same
 *                       Present/Absent and Pass/Fail buttons, and the push that ends
 *                       it — and nothing about anybody else's group.
 *
 * The markup below is what both render, down to the `data-gd-*` attributes, so the
 * two screens cannot drift apart. What differs is only what each door offers: the
 * drive passes a panel picker and a move-group column, the panel's own copy passes
 * neither. Each side binds the attributes to its own server calls.
 *
 * Loaded globally (hooks.app_include_js) rather than per-doctype, because both of
 * the forms above are themselves loaded as doctype JS — which is evaluated too late
 * to be a dependency of one another.
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
/* An interviewer with nothing pending — the one HR is looking for. */
.cd-pill-free{background:rgba(16,185,129,.16);color:#059669}
.cd-roster-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:10px;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--control-bg,rgba(0,0,0,.03))}
.cd-meta-label{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);margin-right:4px}
.cd-pv-move{margin-left:4px}
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
.cd-row-blocked{opacity:.62}
.cd-pill-link{cursor:pointer;text-decoration:none}
.cd-pill-link:hover{filter:brightness(.94);text-decoration:underline}
.cd-ma-hint{margin-bottom:8px;font-size:12px}
.cd-ma-table td{vertical-align:middle}
.cd-ma-table .cd-input{width:100%}
.cd-gd-check{display:inline-flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap}
.cd-gd-check input{margin:0}
.cd-rd-extra{margin-top:-6px;margin-left:22px;border-style:dashed}
.cd-rd-extra-title{font-size:13px}
.cd-rd-extra-list{display:flex;flex-direction:column;gap:6px}
.cd-rd-extra-row{display:grid;grid-template-columns:minmax(120px,1.2fr) auto minmax(90px,1fr) 90px 80px minmax(120px,1.4fr);
	align-items:center;gap:8px;font-size:12px;padding:6px 8px;border-radius:8px;background:var(--control-bg,rgba(0,0,0,.03))}
.cd-rd-extra-name{font-weight:600}
.cd-rd-extra-who,.cd-rd-extra-when,.cd-rd-extra-why{color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-rd-extra-empty{font-size:11px;padding:4px 2px}
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

// ---------------------------------------------------------------------------
// Shared renderers
//
// `ctx` is the small adapter each door supplies, so the board never has to know
// whether it is reading a Campus Drive form or a Group Discussion:
//   esc(v)                  -> escaped string
//   roleTitle(job_opening)  -> readable role
//   instituteName(inst)     -> readable college
//   panelWho(group)         -> [interviewer names] conducting that group
//   groupLabel(group)       -> how to TITLE that group here (optional)
//
// A group is stored as "Group 3 - MP hiring": the drive is part of the name because
// a panel member's Group Discussion list spans every drive they sit on, and three
// rows all called "Group 1" tell them nothing. Inside the drive itself that half is
// redundant, so the Campus Drive supplies a groupLabel that trims it. The stored
// name is still what every data-gd-* attribute carries — it is the key both sides
// join on, and trimming it there would break the lookup.
// ---------------------------------------------------------------------------

const GDB_STATUS_COLORS = {
	Planned: "#6B7280",
	Scheduled: "#0EA5E9",
	"In Progress": "#F59E0B",
	Completed: "#10B981",
};

// A colour per college, so a mixed group is visibly mixed everywhere it appears.
function gdbInstituteColors(members) {
	const institutes = Array.from(new Set((members || []).map((m) => m.institute).filter(Boolean))).sort();
	const out = {};
	institutes.forEach((i, idx) => (out[i] = CD_FALLBACK[idx % CD_FALLBACK.length]));
	return out;
}

function gdbGroupLabel(ctx, g) {
	return (ctx.groupLabel ? ctx.groupLabel(g) : g.group_name) || g.group_name || "";
}

function gdbStatusBadge(status, esc) {
	const c = GDB_STATUS_COLORS[status] || "#6B7280";
	return `<span class="cd-badge" style="color:${c};background:${cdTint(c, 0.14)}">${esc(
		status || "Planned"
	)}</span>`;
}

// The panel conducting a group, with its interviewers — the whole point of assigning
// one, so it is on the card as well as inside the group.
function gdbPanelChip(group, who, esc) {
	if (!group.panel_name) {
		return `<div class="cd-gd-mix"><span class="cd-pill cd-pill-amber">${__(
			"no panel yet"
		)}</span></div>`;
	}
	return `<div class="cd-gd-mix">
		<span class="cd-pill cd-pill-blue">${esc(group.panel_name)}</span>
		${(who || []).map((n) => `<span class="cd-pill">${esc(n)}</span>`).join("")}
	</div>`;
}

// Counts under a group's faces: how far along the marking is.
function gdbTallies(mem) {
	return {
		present: mem.filter((m) => m.attendance === "Present").length,
		pass: mem.filter((m) => m.result === "Pass").length,
		fail: mem.filter((m) => m.result === "Fail").length,
		open: mem.filter((m) => m.result !== "Pass" && m.result !== "Fail").length,
	};
}

function gdbGroupCard(ctx, g, mem, accent, instColor) {
	const esc = ctx.esc;
	const t = gdbTallies(mem);
	const faces = mem
		.slice(0, 6)
		.map((m) => cdAvatar(m.applicant_name || m.job_applicant, instColor[m.institute] || "#9CA3AF"))
		.join("");
	const more = mem.length > 6 ? `<span class="cd-avatar cd-avatar-more">+${mem.length - 6}</span>` : "";

	// Merged groups hold several roles — show the split (e.g. RSM 3 · CSM 3).
	let mix = "";
	if (!g.job_opening) {
		const counts = {};
		mem.forEach((m) => {
			const k = m.job_opening || "";
			counts[k] = (counts[k] || 0) + 1;
		});
		mix = `<div class="cd-gd-mix">${Object.keys(counts)
			.map((k) => {
				const c = cdColorFor(k);
				return `<span class="cd-pill" style="background:${cdTint(c, 0.16)};color:${c}">${esc(
					ctx.roleTitle(k)
				)} ${counts[k]}</span>`;
			})
			.join("")}</div>`;
	}

	return `<div class="cd-gd-card cd-gd-clickable cd-card-accent" style="--cd-accent:${accent}"
		data-gd-open="${esc(g.group_name)}">
		<div class="cd-gd-head">
			<span class="cd-gd-title"><span class="cd-role-dot" style="background:${accent}"></span>${esc(
		gdbGroupLabel(ctx, g)
	)}</span>
			${gdbStatusBadge(g.group_status, esc)}
		</div>
		${gdbPanelChip(g, ctx.panelWho(g), esc)}
		${mix}
		<div class="cd-gd-faces">${faces}${more}</div>
		<div class="cd-gd-meta">
			<span class="cd-pill cd-pill-blue">${mem.length} ${__("candidates")}</span>
			<span class="cd-pill cd-pill-green">${t.present} ${__("present")}</span>
			<span class="cd-pill cd-pill-pass">✓ ${t.pass} ${__("pass")}</span>
			<span class="cd-pill cd-pill-fail">✕ ${t.fail} ${__("fail")}</span>
			${t.open ? `<span class="cd-pill cd-pill-amber">${t.open} ${__("to mark")}</span>` : ""}
		</div>
		<div class="cd-gd-openhint">${__("Open group →")}</div>
	</div>`;
}

/** Every group of a round, bucketed by whatever it was split by. */
function gdbList(ctx, allGroups, members, instColor) {
	const esc = ctx.esc;

	// Indexed once: a big drive has hundreds of members and dozens of groups, and every
	// card would otherwise re-scan the whole list.
	const byGroup = {};
	members.forEach((m) => (byGroup[m.group_name] = byGroup[m.group_name] || []).push(m));
	const membersOf = (g) => byGroup[g.group_name] || [];

	const legend = `<div class="cd-gd-legend">${Object.keys(instColor)
		.map(
			(i) =>
				`<span class="cd-gd-legend-item"><span class="cd-gd-dot" style="background:${instColor[i]}"></span>${esc(
					ctx.instituteName(i)
				)}</span>`
		)
		.join("")}</div>`;
	const grid = (gs, accent) =>
		`<div class="cd-gd-grid">${gs
			.map((g) => gdbGroupCard(ctx, g, membersOf(g), accent || cdColorFor(g.group_name), instColor))
			.join("")}</div>`;

	// A group carries the dimensions it was split by — its role and/or its institute.
	// Bucket by whichever are set, so HR sees per college / per role how many groups
	// there are and who sits under them. A drive-wide split has neither: one flat grid.
	if (!allGroups.some((g) => g.job_opening || g.institute)) return legend + grid(allGroups);

	const order = [];
	const buckets = {};
	allGroups.forEach((g) => {
		const key = `${g.institute || ""}||${g.job_opening || ""}`;
		if (!buckets[key]) {
			buckets[key] = {
				title:
					[ctx.instituteName(g.institute), g.job_opening ? g.job_title || g.job_opening : ""]
						.filter(Boolean)
						.join(" · ") || __("Unassigned"),
				groups: [],
			};
			order.push(key);
		}
		buckets[key].groups.push(g);
	});

	return (
		legend +
		order
			.map((key) => {
				const b = buckets[key];
				const accent = cdColorFor(key);
				const headcount = b.groups.reduce((n, g) => n + membersOf(g).length, 0);
				return `<div class="cd-gd-role-block">
					<div class="cd-gd-role-head">
						<span class="cd-role-dot" style="background:${accent}"></span>
						<span class="cd-gd-role-title">${esc(b.title)}</span>
						<span class="cd-pill" style="background:${cdTint(accent, 0.16)};color:${accent}">${
					b.groups.length
				} ${b.groups.length === 1 ? __("group") : __("groups")}</span>
						<span class="cd-pill">${headcount} ${__("candidates")}</span>
					</div>
					${grid(b.groups, accent)}
				</div>`;
			})
			.join("")
	);
}

/**
 * One group's marking table — the card an interviewer actually works in.
 *
 * `opts` is what the door offers on top of the marks themselves:
 *   canMark        false on a completed group: the verdicts show as read-only pills
 *                  rather than buttons that would only be refused by the server.
 *   applicantLinks candidate names open the Job Applicant (HR); off for a panel, who
 *                  has no permission on it and would only get an error page.
 *   back           the "← All groups" link (the drive has other groups; a GD has not)
 *   siblings       groups this candidate may be moved into — omit for no move column
 *   panelControl   HTML for the panel picker; omit to show the read-only panel chip
 *   statusControl  HTML for the status picker; omit for none
 *   pushTitle/pushLabel  wording of the push button (omit pushLabel for no button)
 */
function gdbDetail(ctx, g, members, opts) {
	const esc = ctx.esc;
	opts = opts || {};
	const instColor = opts.instColor || gdbInstituteColors(members);
	const canMark = opts.canMark !== false;
	const siblings = opts.siblings || [];

	const seg = (row, field, value, label, color) => {
		const active = (row[field] || "Pending") === value;
		if (!canMark) {
			return active
				? `<span class="cd-pill" style="background:${cdTint(color, 0.16)};color:${color}">${esc(
						label
				  )}</span>`
				: "";
		}
		return `<button class="cd-mini ${active ? "active" : ""}" data-gd-set="${field}"
			data-gd-row="${esc(row.name)}" data-gd-value="${value}"
			${active ? `style="background:${cdTint(color, 0.16)};color:${color};border-color:${cdTint(color, 0.4)}"` : ""}
			>${esc(label)}</button>`;
	};
	// Read-only and unmarked: say so, rather than leaving an empty cell that reads as
	// though the row had no verdict field at all.
	const pending = (row, field) =>
		canMark || (row[field] && row[field] !== "Pending")
			? ""
			: `<span class="cd-pill">${__("Pending")}</span>`;

	const rows = members
		.map((m) => {
			const ic = instColor[m.institute] || "#9CA3AF";
			const name = esc(m.applicant_name || m.job_applicant);
			const roleColor = cdColorFor(m.job_opening || "");
			const moveCell = siblings.length
				? `<td><select class="cd-input cd-input-sm" data-gd-move="${esc(m.name)}">${siblings
						.map(
							(s) =>
								`<option value="${esc(s.group_name)}" ${
									s.group_name === m.group_name ? "selected" : ""
								}>${esc(gdbGroupLabel(ctx, s))}</option>`
						)
						.join("")}</select></td>`
				: "";
			return `<tr>
				<td class="cd-gd-cand">
					${cdAvatar(m.applicant_name || m.job_applicant, ic)}
					${
						opts.applicantLinks
							? `<span class="cd-link" data-gd-applicant="${esc(m.job_applicant)}">${name}</span>`
							: `<span>${name}</span>`
					}
				</td>
				<td class="cd-gd-inst-cell"><span class="cd-pill" style="background:${cdTint(ic, 0.14)};color:${ic}">${esc(
				ctx.instituteName(m.institute) || "—"
			)}</span></td>
				<td class="cd-gd-inst-cell"><span class="cd-pill" style="background:${cdTint(
					roleColor,
					0.16
				)};color:${roleColor}">${esc(ctx.roleTitle(m.job_opening))}</span></td>
				<td><div class="cd-mini-grp">
					${seg(m, "attendance", "Present", __("Present"), "#10B981")}
					${seg(m, "attendance", "Absent", __("Absent"), "#EF4444")}
					${pending(m, "attendance")}
				</div></td>
				<td><div class="cd-mini-grp">
					${seg(m, "result", "Pass", __("Pass"), "#10B981")}
					${seg(m, "result", "Fail", __("Fail"), "#EF4444")}
					${pending(m, "result")}
				</div></td>
				${moveCell}
			</tr>`;
		})
		.join("");

	// How many here still lack a verdict — this group can be pushed on its own once
	// that is zero, whatever the rest of the hall is doing.
	const open = gdbTallies(members).open;
	const actions = [
		opts.panelControl || "",
		opts.statusControl || "",
		canMark
			? `<button class="btn btn-default btn-sm" data-gd-bulk="Present">${__("All Present")}</button>
			   <button class="btn btn-default btn-sm" data-gd-bulk="Pending">${__("Reset")}</button>`
			: "",
		opts.pushLabel
			? `<button class="btn btn-sm ${open ? "btn-default" : "btn-primary"}" data-gd-push-group
					title="${
						open
							? __("{0} candidate(s) here still need a Pass or Fail", [open])
							: opts.pushTitle ||
							  __("Send this group's results on — passers to the next round, fails rejected")
					}">${opts.pushLabel}${open ? ` (${open} ${__("to mark")})` : ""}</button>`
			: "",
	].join("");

	return `<div class="cd-card">
		<div class="cd-gd-detail-head">
			<div>
				${opts.back ? `<span class="cd-link cd-gd-back" data-gd-back>← ${__("All groups")}</span>` : ""}
				<div class="cd-gd-detail-title">${esc(gdbGroupLabel(ctx, g))}
					<span class="cd-chip">${members.length} ${__("candidates")}</span>
					${gdbStatusBadge(g.group_status, esc)}
				</div>
				<div class="cd-gd-role">${esc(
					[ctx.instituteName(g.institute), g.job_title || g.job_opening].filter(Boolean).join(" · ")
				)}</div>
				${opts.panelControl ? "" : gdbPanelChip(g, ctx.panelWho(g), esc)}
			</div>
			<div class="cd-gd-detail-actions">${actions}</div>
		</div>
		${opts.note || ""}
		<div class="cd-table-wrap">
			<table class="cd-table cd-gd-table">
				<thead><tr>
					<th class="cd-inst-col">${__("Candidate")}</th>
					<th class="cd-inst-col">${__("Institute")}</th>
					<th class="cd-inst-col">${__("Role")}</th>
					<th>${__("Attendance")}</th>
					<th>${__("GD Result")}</th>
					${siblings.length ? `<th>${__("Group")}</th>` : ""}
				</tr></thead>
				<tbody>${rows}</tbody>
			</table>
		</div>
	</div>`;
}
