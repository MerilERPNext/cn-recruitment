// Behaviour for the "External Recruiter Openings" Custom HTML Block.
//
// Frappe runs this inside an IIFE with `root_element` bound to the block's shadow
// root, so every DOM lookup must go through it - document.querySelector would
// escape into the page. `frappe` and `$` are page globals and are available.
//
// "Submit Candidate" opens the ordinary Job Applicant form with the opening
// already filled in. That form is deliberately the destination rather than a
// bespoke dialog: it already carries the resume upload, the duplicate check and
// every custom field this site has added, so none of that has to be rebuilt here
// (or kept in step with it later).

const API = "recruitment.recruitment.external_recruiter_portal";

const esc = (value) => frappe.utils.escape_html(value == null ? "" : String(value));

const list_region = root_element.querySelector("[data-region='list']");

let can_create = false;
let can_read_applicants = false;

root_element.querySelector("[data-action='refresh']").addEventListener("click", () => load());

load();

function load() {
	list_region.innerHTML = `<div class="text-muted">${__("Loading your openings…")}</div>`;
	frappe
		.call({ method: `${API}.get_my_openings` })
		.then((r) => {
			const data = r.message || {};
			can_create = !!data.can_create_applicant;
			can_read_applicants = !!data.can_read_applicants;
			render(data.openings || []);
		})
		.catch(() => {
			list_region.innerHTML = `<div class="er-empty">${__(
				"Could not load your openings. Please refresh."
			)}</div>`;
		});
}

function render(openings) {
	if (!openings.length) {
		list_region.innerHTML = `
			<div class="er-empty">
				<div class="er-empty-title">${__("No openings assigned to you yet")}</div>
				<div>${__(
					"A role will appear here as soon as the recruitment team posts one to you. Nothing to do until then."
				)}</div>
			</div>`;
		return;
	}

	list_region.innerHTML = openings.map(card_html).join("");

	list_region.querySelectorAll("[data-action='submit-candidate']").forEach((button) => {
		const opening = openings[Number(button.dataset.index)];
		button.addEventListener("click", () => submit_candidate(opening));
	});
	list_region.querySelectorAll("[data-action='view-candidates']").forEach((button) => {
		const opening = openings[Number(button.dataset.index)];
		button.addEventListener("click", () => view_candidates(opening, button));
	});
}

function card_html(opening, index) {
	// Department / location / employment type / experience: whichever the opening
	// actually carries. Filtered rather than placeholdered, so a sparsely filled
	// opening gets a short card instead of a row of "-".
	const facts = [opening.department, opening.location, opening.employment_type, opening.experience]
		.filter(Boolean)
		.map((fact) => `<span class="er-fact">${esc(fact)}</span>`)
		.join("");

	const pipeline = (opening.pipeline || [])
		.map(
			(p) =>
				`<span class="er-pipe er-pipe-${frappe.scrub(p.status || "", "-")}">
					<b>${p.count}</b> ${esc(p.status)}
				</span>`
		)
		.join("");

	return `
		<div class="er-card" data-accent="${index % 5}">
			<div class="er-card-head">
				<div>
					<div class="er-role">${esc(opening.job_title)}</div>
					<div class="er-sub">
						${esc(opening.name)}${opening.designation ? " · " + esc(opening.designation) : ""}
					</div>
				</div>
				<span class="er-status er-status-${frappe.scrub(opening.status || "open", "-")}">
					${esc(opening.status)}
				</span>
			</div>

			${facts ? `<div class="er-facts">${facts}</div>` : ""}

			${
				can_read_applicants
					? `<div>
							<div class="er-meta-label">${__("Candidates")}</div>
							<span class="er-count">${opening.candidate_count} <small>${__(
							"candidates"
					  )}</small></span>
							${
								opening.my_count
									? `<span class="er-mine-note">${opening.my_count} ${__("by you")}</span>`
									: ""
							}
						</div>
						${pipeline ? `<div>${pipeline}</div>` : ""}`
					: ""
			}

			${closing_note(opening)}

			<div class="er-actions">
				${
					can_create
						? `<button class="btn btn-primary btn-sm" data-action="submit-candidate" data-index="${index}">
								${__("Submit Candidate")}
							</button>`
						: ""
				}
				${
					can_read_applicants
						? `<button class="btn btn-default btn-sm" data-action="view-candidates" data-index="${index}">
								${__("View Candidates")}
							</button>`
						: ""
				}
			</div>
		</div>`;
}

