// Behaviour for the "TPO Campus Drives" Custom HTML Block.
//
// Frappe runs this inside an IIFE with `root_element` bound to the block's shadow
// root, so every DOM lookup must go through it - document.querySelector would
// escape into the page. `frappe` and `$` are page globals and are available.
//
// "Add Candidates" opens the ordinary Candidate Registration form with the drive's
// Campus Invite already filled in. That form is deliberately the destination
// rather than a bespoke dialog: its Candidates grid already ships Download /
// Upload (the field is allow_bulk_edit), so bulk and manual entry both come for
// free, and the Institute is auto-filled for a TPO by candidate_registration.js.

const API = "recruitment.recruitment.tpo_portal";

const esc = (value) => frappe.utils.escape_html(value == null ? "" : String(value));

const list_region = root_element.querySelector("[data-region='list']");

root_element.querySelector("[data-action='refresh']").addEventListener("click", () => load());

load();

function load() {
	list_region.innerHTML = `<div class="text-muted">${__("Loading your campus drives…")}</div>`;
	frappe
		.call({ method: `${API}.get_my_campus_drives` })
		.then((r) => render(r.message || []))
		.catch(() => {
			list_region.innerHTML = `<div class="tpo-empty">${__(
				"Could not load your campus drives. Please refresh."
			)}</div>`;
		});
}

function render(drives) {
	if (!drives.length) {
		list_region.innerHTML = `
			<div class="tpo-empty">
				<div class="tpo-empty-title">${__("No campus drives yet")}</div>
				<div>${__(
					"You will see a drive here as soon as your college is invited to one. Nothing to do until then."
				)}</div>
			</div>`;
		return;
	}

	list_region.innerHTML = drives.map(card_html).join("");
	list_region.querySelectorAll("[data-action='add-candidates']").forEach((button) => {
		const drive = drives[Number(button.dataset.index)];
		button.addEventListener("click", () => add_candidates(drive));
	});
	list_region.querySelectorAll("[data-action='view-candidates']").forEach((button) => {
		const drive = drives[Number(button.dataset.index)];
		button.addEventListener("click", () => view_candidates(drive, button));
	});
}

function card_html(drive, index) {
	const openings = (drive.openings || [])
		.map((o) => `<span class="tpo-chip">${esc(o.job_title)}</span>`)
		.join("");

	// The institute is deliberately not shown: a TPO only ever has one (the form
	// fills it in for them) and for HR it would print a row of raw institute IDs.
	return `
		<div class="tpo-drive-card" data-accent="${index % 5}">
			<div class="tpo-drive-card-head">
				<div>
					<div class="tpo-drive-name">${esc(drive.campus_invite_name)}</div>
					<div class="tpo-drive-sub">
						${esc(drive.name)}${drive.region ? " · " + esc(drive.region) : ""}
					</div>
				</div>
				<span class="tpo-status tpo-status-${frappe.scrub(drive.status || "draft", "-")}">
					${esc(drive.status)}
				</span>
			</div>

			<div>
				<div class="tpo-meta-label">${__("Registered")}</div>
				<span class="tpo-count">${drive.candidate_count} <small>${__("candidates")}</small></span>
				${
					drive.applied_count
						? `<span class="tpo-applied-note">${drive.applied_count} ${__("applied")}</span>`
						: ""
				}
				${
					drive.draft_count
						? `<span class="tpo-draft-note">${drive.draft_count} ${__("draft")}</span>`
						: ""
				}
			</div>

			${
				openings
					? `<div>
							<div class="tpo-meta-label">${__("Hiring for")}</div>
							<div>${openings}</div>
						</div>`
					: ""
			}

			${closed_note(drive)}

			<div class="tpo-drive-actions">
				${
					drive.registration_closed
						? `<button class="btn btn-default btn-sm" disabled>${__(
								"Registration Closed"
						  )}</button>`
						: `<button class="btn btn-primary btn-sm" data-action="add-candidates" data-index="${index}">
								${__("Add Candidates")}
							</button>`
				}
				<button class="btn btn-default btn-sm" data-action="view-candidates" data-index="${index}">
					${__("View Candidates")}
				</button>
			</div>
		</div>`;
}

