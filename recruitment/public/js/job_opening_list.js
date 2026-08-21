/* global frappe, $ */

/*
 * Job Opening — custom list rendering on top of Frappe's native list view.
 *
 * Frappe owns data (`listview.data`), filtering, sorting, pagination, selection
 * and the Actions menu. We override `render_list` to draw our styled table into
 * Frappe's `$result`; each row checkbox uses the native `.list-row-checkbox`
 * class so native selection / bulk actions work untouched.
 *
 * Pipeline counts / total applicants / active interviews / owner name are
 * aggregates that aren't on the Job Opening doc, so after each render we fetch
 * them for the visible rows (`get_job_openings_with_stats(names=...)`) and fill
 * the cells. "Open For" days is computed client-side from posted_on/creation.
 *
 * The COLUMNS below are a registration, not a layout: `recruitment.list_columns`
 * decides which of them are drawn, in what order, at what alignment and width,
 * from whatever the user (or the site) saved in "Configure Columns" (⋯ menu).
 * Any docfield on Job Opening can be added there as a column of its own.
 */
(function () {
	const DOCTYPE = "Job Opening";

	const PIPELINE_STAGES = [
		{ key: "Draft",       color: "#9CA3AF", label: "Draft" },
		{ key: "Open",        color: "#374151", label: "Open" },
		{ key: "Shortlisted", color: "#93C5FD", label: "Shortlisted" },
		{ key: "Interview",   color: "#3B82F6", label: "Interview" },
		{ key: "Hold",        color: "#F59E0B", label: "Hold" },
		{ key: "Approvals",   color: "#F97316", label: "Approvals" },
		{ key: "Hired",       color: "#0EA5E9", label: "Hired" },
		{ key: "Accepted",    color: "#10B981", label: "Accepted" },
		{ key: "Rejected",    color: "#FCA5A5", label: "Rejected" },
	];

	const STATUS_COLORS = {
		Open: "#10B981", Closed: "#9CA3AF", Draft: "#F59E0B", Hold: "#F59E0B", Cancelled: "#EF4444",
	};
	const STATUS_FALLBACK_PALETTE = [
		"#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
		"#F97316", "#0EA5E9", "#84CC16", "#EAB308",
	];
	const OWNER_PALETTE = [
		"#4F46E5", "#0EA5E9", "#10B981", "#F59E0B",
		"#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
	];

	function hashStr(s) {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
		return h;
	}
	function getStatusColor(status) {
		if (!status) return "#9CA3AF";
		if (STATUS_COLORS[status]) return STATUS_COLORS[status];
		return STATUS_FALLBACK_PALETTE[hashStr(status) % STATUS_FALLBACK_PALETTE.length];
	}
	function avatarColor(name) {
		if (!name) return OWNER_PALETTE[0];
		return OWNER_PALETTE[hashStr(name) % OWNER_PALETTE.length];
	}
	function escapeHtml(s) {
		if (s === null || s === undefined) return "";
		return String(s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}
	function initialsOf(name) {
		const parts = String(name || "").replace(/@/g, " ").split(/\s+/).filter(Boolean);
		if (!parts.length) return "?";
		return ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).toUpperCase() || "?";
	}

	// Click-to-filter — mirrors Frappe's native list view. Frappe binds a delegated
	// handler on `$result` for `.filterable` elements and reads `data-filter=
	// "fieldname,operator,value"`. Our custom table renders INTO that same `$result`,
	// so any cell we tag with `filterable` + `data-filter` gets the exact same
	// behaviour (click "Draft" -> adds status = Draft filter) for free.
	function filterData(fieldname, value) {
		if (value === null || value === undefined || value === "") return "";
		return ` data-filter="${escapeHtml(fieldname)},=,${escapeHtml(value)}"`;
	}
	function daysOpen(doc) {
		const startStr = doc.posted_on || doc.creation;
		if (!startStr) return 0;
		try {
			const start = frappe.datetime.str_to_obj(startStr);
			const end = doc.closed_on
				? frappe.datetime.str_to_obj(doc.closed_on)
				: frappe.datetime.str_to_obj(frappe.datetime.get_today());
			return Math.max(0, Math.round((end - start) / 86400000));
		} catch (e) { return 0; }
	}

	let state = { activeTab: "All", tabCounts: {}, statusOptions: [], stats: {} };
	let _listview = null;

	function injectStyles() {
		if (document.getElementById("job-opening-list-styles")) return;
		const style = document.createElement("style");
		style.id = "job-opening-list-styles";
		style.textContent = `
			.jo-tabs { display: flex; gap: 8px; padding: 12px 0 4px; flex-wrap: wrap; }
			.jo-tab {
				display: inline-flex; align-items: center; gap: 8px;
				padding: 6px 14px; border-radius: 999px; cursor: pointer;
				background: #F3F4F6; color: #374151; font-size: 13px; font-weight: 500;
				border: 1px solid transparent; transition: background .15s;
			}
			.jo-tab:hover { background: #E5E7EB; }
			.jo-tab.active { background: #111827; color: #fff; }
			.jo-tab .jo-tab-dot { width: 8px; height: 8px; border-radius: 50%; }
			.jo-tab .jo-tab-count {
				background: rgba(255,255,255,0.18); color: inherit;
				padding: 1px 8px; border-radius: 999px; font-size: 12px;
			}
			.jo-tab:not(.active) .jo-tab-count { background: #fff; color: #374151; }

			.jo-table-wrapper { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; overflow-x: auto; }
			.jo-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
			.jo-table thead th {
				text-align: left; font-weight: 500; color: #6B7280; font-size: 11px;
				letter-spacing: 0.04em; text-transform: uppercase;
				background: #F9FAFB; padding: 10px 6px; border-bottom: 1px solid #E5E7EB;
				white-space: nowrap;
			}
			.jo-table tbody td { padding: 12px 6px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
			/* Width, alignment and wrapping are per-column configuration now, emitted
			   as inline styles by the column registry; only the padding tweaks and
			   the default text colour of a plain field cell stay here. */
			.jo-col-check   { padding-left: 10px !important; padding-right: 2px !important; }
			.rlc-field-cell { color: #374151; }
			.jo-table tbody tr { cursor: pointer; }
			.jo-table tbody tr:hover { background: #FAFAFA; }
			.jo-table tbody tr:last-child td { border-bottom: none; }
			.jo-table .filterable { cursor: pointer; }
			.jo-table .filterable:hover { text-decoration: underline; text-underline-offset: 2px; }

			.jo-check { width: 16px; height: 16px; cursor: pointer; }
			.jo-opening-title { font-weight: 600; color: #111827; }
			.jo-opening-title a { color: inherit; text-decoration: none; }
			.jo-opening-title a:hover { text-decoration: underline; text-underline-offset: 2px; }
			.jo-opening-sub { font-size: 12px; color: #6B7280; margin-top: 2px; }
			.jo-open-form { color: #6B7280; text-decoration: none; }
			.jo-open-form:hover { color: #2563EB; text-decoration: underline; text-underline-offset: 2px; }
			.jo-status-pill {
				display: inline-flex; align-items: center; gap: 6px;
				padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500;
			}
			.jo-status-pill .jo-status-dot { width: 6px; height: 6px; border-radius: 50%; }

			.jo-applicants { font-weight: 600; color: #111827; }
			.jo-applicants-sub { color: #6B7280; font-weight: 400; margin-left: 3px; font-size: 11px; }

			.jo-pipeline { display: flex; flex-direction: column; gap: 5px; min-width: 220px; max-width: 320px; }
			.jo-pipeline-bar { display: flex; height: 6px; border-radius: 4px; overflow: hidden; background: #F3F4F6; }
			.jo-pipeline-seg { height: 100%; }
			.jo-pipeline-legend { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 10px; color: #4B5563; line-height: 1.3; }
			.jo-pipeline-legend-item { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
			.jo-pipeline-legend-dot { width: 5px; height: 5px; border-radius: 50%; }

			.jo-interview-badge {
				display: inline-flex; align-items: center; gap: 4px;
				padding: 3px 8px; border-radius: 6px; background: #EFF6FF; color: #1D4ED8;
				font-size: 11.5px; font-weight: 500; white-space: nowrap;
			}
			.jo-interview-badge.is-empty { background: #F3F4F6; color: #9CA3AF; padding: 3px 6px; }

			.jo-days { font-weight: 600; color: #111827; }
			.jo-owner { display: inline-flex; align-items: center; gap: 8px; color: #374151; font-size: 12px; }
			.jo-owner-avatar {
				width: 26px; height: 26px; border-radius: 50%; color: #fff;
				display: inline-flex; align-items: center; justify-content: center;
				font-size: 11px; font-weight: 600;
			}

			/* Native activity meta (modified time · comment count · like) */
			.jo-col-activity { padding-right: 12px !important; }
			.jo-activity { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; color: #9CA3AF; font-size: 12px; }
			.jo-activity .comment-count { display: inline-flex; align-items: center; gap: 2px; }
			.jo-activity .list-row-like, .jo-activity .like-action { cursor: pointer; display: inline-flex; align-items: center; }
			.jo-activity svg.icon, .jo-activity .icon { width: 14px; height: 14px; }

			/* Hide the loading skeleton rows (we render our own table). */
			.jo-custom-active .frappe-list .result .list-row-container { display: none !important; }
			/* Frappe's native column header is replaced by our <thead>, so it's hidden
			   by default — but we REVEAL it while rows are selected so Frappe's native
			   selection bar shows ("N items selected", "X of Y", select-all). When
			   selected, on_row_checked hides the column-label part itself, leaving just
			   the selection bar. Native paging / no-result / Actions menu stay intact. */
			.jo-custom-active .frappe-list .result .list-row-head { display: none !important; }
			.jo-custom-active.jo-has-selection .frappe-list .result .list-row-head { display: flex !important; }
			/* --- Frappe v16 ------------------------------------------------------
			   v16 wraps .result in a new .result-container and fits the list to
			   the viewport: set_result_height() measures the main section and sets
			   an inline pixel height on that container, so rows scroll INSIDE it and
			   the paging bar is pinned below. Our table is a single tall block, not
			   Frappe's row list, so trapping it in that box leaves the paging bar
			   sitting across the middle of our rows.

			   Undo the fitted box for our lists only — it flows naturally again, the
			   way v15 does, and the paging area lands under the table. The heights
			   are inline styles set from JS, hence !important. On v15 there is no
			   .result-container, so none of this matches. */
			.jo-custom-active .frappe-list .result-container,
			.jo-custom-active .frappe-list .result-container .result {
				height: auto !important; max-height: none !important; overflow: visible !important;
			}

		`;
		document.head.appendChild(style);
	}

	function applyTabFilter(key) {
		state.activeTab = key;
		const lv = _listview;
		if (!lv) return;
		const field = lv.page && lv.page.fields_dict && lv.page.fields_dict.status;
		if (field && typeof field.set_value === "function") {
			// Status is a standard quick-filter: set it DIRECTLY to the target value.
			// Switching Draft -> Open is a single value change with no intermediate
			// "clear" step, so there's no stray "show all" fetch to race with.
			Promise.resolve(field.set_value(key === "All" ? "" : key)).then(() => lv.refresh());
		} else if (lv.filter_area) {
			// Status isn't a standard filter (e.g. Job Requisition): mutate the filter
			// list with refreshes suppressed, then fire a single refresh.
			const fa = lv.filter_area;
			fa.trigger_refresh = false;
			Promise.resolve(fa.remove("status"))
				.then(() => (key === "All" ? null : fa.add([[DOCTYPE, "status", "=", key]], false)))
				.then(() => { fa.trigger_refresh = true; lv.refresh(); })
				.catch(() => { fa.trigger_refresh = true; lv.refresh(); });
		}
	}

	function renderTabs() {
		const container = document.getElementById("jo-tabs-container");
		if (!container) return;
		const tabKeys = ["All", ...(state.statusOptions || [])];
		const tabs = tabKeys.map((key) => {
			const isActive = state.activeTab === key;
			const count = state.tabCounts[key] ?? 0;
			const dot = key === "All" ? "" : `<span class="jo-tab-dot" style="background:${getStatusColor(key)}"></span>`;
			return `
				<div class="jo-tab ${isActive ? "active" : ""}" data-tab="${escapeHtml(key)}">
					${dot}<span>${escapeHtml(key)}</span>
					<span class="jo-tab-count">${count}</span>
				</div>`;
		}).join("");
		container.innerHTML = `<div class="jo-tabs">${tabs}</div>`;
		container.querySelectorAll(".jo-tab").forEach((el) => {
			el.addEventListener("click", () => {
				const tab = el.getAttribute("data-tab");
				if (tab === state.activeTab) return;
				applyTabFilter(tab);
			});
		});
	}

	function renderPipeline(pipeline) {
		pipeline = pipeline || {};
		const total = PIPELINE_STAGES.reduce((s, p) => s + (pipeline[p.key] || 0), 0);
		const segments = PIPELINE_STAGES.map((p) => {
			const v = pipeline[p.key] || 0;
			if (!v) return "";
			const w = total ? (v / total) * 100 : 0;
			return `<div class="jo-pipeline-seg" style="width:${w}%;background:${p.color}"></div>`;
		}).join("");
		const legend = PIPELINE_STAGES.map((p) => {
			const v = pipeline[p.key] || 0;
			return `<span class="jo-pipeline-legend-item">
				<span class="jo-pipeline-legend-dot" style="background:${p.color}"></span>
				${v} ${escapeHtml(p.label)}
			</span>`;
		}).join("");
		return `
			<div class="jo-pipeline">
				<div class="jo-pipeline-bar">${segments || '<div class="jo-pipeline-seg" style="width:100%;background:#E5E7EB"></div>'}</div>
				<div class="jo-pipeline-legend">${legend}</div>
			</div>`;
	}

	function renderStatusPill(status) {
		if (!status) return `<span class="jo-status-pill" style="background:#F3F4F6;color:#6B7280">—</span>`;
		const color = getStatusColor(status);
		return `<span class="jo-status-pill filterable"${filterData("status", status)} style="background:${color}1a;color:#111827">
			<span class="jo-status-dot" style="background:${color}"></span>${escapeHtml(status)}
		</span>`;
	}

	// Initial owner cell before stats arrive: fall back to the owner id's local part.
	// Once stats load, fillStats() replaces this with the resolved full name.
	function ownerCellHtml(ownerId) {
		if (!ownerId) return `<span class="jo-owner"><span class="jo-owner-avatar" style="background:#9CA3AF">?</span>—</span>`;
		const display = ownerId.split("@")[0] || ownerId;
		return `<span class="jo-owner filterable"${filterData("owner", ownerId)}>
			<span class="jo-owner-avatar" style="background:${avatarColor(ownerId)}">${escapeHtml(initialsOf(ownerId))}</span>${escapeHtml(display)}
		</span>`;
	}

	function interviewBadge(n) {
		return n
			? `<span class="jo-interview-badge"><span>📅</span> ${n} active</span>`
			: `<span class="jo-interview-badge is-empty">—</span>`;
	}

	// Native Frappe row activity: relative modified time, comment count, and the
	// interactive like/heart (reusing listview.get_like_html so Frappe's delegated
	// like handler toggles it natively).
	function renderActivity(doc, listview) {
		let modified = "";
		try { modified = frappe.datetime.comment_when(doc.modified, true); } catch (e) { /* noop */ }
		const cc = doc._comment_count || 0;
		let chat = "";
		try { chat = frappe.utils.icon("es-line-chat-alt", "sm"); } catch (e) { /* noop */ }
		let likeHtml = "";
		try { likeHtml = (listview && listview.get_like_html) ? listview.get_like_html(doc) : ""; } catch (e) { /* noop */ }
		return `<div class="jo-activity">
			<span class="modified">${modified}</span>
			<span class="comment-count">${chat} ${cc > 99 ? "99+" : cc}</span>
			<span class="list-row-like">${likeHtml}</span>
		</div>`;
	}

	/*
	 * The designed columns, declared once. Order here is only the DEFAULT — the
	 * saved configuration (⋯ → Configure Columns) decides what actually renders.
	 * Columns whose value arrives with the aggregate call carry a `data-stat`
	 * attribute; fillStats() finds them again through it once the call lands.
	 */
	recruitment.list_columns.register(DOCTYPE, {
		reserved_fields: ["modified", "_liked_by", "_comment_count"],
		// Needed by the composite "Opening" cell's sub-line and the days-open maths,
		// and still addable as columns in their own right.
		fetch_fields: ["designation", "department", "location", "publish", "posted_on", "closes_on", "closed_on", "creation"],

		leading: {
			key: "__check",
			width: "28px",
			cell_class: "jo-col-check",
			head_render: () => `<input type="checkbox" class="jo-check jo-select-all"/>`,
			render: (doc) =>
				`<input type="checkbox" class="jo-check list-row-checkbox" data-doctype="${DOCTYPE}" data-name="${escapeHtml(doc.name)}"/>`,
		},

		trailing: {
			key: "__activity",
			align: "right",
			width: "120px",
			cell_class: "jo-col-activity",
			fields: ["modified", "_liked_by", "_comment_count"],
			render: (doc, listview) => renderActivity(doc, listview),
		},

		columns: [
			{
				key: "opening",
				label: __("Opening"),
				// The row's identity cell — and the only way into the opening's form.
				locked: true,
				min_width: "180px",
				nowrap: false,
				fields: ["name", "job_title", "designation", "department", "location"],
				// Title -> applicants for this opening, ID -> the opening form. Both are
				// real anchors so ctrl / middle click opens a new tab natively; a plain
				// left click is intercepted by Frappe's router (no page reload). The whole
				// row falls back to the applicants list via bindTable()'s handler.
				render: (doc) => {
					const sub = [doc.designation, doc.department, doc.location]
						.filter(Boolean).map(escapeHtml).join("  ·  ");
					return `
						<div class="jo-opening-title">
							<a href="${applicantsUrl(doc.name)}" title="${escapeHtml(__("View applicants"))}">${escapeHtml(doc.job_title || doc.name)}</a>
						</div>
						<div class="jo-opening-sub">
							<a class="jo-open-form" href="${formUrl(doc.name)}" title="${escapeHtml(__("Open job opening"))}">${escapeHtml(doc.name)}</a>${sub ? "  ·  " + sub : ""}
						</div>`;
				},
			},
			{
				key: "status",
				label: __("Status"),
				width: "72px",
				fields: ["status"],
				render: (doc) => renderStatusPill(doc.status),
			},
			{
				key: "applicants",
				label: __("Applicants"),
				width: "64px",
				cell_attrs: () => ` data-stat="applicants"`,
				render: () => `<span class="jo-applicants">0</span><span class="jo-applicants-sub">total</span>`,
			},
			{
				key: "pipeline",
				label: __("Pipeline"),
				min_width: "200px",
				max_width: "280px",
				nowrap: false,
				cell_attrs: () => ` data-stat="pipeline"`,
				render: () => renderPipeline(null),
			},
			{
				key: "interviews",
				label: __("Interviews"),
				width: "70px",
				cell_attrs: () => ` data-stat="interviews"`,
				render: () => interviewBadge(0),
			},
			{
				key: "days_open",
				label: __("Open For"),
				width: "52px",
				fields: ["posted_on", "closed_on", "creation"],
				render: (doc) => `<span class="jo-days">${daysOpen(doc)}d</span>`,
			},
			{
				key: "owner",
				label: __("Owner"),
				width: "110px",
				fields: ["owner"],
				cell_attrs: (doc) => ` data-stat="owner" data-owner="${escapeHtml(doc.owner || "")}"`,
				render: (doc) => ownerCellHtml(doc.owner),
			},
		],
	});

	function fillStats() {
		const $result = _listview && _listview.$result;
		if (!$result || !$result.length) return;
		$result.find("tr[data-name]").each(function () {
			const name = this.getAttribute("data-name");
			const s = state.stats[name];
			if (!s) return;
			const applicants = this.querySelector('[data-stat="applicants"]');
			if (applicants) applicants.innerHTML = `<span class="jo-applicants">${s.total_applicants || 0}</span><span class="jo-applicants-sub">total</span>`;
			const pipeline = this.querySelector('[data-stat="pipeline"]');
			if (pipeline) pipeline.innerHTML = renderPipeline(s.pipeline);
			const interviews = this.querySelector('[data-stat="interviews"]');
			if (interviews) interviews.innerHTML = interviewBadge(s.active_interviews || 0);
			const owner = this.querySelector('[data-stat="owner"]');
			if (owner && s.owner && s.owner.id) {
				const display = (s.owner.name || s.owner.id).split(" ")[0];
				owner.innerHTML = `<span class="jo-owner filterable"${filterData("owner", s.owner.id)}>
					<span class="jo-owner-avatar" style="background:${avatarColor(s.owner.id)}">${escapeHtml(s.owner.initials || "?")}</span>${escapeHtml(display)}
				</span>`;
			}
		});
	}

	// --- Opening -> its applicants -------------------------------------------
	// Job Applicant.job_title is the Link to Job Opening (and is search-indexed),
	// so scoping the list is a single `job_title = <opening>` filter.
	const APPLICANT_DOCTYPE = "Job Applicant";
	const APPLICANT_LINK_FIELD = "job_title";

	// Doctype -> URL segment, the same transform frappe.router.slug does. Inlined so
	// these links don't depend on a router internal staying put across versions.
	function slug(doctype) { return doctype.toLowerCase().replace(/ /g, "-"); }

	// `/view/list` is explicit on purpose: a bare `/app/job-applicant` is bounced by
	// ListView.load_last_view() to whatever view that user last used (Report, Kanban,
	// …), which would drop them somewhere other than the designed applicants screen.
	function applicantsUrl(name) {
		return `/app/${slug(APPLICANT_DOCTYPE)}/view/list` +
			`?${APPLICANT_LINK_FIELD}=${encodeURIComponent(name)}`;
	}

	function formUrl(name) {
		return `/app/${slug(DOCTYPE)}/${encodeURIComponent(name)}`;
	}

	// Route to the applicant list already scoped to this opening.
	// `frappe.route_options` is consumed by the list view's `before_refresh`, which
	// clears the previous filters and applies ours with refreshes suppressed BEFORE
	// the first fetch — so the scoped list loads in ONE query instead of pulling
	// every applicant and then re-fetching. (Same path Frappe's own anchor handler
	// takes for the `?job_title=` links above, so both entry points behave alike.)
	function openApplicants(name) {
		frappe.route_options = { [APPLICANT_LINK_FIELD]: name };
		frappe.set_route("List", APPLICANT_DOCTYPE, "List");
	}

	function updateSelectAllState(container) {
		const selectAll = container.querySelector(".jo-select-all");
		if (!selectAll) return;
		const all = Array.from(container.querySelectorAll(".list-row-checkbox"));
		selectAll.checked = all.length > 0 && all.every((c) => c.checked);
		selectAll.indeterminate = !selectAll.checked && all.some((c) => c.checked);
	}

	function bindTable(container, listview) {
		const selectAll = container.querySelector(".jo-select-all");
		if (selectAll) {
			selectAll.addEventListener("click", (e) => e.stopPropagation());
			selectAll.addEventListener("change", () => {
				container.querySelectorAll(".list-row-checkbox").forEach((cb) => { cb.checked = selectAll.checked; });
				if (typeof listview.on_row_checked === "function") listview.on_row_checked();
			});
		}
		container.querySelectorAll(".list-row-checkbox").forEach((cb) => {
			cb.addEventListener("click", (e) => e.stopPropagation());
			cb.addEventListener("change", () => updateSelectAllState(container));
		});
		updateSelectAllState(container);

		// Row click → the applicants for this opening (NOT the opening form; the
		// opening ID in the sub-line links to that, as does "Open job opening" in
		// the header of the applicant list we land on).
		container.querySelectorAll("tr[data-name]").forEach((tr) => {
			tr.addEventListener("click", (e) => {
				if (e.target && e.target.closest("input, button, a, .like-action, .jo-activity, .filterable")) return;
				const name = tr.getAttribute("data-name");
				if (name) openApplicants(name);
			});
		});
	}

	function renderTableInto(listview) {
		const $result = listview.$result;
		if (!$result || !$result.length) return;
		let $host = $result.find(".jo-host");
		if (!$host.length) {
			$host = $('<div class="jo-host"></div>');
			$result.append($host);
		}
		const data = listview.data || [];
		if (!data.length) {
			// Nothing matched — let Frappe's native no-result block show, but still
			// refresh the tabs. Returning early used to leave them frozen on the
			// previous filter's numbers, so an empty list still claimed a count.
			$host.html("");
			fetchAux();
			return;
		}

		const cols = recruitment.list_columns;
		$host.html(`
			<div class="jo-table-wrapper">
				<table class="jo-table">
					<thead>${cols.head_html(DOCTYPE, listview)}</thead>
					<tbody>${data.map((d) => cols.row_html(DOCTYPE, d, listview)).join("")}</tbody>
				</table>
			</div>`);

		bindTable($host[0], listview);
		if (typeof listview.set_rows_as_checked === "function") {
			try { listview.set_rows_as_checked(); } catch (e) { /* noop */ }
		}
		fillStats();   // fill from cached stats immediately (if any), then refresh
		fetchAux();
	}

	// Active list filters EXCEPT status — the tabs count per status, so status must
	// not pre-filter. Everything else (company, department, designation, …) must
	// apply so the tab counts match the visible, filtered rows.
	//
	// Read through `get_filters_for_args()`, not `filter_area.get()`: that is the
	// same accessor the row query uses, so repeated `=` on one field arrives here
	// already folded into an `in` (see list_filter_multi.js).
	function countFilters() {
		const raw =
			(_listview &&
				typeof _listview.get_filters_for_args === "function" &&
				_listview.get_filters_for_args()) ||
			[];
		return raw
			.filter((f) => Array.isArray(f) && f[1] && f[1] !== "status")
			.map((f) => [f[1], f[2], f[3]]);
	}

	let _auxToken = 0;
	function fetchAux() {
		const data = (_listview && _listview.data) || [];
		const names = data.map((d) => d.name);
		const token = ++_auxToken;
		frappe.call({
			method: "recruitment.api.job_opening_list.get_job_openings_with_stats",
			args: { names: JSON.stringify(names), filters: JSON.stringify(countFilters()) },
			callback: (r) => {
				if (token !== _auxToken) return;
				const msg = (r && r.message) || {};
				state.tabCounts = msg.tab_counts || {};
				state.statusOptions = msg.status_options || [];
				state.stats = Object.assign({}, state.stats, msg.stats || {});
				renderTabs();
				fillStats();
			},
		});
	}

	function syncActiveTabFromFilters(listview) {
		try {
			const filters = (listview.filter_area && listview.filter_area.get()) || [];
			// Several statuses filtered at once matches no single tab — the list is
			// showing a union, so leave "All" highlighted instead of picking one.
			const on_status = filters.filter((arr) => arr && arr[1] === "status" && arr[2] === "=");
			state.activeTab =
				on_status.length === 1 && on_status[0][3] ? on_status[0][3] : "All";
		} catch (e) { state.activeTab = "All"; }
	}

	function mountAboveList(listview) {
		const layoutMain = listview.$page.find(".layout-main-section");
		if (!layoutMain.length) return;
		layoutMain.addClass("jo-custom-active");
		if (layoutMain.find("#jo-tabs-container").length) return;
		const tabsHost = $('<div id="jo-tabs-container"></div>');
		// v16 nests `.result` inside `.result-container`; anchor to the outermost
		// of the two so our header/tabs sit ABOVE the whole result block rather
		// than inside v16's fitted, inner-scrolling box.
		const container = layoutMain.find(".frappe-list .result-container");
		const resultEl = container.length ? container : layoutMain.find(".frappe-list .result");
		if (resultEl.length) resultEl.before(tabsHost);
		else layoutMain.prepend(tabsHost);
	}

	function installRenderOverride(listview) {
		// Repeated `=` filters on one field (two Institutes, two Departments, …)
		// are ANDed by Frappe and match nothing; fold them into a single `in`.
		// Guarded so a missing/stale list_filter_multi.js degrades to the old
		// behaviour instead of taking the whole rendered table down with it.
		recruitment.filters && recruitment.filters.install(listview);
		if (listview._jo_render_patched) return;
		listview._jo_render_patched = true;
		listview.render_list = function () { renderTableInto(this); };
		listview.render_header = function () { /* custom <thead> instead */ };

		// Reveal Frappe's native selection bar only while rows are selected.
		const origOnRowChecked = listview.on_row_checked.bind(listview);
		listview.on_row_checked = function () {
			origOnRowChecked();
			const any = this.$result.find(".list-row-checkbox:checked").length > 0;
			this.$page.find(".layout-main-section").toggleClass("jo-has-selection", any);
		};
	}

	frappe.listview_settings[DOCTYPE] = {
		hide_name_column: true,
		/*
		 * Every field any registered column can need, whether or not it is currently
		 * shown — so switching a column on in "Configure Columns" redraws instantly
		 * instead of waiting on a refetch.
		 *
		 * A GETTER, not a value: this file is executed by model.js's init_doctype(),
		 * which runs BEFORE the same callback assigns frappe.model.user_settings for
		 * the doctype. Computing eagerly would miss a user's personally configured
		 * field columns on the first load of the session and render them blank.
		 * Frappe reads settings.add_fields later, in set_fields(), by which point the
		 * settings are in place.
		 */
		get add_fields() {
			return recruitment.list_columns.required_fields(DOCTYPE);
		},

		onload(listview) {
			_listview = listview;
			recruitment.list_columns.ensure_fields(DOCTYPE, listview);
			injectStyles();
			mountAboveList(listview);
			installRenderOverride(listview);
			recruitment.list_columns.add_menu_item(DOCTYPE, listview);
			syncActiveTabFromFilters(listview);
			renderTabs();
		},

		refresh(listview) {
			_listview = listview;
			mountAboveList(listview);
			installRenderOverride(listview);
			recruitment.list_columns.add_menu_item(DOCTYPE, listview);
			syncActiveTabFromFilters(listview);
			renderTabs();
		},
	};
})();