/**
 * When this recruiter's own posting window ends.
 *
 * Not the same as the opening closing. The opening can stay open for months while
 * this recruiter's window ends on Friday, at which point the card simply stops
 * appearing — the permission query drops openings whose window has passed. Saying
 * so a week ahead is the difference between "I have until Friday" and "it vanished
 * and nobody told me".
 */
function closing_note(opening) {
	const days = opening.days_left;
	if (days == null || days > 7) {
		return "";
	}
	const on = frappe.datetime.str_to_user(opening.posting_closes_on);
	const message =
		days < 0
			? __("Your posting for this role ended on {0}.", [on])
			: days === 0
			? __("Your posting for this role ends today ({0}).", [on])
			: __("Your posting for this role ends in {0} day(s), on {1}.", [days, on]);
	return `<div class="er-note">${message}</div>`;
}

// ---------------------------------------------------------------------------
// "View Candidates" — where each candidate on this opening has actually got to.
//
// The card can only say how many there are, which is the least interesting half
// of the question. A submitted candidate then moves through the pipeline without
// the recruiter being told, so between "I sent them" and "they were hired" there
// is a gap only this list can show: status plus the site's own hiring stage.
//
// Rendered in a page-level dialog rather than inside the block: the block lives in
// a shadow root, so its stylesheet does not reach a dialog, and the markup below
// carries its own.
// ---------------------------------------------------------------------------