/**
 * Why this college can no longer register — the two reasons are not the same thing.
 *
 * A passed deadline is HR's to extend. A live drive is not: once the drive for this
 * college has been scheduled and gone live its candidate list is frozen, even though
 * the very same invite is still open for the other colleges on it (their drives have
 * not been created yet). Saying which one it is stops the TPO asking for an extension
 * that would not help them.
 */
function closed_note(drive) {
	if (!drive.registration_closed) {
		return "";
	}
	const message =
		drive.closed_reason === "drive_live"
			? __("Your campus drive has been scheduled and is live, so registration is closed. Contact the recruitment team if a candidate still needs to be added.")
			: __("The registration deadline ({0}) has passed. Contact the recruitment team if you need it extended.", [
					frappe.datetime.str_to_user(drive.registration_expiry_date),
			  ]);
	return `<div class="tpo-closed-note">${message}</div>`;
}

// ---------------------------------------------------------------------------
// "View Candidates" — where each candidate on this drive has actually got to.
//
// The card can only say how many were registered, which is the least interesting
// half of the question. A registered candidate is emailed and applies THEMSELVES,
// so between "I typed them in" and "they are in the pipeline" there is a gap only
// this list can show:
//
//   Draft       the registration was never submitted — waiting on the TPO
//   Registered  submitted and emailed, but this candidate has not applied yet
//   Applied     a Job Applicant exists, with its own status and hiring stage
//
// Rendered in a page-level dialog rather than inside the block: the block lives in
// a shadow root, so its stylesheet does not reach a dialog, and the markup below
// carries its own.
// ---------------------------------------------------------------------------

const STATE_CLASS = {
	Applied: "tpo-cand-applied",
	Registered: "tpo-cand-registered",
	Draft: "tpo-cand-draft",
};

function view_candidates(drive, button) {
	const label = button.innerHTML;
	button.disabled = true;
	button.innerHTML = __("Loading…");

	frappe
		.call({ method: `${API}.get_drive_candidates`, args: { campus_invite: drive.name } })
		.then((r) => show_candidates_dialog(drive, r.message || {}))
		.catch(() => {
			frappe.msgprint({
				title: __("Could not load candidates"),
				message: __("Please try again in a moment."),
				indicator: "red",
			});
		})
		.always(() => {
			button.disabled = false;
			button.innerHTML = label;
		});
}

function show_candidates_dialog(drive, data) {
	const dialog = new frappe.ui.Dialog({
		title: __("Candidates — {0}", [drive.campus_invite_name]),
		size: "extra-large",
		fields: [{ fieldtype: "HTML", fieldname: "candidates" }],
	});
	dialog.fields_dict.candidates.$wrapper.html(candidates_html(data));
	dialog.show();
}

function candidates_html(data) {
	const summary = data.summary || {};
	const rows = data.candidates || [];

	if (!rows.length) {
		return `${CANDIDATE_STYLES}
			<div class="tpo-cand-empty">
				<b>${__("No candidates yet")}</b>
				<div>${__(
					"Candidates you add through Add Candidates will appear here, along with what has happened to each of them."
				)}</div>
			</div>`;
	}

	// Counted, not just listed: "how many, and in what state" is the question the
	// card could not answer.
	const chips = [
		[__("Total"), summary.total, "tpo-cand-total"],
		[__("Applied"), summary.applied, "tpo-cand-applied"],
		[__("Yet to apply"), summary.registered, "tpo-cand-registered"],
		[__("Draft"), summary.draft, "tpo-cand-draft"],
	]
		.filter(([, count]) => count)
		.map(
			([text, count, cls]) =>
				`<span class="tpo-cand-chip ${cls}"><b>${count}</b> ${esc(text)}</span>`
		)
		.join("");

	return `${CANDIDATE_STYLES}
		<div class="tpo-cand-summary">${chips}</div>
		<div class="tpo-cand-scroll">
		<table class="tpo-cand-table">
			<thead>
				<tr>
					<th>#</th>
					<th>${__("Candidate")}</th>
					<th>${__("Contact")}</th>
					<th>${__("Status")}</th>
					<th>${__("Application")}</th>
				</tr>
			</thead>
			<tbody>${rows.map(candidate_row).join("")}</tbody>
		</table>
		</div>`;
}

