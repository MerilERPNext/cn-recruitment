/* global frappe, $ */

(function () {
	const STATUS_COLORS = {
		"Pending": "#F59E0B",
		"Open & Approved": "#10B981",
		"Rejected": "#EF4444",
		"Filled": "#3B82F6",
		"On Hold": "#9CA3AF",
		"Cancelled": "#EF4444",
	};
	const STATUS_FALLBACK_PALETTE = [
		"#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
		"#F97316", "#0EA5E9", "#84CC16", "#EAB308",
	];
	const AVATAR_PALETTE = [
		"#4F46E5", "#0EA5E9", "#10B981", "#F59E0B",
		"#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
	];

	function hash(s) {
		let h = 0;
		for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
		return h;
	}

	function getStatusColor(s) {
		if (!s) return "#9CA3AF";
		if (STATUS_COLORS[s]) return STATUS_COLORS[s];
		return STATUS_FALLBACK_PALETTE[hash(s) % STATUS_FALLBACK_PALETTE.length];
	}

	function avatarColor(s) {
		if (!s) return AVATAR_PALETTE[0];
		return AVATAR_PALETTE[hash(s) % AVATAR_PALETTE.length];
	}

	function escapeHtml(s) {
		if (s === null || s === undefined) return "";
		return String(s)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}

	function formatCurrency(amount, currency) {
		if (amount === null || amount === undefined) return "—";
		const symbol = currency === "INR" ? "₹" : (currency || "");
		try {
			const formatted = new Intl.NumberFormat("en-IN").format(Math.round(Number(amount) || 0));
			return `${symbol} ${formatted}`;
		} catch (e) {
			return `${symbol} ${amount}`;
		}
	}

	function formatDate(d) {
		if (!d) return "";
		try { return frappe.datetime.global_date_format(d); }
		catch (e) { return d; }
	}

	let state = {
		activeTab: "All",
		tabCounts: {},
		statusOptions: [],
		rows: [],
		loading: false,
	};
	let _listview = null;

	function injectStyles() {
		if (document.getElementById("jr-list-styles")) return;
		const style = document.createElement("style");
		style.id = "jr-list-styles";
		style.textContent = `
			.jr-tabs { display: flex; gap: 8px; padding: 12px 0 4px; flex-wrap: wrap; }
			.jr-tab {
				display: inline-flex; align-items: center; gap: 8px;
				padding: 6px 14px; border-radius: 999px; cursor: pointer;
				background: #F3F4F6; color: #374151; font-size: 13px; font-weight: 500;
				border: 1px solid transparent; transition: background .15s;
			}
			.jr-tab:hover { background: #E5E7EB; }
			.jr-tab.active { background: #111827; color: #fff; }
			.jr-tab .jr-tab-dot { width: 8px; height: 8px; border-radius: 50%; }
			.jr-tab .jr-tab-count {
				background: rgba(255,255,255,0.18); color: inherit;
				padding: 1px 8px; border-radius: 999px; font-size: 12px;
			}
			.jr-tab:not(.active) .jr-tab-count { background: #fff; color: #374151; }

			.jr-table-wrapper { background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; overflow-x: auto; }
			.jr-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: auto; }
			.jr-table thead th {
				text-align: left; font-weight: 500; color: #6B7280; font-size: 11px;
				letter-spacing: 0.04em; text-transform: uppercase;
				background: #F9FAFB; padding: 10px 8px; border-bottom: 1px solid #E5E7EB;
				white-space: nowrap;
			}
			.jr-table tbody td { padding: 12px 8px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
			.jr-table tbody tr:hover { background: #FAFAFA; }
			.jr-table tbody tr:last-child td { border-bottom: none; }

			.jr-col-check        { width: 28px; padding-left: 10px !important; padding-right: 2px !important; }
			.jr-col-id           { width: 170px; white-space: nowrap; color: #6B7280; font-size: 12px; }
			.jr-col-designation  { min-width: 200px; font-weight: 600; color: #111827; }
			.jr-col-status       { width: 130px; white-space: nowrap; }
			.jr-col-department   { width: 140px; white-space: nowrap; color: #4B5563; }
			.jr-col-type         { width: 90px; white-space: nowrap; color: #4B5563; }
			.jr-col-requester    { width: 160px; white-space: nowrap; }
			.jr-col-positions    { width: 80px; text-align: right; font-weight: 600; color: #111827; padding-right: 18px !important; }
			.jr-col-compensation { width: 130px; text-align: right; white-space: nowrap; font-weight: 600; color: #111827; }
			.jr-col-expected     { width: 130px; white-space: nowrap; padding-right: 12px !important; }

			.jr-status-pill {
				display: inline-flex; align-items: center; gap: 6px;
				padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500;
			}
			.jr-status-pill .jr-status-dot { width: 6px; height: 6px; border-radius: 50%; }

			.jr-requester { display: inline-flex; align-items: center; gap: 8px; }
			.jr-avatar {
				width: 26px; height: 26px; border-radius: 50%; color: #fff;
				display: inline-flex; align-items: center; justify-content: center;
				font-size: 11px; font-weight: 600;
			}
			.jr-expected-date { color: #111827; font-weight: 500; }
			.jr-expected-hint { font-size: 11px; color: #6B7280; margin-top: 2px; }

			.jr-empty { padding: 36px; text-align: center; color: #6B7280; }

			/* Hide Frappe's default rendered rows */
			.jr-custom-active .frappe-list .list-row-head,
			.jr-custom-active .frappe-list .list-row-container,
			.jr-custom-active .frappe-list .list-row,
			.jr-custom-active .frappe-list .no-result,
			.jr-custom-active .frappe-list .freeze,
			.jr-custom-active .frappe-list .image-view-container,
			.jr-custom-active .frappe-list .kanban-board { display: none !important; }
			.jr-custom-active #jr-tabs-container,
			.jr-custom-active #jr-table-container { display: block !important; }
		`;
		document.head.appendChild(style);
	}

	function renderTabs(container) {
		const tabKeys = ["All", ...Object.keys(state.tabCounts).filter((k) => k !== "All")];
		const tabs = tabKeys.map((key) => {
			const isActive = state.activeTab === key;
			const count = state.tabCounts[key] ?? 0;
			const dot = key === "All" ? "" : `<span class="jr-tab-dot" style="background:${getStatusColor(key)}"></span>`;
			return `
				<div class="jr-tab ${isActive ? "active" : ""}" data-tab="${escapeHtml(key)}">
					${dot}<span>${escapeHtml(key)}</span>
					<span class="jr-tab-count">${count}</span>
				</div>`;
		}).join("");
		container.innerHTML = `<div class="jr-tabs">${tabs}</div>`;
		container.querySelectorAll(".jr-tab").forEach((el) => {
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
		const requester = row.requester || {};
		return `
			<tr data-name="${escapeHtml(row.name)}">
				<td class="jr-col-check"><input type="checkbox" class="jr-row-check" data-name="${escapeHtml(row.name)}"/></td>
				<td class="jr-col-id">${escapeHtml(row.name)}</td>
				<td class="jr-col-designation">${escapeHtml(row.designation || "—")}</td>
				<td class="jr-col-status">
					<span class="jr-status-pill" style="background:${statusColor}1a;color:#111827">
						<span class="jr-status-dot" style="background:${statusColor}"></span>${escapeHtml(row.status || "")}
					</span>
				</td>
				<td class="jr-col-department">${escapeHtml(row.department || "—")}</td>
				<td class="jr-col-type">${escapeHtml(row.employment_type || "—")}</td>
				<td class="jr-col-requester">
					${requester.id
						? `<span class="jr-requester">
							<span class="jr-avatar" style="background:${avatarColor(requester.id)}">${escapeHtml(requester.initials || "?")}</span>
							${escapeHtml(requester.name || "")}
						</span>`
						: "—"}
				</td>
				<td class="jr-col-positions">${row.no_of_positions || 0}</td>
				<td class="jr-col-compensation">${formatCurrency(row.expected_compensation, row.currency)}</td>
				<td class="jr-col-expected">
					<div class="jr-expected-date">${escapeHtml(formatDate(row.expected_by) || "—")}</div>
					${row.expected_by_hint ? `<div class="jr-expected-hint">${escapeHtml(row.expected_by_hint)}</div>` : ""}
				</td>
			</tr>`;
	}

	function renderTable(container) {
		if (state.loading) { container.innerHTML = `<div class="jr-empty">Loading…</div>`; return; }
		if (!state.rows.length) { container.innerHTML = `<div class="jr-empty">No job requisitions found.</div>`; return; }

		const head = `
			<tr>
				<th class="jr-col-check"><input type="checkbox" class="jr-select-all"/></th>
				<th class="jr-col-id">ID</th>
				<th class="jr-col-designation">Designation</th>
				<th class="jr-col-status">Status</th>
				<th class="jr-col-department">Department</th>
				<th class="jr-col-type">Type</th>
				<th class="jr-col-requester">Requested By</th>
				<th class="jr-col-positions">Positions</th>
				<th class="jr-col-compensation">Compensation</th>
				<th class="jr-col-expected">Expected By</th>
			</tr>`;

		container.innerHTML = `
			<div class="jr-table-wrapper">
				<table class="jr-table">
					<thead>${head}</thead>
					<tbody>${state.rows.map(renderRow).join("")}</tbody>
				</table>
			</div>`;

		// Select-all
		const selectAll = container.querySelector(".jr-select-all");
		const rowChecks = container.querySelectorAll(".jr-row-check");
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

		// Row click → open requisition form
		container.querySelectorAll("tr[data-name]").forEach((tr) => {
			tr.addEventListener("click", (e) => {
				if (e.target && e.target.closest("input, button, a")) return;
				const name = tr.getAttribute("data-name");
				frappe.set_route("Form", "Job Requisition", name);
			});
		});
	}

	let pendingFetch = null;
	function refreshList() {
		const listview = _listview
			|| (frappe.views && frappe.views.list_view && frappe.views.list_view["Job Requisition"]);
		if (!listview) return;
		_listview = listview;

		const tabsHost = document.getElementById("jr-tabs-container");
		const tableHost = document.getElementById("jr-table-container");
		if (!tableHost) return;

		state.loading = true;
		renderTable(tableHost);

		const args = {
			status: state.activeTab === "All" ? null : state.activeTab,
			start: listview.start || 0,
			page_length: listview.page_length || 20,
			order_by: listview.sort_by ? `${listview.sort_by} ${listview.sort_order || "desc"}` : "modified desc",
		};

		if (pendingFetch) pendingFetch.aborted = true;
		const token = { aborted: false };
		pendingFetch = token;

		frappe.call({
			method: "recruitment.api.job_requisition_list.get_job_requisitions_with_stats",
			args,
			callback: (r) => {
				if (token.aborted) return;
				const msg = (r && r.message) || { data: [], total_count: 0, tab_counts: {}, status_options: [] };
				state.rows = msg.data || [];
				state.tabCounts = msg.tab_counts || {};
				state.statusOptions = msg.status_options || [];
				state.loading = false;
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
		if (layoutMain.find("#jr-table-container").length) return;

		layoutMain.addClass("jr-custom-active");

		const tabsHost = $('<div id="jr-tabs-container"></div>');
		const tableHost = $('<div id="jr-table-container" style="margin-top:8px"></div>');

		const resultEl = layoutMain.find(".frappe-list .result");
		if (resultEl.length) {
			resultEl.before(tabsHost);
			resultEl.before(tableHost);
		} else {
			layoutMain.prepend(tableHost);
			layoutMain.prepend(tabsHost);
		}
	}

	frappe.listview_settings["Job Requisition"] = {
		hide_name_column: true,
		add_fields: [
			"designation", "department", "status", "custom_employment_type",
			"requested_by", "requested_by_name", "no_of_positions",
			"expected_compensation", "expected_by", "company",
			"modified", "creation",
		],

		onload(listview) {
			_listview = listview;
			injectStyles();
			mountCustomLayout(listview);

			const debounced = frappe.utils.debounce(refreshList, 200);
			listview.$page.on(
				"change keyup",
				".standard-filter-section input, .standard-filter-section select, .page-form input, .page-form select",
				debounced,
			);
			try {
				if (listview.filter_area && listview.filter_area.filter_list) {
					const fl = listview.filter_area.filter_list;
					if (typeof fl.on_change === "function") {
						const orig = fl.on_change.bind(fl);
						fl.on_change = (...a) => { orig(...a); debounced(); };
					}
				}
			} catch (e) { /* noop */ }
			refreshList();
		},

		refresh(listview) {
			_listview = listview;
			mountCustomLayout(listview);
			refreshList();
		},
	};
})();