function view_candidates(opening, button) {
	const label = button.innerHTML;
	button.disabled = true;
	button.innerHTML = __("Loading…");

	frappe
		.call({ method: `${API}.get_opening_candidates`, args: { job_opening: opening.name } })
		.then((r) => show_candidates_dialog(opening, r.message || {}))
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

function show_candidates_dialog(opening, data) {
	const dialog = new frappe.ui.Dialog({
		title: __("Candidates — {0}", [opening.job_title]),
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
			<div class="er-cand-empty">
				<b>${__("No candidates yet")}</b>
				<div>${__(
					"Candidates you send through Submit Candidate will appear here, along with what has happened to each of them."
				)}</div>
			</div>`;
	}

	// Counted, not just listed: "how many, and in what state" is the question the
	// card could not answer.
	const chips = [
		[__("Total"), summary.total, "er-cand-total"],
		[__("Submitted by you"), summary.mine, "er-cand-mine"],
	]
		.filter(([, count]) => count)
		.map(([text, count, cls]) => `<span class="er-cand-chip ${cls}"><b>${count}</b> ${esc(text)}</span>`)
		.concat(
			(summary.pipeline || []).map(
				(p) =>
					`<span class="er-cand-chip er-cand-${frappe.scrub(p.status || "", "-")}"><b>${
						p.count
					}</b> ${esc(p.status)}</span>`
			)
		)
		.join("");

	return `${CANDIDATE_STYLES}
		<div class="er-cand-summary">${chips}</div>
		<div class="er-cand-scroll">
		<table class="er-cand-table">
			<thead>
				<tr>
					<th>#</th>
					<th>${__("Candidate")}</th>
					<th>${__("Contact")}</th>
					<th>${__("Status")}</th>
					<th>${__("Stage")}</th>
				</tr>
			</thead>
			<tbody>${rows.map(candidate_row).join("")}</tbody>
		</table>
		</div>`;
}

function candidate_row(candidate, index) {
	return `
		<tr>
			<td class="er-cand-idx">${index + 1}</td>
			<td>
				<div class="er-cand-name">${esc(candidate.full_name)}</div>
				${
					candidate.mine
						? `<div class="er-cand-sub">${__("Submitted by you")}</div>`
						: candidate.source
						? `<div class="er-cand-sub">${esc(candidate.source)}</div>`
						: ""
				}
			</td>
			<td>
				<div>${esc(candidate.email_id || "")}</div>
				${candidate.phone_number ? `<div class="er-cand-sub">${esc(candidate.phone_number)}</div>` : ""}
			</td>
			<td>
				<span class="er-cand-badge er-cand-${frappe.scrub(candidate.status || "", "-")}">
					${esc(candidate.status)}
				</span>
			</td>
			<td>
				${
					candidate.stage
						? esc(candidate.stage)
						: `<span class="er-cand-sub">${__("Not started")}</span>`
				}
			</td>
		</tr>`;
}

// Inline because the dialog is rendered in the page, outside this block's shadow
// root, so external_recruiter_openings.css does not reach it.
const CANDIDATE_STYLES = `
<style>
	.er-cand-summary { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
	.er-cand-chip { border-radius:999px; padding:4px 12px; font-size:12px;
		background:var(--gray-100,#f4f5f6); color:var(--text-color,#1f272e); }
	.er-cand-chip.er-cand-mine { background:var(--green-100,#e3f5e9); color:var(--green-700,#1a7f43); }
	.er-cand-chip.er-cand-interview { background:var(--blue-100,#e5eefc); color:var(--blue-700,#1257ad); }
	.er-cand-chip.er-cand-shortlisted { background:var(--purple-100,#ece7fb); color:var(--purple-600,#6d4bd8); }
	.er-cand-chip.er-cand-hired, .er-cand-chip.er-cand-accepted { background:var(--green-100,#e3f5e9); color:var(--green-700,#1a7f43); }
	.er-cand-chip.er-cand-rejected { background:var(--red-100,#fce8e8); color:var(--red-600,#c0392b); }
	.er-cand-chip.er-cand-hold, .er-cand-chip.er-cand-draft { background:var(--orange-100,#fdf0dd); color:var(--orange-700,#9a5b00); }
	.er-cand-scroll { overflow-x:auto; }
	.er-cand-table { width:100%; border-collapse:collapse; font-size:13px; }
	.er-cand-table th, .er-cand-table td { text-align:left; padding:8px 10px; vertical-align:top;
		border-bottom:1px solid var(--border-color,#e2e6e9); }
	.er-cand-table th { font-weight:600; color:var(--text-muted,#6b7580); white-space:nowrap; }
	.er-cand-idx { color:var(--text-muted,#6b7580); width:36px; }
	.er-cand-name { font-weight:600; }
	.er-cand-sub { color:var(--text-muted,#6b7580); font-size:12px; }
	.er-cand-badge { display:inline-block; border-radius:6px; padding:2px 8px; font-size:12px;
		background:var(--gray-100,#f4f5f6); white-space:nowrap; }
	.er-cand-badge.er-cand-interview { background:var(--blue-100,#e5eefc); color:var(--blue-700,#1257ad); }
	.er-cand-badge.er-cand-shortlisted { background:var(--purple-100,#ece7fb); color:var(--purple-600,#6d4bd8); }
	.er-cand-badge.er-cand-hired, .er-cand-badge.er-cand-accepted { background:var(--green-100,#e3f5e9); color:var(--green-700,#1a7f43); }
	.er-cand-badge.er-cand-rejected { background:var(--red-100,#fce8e8); color:var(--red-600,#c0392b); }
	.er-cand-badge.er-cand-hold, .er-cand-badge.er-cand-draft { background:var(--orange-100,#fdf0dd); color:var(--orange-700,#9a5b00); }
	.er-cand-empty { padding:24px; text-align:center; color:var(--text-muted,#6b7580); }
</style>`;

function submit_candidate(opening) {
	// route_options (set by new_doc) are applied as defaults on the new document,
	// so the form opens with this opening already selected.
	frappe.new_doc("Job Applicant", { job_title: opening.name });
}