function candidate_row(candidate, index) {
	const applications = candidate.applications || [];
	const application_html = applications.length
		? applications
				.map(
					(a) => `
					<div class="tpo-cand-app">
						<div class="tpo-cand-role">${esc(a.job_title || __("Applied"))}</div>
						<div class="tpo-cand-sub">
							${esc(a.status || "")}${a.stage ? " · " + esc(a.stage) : ""}
						</div>
					</div>`
				)
				.join("")
		: `<span class="tpo-cand-sub">${
				candidate.state === "Draft"
					? __("Registration not submitted yet")
					: __("Has not applied yet")
		  }</span>`;

	const state_label = candidate.spot_registered
		? __("Registered at venue")
		: __(candidate.state);

	return `
		<tr>
			<td class="tpo-cand-idx">${index + 1}</td>
			<td>
				<div class="tpo-cand-name">${esc(candidate.full_name)}</div>
				${candidate.institute ? `<div class="tpo-cand-sub">${esc(candidate.institute)}</div>` : ""}
			</td>
			<td>
				<div>${esc(candidate.email_id || "")}</div>
				${candidate.mobile_number ? `<div class="tpo-cand-sub">${esc(candidate.mobile_number)}</div>` : ""}
			</td>
			<td>
				<span class="tpo-cand-badge ${STATE_CLASS[candidate.state] || ""}">${esc(state_label)}</span>
			</td>
			<td>${application_html}</td>
		</tr>`;
}

// Inline because the dialog is rendered in the page, outside this block's shadow
// root, so tpo_campus_drives.css does not reach it.
const CANDIDATE_STYLES = `
<style>
	.tpo-cand-summary { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
	.tpo-cand-chip { border-radius:999px; padding:4px 12px; font-size:12px;
		background:var(--gray-100,#f4f5f6); color:var(--text-color,#1f272e); }
	.tpo-cand-chip.tpo-cand-applied { background:var(--green-100,#e3f5e9); color:var(--green-700,#1a7f43); }
	.tpo-cand-chip.tpo-cand-registered { background:var(--blue-100,#e5eefc); color:var(--blue-700,#1257ad); }
	.tpo-cand-chip.tpo-cand-draft { background:var(--orange-100,#fdf0dd); color:var(--orange-700,#9a5b00); }
	.tpo-cand-scroll { overflow-x:auto; }
	.tpo-cand-table { width:100%; border-collapse:collapse; font-size:13px; }
	.tpo-cand-table th, .tpo-cand-table td { text-align:left; padding:8px 10px; vertical-align:top;
		border-bottom:1px solid var(--border-color,#e2e6e9); }
	.tpo-cand-table th { font-weight:600; color:var(--text-muted,#6b7580); white-space:nowrap; }
	.tpo-cand-idx { color:var(--text-muted,#6b7580); width:36px; }
	.tpo-cand-name { font-weight:600; }
	.tpo-cand-sub { color:var(--text-muted,#6b7580); font-size:12px; }
	.tpo-cand-role { font-weight:500; }
	.tpo-cand-app + .tpo-cand-app { margin-top:6px; }
	.tpo-cand-badge { display:inline-block; border-radius:6px; padding:2px 8px; font-size:12px;
		background:var(--gray-100,#f4f5f6); white-space:nowrap; }
	.tpo-cand-badge.tpo-cand-applied { background:var(--green-100,#e3f5e9); color:var(--green-700,#1a7f43); }
	.tpo-cand-badge.tpo-cand-registered { background:var(--blue-100,#e5eefc); color:var(--blue-700,#1257ad); }
	.tpo-cand-badge.tpo-cand-draft { background:var(--orange-100,#fdf0dd); color:var(--orange-700,#9a5b00); }
	.tpo-cand-empty { padding:24px; text-align:center; color:var(--text-muted,#6b7580); }
</style>`;

function add_candidates(drive) {
	// route_options (set by new_doc) are applied as defaults on the new document,
	// so the form opens with this drive's invite already selected. The form's own
	// refresh handler then resolves the TPO's Institute from that invite.
	frappe.new_doc("Candidate Registration", { campus_invite: drive.name });
}
