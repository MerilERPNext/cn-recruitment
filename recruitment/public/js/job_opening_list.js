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
			.jo-col-check     { width: 28px; padding-left: 10px !important; padding-right: 2px !important; }
			.jo-col-opening   { min-width: 180px; }
			.jo-col-status    { width: 72px;  white-space: nowrap; }
			.jo-col-applicants{ width: 64px;  white-space: nowrap; }
			.jo-col-pipeline  { min-width: 200px; max-width: 280px; }
			.jo-col-interviews{ width: 70px;  white-space: nowrap; }
			.jo-col-days      { width: 52px;  white-space: nowrap; }
			.jo-col-owner     { width: 110px; white-space: nowrap; }
			.jo-table tbody tr { cursor: pointer; }
			.jo-table tbody tr:hover { background: #FAFAFA; }
			.jo-table tbody tr:last-child td { border-bottom: none; }

			.jo-check { width: 16px; height: 16px; cursor: pointer; }
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

			/* Hide the loading skeleton rows (we render our own table). */
			.jo-custom-active .frappe-list .result .list-row-container { display: none !important; }
			/* Frappe's native column header is replaced by our <thead>, so it's hidden
			   by default — but we REVEAL it while rows are selected so Frappe's native
			   selection bar shows ("N items selected", "X of Y", select-all). When
			   selected, on_row_checked hides the column-label part itself, leaving just
			   the selection bar. Native paging / no-result / Actions menu stay intact. */
			.jo-custom-active .frappe-list .result .list-row-head { display: none !important; }
			.jo-custom-active.jo-has-selection .frappe-list .result .list-row-head { display: flex !important; }
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
		return `<span class="jo-status-pill" style="background:${color}1a;color:#111827">
			<span class="jo-status-dot" style="background:${color}"></span>${escapeHtml(status)}
		</span>`;
	}

	// Initial owner cell before stats arrive: fall back to the owner id's local part.
	// Once stats load, fillStats() replaces this with the resolved full name.
	function ownerCellHtml(ownerId) {
		if (!ownerId) return `<span class="jo-owner"><span class="jo-owner-avatar" style="background:#9CA3AF">?</span>—</span>`;
		const display = ownerId.split("@")[0] || ownerId;
		return `<span class="jo-owner">
			<span class="jo-owner-avatar" style="background:${avatarColor(ownerId)}">${escapeHtml(initialsOf(ownerId))}</span>${escapeHtml(display)}
		</span>`;
	}

	function interviewBadge(n) {
		return n
			? `<span class="jo-interview-badge"><span>📅</span> ${n} active</span>`
			: `<span class="jo-interview-badge is-empty">—</span>`;
	}

	function renderRow(doc) {
		const sub = [doc.designation, doc.department, doc.location].filter(Boolean).map(escapeHtml).join("  ·  ");
		return `
			<tr data-name="${escapeHtml(doc.name)}">
				<td class="jo-col-check"><input type="checkbox" class="jo-check list-row-checkbox" data-doctype="${DOCTYPE}" data-name="${escapeHtml(doc.name)}"/></td>
				<td class="jo-col-opening">
					<div class="jo-opening-title">${escapeHtml(doc.job_title || doc.name)}</div>
					<div class="jo-opening-sub">${escapeHtml(doc.name)}${sub ? "  ·  " + sub : ""}</div>
				</td>
				<td class="jo-col-status">${renderStatusPill(doc.status)}</td>
				<td class="jo-col-applicants" data-stat="applicants"><span class="jo-applicants">0</span><span class="jo-applicants-sub">total</span></td>
				<td class="jo-col-pipeline" data-stat="pipeline">${renderPipeline(null)}</td>
				<td class="jo-col-interviews" data-stat="interviews">${interviewBadge(0)}</td>
				<td class="jo-col-days"><span class="jo-days">${daysOpen(doc)}d</span></td>
				<td class="jo-col-owner" data-stat="owner" data-owner="${escapeHtml(doc.owner || "")}">${ownerCellHtml(doc.owner)}</td>
			</tr>`;
	}

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
				owner.innerHTML = `<span class="jo-owner">
					<span class="jo-owner-avatar" style="background:${avatarColor(s.owner.id)}">${escapeHtml(s.owner.initials || "?")}</span>${escapeHtml(display)}
				</span>`;
			}
		});
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

		// Row click → open the Job Opening form
		container.querySelectorAll("tr[data-name]").forEach((tr) => {
			tr.addEventListener("click", (e) => {
				if (e.target && e.target.closest("input, button, a")) return;
				const name = tr.getAttribute("data-name");
				frappe.set_route("Form", DOCTYPE, name);
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
		if (!data.length) { $host.html(""); return; }

		const head = `
			<tr>
				<th class="jo-col-check"><input type="checkbox" class="jo-check jo-select-all"/></th>
				<th class="jo-col-opening">Opening</th>
				<th class="jo-col-status">Status</th>
				<th class="jo-col-applicants">Applicants</th>
				<th class="jo-col-pipeline">Pipeline</th>
				<th class="jo-col-interviews">Interviews</th>
				<th class="jo-col-days">Open For</th>
				<th class="jo-col-owner">Owner</th>
			</tr>`;

		$host.html(`
			<div class="jo-table-wrapper">
				<table class="jo-table">
					<thead>${head}</thead>
					<tbody>${data.map(renderRow).join("")}</tbody>
				</table>
			</div>`);

		bindTable($host[0], listview);
		if (typeof listview.set_rows_as_checked === "function") {
			try { listview.set_rows_as_checked(); } catch (e) { /* noop */ }
		}
		fillStats();   // fill from cached stats immediately (if any), then refresh
		fetchAux();
	}

	let _auxToken = 0;
	function fetchAux() {
		const data = (_listview && _listview.data) || [];
		const names = data.map((d) => d.name);
		const token = ++_auxToken;
		frappe.call({
			method: "recruitment.api.job_opening_list.get_job_openings_with_stats",
			args: { names: JSON.stringify(names) },
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
			const f = filters.find((arr) => arr && arr[1] === "status" && arr[2] === "=");
			state.activeTab = f && f[3] ? f[3] : "All";
		} catch (e) { state.activeTab = "All"; }
	}

	function mountAboveList(listview) {
		const layoutMain = listview.$page.find(".layout-main-section");
		if (!layoutMain.length) return;
		layoutMain.addClass("jo-custom-active");
		if (layoutMain.find("#jo-tabs-container").length) return;
		const tabsHost = $('<div id="jo-tabs-container"></div>');
		const resultEl = layoutMain.find(".frappe-list .result");
		if (resultEl.length) resultEl.before(tabsHost);
		else layoutMain.prepend(tabsHost);
	}

	function installRenderOverride(listview) {
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
		add_fields: [
			"job_title", "designation", "department", "location",
			"status", "publish", "posted_on", "closes_on", "closed_on",
			"owner", "creation", "modified", "name",
		],

		onload(listview) {
			_listview = listview;
			injectStyles();
			mountAboveList(listview);
			installRenderOverride(listview);
			syncActiveTabFromFilters(listview);
			renderTabs();
		},

		refresh(listview) {
			_listview = listview;
			mountAboveList(listview);
			installRenderOverride(listview);
			syncActiveTabFromFilters(listview);
			renderTabs();
		},
	};
})();
