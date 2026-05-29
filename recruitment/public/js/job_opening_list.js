/* global frappe */

(function () {
	const PIPELINE_STAGES = [
		{ key: "Draft",       color: "#9CA3AF", label: "Draft" },
		{ key: "Open",        color: "#374151", label: "Open" },
		{ key: "Shortlisted", color: "#93C5FD", label: "Shortlisted" },
		{ key: "Interview",   color: "#3B82F6", label: "Interview" },
		{ key: "Hold",        color: "#F59E0B", label: "Hold" },
		{ key: "Approvals",   color: "#F97316", label: "Approvals" },
		{ key: "Accepted",    color: "#10B981", label: "Accepted" },
		{ key: "Rejected",    color: "#FCA5A5", label: "Rejected" },
	];

	// Default dot colors for well-known statuses. Anything not listed gets a color
	// derived from a hash of the status name, so new options in the doctype Just Work.
	const STATUS_COLORS = {
		Open: "#10B981",
		Closed: "#9CA3AF",
		Draft: "#F59E0B",
		Hold: "#F59E0B",
		Cancelled: "#EF4444",
	};
	const STATUS_FALLBACK_PALETTE = [
		"#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
		"#F97316", "#0EA5E9", "#84CC16", "#EAB308",
	];

	function getStatusColor(status) {
		if (!status) return "#9CA3AF";
		if (STATUS_COLORS[status]) return STATUS_COLORS[status];
		let h = 0;
		for (let i = 0; i < status.length; i++) h = (h * 31 + status.charCodeAt(i)) >>> 0;
		return STATUS_FALLBACK_PALETTE[h % STATUS_FALLBACK_PALETTE.length];
	}

	const OWNER_PALETTE = [
		"#4F46E5", "#0EA5E9", "#10B981", "#F59E0B",
		"#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
	];

	let state = {
		activeTab: "All",
		tabCounts: { All: 0, Open: 0, Draft: 0, Closed: 0 },
		rows: [],
		loading: false,
	};

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
			.jo-table tbody td {
				padding: 12px 6px; border-bottom: 1px solid #F3F4F6; vertical-align: middle;
			}
			/* Compact column widths so the row fits without horizontal scroll on narrow viewports */
			.jo-col-check     { width: 28px; padding-left: 10px !important; padding-right: 2px !important; }
			.jo-col-opening   { min-width: 180px; }
			.jo-col-status    { width: 72px;  white-space: nowrap; }
			.jo-col-applicants{ width: 64px;  white-space: nowrap; }
			.jo-col-pipeline  { min-width: 200px; max-width: 280px; }
			.jo-col-interviews{ width: 70px;  white-space: nowrap; }
			.jo-col-days      { width: 52px;  white-space: nowrap; }
			.jo-col-owner     { width: 110px; white-space: nowrap; }
			.jo-col-actions   { width: 56px;  white-space: nowrap; padding-right: 10px !important; }
			.jo-table tbody tr:hover { background: #FAFAFA; }
			.jo-table tbody tr:last-child td { border-bottom: none; }

			.jo-opening-title { font-weight: 600; color: #111827; }
			.jo-opening-sub { font-size: 12px; color: #6B7280; margin-top: 2px; }
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

			.jo-row-actions { display: inline-flex; gap: 6px; }
			.jo-row-actions button {
				border: none; background: transparent; padding: 4px; border-radius: 4px;
				color: #6B7280; cursor: pointer;
			}
			.jo-row-actions button:hover { background: #F3F4F6; color: #111827; }

			.jo-checkbox { width: 16px; height: 16px; cursor: pointer; }
			.jo-empty { padding: 36px; text-align: center; color: #6B7280; }

			/* Hide Frappe's default rendered rows; we render our own table */
			.jo-custom-active .frappe-list .list-row-head,
			.jo-custom-active .frappe-list .list-row-container,
			.jo-custom-active .frappe-list .list-row,
			.jo-custom-active .frappe-list .no-result,
			.jo-custom-active .frappe-list .freeze,
			.jo-custom-active .frappe-list .image-view-container,
			.jo-custom-active .frappe-list .kanban-board { display: none !important; }
			/* Our injected hosts must stay visible even though they sit inside .frappe-list */
			.jo-custom-active #jo-tabs-container,
			.jo-custom-active #jo-table-container { display: block !important; }
		`;
		document.head.appendChild(style);
	}

	function avatarColor(name) {
		if (!name) return OWNER_PALETTE[0];
		let h = 0;
		for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
		return OWNER_PALETTE[h % OWNER_PALETTE.length];
	}

	function escapeHtml(s) {
		if (s === null || s === undefined) return "";
		return String(s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}

	function renderTabs(container) {
		// Tab order: "All" first, then each status option from the doctype meta (returned by the API).
		const tabKeys = ["All", ...Object.keys(state.tabCounts).filter((k) => k !== "All")];
		const tabs = tabKeys.map((key) => {
			const isActive = state.activeTab === key;
			const count = state.tabCounts[key] ?? 0;
			const dot = key === "All"
				? ""
				: `<span class="jo-tab-dot" style="background:${getStatusColor(key)}"></span>`;
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
				state.activeTab = tab;
				refreshList();
			});
		});
	}

	function renderPipeline(row) {
		const pipeline = row.pipeline || {};
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

	function renderStatusPill(displayStatus) {
		if (!displayStatus) return `<span class="jo-status-pill" style="background:#F3F4F6;color:#6B7280">—</span>`;
		const color = getStatusColor(displayStatus);
		// Soft background derived from the dot color, dark text for contrast.
		return `<span class="jo-status-pill" style="background:${color}1a;color:#111827">
			<span class="jo-status-dot" style="background:${color}"></span>${escapeHtml(displayStatus)}
		</span>`;
	}

	function renderOwner(owner) {
		if (!owner || !owner.id) {
			return `<span class="jo-owner"><span class="jo-owner-avatar" style="background:#9CA3AF">?</span>—</span>`;
		}
		const color = avatarColor(owner.id);
		return `
			<span class="jo-owner">
				<span class="jo-owner-avatar" style="background:${color}">${escapeHtml(owner.initials || "?")}</span>
				${escapeHtml((owner.name || "").split(" ")[0])}
			</span>`;
	}

	function renderRow(row) {
		const sub = [row.designation, row.department, row.location].filter(Boolean).map(escapeHtml).join("  ·  ");
		const interviews = row.active_interviews || 0;
		const interviewBadge = interviews
			? `<span class="jo-interview-badge"><span>📅</span> ${interviews} active</span>`
			: `<span class="jo-interview-badge is-empty">—</span>`;

		return `
			<tr data-name="${escapeHtml(row.name)}">
				<td class="jo-col-check"><input type="checkbox" class="jo-checkbox jo-row-check" data-name="${escapeHtml(row.name)}"/></td>
				<td class="jo-col-opening">
					<div class="jo-opening-title">${escapeHtml(row.job_title || row.name)}</div>
					<div class="jo-opening-sub">${escapeHtml(row.name)}${sub ? "  ·  " + sub : ""}</div>
				</td>
				<td class="jo-col-status">${renderStatusPill(row.display_status)}</td>
				<td class="jo-col-applicants"><span class="jo-applicants">${row.total_applicants || 0}</span><span class="jo-applicants-sub">total</span></td>
				<td class="jo-col-pipeline">${renderPipeline(row)}</td>
				<td class="jo-col-interviews">${interviewBadge}</td>
				<td class="jo-col-days"><span class="jo-days">${row.open_for_days || 0}d</span></td>
				<td class="jo-col-owner">${renderOwner(row.owner)}</td>
				<td class="jo-col-actions">
					<div class="jo-row-actions">
						<button data-action="open" title="Open in new tab">↗</button>
						<button data-action="more" title="More">⋮</button>
					</div>
				</td>
			</tr>`;
	}

	function renderTable(container) {
		if (state.loading) {
			container.innerHTML = `<div class="jo-empty">Loading…</div>`;
			return;
		}
		if (!state.rows.length) {
			container.innerHTML = `<div class="jo-empty">No job openings found.</div>`;
			return;
		}

		const head = `
			<tr>
				<th class="jo-col-check"><input type="checkbox" class="jo-checkbox jo-select-all"/></th>
				<th class="jo-col-opening">Opening</th>
				<th class="jo-col-status">Status</th>
				<th class="jo-col-applicants">Applicants</th>
				<th class="jo-col-pipeline">Pipeline</th>
				<th class="jo-col-interviews">Interviews</th>
				<th class="jo-col-days">Open For</th>
				<th class="jo-col-owner">Owner</th>
				<th class="jo-col-actions"></th>
			</tr>`;

		const body = state.rows.map(renderRow).join("");
		container.innerHTML = `
			<div class="jo-table-wrapper">
				<table class="jo-table">
					<thead>${head}</thead>
					<tbody>${body}</tbody>
				</table>
			</div>`;

		// Select-all checkbox in header toggles all row checkboxes
		const selectAll = container.querySelector(".jo-select-all");
		const rowChecks = container.querySelectorAll(".jo-row-check");
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

		// Row click → Job Applicant list filtered by this opening
		container.querySelectorAll("tr[data-name]").forEach((tr) => {
			tr.addEventListener("click", (e) => {
				if (e.target && e.target.closest("input, button")) return;
				const name = tr.getAttribute("data-name");
				frappe.route_options = { job_title: name };
				frappe.set_route("List", "Job Applicant");
			});
		});

		// ↗ action → open Job Opening form in a NEW tab
		// ⋮ action → open Job Opening form (same tab)
		container.querySelectorAll("button[data-action]").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const tr = btn.closest("tr[data-name]");
				const name = tr && tr.getAttribute("data-name");
				const action = btn.getAttribute("data-action");
				if (!name) return;
				if (action === "open") {
					window.open(`/app/job-opening/${encodeURIComponent(name)}`, "_blank");
				} else if (action === "more") {
					frappe.set_route("Form", "Job Opening", name);
				}
			});
		});
	}

	function getActiveListView() {
		return frappe.views && frappe.views.list_view
			? frappe.views.list_view["Job Opening"]
			: null;
	}

	function getSearchTerm(listview) {
		try {
			const tagsInput = listview.page.page_form.find('input[data-fieldname="tag"]');
			if (tagsInput.length) return tagsInput.val() || "";
		} catch (e) { /* noop */ }
		return "";
	}

	let pendingFetch = null;
	function refreshList() {
		const listview = getActiveListView();
		if (!listview) return;

		const tabsContainer = document.getElementById("jo-tabs-container");
		const tableContainer = document.getElementById("jo-table-container");
		if (!tableContainer) return;

		state.loading = true;
		renderTable(tableContainer);

		const args = {
			status: state.activeTab === "All" ? null : state.activeTab,
			search: getSearchTerm(listview),
			start: (listview.start || 0),
			page_length: (listview.page_length || 20),
			order_by: listview.sort_by ? `${listview.sort_by} ${listview.sort_order || "desc"}` : "modified desc",
		};

		if (pendingFetch) pendingFetch.aborted = true;
		const token = { aborted: false };
		pendingFetch = token;

		frappe.call({
			method: "recruitment.api.job_opening_list.get_job_openings_with_stats",
			args,
			callback: (r) => {
				if (token.aborted) return;
				const msg = (r && r.message) || { data: [], total_count: 0, tab_counts: state.tabCounts };
				state.rows = msg.data || [];
				state.tabCounts = msg.tab_counts || state.tabCounts;
				state.loading = false;
				if (tabsContainer) renderTabs(tabsContainer);
				renderTable(tableContainer);
			},
			error: () => {
				if (token.aborted) return;
				state.loading = false;
				renderTable(tableContainer);
			},
		});
	}

	function mountCustomLayout(listview) {
		const layoutMain = listview.$page.find(".layout-main-section");
		if (!layoutMain.length) return;
		if (layoutMain.find("#jo-tabs-container").length) return;

		layoutMain.addClass("jo-custom-active");

		const tabsHost = $('<div id="jo-tabs-container"></div>');
		const tableHost = $('<div id="jo-table-container" style="margin-top:12px"></div>');

		const resultEl = layoutMain.find(".frappe-list .result");
		if (resultEl.length) {
			resultEl.before(tabsHost);
			resultEl.before(tableHost);
		} else {
			layoutMain.prepend(tableHost);
			layoutMain.prepend(tabsHost);
		}

		renderTabs(tabsHost[0]);
		renderTable(tableHost[0]);
	}

	frappe.listview_settings["Job Opening"] = {
		hide_name_column: true,
		add_fields: [
			"job_title", "designation", "department", "location",
			"status", "publish", "posted_on", "closes_on", "closed_on",
			"owner", "modified", "name",
		],

		onload(listview) {
			injectStyles();
			mountCustomLayout(listview);

			// Refresh our custom table whenever the user changes filters/search/page.
			const debounced = frappe.utils.debounce(refreshList, 200);
			listview.$page.on(
				"change keyup",
				".standard-filter-section input, .standard-filter-section select, .page-form input, .page-form select",
				debounced,
			);
			refreshList();
		},

		refresh(listview) {
			mountCustomLayout(listview);
			refreshList();
		},
	};
})();
