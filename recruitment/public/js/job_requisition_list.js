/* global frappe, $ */

/*
 * Job Requisition — custom list rendering on top of Frappe's native list view.
 *
 * Design: we DO NOT fetch our own data or paginate. Frappe owns the data
 * (`listview.data`), filtering, sorting, pagination, selection and the Actions
 * menu. We only override row rendering: `render_list` draws our styled table
 * into Frappe's own `$result`, and each row's checkbox uses Frappe's native
 * `.list-row-checkbox` class so native selection / bulk-actions work untouched.
 * A small aux API call supplies the status-tab counts.
 */
(function () {
	const DOCTYPE = "Job Requisition";

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
	function initialsOf(name) {
		const parts = String(name || "").replace(/@/g, " ").split(/\s+/).filter(Boolean);
		if (!parts.length) return "?";
		return ((parts[0][0] || "") + (parts[1] ? parts[1][0] : "")).toUpperCase() || "?";
	}

	// Click-to-filter — mirrors Frappe's native list view. Frappe binds a delegated
	// handler on `$result` for `.filterable` elements and reads `data-filter=
	// "fieldname,operator,value"`. Our custom table renders INTO that same `$result`,
	// so any cell we tag with `filterable` + `data-filter` gets the exact same
	// behaviour (click a status -> adds status = <value> filter) for free.
	function filterCls(value) { return value === null || value === undefined || value === "" ? "" : " filterable"; }
	function filterData(fieldname, value) {
		if (value === null || value === undefined || value === "") return "";
		return ` data-filter="${escapeHtml(fieldname)},=,${escapeHtml(value)}"`;
	}
	function defaultCurrency() {
		try {
			return (frappe.defaults && frappe.defaults.get_default("currency"))
				|| (frappe.sys_defaults && frappe.sys_defaults.currency) || "INR";
		} catch (e) { return "INR"; }
	}
	function formatCurrency(amount, currency) {
		if (amount === null || amount === undefined || amount === "") return "—";
		const symbol = currency === "INR" ? "₹" : (currency || "");
		try {
			return `${symbol} ${new Intl.NumberFormat("en-IN").format(Math.round(Number(amount) || 0))}`;
		} catch (e) { return `${symbol} ${amount}`; }
	}
	function formatDate(d) {
		if (!d) return "";
		try { return frappe.datetime.global_date_format(d); } catch (e) { return d; }
	}
	function relativeDate(d) {
		if (!d) return "";
		let target;
		try { target = frappe.datetime.str_to_obj(d); } catch (e) { return ""; }
		if (!target) return "";
		const today = frappe.datetime.str_to_obj(frappe.datetime.get_today());
		const diff = Math.round((target - today) / 86400000);
		if (diff === 0) return "today";
		const future = diff > 0;
		const n = Math.abs(diff);
		if (n < 30) return future ? `in ${n}d` : `${n}d ago`;
		const months = Math.floor(n / 30);
		if (months < 12) return future ? `in ${months}mo` : `${months}mo ago`;
		const years = Math.floor(months / 12);
		return future ? `in ${years}y` : `${years}y ago`;
	}

	let state = { activeTab: "All", tabCounts: {}, statusOptions: [] };
	let _listview = null;

	// Fieldnames that already have their OWN dedicated column in our designed table
	// (so we don't draw them twice). Everything else the user adds via Frappe's List
	// Settings is appended as a real extra column with its own value.
	const KNOWN_FIELDS = new Set([
		"name", "designation", "department", "status", "custom_employment_type_link",
		"requested_by", "requested_by_name", "no_of_positions",
		"expected_compensation", "expected_by",
		"modified", "_liked_by", "_comment_count",
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
			`<th class="jr-col-extra">${escapeHtml(__(c.df.label || c.df.fieldname))}</th>`
		).join("");
	}
	function extraRowCells(doc, listview) {
		return extraColumns(listview).map((c) =>
			`<td class="jr-col-extra">${formatCellHtml(doc, c.df)}</td>`
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
			.jr-table tbody tr { cursor: pointer; }
			.jr-table tbody tr:hover { background: #FAFAFA; }
			.jr-table tbody tr:last-child td { border-bottom: none; }
			.jr-table .filterable { cursor: pointer; }
			.jr-table .filterable:hover { text-decoration: underline; text-underline-offset: 2px; }

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
			.jr-col-extra        { color: #374151; white-space: nowrap; }

			.jr-check { width: 16px; height: 16px; cursor: pointer; }
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

			/* Native activity meta (modified time · comment count · like) */
			.jr-col-activity { width: 120px; white-space: nowrap; text-align: right; padding-right: 12px !important; }
			.jr-activity { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; color: #9CA3AF; font-size: 12px; }
			.jr-activity .comment-count { display: inline-flex; align-items: center; gap: 2px; }
			.jr-activity .list-row-like, .jr-activity .like-action { cursor: pointer; display: inline-flex; align-items: center; }
			.jr-activity svg.icon, .jr-activity .icon { width: 14px; height: 14px; }

			/* Hide the loading skeleton rows (we render our own table). */
			.jr-custom-active .frappe-list .result .list-row-container { display: none !important; }
			/* Frappe's native column header is replaced by our <thead>, so it's hidden
			   by default — but we REVEAL it while rows are selected so Frappe's native
			   selection bar shows ("N items selected", "X of Y", select-all). When
			   selected, on_row_checked hides the column-label part itself, leaving just
			   the selection bar. Native paging / no-result / Actions menu stay intact. */
			.jr-custom-active .frappe-list .result .list-row-head { display: none !important; }
			.jr-custom-active.jr-has-selection .frappe-list .result .list-row-head { display: flex !important; }
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
			.jr-custom-active .frappe-list .result-container,
			.jr-custom-active .frappe-list .result-container .result {
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
			// Status isn't a standard filter (Job Requisition only exposes requested_by
			// as a quick filter): mutate the filter list with refreshes suppressed,
			// then fire a single refresh.
			const fa = lv.filter_area;
			fa.trigger_refresh = false;
			Promise.resolve(fa.remove("status"))
				.then(() => (key === "All" ? null : fa.add([[DOCTYPE, "status", "=", key]], false)))
				.then(() => { fa.trigger_refresh = true; lv.refresh(); })
				.catch(() => { fa.trigger_refresh = true; lv.refresh(); });
		}
	}

	function renderTabs() {
		const container = document.getElementById("jr-tabs-container");
		if (!container) return;
		const tabKeys = ["All", ...(state.statusOptions || [])];
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
				applyTabFilter(tab);
			});
		});
	}

	// Native Frappe row activity: relative modified time, comment count, and the
	// interactive like/heart. We reuse listview.get_like_html so Frappe's own
	// delegated like handler (bound on $result) toggles likes natively.
	function renderActivity(doc, listview) {
		let modified = "";
		try { modified = frappe.datetime.comment_when(doc.modified, true); } catch (e) { /* noop */ }
		const cc = doc._comment_count || 0;
		let chat = "";
		try { chat = frappe.utils.icon("es-line-chat-alt", "sm"); } catch (e) { /* noop */ }
		let likeHtml = "";
		try { likeHtml = (listview && listview.get_like_html) ? listview.get_like_html(doc) : ""; } catch (e) { /* noop */ }
		return `<div class="jr-activity">
			<span class="modified">${modified}</span>
			<span class="comment-count">${chat} ${cc > 99 ? "99+" : cc}</span>
			<span class="list-row-like">${likeHtml}</span>
		</div>`;
	}

	function renderRow(doc, listview) {
		const statusColor = getStatusColor(doc.status);
		const reqName = doc.requested_by_name || doc.requested_by || "";
		const currency = defaultCurrency();
		return `
			<tr data-name="${escapeHtml(doc.name)}">
				<td class="jr-col-check"><input type="checkbox" class="jr-check list-row-checkbox" data-doctype="${DOCTYPE}" data-name="${escapeHtml(doc.name)}"/></td>
				<td class="jr-col-id">${escapeHtml(doc.name)}</td>
				<td class="jr-col-designation">${doc.designation
					? `<span class="filterable"${filterData("designation", doc.designation)}>${escapeHtml(doc.designation)}</span>`
					: "—"}</td>
				<td class="jr-col-status">
					<span class="jr-status-pill${filterCls(doc.status)}"${filterData("status", doc.status)} style="background:${statusColor}1a;color:#111827">
						<span class="jr-status-dot" style="background:${statusColor}"></span>${escapeHtml(doc.status || "")}
					</span>
				</td>
				<td class="jr-col-department">${doc.department
					? `<span class="filterable"${filterData("department", doc.department)}>${escapeHtml(doc.department)}</span>`
					: "—"}</td>
				<td class="jr-col-type">${doc.custom_employment_type_link
					? `<span class="filterable"${filterData("custom_employment_type_link", doc.custom_employment_type_link)}>${escapeHtml(doc.custom_employment_type_link)}</span>`
					: "—"}</td>
				<td class="jr-col-requester">
					${reqName
						? `<span class="jr-requester${filterCls(doc.requested_by)}"${filterData("requested_by", doc.requested_by)}>
							<span class="jr-avatar" style="background:${avatarColor(doc.requested_by || reqName)}">${escapeHtml(initialsOf(reqName))}</span>
							${escapeHtml(reqName)}
						</span>`
						: "—"}
				</td>
				<td class="jr-col-positions">${escapeHtml(String(doc.no_of_positions || 0))}</td>
				<td class="jr-col-compensation">${escapeHtml(formatCurrency(doc.expected_compensation, currency))}</td>
				<td class="jr-col-expected">
					<div class="jr-expected-date">${escapeHtml(formatDate(doc.expected_by) || "—")}</div>
					${doc.expected_by ? `<div class="jr-expected-hint">${escapeHtml(relativeDate(doc.expected_by))}</div>` : ""}
				</td>
				${extraRowCells(doc, listview)}
				<td class="jr-col-activity">${renderActivity(doc, listview)}</td>
			</tr>`;
	}

	function updateSelectAllState(container) {
		const selectAll = container.querySelector(".jr-select-all");
		if (!selectAll) return;
		const all = Array.from(container.querySelectorAll(".list-row-checkbox"));
		selectAll.checked = all.length > 0 && all.every((c) => c.checked);
		selectAll.indeterminate = !selectAll.checked && all.some((c) => c.checked);
	}

	function bindTable(container, listview) {
		const selectAll = container.querySelector(".jr-select-all");
		if (selectAll) {
			selectAll.addEventListener("click", (e) => e.stopPropagation());
			selectAll.addEventListener("change", () => {
				container.querySelectorAll(".list-row-checkbox").forEach((cb) => { cb.checked = selectAll.checked; });
				if (typeof listview.on_row_checked === "function") listview.on_row_checked();
			});
		}
		container.querySelectorAll(".list-row-checkbox").forEach((cb) => {
			cb.addEventListener("click", (e) => e.stopPropagation());
			// Frappe's delegated handler updates selection/Actions; we only sync the header box.
			cb.addEventListener("change", () => updateSelectAllState(container));
		});
		updateSelectAllState(container);

		container.querySelectorAll("tr[data-name]").forEach((tr) => {
			tr.addEventListener("click", (e) => {
				if (e.target && e.target.closest("input, button, a, .like-action, .jr-activity, .filterable")) return;
				frappe.set_route("Form", DOCTYPE, tr.getAttribute("data-name"));
			});
		});
	}

	function renderTableInto(listview) {
		const $result = listview.$result;
		if (!$result || !$result.length) return;
		let $host = $result.find(".jr-host");
		if (!$host.length) {
			$host = $('<div class="jr-host"></div>');
			$result.append($host);
		}
		const data = listview.data || [];
		if (!data.length) { $host.html(""); return; }  // let Frappe's native no-result show

		const head = `
			<tr>
				<th class="jr-col-check"><input type="checkbox" class="jr-check jr-select-all"/></th>
				<th class="jr-col-id">ID</th>
				<th class="jr-col-designation">Designation</th>
				<th class="jr-col-status">Status</th>
				<th class="jr-col-department">Department</th>
				<th class="jr-col-type">Type</th>
				<th class="jr-col-requester">Requested By</th>
				<th class="jr-col-positions">Positions</th>
				<th class="jr-col-compensation">Compensation</th>
				<th class="jr-col-expected">Expected By</th>
				${extraHeadCells(listview)}
				<th class="jr-col-activity"></th>
			</tr>`;

		$host.html(`
			<div class="jr-table-wrapper">
				<table class="jr-table">
					<thead>${head}</thead>
					<tbody>${data.map((d) => renderRow(d, listview)).join("")}</tbody>
				</table>
			</div>`);

		bindTable($host[0], listview);
		// Re-apply any persisted selection into our freshly drawn checkboxes.
		if (typeof listview.set_rows_as_checked === "function") {
			try { listview.set_rows_as_checked(); } catch (e) { /* noop */ }
		}
	}

	function fetchAux() {
		frappe.call({
			method: "recruitment.api.job_requisition_list.get_job_requisitions_with_stats",
			args: {},
			callback: (r) => {
				const msg = (r && r.message) || {};
				state.tabCounts = msg.tab_counts || {};
				state.statusOptions = msg.status_options || [];
				renderTabs();
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
		layoutMain.addClass("jr-custom-active");
		if (layoutMain.find("#jr-tabs-container").length) return;
		const tabsHost = $('<div id="jr-tabs-container"></div>');
		// v16 nests `.result` inside `.result-container`; anchor to the outermost
		// of the two so our header/tabs sit ABOVE the whole result block rather
		// than inside v16's fitted, inner-scrolling box.
		const container = layoutMain.find(".frappe-list .result-container");
		const resultEl = container.length ? container : layoutMain.find(".frappe-list .result");
		if (resultEl.length) resultEl.before(tabsHost);
		else layoutMain.prepend(tabsHost);
	}

	function installRenderOverride(listview) {
		if (listview._jr_render_patched) return;
		listview._jr_render_patched = true;
		listview.render_list = function () { renderTableInto(this); };
		listview.render_header = function () { /* custom <thead> instead */ };

		// Reveal Frappe's native selection bar only while rows are selected.
		const origOnRowChecked = listview.on_row_checked.bind(listview);
		listview.on_row_checked = function () {
			origOnRowChecked();
			const any = this.$result.find(".list-row-checkbox:checked").length > 0;
			this.$page.find(".layout-main-section").toggleClass("jr-has-selection", any);
		};
	}

	frappe.listview_settings[DOCTYPE] = {
		hide_name_column: true,
		add_fields: [
			"designation", "department", "status", "custom_employment_type_link",
			"requested_by", "requested_by_name", "no_of_positions",
			"expected_compensation", "expected_by", "company",
			"modified", "creation", "_liked_by",
		],

		onload(listview) {
			_listview = listview;
			injectStyles();
			mountAboveList(listview);
			installRenderOverride(listview);
			syncActiveTabFromFilters(listview);
			renderTabs();
			fetchAux();

			// "Activate Job Requisition" — associate an existing Job Opening with
			// the selected requisition (same as the form's Associate Job Opening).
			listview.page.add_action_item(__("Activate Job Requisition"), () => {
				const selected = listview.get_checked_items();
				if (!selected.length) {
					frappe.msgprint(__("Select a Job Requisition first.")); return;
				}
				if (selected.length > 1) {
					frappe.msgprint(__("Please select a single Job Requisition to activate.")); return;
				}
				const row = selected[0];
				const req = row.name;
				frappe.prompt(
					[{
						fieldname: "job_opening", label: __("Job Opening"),
						fieldtype: "Link", options: "Job Opening", reqd: 1,
						description: __("The Job Opening to associate with {0}.", [req]),
						// Dynamic filter — same as HRMS Associate Job Opening: scope to
						// the requisition's company / designation / department, status Open.
						get_query: () => {
							const filters = { status: "Open" };
							if (row.company) filters.company = row.company;
							if (row.designation) filters.designation = row.designation;
							if (row.department) filters.department = row.department;
							return { filters };
						},
					}],
					(values) => {
						frappe.call({
							method: "recruitment.api.job_requisition.activate_job_requisition",
							args: { job_requisition: req, job_opening: values.job_opening },
							freeze: true,
							freeze_message: __("Activating…"),
							callback: () => {
								frappe.show_alert({ message: __("Job Requisition activated"), indicator: "green" });
								listview.refresh();
							},
						});
					},
					__("Activate Job Requisition"),
					__("Activate"),
				);
			});
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
