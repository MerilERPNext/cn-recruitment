/* global frappe, $ */

/*
 * Job Applicant — custom list rendering on top of Frappe's native list view.
 *
 * Frappe owns data (`listview.data`), filtering, sorting, pagination, selection
 * and the Actions menu. We override `render_list` to draw our styled table into
 * Frappe's `$result`; each row checkbox uses the native `.list-row-checkbox`
 * class so native selection / bulk actions work untouched. A small aux API call
 * supplies tab counts, the top pipeline bar, the scoped header and owner names.
 *
 * The COLUMNS below are a registration, not a layout: `recruitment.list_columns`
 * decides which of them are drawn, in what order, at what alignment and width,
 * from whatever the user (or the site) saved in "Configure Columns" (⋯ menu).
 * Any docfield on Job Applicant can be added there as a column of its own.
 */
(function () {
	const DOCTYPE = "Job Applicant";

	const SOURCE_PALETTE = [
		"#4F46E5", "#0EA5E9", "#10B981", "#F59E0B",
		"#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
	];
	const STATUS_COLORS = {
		Draft: "#9CA3AF", Open: "#374151", Shortlisted: "#93C5FD", Interview: "#3B82F6",
		Hold: "#F59E0B", Approvals: "#F97316", Accepted: "#10B981", Rejected: "#FCA5A5",
		Applied: "#374151", Screening: "#93C5FD", Offer: "#F59E0B", Hired: "#10B981",
	};
	const STATUS_FALLBACK_PALETTE = [
		"#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
		"#F97316", "#0EA5E9", "#84CC16", "#EAB308",
	];

	function hash(str) {
		let h = 0;
		for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
		return h;
	}
	function getStatusColor(s) {
		if (!s) return "#9CA3AF";
		if (STATUS_COLORS[s]) return STATUS_COLORS[s];
		return STATUS_FALLBACK_PALETTE[hash(s) % STATUS_FALLBACK_PALETTE.length];
	}
	function avatarColor(name) {
		if (!name) return SOURCE_PALETTE[0];
		return SOURCE_PALETTE[hash(name) % SOURCE_PALETTE.length];
	}
	function escapeHtml(s) {
		if (s === null || s === undefined) return "";
		return String(s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}
	// The name is stored in parts (first / middle / surname) and Job Applicant derives
	// `custom_full_name` from them on save — prefer that. The join below is only a
	// fallback for a row saved before the derived field existed, and it skips a part
	// already present in an earlier one so a surname is never printed twice
	// ("Neha Iyer Iyer").
	function fullName(doc) {
		if (doc.custom_full_name) return doc.custom_full_name;
		const seen = new Set();
		const parts = [];
		[doc.applicant_name, doc.custom_applicant_middle_name, doc.custom_applicant_last_name]
			.map((p) => String(p || "").trim())
			.filter(Boolean)
			.forEach((part) => {
				const words = part.toLowerCase().split(/\s+/).filter(Boolean);
				if (words.length && words.every((w) => seen.has(w))) return;
				words.forEach((w) => seen.add(w));
				parts.push(part);
			});
		return parts.join(" ").trim() || doc.name;
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
	function filterCls(value) { return value === null || value === undefined || value === "" ? "" : " filterable"; }
	function filterData(fieldname, value) {
		if (value === null || value === undefined || value === "") return "";
		return ` data-filter="${escapeHtml(fieldname)},=,${escapeHtml(value)}"`;
	}

	let state = {
		activeTab: "All",
		tabCounts: {},
		statusOptions: [],
		opening: null,
		users: {},
	};
	let _listview = null;

	function injectStyles() {
		if (document.getElementById("ja-list-styles")) return;
		const style = document.createElement("style");
		style.id = "ja-list-styles";
		style.textContent = `
			.ja-header { padding: 12px 0 8px; }
			.ja-header-eyebrow { font-size: 11px; letter-spacing: 0.08em; color: #6B7280; text-transform: uppercase; font-weight: 500; }
			.ja-header-title { font-size: 20px; font-weight: 700; color: #111827; margin-top: 4px; }
			.ja-header-meta { display: flex; align-items: center; gap: 10px; margin-top: 4px; color: #6B7280; font-size: 13px; }
			.ja-header-meta a { color: #2563EB; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
			.ja-header-meta a:hover { text-decoration: underline; }
			/* No requisition behind this opening — still clickable, but it explains
			   itself rather than pretending to be a link somewhere. */
			.ja-header-meta a.ja-no-requisition { color: #9CA3AF; }

			.ja-pipeline-top { padding: 8px 0; }
			.ja-pipeline-top-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: #F3F4F6; }
			.ja-pipeline-top-seg { height: 100%; }
			.ja-pipeline-top-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; font-size: 12px; color: #4B5563; }
			.ja-pipeline-top-legend-item { display: inline-flex; align-items: center; gap: 4px; }
			.ja-pipeline-top-legend-dot { width: 6px; height: 6px; border-radius: 50%; }

			.ja-tabs { display: flex; gap: 8px; padding: 8px 0 4px; flex-wrap: wrap; }
			.ja-tab {
				display: inline-flex; align-items: center; gap: 8px;
				padding: 6px 14px; border-radius: 999px; cursor: pointer;
				background: #F3F4F6; color: #374151; font-size: 13px; font-weight: 500;
				border: 1px solid transparent; transition: background .15s;
			}
			.ja-tab:hover { background: #E5E7EB; }
			.ja-tab.active { background: #111827; color: #fff; }
			.ja-tab .ja-tab-dot { width: 8px; height: 8px; border-radius: 50%; }
			.ja-tab .ja-tab-count {
				background: rgba(255,255,255,0.18); color: inherit;
				padding: 1px 8px; border-radius: 999px; font-size: 12px;
			}
			.ja-tab:not(.active) .ja-tab-count { background: #fff; color: #374151; }

			.ja-table-wrapper { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; overflow-x: auto; }
			.ja-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
			.ja-table thead th {
				text-align: left; font-weight: 500; color: #6B7280; font-size: 11px;
				letter-spacing: 0.04em; text-transform: uppercase;
				background: #F9FAFB; padding: 10px 8px; border-bottom: 1px solid #E5E7EB;
				white-space: nowrap;
			}
			.ja-table tbody td { padding: 12px 8px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
			.ja-table tbody tr { cursor: pointer; }
			.ja-table tbody tr:hover { background: #FAFAFA; }
			.ja-table tbody tr:last-child td { border-bottom: none; }
			.ja-table .filterable { cursor: pointer; }
			.ja-table .filterable:hover { text-decoration: underline; text-underline-offset: 2px; }

			/* Width, alignment and wrapping are per-column configuration now, emitted
			   as inline styles by the column registry. Only what can't be configured
			   — padding tweaks, the default text colour of a plain field cell —
			   stays here. Header cells inherit the same inline alignment, so a
			   right-aligned column's label sits over its values. */
			.ja-col-check   { padding-left: 10px !important; padding-right: 2px !important; }
			.rlc-field-cell { color: #374151; }

			.ja-check { width: 16px; height: 16px; cursor: pointer; }
			.ja-candidate { display: flex; align-items: center; gap: 10px; }
			.ja-avatar { width: 30px; height: 30px; border-radius: 50%; color: #fff;
				display: inline-flex; align-items: center; justify-content: center;
				font-size: 11px; font-weight: 600; flex: 0 0 auto;
			}
			.ja-cand-name { font-weight: 600; color: #111827; }
			.ja-cand-email { font-size: 12px; color: #6B7280; }

			.ja-status-pill {
				display: inline-flex; align-items: center; gap: 6px;
				padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500;
			}
			.ja-status-pill .ja-status-dot { width: 6px; height: 6px; border-radius: 50%; }

			.ja-score { display: flex; align-items: center; gap: 8px; }
			.ja-score-bar { flex: 1; height: 6px; background: #F3F4F6; border-radius: 4px; overflow: hidden; min-width: 60px; }
			.ja-score-fill { height: 100%; background: #93C5FD; border-radius: 4px; }
			.ja-score-num { font-weight: 600; color: #111827; min-width: 24px; text-align: right; }

			.ja-owner { display: inline-flex; align-items: center; gap: 6px; color: #374151; font-size: 12px; }

			/* Native activity meta (modified time · comment count · like) */
			.ja-col-activity { padding-right: 12px !important; }
			.ja-activity { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; color: #9CA3AF; font-size: 12px; }
			.ja-activity .comment-count { display: inline-flex; align-items: center; gap: 2px; }
			.ja-activity .list-row-like, .ja-activity .like-action { cursor: pointer; display: inline-flex; align-items: center; }
			.ja-activity svg.icon, .ja-activity .icon { width: 14px; height: 14px; }

			/* Hide the loading skeleton rows (we render our own table). */
			.ja-custom-active .frappe-list .result .list-row-container { display: none !important; }
			/* Frappe's native column header is replaced by our <thead>, so it's hidden
			   by default — but we REVEAL it while rows are selected so Frappe's native
			   selection bar shows ("N items selected", "X of Y", select-all). When
			   selected, on_row_checked hides the column-label part itself, leaving just
			   the selection bar. Native paging / no-result / Actions menu stay intact. */
			.ja-custom-active .frappe-list .result .list-row-head { display: none !important; }
			.ja-custom-active.ja-has-selection .frappe-list .result .list-row-head { display: flex !important; }
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
			.ja-custom-active .frappe-list .result-container,
			.ja-custom-active .frappe-list .result-container .result {
				height: auto !important; max-height: none !important; overflow: visible !important;
			}

		`;
		document.head.appendChild(style);
	}

	// Resolve the scoped opening strictly from the *live* filters so the header
	// disappears the moment the job_title filter is cleared. (Frappe applies any
	// route_options / URL ?job_title= into filter_area on load, so reading the
	// filters covers deep-links too — and avoids the sticky route_options that
	// used to keep the header around after the filter was removed.)
	function resolveJobOpening() {
		const lv = _listview || (frappe.views && frappe.views.list_view && frappe.views.list_view[DOCTYPE]);
		try {
			if (lv && lv.filter_area && typeof lv.filter_area.get === "function") {
				const on_opening = (lv.filter_area.get() || []).filter(
					(arr) => arr && arr[1] === "job_title" && arr[2] === "="
				);
				// Two openings filtered at once is not one scope — show no header
				// rather than captioning the list with whichever came first.
				if (on_opening.length === 1 && on_opening[0][3]) return on_opening[0][3];
			}
		} catch (e) { /* noop */ }
		return null;
	}

	// `state` is module-level and survives navigation, so when you arrive from the
	// Job Opening list (or switch between openings) the cached header would render
	// the PREVIOUS opening until fetchAux lands. Drop it as soon as the live filter
	// disagrees, so we show nothing rather than the wrong opening.
	function syncOpeningFromFilters() {
		const name = resolveJobOpening();
		if (!name || (state.opening && state.opening.name !== name)) state.opening = null;
	}

	function renderHeader() {
		const container = document.getElementById("ja-header-container");
		if (!container) return;
		if (!state.opening) { container.innerHTML = ""; return; }
		const op = state.opening;
		const meta = [op.designation, op.department, op.location].filter(Boolean).map(escapeHtml).join(" · ");

		// The requisition this opening was raised against. Filtered by `name` — a
		// standard field, so Frappe resolves it straight into the list's filters.
		// Openings raised without one get a click that explains why, rather than a
		// dead link or a silently missing action.
		const requisition = op.job_requisition
			? `<a href="/app/job-requisition/view/list?name=${encodeURIComponent(op.job_requisition)}">↗ ${__("Job Requisition")}</a>`
			: `<a class="ja-no-requisition">↗ ${__("Job Requisition")}</a>`;

		container.innerHTML = `
			<div class="ja-header">
				<div class="ja-header-eyebrow">Applicants for</div>
				<div class="ja-header-title">${escapeHtml(op.job_title || op.name)}</div>
				<div class="ja-header-meta">
					<span>${escapeHtml(op.name)}</span>
					${meta ? `<span>·</span><span>${meta}</span>` : ""}
					<span>·</span>
					<a href="/app/job-opening/${encodeURIComponent(op.name)}">↗ ${__("Edit job opening")}</a>
					<span>·</span>
					${requisition}
				</div>
			</div>`;

		const none = container.querySelector(".ja-no-requisition");
		if (none) {
			none.addEventListener("click", () => {
				frappe.msgprint({
					title: __("No Job Requisition"),
					indicator: "orange",
					message: __("Job Opening {0} was created without a linked Job Requisition, so there is no requisition to open.", [op.name]),
				});
			});
		}
	}

	function renderPipelineTop() {
		const container = document.getElementById("ja-pipeline-container");
		if (!container) return;
		const tc = state.tabCounts || {};
		const stages = state.statusOptions || [];
		const total = stages.reduce((s, st) => s + (tc[st] || 0), 0);
		const segs = stages.map((st) => {
			const v = tc[st] || 0;
			if (!v) return "";
			const w = total ? (v / total) * 100 : 0;
			return `<div class="ja-pipeline-top-seg" style="width:${w}%;background:${getStatusColor(st)}"></div>`;
		}).join("");
		const legend = stages.map((st) => `
			<span class="ja-pipeline-top-legend-item">
				<span class="ja-pipeline-top-legend-dot" style="background:${getStatusColor(st)}"></span>
				${tc[st] || 0} ${escapeHtml(st)}
			</span>`).join("");
		container.innerHTML = `
			<div class="ja-pipeline-top">
				<div class="ja-pipeline-top-bar">${segs || '<div class="ja-pipeline-top-seg" style="width:100%;background:#E5E7EB"></div>'}</div>
				<div class="ja-pipeline-top-legend">${legend}</div>
			</div>`;
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
		const container = document.getElementById("ja-tabs-container");
		if (!container) return;
		const tabKeys = ["All", ...(state.statusOptions || [])];
		const tabs = tabKeys.map((key) => {
			const isActive = state.activeTab === key;
			const count = state.tabCounts[key] ?? 0;
			const dot = key === "All" ? "" : `<span class="ja-tab-dot" style="background:${getStatusColor(key)}"></span>`;
			return `
				<div class="ja-tab ${isActive ? "active" : ""}" data-tab="${escapeHtml(key)}">
					${dot}<span>${escapeHtml(key)}</span>
					<span class="ja-tab-count">${count}</span>
				</div>`;
		}).join("");
		container.innerHTML = `<div class="ja-tabs">${tabs}</div>`;
		container.querySelectorAll(".ja-tab").forEach((el) => {
			el.addEventListener("click", () => {
				const tab = el.getAttribute("data-tab");
				if (tab === state.activeTab) return;
				applyTabFilter(tab);
			});
		});
	}

	function ownerCellHtml(ownerId) {
		if (!ownerId) return `<span class="ja-owner">—</span>`;
		const u = state.users[ownerId];
		const display = u ? (u.first_name || u.name || ownerId) : (ownerId.split("@")[0] || ownerId);
		const ini = u ? u.initials : initialsOf(ownerId);
		return `<span class="ja-owner filterable"${filterData("owner", ownerId)}>
			<span class="ja-avatar" style="width:22px;height:22px;background:${avatarColor(ownerId)}">${escapeHtml(ini)}</span>${escapeHtml(display)}
		</span>`;
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
		return `<div class="ja-activity">
			<span class="modified">${modified}</span>
			<span class="comment-count">${chat} ${cc > 99 ? "99+" : cc}</span>
			<span class="list-row-like">${likeHtml}</span>
		</div>`;
	}

	/*
	 * The designed columns, declared once. Order here is only the DEFAULT — the
	 * saved configuration (⋯ → Configure Columns) decides what actually renders.
	 * `fields` is what each column needs SELECTed; the engine unions them into
	 * `add_fields` so a column can be switched on without a refetch.
	 */
	recruitment.list_columns.register(DOCTYPE, {
		// Always fetched, never a column of their own.
		reserved_fields: ["modified", "_liked_by", "_comment_count"],
		// Fetched for the rest of the page (quick filters, aux calls), but still
		// available to add as columns.
		fetch_fields: ["phone_number", "job_title", "designation"],

		leading: {
			key: "__check",
			width: "28px",
			cell_class: "ja-col-check",
			head_render: () => `<input type="checkbox" class="ja-check ja-select-all"/>`,
			render: (doc) =>
				`<input type="checkbox" class="ja-check list-row-checkbox" data-doctype="${DOCTYPE}" data-name="${escapeHtml(doc.name)}"/>`,
		},

		trailing: {
			key: "__activity",
			align: "right",
			width: "120px",
			cell_class: "ja-col-activity",
			fields: ["modified", "_liked_by", "_comment_count"],
			render: (doc, listview) => renderActivity(doc, listview),
		},

		columns: [
			{
				key: "candidate",
				label: __("Candidate"),
				// The row's identity cell: hiding it would leave rows you can't tell
				// apart, so it stays put while everything around it moves.
				locked: true,
				min_width: "220px",
				nowrap: false,
				fields: ["name", "applicant_name", "custom_applicant_middle_name",
					"custom_applicant_last_name", "custom_full_name", "email_id"],
				render: (doc) => {
					const candidate = fullName(doc);
					const ini = initialsOf(candidate || doc.email_id || doc.name);
					return `
						<div class="ja-candidate">
							<span class="ja-avatar" style="background:${avatarColor(doc.name)}">${escapeHtml(ini)}</span>
							<div>
								<div class="ja-cand-name">${escapeHtml(candidate)}</div>
								<div class="ja-cand-email">${escapeHtml(doc.email_id || "")}</div>
							</div>
						</div>`;
				},
			},
			{
				key: "stage",
				label: __("Stage"),
				width: "100px",
				fields: ["status"],
				render: (doc) => {
					const color = getStatusColor(doc.status);
					return `<span class="ja-status-pill${filterCls(doc.status)}"${filterData("status", doc.status)} style="background:${color}1a;color:#111827">
						<span class="ja-status-dot" style="background:${color}"></span>${escapeHtml(doc.status || "")}
					</span>`;
				},
			},
			{
				key: "experience",
				label: __("Experience"),
				width: "70px",
				fields: ["custom_total_experience"],
				render: (doc) => escapeHtml(doc.custom_total_experience || "—"),
			},
			{
				key: "score",
				label: __("Score"),
				width: "130px",
				fields: ["applicant_rating"],
				render: (doc) => {
					const score = Math.max(0, Math.min(100, Math.round((Number(doc.applicant_rating) || 0) * 20)));
					return `<div class="ja-score">
						<div class="ja-score-bar"><div class="ja-score-fill" style="width:${score}%"></div></div>
						<span class="ja-score-num">${score}</span>
					</div>`;
				},
			},
			{
				key: "source",
				label: __("Source"),
				width: "110px",
				fields: ["source", "source_name"],
				render: (doc) => (doc.source
					? `<span class="filterable"${filterData("source", doc.source)}>${escapeHtml(doc.source)}</span>`
					: escapeHtml(doc.source_name || "—")),
			},
			{
				key: "applied",
				label: __("Applied"),
				width: "110px",
				fields: ["creation"],
				render: (doc) => escapeHtml(doc.creation ? frappe.datetime.global_date_format(doc.creation) : ""),
			},
			{
				key: "owner",
				label: __("Owner"),
				width: "110px",
				fields: ["owner"],
				// Names arrive with the aux call; patchOwnerCells() finds the cell again
				// through this attribute and swaps the placeholder for the real name.
				cell_attrs: (doc) => ` data-owner="${escapeHtml(doc.owner || "")}"`,
				render: (doc) => ownerCellHtml(doc.owner),
			},
		],
	});

	function updateSelectAllState(container) {
		const selectAll = container.querySelector(".ja-select-all");
		if (!selectAll) return;
		const all = Array.from(container.querySelectorAll(".list-row-checkbox"));
		selectAll.checked = all.length > 0 && all.every((c) => c.checked);
		selectAll.indeterminate = !selectAll.checked && all.some((c) => c.checked);
	}

	function bindTable(container, listview) {
		const selectAll = container.querySelector(".ja-select-all");
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

		container.querySelectorAll("tr[data-name]").forEach((tr) => {
			tr.addEventListener("click", (e) => {
				if (e.target && e.target.closest("input, button, a, .like-action, .ja-activity, .filterable")) return;
				frappe.set_route("Form", DOCTYPE, tr.getAttribute("data-name"));
			});
		});
	}

	function renderTableInto(listview) {
		const $result = listview.$result;
		if (!$result || !$result.length) return;
		let $host = $result.find(".ja-host");
		if (!$host.length) {
			$host = $('<div class="ja-host"></div>');
			$result.append($host);
		}
		const data = listview.data || [];
		if (!data.length) {
			// Nothing matched — let Frappe's native no-result block show, but still
			// refresh the tabs/pipeline. Returning early used to leave them frozen on
			// the previous filter's numbers, so an empty list still claimed "42".
			$host.html("");
			fetchAux();
			return;
		}

		const cols = recruitment.list_columns;
		$host.html(`
			<div class="ja-table-wrapper">
				<table class="ja-table">
					<thead>${cols.head_html(DOCTYPE, listview)}</thead>
					<tbody>${data.map((d) => cols.row_html(DOCTYPE, d, listview)).join("")}</tbody>
				</table>
			</div>`);

		bindTable($host[0], listview);
		if (typeof listview.set_rows_as_checked === "function") {
			try { listview.set_rows_as_checked(); } catch (e) { /* noop */ }
		}
		fetchAux();
	}

	function patchOwnerCells() {
		const $result = _listview && _listview.$result;
		if (!$result || !$result.length) return;
		$result.find("td[data-owner]").each(function () {
			const id = this.getAttribute("data-owner");
			if (id) this.innerHTML = ownerCellHtml(id);
		});
	}

	// Active list filters EXCEPT status — the tabs count per status, so status must
	// not pre-filter. Everything else (institute, campus invite, opening, …) must
	// apply so the tab counts match the visible, filtered rows.
	//
	// Read through `get_filters_for_args()`, not `filter_area.get()`: that is the
	// same accessor the row query uses, so repeated `=` on one field arrives here
	// already folded into an `in` (see list_filter_multi.js) and the counts stay
	// in step with the rows instead of counting a query that can never match.
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
		const owners = Array.from(new Set(data.map((d) => d.owner).filter(Boolean)));
		const token = ++_auxToken;
		frappe.call({
			method: "recruitment.api.job_applicant_list.get_job_applicants_with_stats",
			args: {
				job_opening: resolveJobOpening(),
				owners: JSON.stringify(owners),
				filters: JSON.stringify(countFilters()),
			},
			callback: (r) => {
				if (token !== _auxToken) return;
				const msg = (r && r.message) || {};
				state.tabCounts = msg.tab_counts || {};
				state.statusOptions = msg.status_options || [];
				state.opening = msg.opening || null;
				state.users = msg.users || {};
				renderHeader();
				renderPipelineTop();
				renderTabs();
				patchOwnerCells();
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
		layoutMain.addClass("ja-custom-active");
		if (layoutMain.find("#ja-header-container").length) return;
		const headerHost = $('<div id="ja-header-container"></div>');
		const pipelineHost = $('<div id="ja-pipeline-container"></div>');
		const tabsHost = $('<div id="ja-tabs-container"></div>');
		// v16 nests `.result` inside `.result-container`; anchor to the outermost
		// of the two so our header/tabs sit ABOVE the whole result block rather
		// than inside v16's fitted, inner-scrolling box.
		const container = layoutMain.find(".frappe-list .result-container");
		const resultEl = container.length ? container : layoutMain.find(".frappe-list .result");
		if (resultEl.length) {
			resultEl.before(headerHost);
			resultEl.before(pipelineHost);
			resultEl.before(tabsHost);
		} else {
			layoutMain.prepend(tabsHost);
			layoutMain.prepend(pipelineHost);
			layoutMain.prepend(headerHost);
		}
	}

	function installRenderOverride(listview) {
		// Repeated `=` filters on one field (two Institutes, two Departments, …)
		// are ANDed by Frappe and match nothing; fold them into a single `in`.
		// Guarded so a missing/stale list_filter_multi.js degrades to the old
		// behaviour instead of taking the whole rendered table down with it.
		recruitment.filters && recruitment.filters.install(listview);
		if (listview._ja_render_patched) return;
		listview._ja_render_patched = true;
		listview.render_list = function () { renderTableInto(this); };
		listview.render_header = function () { /* custom <thead> instead */ };

		// Reveal Frappe's native selection bar only while rows are selected.
		const origOnRowChecked = listview.on_row_checked.bind(listview);
		listview.on_row_checked = function () {
			origOnRowChecked();
			const any = this.$result.find(".list-row-checkbox:checked").length > 0;
			this.$page.find(".layout-main-section").toggleClass("ja-has-selection", any);
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
			syncOpeningFromFilters();
			renderHeader();
			renderPipelineTop();
			renderTabs();

			// Bulk "Send Pre Offer Form" — select many applicants and send the
			// (form-less) pre-offer to each at once. Skips already-sent.
			// Gated by Recruitment Settings -> Enable Pre Offer Form Button.
			frappe.db.get_single_value("Recruitment Settings", "enable_pre_offer_form").then(function (enabled) {
				if (!enabled) return;
				listview.page.add_action_item(__("Send Pre Offer Form"), function () {
					const selected = listview.get_checked_items();
					if (!selected.length) { frappe.msgprint(__("Please select Job Applicants")); return; }
					frappe.confirm(
						__("Send Pre Offer Forms to {0} selected applicant(s)?", [selected.length]),
						function () {
							frappe.call({
								method: "recruitment.api.action_center.send_bulk_pre_offer",
								args: { applicants: JSON.stringify(selected.map((d) => d.name)) },
								freeze: true,
								freeze_message: __("Sending Pre Offer Forms..."),
								callback: function (r2) {
									if (!r2.message) return;
									frappe.msgprint(
										__("Created: {0}<br>Skipped: {1}<br>Failed: {2}", [
											r2.message.created, r2.message.skipped, r2.message.failed,
										]),
									);
									listview.refresh();
								},
							});
						},
					);
				});
			});

			// Preserve "Create Job Offer" bulk action (gated by Recruitment Settings).
			frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Recruitment Settings", name: "Recruitment Settings" },
				callback: function (r) {
					if (!r.message || !r.message.allow_bulk_job_offer) return;
					listview.page.add_action_item("Create Job Offer", function () {
						const selected = listview.get_checked_items();
						if (!selected.length) { frappe.msgprint("Please select Job Applicants"); return; }
						frappe.confirm("Create Job Offers for selected applicants?", function () {
							const applicants = selected.map((d) => d.name);
							frappe.call({
								method: "recruitment.api.bulk_job_offer.create_bulk_job_offer",
								args: { applicants: JSON.stringify(applicants) },
								callback: function (r2) {
									const m = (r2 && r2.message) || {};
									// Reasons say WHY an applicant was left out (no free
									// position, offer already exists) — a bare count sends
									// people hunting through the error log for it.
									const why = (m.reasons || []).length
										? "<br><br>" + frappe.utils.escape_html((m.reasons || []).join("\n")).replace(/\n/g, "<br>")
										: "";
									frappe.msgprint(
										"Created: " + m.created +
										"<br>Skipped: " + m.skipped +
										"<br>Failed: " + m.failed + why,
									);
									listview.refresh();
								},
							});
						});
					});
				},
			});
		},

		refresh(listview) {
			_listview = listview;
			mountAboveList(listview);
			installRenderOverride(listview);
			recruitment.list_columns.add_menu_item(DOCTYPE, listview);
			syncActiveTabFromFilters(listview);
			syncOpeningFromFilters();
			renderHeader();
			renderPipelineTop();
			renderTabs();
		},
	};
})();
