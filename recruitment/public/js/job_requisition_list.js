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
		"Approval Pending": "#F59E0B",
		// Draft is the "sent back for rework" state — orange, matching the
		// React requisition list so the same status reads the same in both UIs.
		"Draft": "#F97316",
		"Approved Draft": "#10B981",
		"Approved Active": "#059669",
		"Rejected": "#EF4444",
		"Auto Archived": "#3B82F6",
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

	// Bulk "Move to Draft" runs each requisition in its own savepoint, so a batch
	// can come back part-moved. Show every bucket — a silent "done" would hide the
	// rows that were refused (Filled, Cancelled, no permission).
	function reportBulkDraftResult(res) {
		const moved = res.moved || [], skipped = res.skipped || [], failed = res.failed || [];
		if (moved.length && !skipped.length && !failed.length) {
			frappe.show_alert({
				message: __("{0} requisition(s) moved to Draft", [moved.length]),
				indicator: "orange",
			});
			return;
		}
		const lines = [];
		if (moved.length) lines.push(`<p><b>${__("Moved to Draft")}:</b> ${escapeHtml(moved.join(", "))}</p>`);
		if (skipped.length) lines.push(`<p><b>${__("Already in Draft")}:</b> ${escapeHtml(skipped.join(", "))}</p>`);
		if (failed.length) {
			const rows = failed
				.map((f) => `<li><b>${escapeHtml(f.name)}</b> — ${escapeHtml(f.error)}</li>`)
				.join("");
			lines.push(`<p><b>${__("Not moved")}:</b></p><ul>${rows}</ul>`);
		}
		frappe.msgprint({
			title: __("Move to Draft"),
			indicator: failed.length ? "orange" : "green",
			message: lines.join(""),
		});
	}

	let state = { activeTab: "All", tabCounts: {}, statusOptions: [] };
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
			.jr-table tbody tr { cursor: pointer; }
			.jr-table tbody tr:hover { background: #FAFAFA; }
			.jr-table tbody tr:last-child td { border-bottom: none; }
			.jr-table .filterable { cursor: pointer; }
			.jr-table .filterable:hover { text-decoration: underline; text-underline-offset: 2px; }

			/* Width, alignment and wrapping are per-column configuration now, emitted
			   as inline styles by the column registry; what stays here is the visual
			   treatment of a cell (weight, colour, padding) that isn't configurable. */
			.jr-col-check        { padding-left: 10px !important; padding-right: 2px !important; }
			.jr-col-id           { color: #6B7280; font-size: 12px; }
			.jr-col-designation  { font-weight: 600; color: #111827; }
			.jr-col-department   { color: #4B5563; }
			.jr-col-type         { color: #4B5563; }
			.jr-col-positions    { font-weight: 600; color: #111827; padding-right: 18px !important; }
			.jr-col-compensation { font-weight: 600; color: #111827; }
			.jr-col-expected     { padding-right: 12px !important; }
			.rlc-field-cell      { color: #374151; }

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
			.jr-col-activity { padding-right: 12px !important; }
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

	/*
	 * The designed columns, declared once. Order here is only the DEFAULT — the
	 * saved configuration (⋯ → Configure Columns) decides what actually renders,
	 * in what order, at what alignment and width.
	 */
	recruitment.list_columns.register(DOCTYPE, {
		reserved_fields: ["modified", "_liked_by", "_comment_count"],
		// Read by the "Activate Job Requisition" action's get_query, not by a column.
		fetch_fields: ["company", "creation"],

		leading: {
			key: "__check",
			width: "28px",
			cell_class: "jr-col-check",
			head_render: () => `<input type="checkbox" class="jr-check jr-select-all"/>`,
			render: (doc) =>
				`<input type="checkbox" class="jr-check list-row-checkbox" data-doctype="${DOCTYPE}" data-name="${escapeHtml(doc.name)}"/>`,
		},

		trailing: {
			key: "__activity",
			align: "right",
			width: "120px",
			cell_class: "jr-col-activity",
			fields: ["modified", "_liked_by", "_comment_count"],
			render: (doc, listview) => renderActivity(doc, listview),
		},

		columns: [
			{
				key: "id",
				label: __("ID"),
				width: "170px",
				fields: ["name"],
				cell_class: "jr-col-id",
				render: (doc) => escapeHtml(doc.name),
			},
			{
				key: "designation",
				label: __("Designation"),
				// The requisition's identity in the row; everything else can go.
				locked: true,
				min_width: "200px",
				nowrap: false,
				fields: ["designation"],
				cell_class: "jr-col-designation",
				render: (doc) => (doc.designation
					? `<span class="filterable"${filterData("designation", doc.designation)}>${escapeHtml(doc.designation)}</span>`
					: "—"),
			},
			{
				key: "status",
				label: __("Status"),
				width: "130px",
				fields: ["status"],
				render: (doc) => {
					const color = getStatusColor(doc.status);
					return `<span class="jr-status-pill${filterCls(doc.status)}"${filterData("status", doc.status)} style="background:${color}1a;color:#111827">
						<span class="jr-status-dot" style="background:${color}"></span>${escapeHtml(doc.status || "")}
					</span>`;
				},
			},
			{
				key: "department",
				label: __("Department"),
				width: "140px",
				fields: ["department"],
				cell_class: "jr-col-department",
				render: (doc) => (doc.department
					? `<span class="filterable"${filterData("department", doc.department)}>${escapeHtml(doc.department)}</span>`
					: "—"),
			},
			{
				key: "employment_type",
				label: __("Type"),
				width: "90px",
				fields: ["custom_employment_type_link"],
				cell_class: "jr-col-type",
				render: (doc) => (doc.custom_employment_type_link
					? `<span class="filterable"${filterData("custom_employment_type_link", doc.custom_employment_type_link)}>${escapeHtml(doc.custom_employment_type_link)}</span>`
					: "—"),
			},
			{
				key: "requested_by",
				label: __("Requested By"),
				width: "160px",
				fields: ["requested_by", "requested_by_name"],
				render: (doc) => {
					const reqName = doc.requested_by_name || doc.requested_by || "";
					if (!reqName) return "—";
					return `<span class="jr-requester${filterCls(doc.requested_by)}"${filterData("requested_by", doc.requested_by)}>
						<span class="jr-avatar" style="background:${avatarColor(doc.requested_by || reqName)}">${escapeHtml(initialsOf(reqName))}</span>
						${escapeHtml(reqName)}
					</span>`;
				},
			},
			{
				key: "positions",
				label: __("Positions"),
				width: "80px",
				align: "right",
				fields: ["no_of_positions"],
				cell_class: "jr-col-positions",
				render: (doc) => escapeHtml(String(doc.no_of_positions || 0)),
			},
			{
				key: "compensation",
				label: __("Compensation"),
				width: "130px",
				align: "right",
				fields: ["expected_compensation"],
				cell_class: "jr-col-compensation",
				render: (doc) => escapeHtml(formatCurrency(doc.expected_compensation, defaultCurrency())),
			},
			{
				key: "expected_by",
				label: __("Expected By"),
				width: "130px",
				fields: ["expected_by"],
				cell_class: "jr-col-expected",
				render: (doc) => `
					<div class="jr-expected-date">${escapeHtml(formatDate(doc.expected_by) || "—")}</div>
					${doc.expected_by ? `<div class="jr-expected-hint">${escapeHtml(relativeDate(doc.expected_by))}</div>` : ""}`,
			},
		],
	});

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
		if (!data.length) {
			// Nothing matched — let Frappe's native no-result block show, but still
			// refresh the tabs so they don't stay frozen on the previous filter's
			// numbers while the list underneath is empty.
			$host.html("");
			fetchAux();
			return;
		}

		const cols = recruitment.list_columns;
		$host.html(`
			<div class="jr-table-wrapper">
				<table class="jr-table">
					<thead>${cols.head_html(DOCTYPE, listview)}</thead>
					<tbody>${data.map((d) => cols.row_html(DOCTYPE, d, listview)).join("")}</tbody>
				</table>
			</div>`);

		bindTable($host[0], listview);
		// Re-apply any persisted selection into our freshly drawn checkboxes.
		if (typeof listview.set_rows_as_checked === "function") {
			try { listview.set_rows_as_checked(); } catch (e) { /* noop */ }
		}
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
		const token = ++_auxToken;
		frappe.call({
			method: "recruitment.api.job_requisition_list.get_job_requisitions_with_stats",
			args: { filters: JSON.stringify(countFilters()) },
			callback: (r) => {
				if (token !== _auxToken) return;   // a newer filter change already won
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
		// Repeated `=` filters on one field (two Institutes, two Departments, …)
		// are ANDed by Frappe and match nothing; fold them into a single `in`.
		// Guarded so a missing/stale list_filter_multi.js degrades to the old
		// behaviour instead of taking the whole rendered table down with it.
		recruitment.filters && recruitment.filters.install(listview);
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
				const dialog = frappe.prompt(
					[{
						fieldname: "job_opening", label: __("Job Opening"),
						fieldtype: "Link", options: "Job Opening", reqd: 1,
						description: __("The Job Opening to associate with {0}.", [req]),
						// Scope to the requisition's company / designation / department,
						// status Open — and drop openings already associated with another
						// requisition, since an opening belongs to at most one.
						get_query: () => {
							const filters = { job_requisition: req };
							if (row.company) filters.company = row.company;
							if (row.designation) filters.designation = row.designation;
							if (row.department) filters.department = row.department;
							return {
								query: "recruitment.api.job_requisition.unassociated_job_opening_query",
								filters,
							};
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

				// The picker's built-in "+ Create a new Job Opening" opens a blank
				// opening. Point it at the same mapper "Actions → Create Job Opening"
				// uses on the form, so the opening arrives pre-filled from the
				// requisition either way. Overrides this dialog's control instance
				// only — Frappe reads `this.new_doc` when it renders the dropdown, so
				// no other link field or doctype is touched.
				const opening_field = dialog && dialog.fields_dict && dialog.fields_dict.job_opening;
				if (opening_field) {
					opening_field.new_doc = () => {
						dialog.hide();
						// hooks.py redirects this HRMS method to our own make_job_opening.
						frappe.model.open_mapped_doc({
							method: "hrms.hr.doctype.job_requisition.job_requisition.make_job_opening",
							source_name: req,
						});
					};
				}
			});

			// "Move to Draft" — pull the selected requisitions back out of a running
			// approval so they can be reworked. Works over a mixed selection: rows
			// already in Draft are reported as skipped rather than failing the batch.
			listview.page.add_action_item(__("Move to Draft"), () => {
				const selected = listview.get_checked_items();
				if (!selected.length) {
					frappe.msgprint(__("Select at least one Job Requisition.")); return;
				}
				const names = selected.map((row) => row.name);
				frappe.prompt(
					[{
						fieldname: "reason", label: __("Reason"), fieldtype: "Small Text",
						description: __("Recorded on each requisition's timeline. Any approval currently in progress will be revoked."),
					}],
					(values) => {
						frappe.call({
							method: "recruitment.api.requisition_status.bulk_move_to_draft",
							args: { job_requisitions: names, reason: values.reason },
							freeze: true,
							freeze_message: __("Moving to Draft…"),
							callback: (r) => {
								const res = (r && r.message) || {};
								reportBulkDraftResult(res);
								listview.refresh();
							},
						});
					},
					__("Move {0} Requisition(s) to Draft", [names.length]),
					__("Move to Draft"),
				);
			});
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
