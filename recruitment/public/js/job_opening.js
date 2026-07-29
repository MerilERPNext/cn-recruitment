/* global frappe, $ */
/**
 * Job Opening form — Application Fields UI on the Job application tab.
 * Mirrors the Job Applicant Profile Settings layout (section list LEFT,
 * grouped column table RIGHT, only the active section renders) so the two
 * pages look and behave identically.
 *
 * Rows come from get_job_applicant_profile_template (settings defaults
 * merged with any opening-specific overrides). Toggling a control upserts
 * the matching row in cur_frm.doc.custom_application_fields and dirties
 * the form so Save persists.
 */

(function () {
	// Column definitions, the stylesheet and every cell renderer are shared with
	// Job Applicant Profile Settings — see public/js/applicant_fields_ui.js. Only
	// the parts that differ live here: this tab renders the merged template and
	// upserts per-opening overrides into `custom_application_fields`.
	const AFU = recruitment.applicant_fields_ui;
	const escapeHtml = AFU.escapeHtml;
	const injectStyles = AFU.injectStyles;

	function renderUI(host, state, frm) {
		const rows = state.rows || [];

		const sectionsList = [];
		const counts = {};
		rows.forEach((r) => {
			const s = r.section || "General";
			if (!(s in counts)) { sectionsList.push(s); counts[s] = 0; }
			counts[s] += 1;
		});

		if (!rows.length) {
			host.innerHTML = AFU.emptyState(__("No fields to configure."));
			return;
		}

		const active = state.activeSection && sectionsList.includes(state.activeSection)
			? state.activeSection
			: sectionsList[0];
		state.activeSection = active;

		const sideHtml = `<div class="apf-side-head">${__("Sections")}</div>` + sectionsList.map((s) => `
			<div class="apf-side-item ${s === active ? "active" : ""}" data-section="${escapeHtml(s)}" title="${escapeHtml(s)}">
				<span>${escapeHtml(s)}</span>
				<span class="apf-count">${counts[s]}</span>
			</div>
		`).join("");

		const sectionRows = rows.filter((r) => (r.section || "General") === active);
		const bodyHtml = sectionRows.length
			? sectionRows.map((r, i) => AFU.renderRow(r, i)).join("")
			: `<tr><td colspan="${AFU.TOTAL_COLS}">${AFU.emptyState(__("No fields in this section."))}</td></tr>`;

		host.innerHTML = `
			<div class="apf-container">
				<div class="apf-side">${sideHtml}</div>
				<div class="apf-main">
					<div class="apf-head">
						<div>
							<div class="apf-head-sub">${__("Application Fields")}</div>
							<div class="apf-head-title">${escapeHtml(active)}</div>
						</div>
					</div>
					${AFU.toolbarHtml()}
					<div class="apf-scroll">
						<table class="apf-table">
							<thead>${AFU.headerRows()}</thead>
							<tbody>${bodyHtml}</tbody>
						</table>
					</div>
				</div>
			</div>`;

		bindEvents(host, state, frm);
	}

	function bindEvents(host, state, frm) {
		// Section switching
		host.querySelectorAll(".apf-side-item").forEach((el) => {
			el.addEventListener("click", () => {
				state.activeSection = el.getAttribute("data-section");
				renderUI(host, state, frm);
			});
		});

		// Editable label
		host.querySelectorAll("input.apf-label-input").forEach((inp) => {
			inp.addEventListener("change", () => {
				const ref = inp.getAttribute("data-ref");
				const newLabel = inp.value.trim() || ref;
				inp.value = newLabel;
				const stateRow = state.rows.find((r) => r.reference_name === ref);
				if (stateRow) stateRow.display_name = newLabel;
				const docRow = upsertOpeningRow(frm, ref, state);
				docRow.display_name = newLabel;
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			});
		});

		// Parent field toggles
		host.querySelectorAll("input[type=checkbox][data-ref][data-col]").forEach((cb) => {
			if (cb.classList.contains("apf-child-toggle")) return;
			cb.addEventListener("change", () => {
				const ref = cb.getAttribute("data-ref");
				const col = cb.getAttribute("data-col");
				const checked = cb.checked ? 1 : 0;
				const stateRow = state.rows.find((r) => r.reference_name === ref);
				if (stateRow) stateRow[col] = checked;
				const docRow = upsertOpeningRow(frm, ref, state);
				docRow[col] = checked;
				frm.refresh_field("custom_application_fields");
				frm.dirty();
				AFU.refreshCounts(host);
			});
		});

		// Parent field selects
		host.querySelectorAll("select[data-ref][data-col]").forEach((sel) => {
			sel.addEventListener("change", () => {
				const ref = sel.getAttribute("data-ref");
				const col = sel.getAttribute("data-col");
				const stateRow = state.rows.find((r) => r.reference_name === ref);
				if (stateRow) stateRow[col] = sel.value;
				const docRow = upsertOpeningRow(frm, ref, state);
				docRow[col] = sel.value;
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			});
		});

		// Child table field visibility toggles
		host.querySelectorAll("input.apf-child-toggle").forEach((cb) => {
			cb.addEventListener("change", () => {
				const parentRef = cb.getAttribute("data-parent-ref");
				const childRef  = cb.getAttribute("data-child-ref");
				const col       = cb.getAttribute("data-col");
				const checked   = cb.checked ? 1 : 0;

				// Update state
				const stateRow = state.rows.find((r) => r.reference_name === parentRef);
				if (stateRow) {
					let cfg = {};
					try { cfg = JSON.parse(stateRow.child_field_config || "{}"); } catch (e) { /* ignore */ }
					if (cfg[childRef]) cfg[childRef][col] = checked;
					stateRow.child_field_config = JSON.stringify(cfg);
				}

				// Update doc row
				const docRow = upsertOpeningRow(frm, parentRef, state);
				let cfg = {};
				try { cfg = JSON.parse(docRow.child_field_config || "{}"); } catch (e) { /* ignore */ }
				if (cfg[childRef]) cfg[childRef][col] = checked;
				docRow.child_field_config = JSON.stringify(cfg);

				frm.refresh_field("custom_application_fields");
				frm.dirty();
			});
		});

		// Expand / collapse child field config panels
		host.querySelectorAll(".apf-expand").forEach((btn) => {
			btn.addEventListener("click", () => {
				const ref = btn.getAttribute("data-ref");
				const childRow = host.querySelector(`.apf-child-row[data-parent-ref="${ref}"]`);
				if (!childRow) return;
				const open = childRow.style.display !== "none";
				childRow.style.display = open ? "none" : "";
				btn.textContent = open ? "▶ Child Fields" : "▼ Child Fields";
			});
		});

		// Delete
		host.querySelectorAll(".apf-delete").forEach((btn) => {
			btn.addEventListener("click", () => {
				const ref = btn.getAttribute("data-ref");
				frappe.confirm(`Remove ${ref}?`, () => {
					state.rows = state.rows.filter((r) => r.reference_name !== ref);
					const idx = (frm.doc.custom_application_fields || []).findIndex((r) => r.reference_name === ref);
					if (idx >= 0) {
						frm.doc.custom_application_fields.splice(idx, 1);
						frm.refresh_field("custom_application_fields");
					}
					frm.dirty();
					renderUI(host, state, frm);
				});
			});
		});

		// Select-all
		// Search, per-channel tallies and the bulk bar. `applyBulk` is the only
		// per-page part: it upserts each change as a per-opening override.
		AFU.bindToolbar(host, {
			applyBulk(col, value, refs) {
				refs.forEach((ref) => {
					const stateRow = state.rows.find((r) => r.reference_name === ref);
					if (stateRow) stateRow[col] = value;
					upsertOpeningRow(frm, ref, state)[col] = value;
				});
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			},
		});
	}

	function mountUI(frm) {
		const wrapper = frm.fields_dict.custom_application_fields_ui;
		if (!wrapper) return;
		const host = wrapper.$wrapper && wrapper.$wrapper.find("#jo-app-fields-host")[0];
		if (!host) return;

		injectStyles();
		host.innerHTML = AFU.emptyState(__("Loading application fields…"));

		frappe.call({
			method: "recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings.get_job_applicant_profile_template",
			args: { opening: frm.is_new() ? null : frm.doc.name },
			callback: (r) => {
				const msg = (r && r.message) || { sections: [], rows: [] };
				const state = { rows: msg.rows || [], activeSection: null };

				// Overlay any unsaved edits the user already made on this opening.
				(frm.doc.custom_application_fields || []).forEach((docRow) => {
					const stateRow = state.rows.find((sr) => sr.reference_name === docRow.reference_name);
					if (!stateRow) return;
					["view_careers", "mandatory_careers", "view_ijp", "mandatory_ijp",
					 "view_refer", "mandatory_refer", "view_campus", "mandatory_campus",
					 "view_preoffer", "mandatory_preoffer",
					 "ctq_flag"].forEach((col) => { stateRow[col] = docRow[col] ? 1 : 0; });
					["visibility", "editability", "preoffer_visibility", "preoffer_edit_approve"].forEach((col) => {
						if (docRow[col]) stateRow[col] = docRow[col];
					});
					if (docRow.child_field_config) stateRow.child_field_config = docRow.child_field_config;
					if (docRow.display_name) stateRow.display_name = docRow.display_name;
				});

				renderUI(host, state, frm);
			},
			error: () => {
				host.innerHTML = AFU.emptyState(__("Failed to load application fields."));
			},
		});
	}

	frappe.ui.form.on("Job Opening", {
		refresh(frm) { mountUI(frm); },
	});
})();

