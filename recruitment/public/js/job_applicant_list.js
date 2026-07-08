/* global frappe, $ */

/*
 * Job Applicant — custom list rendering on top of Frappe's native list view.
 *
 * Frappe owns data (`listview.data`), filtering, sorting, pagination, selection
 * and the Actions menu. We override `render_list` to draw our styled table into
 * Frappe's `$result`; each row checkbox uses the native `.list-row-checkbox`
 * class so native selection / bulk actions work untouched. A small aux API call
 * supplies tab counts, the top pipeline bar, the scoped header and owner names.
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

	// Fieldnames that already have their OWN dedicated column in our designed table
	// (so we don't draw them twice). Everything else the user adds via Frappe's List
	// Settings is appended as a real extra column with its own value.
	const KNOWN_FIELDS = new Set([
		"name", "applicant_name", "email_id", "status",
		"source", "source_name", "applicant_rating", "custom_total_experience",
		"owner", "creation", "modified", "_liked_by", "_comment_count",
	]);

	// Columns the user added via List Settings that we don't already draw.
	// Frappe builds `listview.columns` from the doctype's in_list_view fields +
	// List View Settings, and fetches their data automatically, so doc[fieldname]
	// is populated for us.
	function extraColumns(listview) {
		const cols = (listview && listview.columns) || [];
		return cols.filter((c) => c && c.type === "Field" && c.df && c.df.fieldname && !KNOWN_FIELDS.has(c.df.fieldname));
	}
	function extraHeadCells(listview) {
		return extraColumns(listview).map((c) =>
			`<th class="ja-col-extra">${escapeHtml(__(c.df.label || c.df.fieldname))}</th>`
		).join("");
	}
	function extraRowCells(doc, listview) {
		return extraColumns(listview).map((c) =>
			`<td class="ja-col-extra">${formatCellHtml(doc, c.df)}</td>`
		).join("");
	}

	// Render one extra-column value exactly like Frappe's native list cell:
	// formatted for display, but wrapped in a `.filterable` element (with the raw
	// stored value in data-filter) for every field type Frappe makes clickable —
	// i.e. everything except Image / rich-HTML fields.
	function formatCellHtml(doc, df) {
		const fieldname = df && df.fieldname;
		const value = doc[fieldname];
		if (value === null || value === undefined || value === "") return "";
		const htmlTypes = (frappe.model && frappe.model.html_fieldtypes) || [];
		if (df.fieldtype === "Image" || htmlTypes.includes(df.fieldtype)) {
			try { return frappe.format(value, df, { inline: true }, doc); }
			catch (e) { return escapeHtml(value); }
		}
		// Link: render the raw value as a filter-only anchor (no href) so clicking
		// filters instead of navigating — matching Frappe's native Link cell.
		if (df.fieldtype === "Link" || df.fieldtype === "Dynamic Link") {
			return `<a class="filterable"${filterData(fieldname, value)}>${escapeHtml(value)}</a>`;
		}
		let display;
		try { display = frappe.format(value, df, { inline: true }, doc); }
		catch (e) { display = escapeHtml(value); }
		return `<span class="filterable"${filterData(fieldname, value)}>${display == null ? "" : display}</span>`;
	}

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
			.ja-table tbody tr { cursor: pointer; }
			.ja-table tbody tr:hover { background: #FAFAFA; }
			.ja-table tbody tr:last-child td { border-bottom: none; }
			.ja-table .filterable { cursor: pointer; }
			.ja-table .filterable:hover { text-decoration: underline; text-underline-offset: 2px; }

			.ja-col-check     { width: 28px; padding-left: 10px !important; padding-right: 2px !important; }
			.ja-col-candidate { min-width: 220px; }
			.ja-col-stage     { width: 100px; white-space: nowrap; }
			.ja-col-exp       { width: 70px; white-space: nowrap; }
			.ja-col-score     { width: 130px; }
			.ja-col-source    { width: 110px; white-space: nowrap; }
			.ja-col-applied   { width: 110px; white-space: nowrap; }
			.ja-col-owner     { width: 110px; white-space: nowrap; }
			.ja-col-extra     { color: #374151; white-space: nowrap; }

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
			.ja-col-activity { width: 120px; white-space: nowrap; text-align: right; padding-right: 12px !important; }
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
				const f = (lv.filter_area.get() || []).find((arr) => arr && arr[1] === "job_title");
				if (f && f[3]) return f[3];
			}
		} catch (e) { /* noop */ }
		return null;
	}

	function renderHeader() {
		const container = document.getElementById("ja-header-container");
		if (!container) return;
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

	function renderRow(doc, listview) {
		const statusColor = getStatusColor(doc.status);
		const score = Math.max(0, Math.min(100, Math.round((Number(doc.applicant_rating) || 0) * 20)));
		const applied = doc.creation ? frappe.datetime.global_date_format(doc.creation) : "";
		const nameInitials = initialsOf(doc.applicant_name || doc.email_id || doc.name);
		return `
			<tr data-name="${escapeHtml(doc.name)}">
				<td class="ja-col-check"><input type="checkbox" class="ja-check list-row-checkbox" data-doctype="${DOCTYPE}" data-name="${escapeHtml(doc.name)}"/></td>
				<td class="ja-col-candidate">
					<div class="ja-candidate">
						<span class="ja-avatar" style="background:${avatarColor(doc.name)}">${escapeHtml(nameInitials)}</span>
						<div>
							<div class="ja-cand-name">${escapeHtml(doc.applicant_name || doc.name)}</div>
							<div class="ja-cand-email">${escapeHtml(doc.email_id || "")}</div>
						</div>
					</div>
				</td>
				<td class="ja-col-stage">
					<span class="ja-status-pill${filterCls(doc.status)}"${filterData("status", doc.status)} style="background:${statusColor}1a;color:#111827">
						<span class="ja-status-dot" style="background:${statusColor}"></span>${escapeHtml(doc.status || "")}
					</span>
				</td>
				<td class="ja-col-exp">${escapeHtml(doc.custom_total_experience || "—")}</td>
				<td class="ja-col-score">
					<div class="ja-score">
						<div class="ja-score-bar"><div class="ja-score-fill" style="width:${score}%"></div></div>
						<span class="ja-score-num">${score}</span>
					</div>
				</td>
				<td class="ja-col-source">${doc.source
					? `<span class="filterable"${filterData("source", doc.source)}>${escapeHtml(doc.source)}</span>`
					: escapeHtml(doc.source_name || "—")}</td>
				<td class="ja-col-applied">${escapeHtml(applied)}</td>
				<td class="ja-col-owner" data-owner="${escapeHtml(doc.owner || "")}">${ownerCellHtml(doc.owner)}</td>
				${extraRowCells(doc, listview)}
				<td class="ja-col-activity">${renderActivity(doc, listview)}</td>
			</tr>`;
	}

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
		if (!data.length) { $host.html(""); return; }

		const head = `
			<tr>
				<th class="ja-col-check"><input type="checkbox" class="ja-check ja-select-all"/></th>
				<th class="ja-col-candidate">Candidate</th>
				<th class="ja-col-stage">Stage</th>
				<th class="ja-col-exp">Experience</th>
				<th class="ja-col-score">Score</th>
				<th class="ja-col-source">Source</th>
				<th class="ja-col-applied">Applied</th>
				<th class="ja-col-owner">Owner</th>
				${extraHeadCells(listview)}
				<th class="ja-col-activity"></th>
			</tr>`;

		$host.html(`
			<div class="ja-table-wrapper">
				<table class="ja-table">
					<thead>${head}</thead>
					<tbody>${data.map((d) => renderRow(d, listview)).join("")}</tbody>
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

	let _auxToken = 0;
	function fetchAux() {
		const data = (_listview && _listview.data) || [];
		const owners = Array.from(new Set(data.map((d) => d.owner).filter(Boolean)));
		const token = ++_auxToken;
		frappe.call({
			method: "recruitment.api.job_applicant_list.get_job_applicants_with_stats",
			args: { job_opening: resolveJobOpening(), owners: JSON.stringify(owners) },
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
			const f = filters.find((arr) => arr && arr[1] === "status" && arr[2] === "=");
			state.activeTab = f && f[3] ? f[3] : "All";
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
		const resultEl = layoutMain.find(".frappe-list .result");
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
		add_fields: [
			"applicant_name", "email_id", "phone_number", "status",
			"job_title", "designation", "source", "source_name",
			"applicant_rating", "custom_total_experience",
			"owner", "creation", "modified", "_liked_by",
		],

		onload(listview) {
			_listview = listview;
			injectStyles();
			mountAboveList(listview);
			installRenderOverride(listview);
			syncActiveTabFromFilters(listview);
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
			mountAboveList(listview);
			installRenderOverride(listview);
			syncActiveTabFromFilters(listview);
			renderHeader();
			renderPipelineTop();
			renderTabs();
		},
	};
})();
