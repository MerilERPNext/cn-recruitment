/* global frappe, $ */

(function () {
	const SOURCE_PALETTE = [
		"#4F46E5", "#0EA5E9", "#10B981", "#F59E0B",
		"#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
	];
	const STATUS_COLORS = {
		Draft: "#9CA3AF",
		Open: "#374151",
		Shortlisted: "#93C5FD",
		Interview: "#3B82F6",
		Hold: "#F59E0B",
		Approvals: "#F97316",
		Accepted: "#10B981",
		Rejected: "#FCA5A5",
		// Common alternates
		Applied: "#374151",
		Screening: "#93C5FD",
		Offer: "#F59E0B",
		Hired: "#10B981",
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

	let state = {
		activeTab: "All",
		tabCounts: {},
		statusOptions: [],
		opening: null,
		rows: [],
		loading: false,
	};

	// Cached reference to the active list view instance — set by onload/refresh
	// hooks so refreshList can always reach the current filter_area, even when
	// frappe.views.list_view["Job Applicant"] isn't populated yet (initial render).
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
			.ja-header-meta a { color: #2563EB; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
			.ja-header-meta a:hover { text-decoration: underline; }

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
			.ja-table tbody tr:hover { background: #FAFAFA; }
			.ja-table tbody tr:last-child td { border-bottom: none; }

			.ja-col-check     { width: 28px; padding-left: 10px !important; padding-right: 2px !important; }
			.ja-col-candidate { min-width: 220px; }
			.ja-col-stage     { width: 100px; white-space: nowrap; }
			.ja-col-exp       { width: 70px; white-space: nowrap; }
			.ja-col-score     { width: 130px; }
			.ja-col-source    { width: 110px; white-space: nowrap; }
			.ja-col-applied   { width: 110px; white-space: nowrap; }
			.ja-col-owner     { width: 110px; white-space: nowrap; }
			.ja-col-actions   { width: 60px; white-space: nowrap; padding-right: 10px !important; }

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
			.ja-row-actions { display: inline-flex; gap: 6px; }
			.ja-row-actions button {
				border: none; background: transparent; padding: 4px; border-radius: 4px;
				color: #6B7280; cursor: pointer;
			}
			.ja-row-actions button:hover { background: #F3F4F6; color: #111827; }

			.ja-empty { padding: 36px; text-align: center; color: #6B7280; }

			/* Hide Frappe's default rendered rows */
			.ja-custom-active .frappe-list .list-row-head,
			.ja-custom-active .frappe-list .list-row-container,
			.ja-custom-active .frappe-list .list-row,
			.ja-custom-active .frappe-list .no-result,
			.ja-custom-active .frappe-list .freeze,
			.ja-custom-active .frappe-list .image-view-container,
			.ja-custom-active .frappe-list .kanban-board { display: none !important; }
			.ja-custom-active #ja-header-container,
			.ja-custom-active #ja-pipeline-container,
			.ja-custom-active #ja-tabs-container,
			.ja-custom-active #ja-table-container { display: block !important; }
		`;
		document.head.appendChild(style);
	}

	function resolveJobOpening() {
		// 1. Simple URL param: ?job_title=X
		const params = new URLSearchParams(window.location.search);
		if (params.get("job_title")) return params.get("job_title");

		// 2. ?filters=[["Job Applicant","job_title","=","XXX"]]
		const fParam = params.get("filters");
		if (fParam) {
			try {
				const parsed = JSON.parse(decodeURIComponent(fParam));
				const f = (parsed || []).find((arr) => arr && arr[1] === "job_title");
				if (f && f[3]) return f[3];
			} catch (e) { /* noop */ }
		}

		// 3. Filter applied via the list view's filter_area widget (popup or quick filter)
		const lv = _listview || (frappe.views && frappe.views.list_view && frappe.views.list_view["Job Applicant"]);
		try {
			if (lv && lv.filter_area && typeof lv.filter_area.get === "function") {
				const filters = lv.filter_area.get();
				const f = (filters || []).find((arr) => arr && arr[1] === "job_title");
				if (f && f[3]) return f[3];
			}
		} catch (e) { /* noop */ }

		// 4. frappe.route_options (set when navigating with set_route options)
		if (frappe.route_options && frappe.route_options.job_title) {
			return frappe.route_options.job_title;
		}
		return null;
	}

	function renderHeader(container) {
		if (!state.opening) { container.innerHTML = ""; return; }
		const op = state.opening;
		const meta = [op.designation, op.department, op.location].filter(Boolean).map(escapeHtml).join(" · ");
		container.innerHTML = `
			<div class="ja-header">
				<div class="ja-header-eyebrow">Applicants for</div>
				<div class="ja-header-title">${escapeHtml(op.job_title || op.name)}</div>
				<div class="ja-header-meta">
					<span>${escapeHtml(op.name)}</span>
					${meta ? `<span>·</span><span>${meta}</span>` : ""}
					<span>·</span>
					<a href="/app/job-opening/${encodeURIComponent(op.name)}">↗ Open job opening</a>
				</div>
			</div>`;
	}

	function renderPipelineTop(container) {
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

	function renderTabs(container) {
		const tabKeys = ["All", ...Object.keys(state.tabCounts).filter((k) => k !== "All")];
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
				state.activeTab = tab;
				refreshList();
			});
		});
	}

	function renderRow(row) {
		const statusColor = getStatusColor(row.status);
		const score = Math.max(0, Math.min(100, row.score_pct || 0));
		const applied = row.applied_on ? frappe.datetime.global_date_format(row.applied_on) : "";
		const ownerHtml = row.owner && row.owner.id
			? `<span class="ja-owner"><span class="ja-avatar" style="width:22px;height:22px;background:${avatarColor(row.owner.id)}">${escapeHtml(row.owner.initials)}</span>${escapeHtml(row.owner.first_name || "")}</span>`
			: `<span class="ja-owner">—</span>`;

		return `
			<tr data-name="${escapeHtml(row.name)}">
				<td class="ja-col-check"><input type="checkbox" class="ja-row-check" data-name="${escapeHtml(row.name)}"/></td>
				<td class="ja-col-candidate">
					<div class="ja-candidate">
						<span class="ja-avatar" style="background:${avatarColor(row.name)}">${escapeHtml(row.initials || "?")}</span>
						<div>
							<div class="ja-cand-name">${escapeHtml(row.applicant_name || row.name)}</div>
							<div class="ja-cand-email">${escapeHtml(row.email_id || "")}</div>
						</div>
					</div>
				</td>
				<td class="ja-col-stage">
					<span class="ja-status-pill" style="background:${statusColor}1a;color:#111827">
						<span class="ja-status-dot" style="background:${statusColor}"></span>${escapeHtml(row.status || "")}
					</span>
				</td>
				<td class="ja-col-exp">${escapeHtml(row.experience || "—")}</td>
				<td class="ja-col-score">
					<div class="ja-score">
						<div class="ja-score-bar"><div class="ja-score-fill" style="width:${score}%"></div></div>
						<span class="ja-score-num">${score}</span>
					</div>
				</td>
				<td class="ja-col-source">${escapeHtml(row.source || row.source_name || "—")}</td>
				<td class="ja-col-applied">${escapeHtml(applied)}</td>
				<td class="ja-col-owner">${ownerHtml}</td>
				<td class="ja-col-actions">
					<div class="ja-row-actions">
						<button data-action="open" title="Open in new tab">↗</button>
						<button data-action="more" title="More">⋮</button>
					</div>
				</td>
			</tr>`;
	}

	function renderTable(container) {
		if (state.loading) { container.innerHTML = `<div class="ja-empty">Loading…</div>`; return; }
		if (!state.rows.length) { container.innerHTML = `<div class="ja-empty">No applicants found.</div>`; return; }

		const head = `
			<tr>
				<th class="ja-col-check"><input type="checkbox" class="ja-select-all"/></th>
				<th class="ja-col-candidate">Candidate</th>
				<th class="ja-col-stage">Stage</th>
				<th class="ja-col-exp">Experience</th>
				<th class="ja-col-score">Score</th>
				<th class="ja-col-source">Source</th>
				<th class="ja-col-applied">Applied</th>
				<th class="ja-col-owner">Owner</th>
				<th class="ja-col-actions"></th>
			</tr>`;

		container.innerHTML = `
			<div class="ja-table-wrapper">
				<table class="ja-table">
					<thead>${head}</thead>
					<tbody>${state.rows.map(renderRow).join("")}</tbody>
				</table>
			</div>`;

		// Select-all
		const selectAll = container.querySelector(".ja-select-all");
		const rowChecks = container.querySelectorAll(".ja-row-check");
		if (selectAll) {
			selectAll.addEventListener("click", (e) => e.stopPropagation());
			selectAll.addEventListener("change", () => {
				rowChecks.forEach((cb) => { cb.checked = selectAll.checked; });
			});
		}
		rowChecks.forEach((cb) => {
			cb.addEventListener("click", (e) => e.stopPropagation());
			cb.addEventListener("change", () => {
				if (!selectAll) return;
				const all = Array.from(rowChecks);
				selectAll.checked = all.every((c) => c.checked);
				selectAll.indeterminate = !selectAll.checked && all.some((c) => c.checked);
			});
		});

		// Row click → form
		container.querySelectorAll("tr[data-name]").forEach((tr) => {
			tr.addEventListener("click", (e) => {
				if (e.target && e.target.closest("input, button, a")) return;
				const name = tr.getAttribute("data-name");
				frappe.set_route("Form", "Job Applicant", name);
			});
		});

		// Action buttons
		container.querySelectorAll("button[data-action]").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const tr = btn.closest("tr[data-name]");
				const name = tr && tr.getAttribute("data-name");
				const action = btn.getAttribute("data-action");
				if (!name) return;
				if (action === "open") {
					window.open(`/app/job-applicant/${encodeURIComponent(name)}`, "_blank");
				} else if (action === "more") {
					frappe.set_route("Form", "Job Applicant", name);
				}
			});
		});
	}

	let pendingFetch = null;
	function refreshList() {
		const listview = _listview
			|| (frappe.views && frappe.views.list_view && frappe.views.list_view["Job Applicant"]);
		if (!listview) return;
		_listview = listview;

		const headerHost = document.getElementById("ja-header-container");
		const pipelineHost = document.getElementById("ja-pipeline-container");
		const tabsHost = document.getElementById("ja-tabs-container");
		const tableHost = document.getElementById("ja-table-container");
		if (!tableHost) return;

		state.loading = true;
		renderTable(tableHost);

		const args = {
			job_opening: resolveJobOpening(),
			status: state.activeTab === "All" ? null : state.activeTab,
			start: listview.start || 0,
			page_length: listview.page_length || 20,
			order_by: listview.sort_by ? `${listview.sort_by} ${listview.sort_order || "desc"}` : "creation desc",
		};

		if (pendingFetch) pendingFetch.aborted = true;
		const token = { aborted: false };
		pendingFetch = token;

		frappe.call({
			method: "recruitment.api.job_applicant_list.get_job_applicants_with_stats",
			args,
			callback: (r) => {
				if (token.aborted) return;
				const msg = (r && r.message) || { data: [], total_count: 0, tab_counts: {}, status_options: [], opening: null };
				state.rows = msg.data || [];
				state.tabCounts = msg.tab_counts || {};
				state.statusOptions = msg.status_options || [];
				state.opening = msg.opening || null;
				state.loading = false;
				if (headerHost) renderHeader(headerHost);
				if (pipelineHost) renderPipelineTop(pipelineHost);
				if (tabsHost) renderTabs(tabsHost);
				renderTable(tableHost);
			},
			error: () => {
				if (token.aborted) return;
				state.loading = false;
				renderTable(tableHost);
			},
		});
	}

	function mountCustomLayout(listview) {
		const layoutMain = listview.$page.find(".layout-main-section");
		if (!layoutMain.length) return;
		if (layoutMain.find("#ja-table-container").length) return;

		layoutMain.addClass("ja-custom-active");

		const headerHost = $('<div id="ja-header-container"></div>');
		const pipelineHost = $('<div id="ja-pipeline-container"></div>');
		const tabsHost = $('<div id="ja-tabs-container"></div>');
		const tableHost = $('<div id="ja-table-container" style="margin-top:8px"></div>');

		const resultEl = layoutMain.find(".frappe-list .result");
		if (resultEl.length) {
			resultEl.before(headerHost);
			resultEl.before(pipelineHost);
			resultEl.before(tabsHost);
			resultEl.before(tableHost);
		} else {
			layoutMain.prepend(tableHost);
			layoutMain.prepend(tabsHost);
			layoutMain.prepend(pipelineHost);
			layoutMain.prepend(headerHost);
		}
	}

	frappe.listview_settings["Job Applicant"] = {
		hide_name_column: true,
		add_fields: [
			"applicant_name", "email_id", "phone_number", "status",
			"job_title", "designation", "source", "source_name",
			"applicant_rating", "custom_total_experience",
			"owner", "creation", "modified",
		],

		onload(listview) {
			_listview = listview;
			injectStyles();
			mountCustomLayout(listview);

			const debounced = frappe.utils.debounce(refreshList, 200);

			// Standard top-row filter inputs (ID / Applicant Name / Status)
			listview.$page.on(
				"change keyup",
				".standard-filter-section input, .standard-filter-section select, .page-form input, .page-form select",
				debounced,
			);

			// Filter popup ("+ Add a Filter") changes go through filter_area / filter_list events.
			// Subscribe so applying or clearing a filter immediately re-runs our fetch.
			try {
				if (listview.filter_area && listview.filter_area.filter_list) {
					const fl = listview.filter_area.filter_list;
					if (typeof fl.on_change === "function") {
						const orig = fl.on_change.bind(fl);
						fl.on_change = (...a) => { orig(...a); debounced(); };
					}
					// Frappe also bubbles up an apply event we can catch on the DOM
					listview.$page.on("click", ".filter-popover-list .apply-filters, .filter-action-buttons .apply-btn", debounced);
				}
			} catch (e) { /* noop */ }

			refreshList();

			// Preserve existing "Create Job Offer" bulk action (unchanged behavior)
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
									frappe.msgprint(
										"Created: " + r2.message.created +
										"<br>Skipped: " + r2.message.skipped +
										"<br>Failed: " + r2.message.failed,
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
			mountCustomLayout(listview);
			refreshList();
		},
	};
})();