// Recruitment Settings → "Allow creation of Position(s) at jobs directly".
// When OFF (default), the Position Details table on the Job Opening is read-only,
// so positions can't be added directly here — they come from a Job Requisition.
// The requisition → opening server flow populates positions programmatically and
// is unaffected by this form-level control.
frappe.ui.form.on("Job Opening", {
	refresh(frm) {
		if (!frm.fields_dict.custom_position_details) return;
		frappe.db
			.get_single_value("Recruitment Settings", "allow_position_creation_at_jobs_directly")
			.then((allowed) => {
				frm.set_df_property("custom_position_details", "read_only", allowed ? 0 : 1);
				frm.refresh_field("custom_position_details");
			});
	},
});

// Cascading selection: Company -> Department -> Designation -> Functional Area.
// Department is scoped to the chosen Company (Department.company); Designation is
// scoped to the chosen Department (Designation.custom_department). Changing a field
// resets the ones below it so a stale child can't survive a new parent.
//
// Functional Area is defined ON the Designation (Designation.custom_functional_area,
// a mandatory Link) — the opening just inherits it.
//
// add_fetch does BOTH halves of that with no added round trips: the value rides along
// on the `frappe.client.validate_link` call the Designation link already fires on every
// change (it just asks for one more column), and clearing the designation clears the
// fetched field too. Hence no `designation` handler and no `refresh` lookup — a lookup
// on refresh would re-hit the DB on every reload/save/tab switch for a value the doc
// already carries.
frappe.ui.form.on("Job Opening", {
	setup(frm) {
		frm.add_fetch("designation", "custom_functional_area", "custom_functional_area");

		// Pin the picker to the designation's functional area. Reads the doc's own
		// value (kept in sync by the fetch above) rather than re-querying the
		// Designation, so opening the dropdown costs nothing extra. No designation
		// chosen yet -> field is empty -> list stays unfiltered.
		frm.set_query("custom_functional_area", () => {
			const fa = frm.doc.custom_functional_area;
			return fa ? { filters: { name: fa } } : {};
		});
	},
});

frappe.ui.form.on("Job Opening", {
	setup(frm) {
		// Department: enabled only, scoped to the chosen Company.
		frm.set_query("department", () => {
			const filters = { disabled: 0 };
			if (frm.doc.company) filters.company = frm.doc.company;
			return { filters };
		});
		// Designation: Active status only, scoped to the chosen Department.
		frm.set_query("designation", () => {
			const filters = { custom_status: "Active" };
			if (frm.doc.department) filters.custom_department = frm.doc.department;
			return { filters };
		});
	},
	company(frm) {
		if (frm.doc.department) frm.set_value("department", null);
		if (frm.doc.designation) frm.set_value("designation", null);
	},
	department(frm) {
		if (frm.doc.designation) frm.set_value("designation", null);
	},
});
