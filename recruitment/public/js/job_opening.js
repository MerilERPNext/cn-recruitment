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

	// An override row wins as a WHOLE over the settings default (see
	// get_job_applicant_profile_template), so a row created to record one toggle
	// must carry the merged value of every other column — otherwise switching
	// CAREERS on here would silently clear the IJP and REFER defaults.
	const OVERRIDE_CHECK_COLS = [
		"view_careers", "mandatory_careers",
		"view_ijp", "mandatory_ijp",
		"view_refer", "mandatory_refer",
		"view_campus", "mandatory_campus",
		"view_preoffer", "mandatory_preoffer",
		"ctq_flag",
	];
	// GENERAL / PRE-OFFER RULES role lists (see field_role_permissions.py).
	const OVERRIDE_ROLE_COLS = {
		visibility: '["All"]',
		editability: '["All"]',
		preoffer_visibility: '["All"]',
		preoffer_edit_approve: '["All"]',
	};

	// The only columns an opening may still write on a locked field.
	const RULE_COLS = new Set(Object.keys(OVERRIDE_ROLE_COLS));

	/** Whether `ref` is locked in Job Applicant Profile Settings. */
	function isLocked(state, ref) {
		const tpl = (state.rows || []).find((r) => r.reference_name === ref);
		return !!(tpl && tpl.locked);
	}

	/**
	 * The opening's own row for `ref`, created from the merged template if absent.
	 *
	 * Returns a throwaway object for a locked field so every caller can go on
	 * assigning to it without a guard of its own, while nothing reaches the
	 * document. The controls for such a row are rendered disabled, so this is the
	 * belt to that braces — and `enforce_locked_fields` on the server is the rule
	 * neither of them can be.
	 *
	 * `col` is the column being written; a locked field accepts only RULE_COLS.
	 */
	function upsertOpeningRow(frm, ref, state, col) {
		if (isLocked(state, ref) && !RULE_COLS.has(col)) return {};

		let docRow = (frm.doc.custom_application_fields || []).find((r) => r.reference_name === ref);
		if (docRow) return docRow;

		const tpl = (state.rows || []).find((r) => r.reference_name === ref) || {};
		const values = {
			section: tpl.section || "General",
			reference_name: ref,
			display_name: tpl.display_name || ref,
			fieldtype: tpl.fieldtype || "",
			child_field_config: tpl.child_field_config || "",
		};
		OVERRIDE_CHECK_COLS.forEach((c) => { values[c] = tpl[c] ? 1 : 0; });
		Object.keys(OVERRIDE_ROLE_COLS).forEach((c) => {
			values[c] = tpl[c] || OVERRIDE_ROLE_COLS[c];
		});
		return frm.add_child("custom_application_fields", values);
	}

	// Settings positions arrive spaced ORDER_STEP apart, so a moved field takes the
	// midpoint of the gap and its neighbours are left untouched. Renumbering every
	// row 1..N instead would turn all ~100 fields into overrides — and, since an
	// override wins as a whole, cut them off from later Profile Settings changes.
	const ORDER_STEP = 1000;

	/**
	 * Write the new positions of the just-moved rows (left as one contiguous block
	 * by `applyMove`). Only when a gap has been halved down to nothing does the
	 * whole list get respaced.
	 */
	function assignOrders(frm, state, movedRefs) {
		const rows = state.rows || [];
		const moved = new Set(movedRefs);
		const num = (r) => Number(r && r.display_order) || 0;

		const first = rows.findIndex((r) => moved.has(r.reference_name));
		if (first < 0) return;
		let last = first;
		while (last + 1 < rows.length && moved.has(rows[last + 1].reference_name)) last += 1;
		const count = last - first + 1;

		const prev = first > 0 ? num(rows[first - 1]) : 0;
		const next = last + 1 < rows.length
			? num(rows[last + 1])
			: prev + ORDER_STEP * (count + 1);

		const step = Math.floor((next - prev) / (count + 1));
		const write = (r, order) => {
			r.display_order = order;
			const docRow = upsertOpeningRow(frm, r.reference_name, state);
			docRow.section = r.section || "General";
			docRow.display_order = order;
		};

		if (step < 1) {
			// Gap exhausted — respace everything so there is room again.
			rows.forEach((r, i) => write(r, (i + 1) * ORDER_STEP));
			return;
		}
		for (let k = 0; k < count; k++) write(rows[first + k], prev + step * (k + 1));
	}

	/**
	 * Reposition fields for THIS opening only: drop on a row to reorder inside the
	 * section, drop on a sidebar section (or use the grip / bulk Move) to change
	 * section.
	 *
	 * Placement is per-opening data, so it can't be written to the settings table —
	 * it is recorded on the opening's own rows as `section` + `display_order`, which
	 * the merged template reads back in preference to the settings placement.
	 */
	function moveRows(host, state, frm, refs, dest) {
		if (!refs.length) return;   // every selected row was locked
		const result = AFU.applyMove(
			state.rows || [], refs, dest,
			(r) => r.section || "General",
			(r, s) => { r.section = s; }
		);
		if (!result) return;

		state.rows = result.rows;
		assignOrders(frm, state, refs);
		frm.refresh_field("custom_application_fields");
		frm.dirty();

		state.activeSection = result.section;
		renderUI(host, state, frm);
		frappe.show_alert({
			message: __("{0} field(s) moved to {1}", [refs.length, escapeHtml(result.section)]),
			indicator: "green",
		});
	}

	function renderUI(host, state, frm) {
		const rows = state.rows || [];

		const sectionsList = [];
		const counts = {};
		rows.forEach((r) => {
			const s = r.section || "General";
			if (!(s in counts)) { sectionsList.push(s); counts[s] = 0; }
			counts[s] += 1;
		});

		// Keep a just-emptied section listed so it stays a drop target and the move
		// can be undone without reloading the form.
		(state.knownSections || []).forEach((s, i) => {
			if (sectionsList.includes(s)) return;
			sectionsList.splice(Math.min(i, sectionsList.length), 0, s);
			counts[s] = 0;
		});
		state.knownSections = sectionsList.slice();

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
		`).join("") + `<div class="apf-side-hint">${
			__("Drag a field's ⠿ handle onto a section to move it there, or drop it between rows to reorder. Placement applies to this opening only.")
		}</div>`;

		// Search spans every section; an empty query shows the active section.
		const q = (state.search || "").trim().toLowerCase();
		const sectionRows = q
			? rows.filter((r) => `${r.display_name || ""} ${r.reference_name || ""}`.toLowerCase().includes(q))
			: rows.filter((r) => (r.section || "General") === active);
		// Not lockable here: locked fields render frozen with a padlock badge.
		const rowOptions = {
			lockable: false,
			searching: !!q,
			// Applicability badges for scoped fields.
			openingApplicability: state.appl || {},
		};
		const offNames = (state.rows || [])
			.filter((r) => (state.appl || {})[r.reference_name] && !state.appl[r.reference_name].applicable)
			.map((r) => r.display_name || r.reference_name);
		const bodyHtml = sectionRows.length
			? sectionRows.map((r, i) => AFU.renderRow(r, i, rowOptions)).join("")
			: `<tr><td colspan="${AFU.totalCols(rowOptions)}">${AFU.emptyState(
					q ? __("No field matches “{0}”.", [state.search]) : __("No fields in this section.")
				)}</td></tr>`;

		host.innerHTML = `
			<div class="apf-container">
				<div class="apf-side">${sideHtml}</div>
				<div class="apf-main">
					<div class="apf-head">
						<div>
							<div class="apf-head-sub">${__("Application Fields")}</div>
							<div class="apf-head-title">${
								q ? __("Search results") : escapeHtml(active)
							}</div>
							${offNames.length ? `<div class="apf-appl-note">${__(
								"Not shown on this opening: {0}. Their Applicability rule in Job Applicant Profile Settings doesn't include this company or assignment, so candidates here never see them.",
								[`<b>${offNames.map(escapeHtml).join(", ")}</b>`]
							)}</div>` : ""}
						</div>
					</div>
					${AFU.toolbarHtml(sectionsList, { search: state.search || "" })}
					<div class="apf-scroll">
						<table class="apf-table">
							<thead>${AFU.headerRows(rowOptions)}</thead>
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
				// Picking a section clears the search.
				state.search = "";
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
				const docRow = upsertOpeningRow(frm, ref, state, col);
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
				const docRow = upsertOpeningRow(frm, ref, state, col);
				docRow[col] = sel.value;
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			});
		});

		// Role pickers — live even on a locked row (see RULE_COLS).
		AFU.bindRoleCells(
			host,
			(ref, col) => {
				const stateRow = state.rows.find((r) => r.reference_name === ref);
				return stateRow ? stateRow[col] : "";
			},
			(ref, col, json) => {
				const stateRow = state.rows.find((r) => r.reference_name === ref);
				if (stateRow) stateRow[col] = json;
				upsertOpeningRow(frm, ref, state, col)[col] = json;
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			}
		);

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
				if (isLocked(state, ref)) return;
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

		// Search, per-channel tallies, the bulk bar and drag-to-move. `applyBulk`
		// and `moveRows` are the only per-page parts: they upsert each change as a
		// per-opening override.
		AFU.bindToolbar(host, {
			totalFields: (state.rows || []).length,
			searchActive: !!(state.search || "").trim(),
			onSearch(value) {
				state.search = value;
				renderUI(host, state, frm);
			},
			moveRows(refs, dest) {
				moveRows(host, state, frm, refs.filter((ref) => !isLocked(state, ref)), dest);
			},
			applyBulk(col, value, refs) {
				refs.filter((ref) => !isLocked(state, ref)).forEach((ref) => {
					const stateRow = state.rows.find((r) => r.reference_name === ref);
					if (stateRow) stateRow[col] = value;
					upsertOpeningRow(frm, ref, state, col)[col] = value;
				});
				frm.refresh_field("custom_application_fields");
				frm.dirty();
			},
		});
	}

	// `refresh` fires on load, on every save and on any frm.refresh() — and it
	// wipes the HTML field's wrapper, so the grid has to be rebuilt each time. The
	// template behind it does not change in between, and fetching it costs a
	// Singles read + a child-table read + meta on the server, so it is held for
	// the life of the page and re-fetched only once the document itself moves on
	// (`modified` changes on save/reload). Reloading the browser always refetches.
	const templateCache = { key: null, rows: null };

	function mountUI(frm) {
		const wrapper = frm.fields_dict.custom_application_fields_ui;
		if (!wrapper) return;
		const host = wrapper.$wrapper && wrapper.$wrapper.find("#jo-app-fields-host")[0];
		if (!host) return;

		injectStyles();

		const key = `${frm.doc.name}::${frm.doc.modified || "new"}`;
		if (templateCache.key === key && templateCache.rows) {
			// Deep-copied: render() mutates rows as the user edits, and the cache has
			// to keep handing out the server's version, not the last edited one.
			build(JSON.parse(JSON.stringify(templateCache.rows)));
			return;
		}

		host.innerHTML = AFU.emptyState(__("Loading application fields…"));

		frappe.call({
			method: "recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings.get_job_applicant_profile_template",
			args: { opening: frm.is_new() ? null : frm.doc.name },
			callback: (r) => {
				const msg = (r && r.message) || { sections: [], rows: [] };
				templateCache.key = key;
				templateCache.rows = msg.rows || [];
				build(JSON.parse(JSON.stringify(templateCache.rows)));
			},
			error: () => {
				host.innerHTML = AFU.emptyState(__("Failed to load application fields."));
			},
		});

		function build(rows) {
			const state = { rows: rows, activeSection: null };

			// Overlay any unsaved edits the user already made on this opening.
			// Indexed once — the doc can hold a row per field, and a find() per
			// row would walk the template list all over again for each of them.
			const byRef = new Map(state.rows.map((r) => [r.reference_name, r]));
			(frm.doc.custom_application_fields || []).forEach((docRow) => {
				const stateRow = byRef.get(docRow.reference_name);
				if (!stateRow) return;
				OVERRIDE_CHECK_COLS.forEach((col) => { stateRow[col] = docRow[col] ? 1 : 0; });
				Object.keys(OVERRIDE_ROLE_COLS).forEach((col) => {
					if (docRow[col]) stateRow[col] = docRow[col];
				});
				if (docRow.child_field_config) stateRow.child_field_config = docRow.child_field_config;
				if (docRow.display_name) stateRow.display_name = docRow.display_name;
				if (docRow.section) stateRow.section = docRow.section;
				if (docRow.display_order) stateRow.display_order = docRow.display_order;
			});

			// Re-sort for unsaved moves. The template already came back sorted, so
			// this only matters when the form is refreshed with a move still
			// unsaved — index breaks the tie, keeping the server's order otherwise.
			state.rows = state.rows
				.map((r, i) => ({ row: r, key: Number(r.display_order) || (i + 1) * ORDER_STEP, i: i }))
				.sort((a, b) => (a.key - b.key) || (a.i - b.i))
				.map((x) => x.row);

			renderUI(host, state, frm);
			// Paint first; the applicability badges arrive after.
			frm._apf_state = state;
			frm._apf_host = host;
			refreshApplicability(frm);
		}
	}

	// Changing one of these re-checks the badges against the unsaved form values.
	const APPL_WATCH = ["company", "department", "designation", "location", "employment_type"];

	function openingLinkValues(frm) {
		const out = {};
		(frm.meta.fields || []).forEach((df) => {
			if ((df.fieldtype === "Link" || df.fieldtype === "Dynamic Link") && frm.doc[df.fieldname]) {
				out[df.fieldname] = frm.doc[df.fieldname];
			}
		});
		return out;
	}

	function refreshApplicability(frm) {
		const state = frm._apf_state, host = frm._apf_host;
		if (!state || !host) return;
		const values = openingLinkValues(frm);
		const key = JSON.stringify(values);
		if (state.applKey === key) return; // nothing that matters changed
		state.applKey = key;
		frappe.xcall("recruitment.recruitment.field_applicability.get_opening_applicability", { values })
			.then((map) => {
				if (state.applKey !== key || frm._apf_state !== state) return; // superseded
				const next = map || {};
				// Redraw only if a badge changed.
				if (JSON.stringify(next) === JSON.stringify(state.appl || {})) return;
				state.appl = next;
				renderUI(host, state, frm);
			})
			.catch(() => { /* badges are advisory; the grid works without them */ });
	}

	const handlers = { refresh(frm) { mountUI(frm); } };
	APPL_WATCH.forEach((f) => { handlers[f] = (frm) => refreshApplicability(frm); });
	frappe.ui.form.on("Job Opening", handlers);
})();

// Recruitment Settings → "Allow creation of Position(s) at jobs directly".
// When OFF (default), the Position Details table on the Job Opening is read-only,
// so positions can't be added directly here — they come from a Job Requisition.
// The requisition → opening server flow populates positions programmatically and
// is unaffected by this form-level control.
(function () {
	// Asked for once per page rather than on every refresh: refresh fires on load,
	// on every save and on every reload, and this is one round trip for a setting
	// that only changes in Recruitment Settings (a page load away).
	let allowed = null;

	frappe.ui.form.on("Job Opening", {
		refresh(frm) {
			if (!frm.fields_dict.custom_position_details) return;
			if (!allowed) {
				allowed = frappe.db.get_single_value(
					"Recruitment Settings", "allow_position_creation_at_jobs_directly"
				);
			}
			allowed.then((value) => {
				frm.set_df_property("custom_position_details", "read_only", value ? 0 : 1);
				frm.refresh_field("custom_position_details");
			});
		},
	});
})();

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
