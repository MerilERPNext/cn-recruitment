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

			<div class="tpo-drive-actions">
				<button class="btn btn-primary btn-sm" data-action="add-candidates" data-index="${index}">
					${__("Add Candidates")}
				</button>
			</div>
		</div>`;
}

function add_candidates(drive) {
	// route_options (set by new_doc) are applied as defaults on the new document,
	// so the form opens with this drive's invite already selected. The form's own
	// refresh handler then resolves the TPO's Institute from that invite.
	frappe.new_doc("Candidate Registration", { campus_invite: drive.name });
}
