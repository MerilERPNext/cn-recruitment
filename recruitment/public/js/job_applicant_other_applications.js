/* global frappe, $, __ */

/*
 * Job Applicant — "Previous Applications" tab.
 *
 * Answers the one question HR asks when a familiar name comes up: has this
 * person applied to us before, and are they live in another pipeline right now?
 *
 * Renders into the HTML field `custom_previous_applications_html`, which sits in
 * its own tab after Application Details. The tab link carries a count badge, so
 * HR can see there is history without opening the tab at all.
 *
 * Data: recruitment.api.applicant_applications.get_other_applications, which
 * decides "same candidate" using the very match keys the duplicity gate uses at
 * before_insert. Everything shown here — active/closed, re-application, the
 * counts in the header — is classified server-side; this file only paints.
 */
(function () {
	const HOST = "custom_previous_applications_html";
	const TAB = "custom_previous_applications_tab";
	const METHOD = "recruitment.api.applicant_applications.get_other_applications";
	const esc = frappe.utils.escape_html;

	// Tone -> palette. The server picks the tone; this is only the colour.
	// `fg` paints the rail, the dot and the chip's text; `bg`/`br` tint the chip.
	const TONE = {
		active: { fg: "#067647", bg: "#ECFDF3", br: "#ABEFC6" }, // live in a pipeline
		offer:  { fg: "#175CD3", bg: "#EFF8FF", br: "#B2DDFF" }, // at/through offer
		hold:   { fg: "#B54708", bg: "#FFFAEB", br: "#FEDF89" }, // parked
		closed: { fg: "#667085", bg: "#F2F4F7", br: "#E4E7EC" }, // rejected/withdrawn
	};

	function injectStyles() {
		if (document.getElementById("oaa-styles")) return;
		const style = document.createElement("style");
		style.id = "oaa-styles";
		style.textContent = `
			.oaa-strip {
				display: flex; align-items: center; gap: 10px;
				padding: 10px 16px; border-radius: 10px;
				border: 1px solid var(--border-color, #e2e6e9);
				background: var(--fg-color, #fff);
				font-size: 12.5px; color: var(--text-muted, #6b7280);
			}
			/* Something is live elsewhere — this must not read as chrome. */
			.oaa-strip.oaa-alert {
				border-color: #F5C77E; background: #FFF8EC; color: #7C3D06;
			}
			.oaa-strip.oaa-quiet { border-style: dashed; }
			.oaa-dot {
				flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%;
				background: currentColor; opacity: .85;
			}
			.oaa-strip-text { flex: 1 1 auto; min-width: 0; }
			.oaa-strip-text b { font-weight: 600; }
			.oaa-btn {
				flex: 0 0 auto; cursor: pointer; border: 0; background: transparent;
				color: inherit; font-size: 12px; font-weight: 600; padding: 2px 6px;
				border-radius: 6px;
			}
			.oaa-btn:hover { background: rgba(0,0,0,.05); }
			.oaa-reload { opacity: .6; font-weight: 400; }
			.oaa-reload:hover { opacity: 1; }

			.oaa-list { margin-top: 10px; display: grid; gap: 6px; }

			/* Two lines, whole card clickable. Anything taller turned four
			   applications into a page of scrolling. */
			.oaa-card {
				position: relative; display: block; text-decoration: none;
				padding: 9px 30px 9px 15px;
				border: 1px solid var(--border-color, #e2e6e9); border-radius: 8px;
				background: var(--fg-color, #fff);
				transition: background .12s, border-color .12s;
			}
			.oaa-card:hover {
				text-decoration: none; border-color: var(--oaa-fg);
				background: var(--oaa-bg);
			}
			/* The rail is the glance: green/blue/amber = still in play, grey = done. */
			.oaa-card::before {
				content: ""; position: absolute; left: 0; top: 0; bottom: 0;
				width: 3px; border-radius: 8px 0 0 8px; background: var(--oaa-fg, #9CA3AF);
			}
			/* Chevron, so the whole card reads as clickable without a "Open" link
			   taking up a row of its own. */
			.oaa-card::after {
				content: "\\203A"; position: absolute; right: 12px; top: 50%;
				transform: translateY(-58%);
				font-size: 17px; line-height: 1; color: var(--oaa-fg); opacity: .45;
			}
			.oaa-card:hover::after { opacity: 1; }
			.oaa-card.oaa-closed { opacity: .8; }

			.oaa-row {
				display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
				min-width: 0;
			}
			.oaa-row + .oaa-row { margin-top: 4px; }
			.oaa-title {
				font-size: 13px; font-weight: 600; color: var(--text-color, #1f272e);
			}
			.oaa-code {
				font-size: 11px; font-weight: 600; letter-spacing: .02em;
				color: var(--text-muted, #6b7280);
				background: var(--gray-100, #f4f5f6); border-radius: 4px; padding: 1px 6px;
			}

			.oaa-tag {
				border-radius: 999px; padding: 0 7px; font-size: 10px;
				font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
				white-space: nowrap;
				background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE;
			}

			/* A tinted chip on its own row. Full status + sub-status, never clipped
			   — beside a long job title this is exactly what gets truncated. */
			.oaa-chip {
				display: inline-flex; align-items: center; gap: 5px;
				border-radius: 999px; padding: 1px 9px 1px 7px;
				font-size: 11px; font-weight: 600; white-space: nowrap;
				color: var(--oaa-fg); background: var(--oaa-bg);
				border: 1px solid var(--oaa-br);
			}
			.oaa-chip-dot {
				width: 6px; height: 6px; border-radius: 50%; background: currentColor;
			}

			/* Stage / date / source / recruiter, dot-separated on one line. */
			.oaa-meta {
				font-size: 11.5px; color: var(--text-muted, #6b7280); min-width: 0;
			}
			.oaa-meta i { font-style: normal; opacity: .45; margin: 0 5px; }

			.oaa-foot { margin-top: 8px; font-size: 11.5px; color: var(--text-muted, #6b7280); }
			.oaa-empty { padding: 10px 2px; font-size: 12.5px; color: var(--text-muted, #6b7280); }

			/* Count on the tab link, so the history is visible without opening it. */
			.oaa-tab-badge {
				display: inline-block; margin-left: 6px; padding: 0 6px;
				min-width: 18px; border-radius: 999px;
				font-size: 10.5px; font-weight: 600; line-height: 17px; text-align: center;
				background: var(--gray-200, #e2e6e9); color: var(--text-muted, #6b7280);
			}
			.oaa-tab-badge.oaa-tab-alert { background: #F7B955; color: #4A2500; }

			@media (max-width: 640px) {
				.oaa-strip { padding: 9px 12px; }
				.oaa-open { position: static; display: inline-block; margin-top: 8px; }
			}
		`;
		document.head.appendChild(style);
	}

	// ── Tab plumbing ────────────────────────────────────────────────────────
	function eachTab(frm, fn) {
		((frm.layout && frm.layout.tabs) || []).forEach((t) => {
			if (t.df && t.df.fieldname === TAB) fn(t);
		});
	}

	// Frappe evaluates tab emptiness before this HTML field's content lands and
	// never re-checks, so a tab we fill asynchronously would flash and hide.
	// Same fix hiring_workflow_flow.js applies to its own tab.
	function keepTabVisible(frm) {
		try {
			eachTab(frm, (t) => { t.df.hidden = 0; t.toggle(true); });
			const field = frm.fields_dict[HOST];
			if (field && field.$wrapper) {
				field.df.hidden = 0;
				field.$wrapper.removeClass("hide-control").show();
				field.$wrapper.closest(".form-section")
					.removeClass("empty-section").addClass("visible-section");
			}
		} catch (e) { /* non-fatal */ }
	}

	function hideTab(frm) {
		try {
			eachTab(frm, (t) => { t.df.hidden = 1; t.toggle(false); });
		} catch (e) { /* non-fatal */ }
	}

	function setTabBadge(frm, data) {
		try {
			eachTab(frm, (t) => {
				if (!t.tab_link) return;
				const $link = t.tab_link.find("a").addBack("a").first();
				$link.find(".oaa-tab-badge").remove();
				if (!data || !data.total) return;
				const alert = data.active_count > 0 ? " oaa-tab-alert" : "";
				$link.append(
					`<span class="oaa-tab-badge${alert}" title="${
						data.active_count
							? __("{0} still active", [data.active_count])
							: __("all closed")
					}">${data.total}</span>`
				);
			});
		} catch (e) { /* non-fatal */ }
	}

	// ── Formatting ──────────────────────────────────────────────────────────
	// Recruiters think in recency, so the elapsed time sits next to the date.
	function agoText(days) {
		if (days === null || days === undefined) return "";
		if (days <= 0) return __("today");
		if (days === 1) return __("yesterday");
		if (days < 30) return __("{0} days ago", [days]);
		const months = Math.round(days / 30);
		if (days < 365) return months <= 1 ? __("1 month ago") : __("{0} months ago", [months]);
		const years = Math.round(days / 365);
		return years <= 1 ? __("1 year ago") : __("{0} years ago", [years]);
	}

	function appliedText(row) {
		const date = row.applied_on ? frappe.datetime.str_to_user(row.applied_on) : "";
		const ago = agoText(row.days_ago);
		// Parenthesised, not dot-separated: the meta line already uses dots.
		if (date && ago) return `${date} (${ago})`;
		return date || ago || "";
	}

	function cardHtml(row) {
		const t = TONE[row.tone] || TONE.closed;

		// Without this the recruiter has to compare job codes to realise the
		// candidate simply applied to THIS opening again.
		const sameTag = row.is_same_opening
			? `<span class="oaa-tag">${__("Re-applied")}</span>`
			: "";

		// One dot-separated line instead of a four-row label/value table — the
		// labels were costing a row each and saying nothing a recruiter needs.
		const meta = [row.location, row.stage, appliedText(row), row.source,
			row.recruiter_name || row.recruiter]
			.filter(Boolean)
			.map(esc)
			.join("<i>•</i>");

		return `
			<a class="oaa-card ${row.is_active ? "" : "oaa-closed"}"
				href="/app/job-applicant/${encodeURIComponent(row.name)}"
				style="--oaa-fg:${t.fg};--oaa-bg:${t.bg};--oaa-br:${t.br}">
				<div class="oaa-row">
					<span class="oaa-title">${esc(row.opening_title || row.job_opening || "—")}</span>
					${row.opening_code ? `<span class="oaa-code">${esc(row.opening_code)}</span>` : ""}
					${sameTag}
				</div>
				<div class="oaa-row">
					<span class="oaa-chip"><span class="oaa-chip-dot"></span>${esc(row.state_label || "")}</span>
					${meta ? `<span class="oaa-meta">${meta}</span>` : ""}
				</div>
			</a>
		`;
	}

	function stripText(data) {
		const total = data.total || 0;
		const active = data.active_count || 0;

		if (!total) return __("No other applications from this candidate.");

		const applications = total === 1
			? __("1 other application")
			: __("{0} other applications", [total]);
		if (!active) return __("<b>{0}</b> — all closed.", [applications]);
		if (active === total) {
			return active === 1
				? __("<b>1 other application</b> — still active.")
				: __("<b>{0}</b> — all still active.", [applications]);
		}
		return __("<b>{0}</b> — {1} still active.", [applications, active]);
	}

	function footText(data) {
		const bits = [];
		if (data.hidden_count) {
			// Count only — the endpoint discloses nothing else about these.
			bits.push(
				data.hidden_count === 1
					? __("1 more application is not visible to you.")
					: __("{0} more applications are not visible to you.", [data.hidden_count])
			);
		}
		if (data.truncated_count) {
			bits.push(__("{0} older application(s) not shown.", [data.truncated_count]));
		}
		return bits.join(" ");
	}

	// ── Render ──────────────────────────────────────────────────────────────
	function bindReload($w, frm) {
		$w.find("[data-oaa-reload]").on("click", () => {
			delete frm.__oaa_data;
			delete frm.__oaa_name;
			load(frm, true);
		});
	}

	function paint($w, frm, data) {
		const total = data.total || 0;
		const active = data.active_count || 0;
		const stripClass = total === 0 ? "oaa-quiet" : (active > 0 ? "oaa-alert" : "");
		const foot = footText(data);

		// The tab is opened deliberately, so the list is always expanded — hiding
		// it behind a "Show" control inside its own tab would be one click for
		// nothing. The strip stays as the summary line.
		$w.html(`
			<div class="oaa-strip ${stripClass}">
				<span class="oaa-dot"></span>
				<span class="oaa-strip-text">${stripText(data)}</span>
				<button class="oaa-btn oaa-reload" data-oaa-reload="1"
					title="${__("Refresh")}">&#8635;</button>
			</div>
			${total
				? `<div class="oaa-list">${(data.applications || []).map(cardHtml).join("")}</div>`
				: `<div class="oaa-empty">${__(
					"Nothing else on record for this person — matched on {0}.",
					[(data.match_fields || []).join(", ") || __("email and phone")]
				)}</div>`}
			${foot ? `<div class="oaa-foot">${esc(foot)}</div>` : ""}
		`);
		bindReload($w, frm);
		keepTabVisible(frm);
		setTabBadge(frm, data);
	}

	// A panel that failed to load must say so. Rendering nothing would make
	// "no other applications" and "the lookup broke" look identical — and the
	// point of this tab is that HR can trust a blank as an answer.
	function paintError($w, frm) {
		$w.html(`
			<div class="oaa-strip oaa-quiet">
				<span class="oaa-dot"></span>
				<span class="oaa-strip-text">${__("Could not check this candidate's other applications.")}</span>
				<button class="oaa-btn" data-oaa-reload="1">${__("Retry")}</button>
			</div>
		`);
		bindReload($w, frm);
		keepTabVisible(frm);
		setTabBadge(frm, null);
	}

	function render(frm, data, attempt) {
		attempt = attempt || 0;
		const field = frm.fields_dict[HOST];
		if (!field || !field.$wrapper) {
			// HTML control not mounted yet (inactive tab, or fixtures not applied
			// on this site) — retry briefly, then give up quietly.
			if (attempt < 20) setTimeout(() => render(frm, data, attempt + 1), 150);
			return;
		}
		if (data) paint(field.$wrapper, frm, data);
		else paintError(field.$wrapper, frm);
	}

	function load(frm, force) {
		// `refresh` fires on every save, reload and tab switch. The answer is about
		// OTHER documents, so it cannot be derived from this doc — cache it per
		// applicant and re-fetch only when the form moves to a different one, or
		// when the user asks via the refresh control.
		if (!force && frm.__oaa_data && frm.__oaa_name === frm.doc.name) {
			render(frm, frm.__oaa_data);
			return;
		}

		frappe.call({
			method: METHOD,
			args: { job_applicant: frm.doc.name },
			// This is a background read for a side panel. A failure must not throw
			// a modal over the form the recruiter is working in — it paints the
			// inline retry strip instead. The traceback still reaches the browser
			// console (frappe.request.cleanup logs r.exc regardless).
			silent: true,
			callback: (r) => {
				const message = r && r.message;
				if (!message) return render(frm, null);
				// The form may have moved on while the call was in flight.
				if (frm.doc.name !== message.job_applicant) return;
				frm.__oaa_name = frm.doc.name;
				frm.__oaa_data = message;
				render(frm, message);
			},
			error: () => render(frm, null),
		});
	}

	// Re-render when the tab is clicked — by then the HTML control is guaranteed
	// to be in the DOM, which it is not while the tab has never been opened.
	function bindTabClick(frm) {
		eachTab(frm, (t) => {
			if (!t.tab_link) return;
			t.tab_link.off("click.oaa").on("click.oaa", () => {
				if (frm.__oaa_data) setTimeout(() => render(frm, frm.__oaa_data), 50);
			});
		});
	}

	frappe.ui.form.on("Job Applicant", {
		refresh(frm) {
			try {
				injectStyles();
				// Nothing to look up until the applicant exists.
				if (frm.is_new()) { hideTab(frm); return; }
				keepTabVisible(frm);
				bindTabClick(frm);
				load(frm);
			} catch (e) { /* non-fatal */ }
		},
	});
})();
