/* global frappe, $, __ */

/*
 * Job Applicant — "Employee Record" tab.
 *
 * The candidate who applies from a personal gmail address is the case this
 * exists for: they are already on the payroll, or they left last quarter, or
 * they left under a Do Not Rehire flag — and nothing on the Job Applicant says
 * so, because the application carries an address that ties to no Employee.
 *
 * Renders into `custom_employee_record_html`, in its own tab after Previous
 * Applications. The tab link carries a badge and a warning banner is raised on
 * the form itself, so a match cannot be missed by not opening the tab.
 *
 * Data: recruitment.api.employee_match.get_employee_match, which classifies via
 * the same module the before_insert gate uses — what is shown here and what the
 * gate decides can never disagree.
 */
(function () {
	const HOST = "custom_employee_record_html";
	const TAB = "custom_employee_record_tab";
	const METHOD = "recruitment.api.employee_match.get_employee_match";
	const esc = frappe.utils.escape_html;

	// Verdict -> palette + how loudly to say it. Same colour language as the
	// Previous Applications cards, so the two tabs read as one system.
	const VERDICT = {
		active_employee: { fg: "#B42318", bg: "#FEF3F2", br: "#FECDCA", severity: 3 },
		do_not_rehire:   { fg: "#B42318", bg: "#FEF3F2", br: "#FECDCA", severity: 3 },
		too_soon:        { fg: "#B54708", bg: "#FFFAEB", br: "#FEDF89", severity: 2 },
		clean:           { fg: "#067647", bg: "#ECFDF3", br: "#ABEFC6", severity: 1 },
	};

	function tone(code) {
		return VERDICT[code] || VERDICT.clean;
	}

	function injectStyles() {
		if (document.getElementById("oer-styles")) return;
		const style = document.createElement("style");
		style.id = "oer-styles";
		style.textContent = `
			.oer-strip {
				display: flex; align-items: center; gap: 10px;
				padding: 10px 16px; border-radius: 10px;
				border: 1px solid var(--oer-br, #e2e6e9); background: var(--oer-bg, #fff);
				color: var(--oer-fg, #6b7280); font-size: 12.5px;
			}
			.oer-strip.oer-quiet {
				border-style: dashed; border-color: var(--border-color, #e2e6e9);
				background: var(--fg-color, #fff); color: var(--text-muted, #6b7280);
			}
			.oer-dot {
				flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%;
				background: currentColor; opacity: .85;
			}
			.oer-strip-text { flex: 1 1 auto; min-width: 0; }
			.oer-strip-text b { font-weight: 600; }
			.oer-btn {
				flex: 0 0 auto; cursor: pointer; border: 0; background: transparent;
				color: inherit; font-size: 12px; font-weight: 600; padding: 2px 6px;
				border-radius: 6px; opacity: .65;
			}
			.oer-btn:hover { background: rgba(0,0,0,.05); opacity: 1; }

			.oer-list { margin-top: 10px; display: grid; gap: 8px; }

			.oer-card {
				position: relative; display: block; text-decoration: none;
				padding: 11px 30px 11px 15px;
				border: 1px solid var(--border-color, #e2e6e9); border-radius: 8px;
				background: var(--fg-color, #fff);
				transition: background .12s, border-color .12s;
			}
			.oer-card:hover {
				text-decoration: none; border-color: var(--oer-fg); background: var(--oer-bg);
			}
			.oer-card::before {
				content: ""; position: absolute; left: 0; top: 0; bottom: 0;
				width: 3px; border-radius: 8px 0 0 8px; background: var(--oer-fg);
			}
			.oer-card::after {
				content: "\\203A"; position: absolute; right: 12px; top: 50%;
				transform: translateY(-58%);
				font-size: 17px; line-height: 1; color: var(--oer-fg); opacity: .45;
			}
			.oer-card:hover::after { opacity: 1; }

			.oer-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; min-width: 0; }
			.oer-row + .oer-row { margin-top: 4px; }
			.oer-name { font-size: 13px; font-weight: 600; color: var(--text-color, #1f272e); }
			.oer-id {
				font-size: 11px; font-weight: 600; letter-spacing: .02em;
				color: var(--text-muted, #6b7280);
				background: var(--gray-100, #f4f5f6); border-radius: 4px; padding: 1px 6px;
			}
			.oer-chip {
				display: inline-flex; align-items: center; gap: 5px;
				border-radius: 999px; padding: 1px 9px 1px 7px;
				font-size: 11px; font-weight: 600; white-space: nowrap;
				color: var(--oer-fg); background: var(--oer-bg); border: 1px solid var(--oer-br);
			}
			.oer-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
			.oer-meta { font-size: 11.5px; color: var(--text-muted, #6b7280); min-width: 0; }
			.oer-meta i { font-style: normal; opacity: .45; margin: 0 5px; }
			.oer-detail { margin-top: 5px; font-size: 12px; color: var(--oer-fg); }

			/* How we know it is the same person — HR's first question. */
			.oer-keys {
				margin-top: 5px; font-size: 11px; color: var(--text-muted, #6b7280);
			}
			.oer-key {
				display: inline-block; margin-right: 5px; padding: 0 6px;
				border-radius: 4px; background: var(--gray-100, #f4f5f6);
				font-family: var(--font-stack-mono, monospace); font-size: 10.5px;
			}
			.oer-linked {
				border-radius: 999px; padding: 0 7px; font-size: 10px; font-weight: 700;
				letter-spacing: .03em; text-transform: uppercase; white-space: nowrap;
				background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE;
			}
			.oer-foot { margin-top: 8px; font-size: 11.5px; color: var(--text-muted, #6b7280); }

			.oer-tab-badge {
				display: inline-block; margin-left: 6px; padding: 0 6px;
				min-width: 18px; border-radius: 999px;
				font-size: 10.5px; font-weight: 600; line-height: 17px; text-align: center;
				background: var(--gray-200, #e2e6e9); color: var(--text-muted, #6b7280);
			}
			.oer-tab-badge.oer-tab-alert { background: #D92D20; color: #fff; }
		`;
		document.head.appendChild(style);
	}

	// ── Tab plumbing ────────────────────────────────────────────────────────
	function eachTab(frm, fn) {
		((frm.layout && frm.layout.tabs) || []).forEach((t) => {
			if (t.df && t.df.fieldname === TAB) fn(t);
		});
	}

	// Frappe decides a tab is empty before an async HTML field lands and never
	// re-checks, so a tab filled later flashes and hides without this.
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
		try { eachTab(frm, (t) => { t.df.hidden = 1; t.toggle(false); }); }
		catch (e) { /* non-fatal */ }
	}

	function setTabBadge(frm, data) {
		try {
			eachTab(frm, (t) => {
				if (!t.tab_link) return;
				const $link = t.tab_link.find("a").addBack("a").first();
				$link.find(".oer-tab-badge").remove();
				if (!data || !data.total) return;
				const alert = data.attention_count > 0 ? " oer-tab-alert" : "";
				$link.append(`<span class="oer-tab-badge${alert}">${data.total}</span>`);
			});
		} catch (e) { /* non-fatal */ }
	}

	// A match changes what the recruiter should do next, so it is raised on the
	// form itself — not only inside a tab they may never open.
	function setFormIndicator(frm, data) {
		try {
			if (!data || !data.attention_count) return;
			const worst = (data.matches || []).find((m) => tone(m.verdict).severity >= 2);
			if (!worst) return;
			frm.dashboard.add_comment(
				__("Rehire check: {0} — {1}", [worst.verdict_label, esc(worst.verdict_detail || "")]),
				tone(worst.verdict).severity >= 3 ? "red" : "orange",
				true
			);
		} catch (e) { /* non-fatal */ }
	}

	// A candidate let through a duplicity match runs on a different workflow than
	// everyone else on the opening, and that must be obvious on the form itself.
	function setDuplicityFlag(frm) {
		try {
			if (!frm.doc.custom_duplicity_flagged) return;
			frm.dashboard.add_comment(
				__("Hiring allowed despite a duplicity match ({0}) — hiring workflow {1}; the Job Offer will need exceptional approval. Reasons are on the Employee Record tab.", [
					esc(frm.doc.custom_duplicity_check_setting || ""),
					esc(frm.doc.custom_duplicity_hiring_workflow || __("of the Job Opening")),
				]),
				"orange",
				true
			);
		} catch (e) { /* non-fatal */ }
	}

	// ── Formatting ──────────────────────────────────────────────────────────
	function dateText(value) {
		return value ? frappe.datetime.str_to_user(value) : "";
	}

	function cardHtml(row) {
		const t = tone(row.verdict);
		const tenure = [
			row.date_of_joining ? __("Joined {0}", [dateText(row.date_of_joining)]) : "",
			row.relieving_date ? __("Left {0}", [dateText(row.relieving_date)]) : "",
		].filter(Boolean).join(" — ");

		const meta = [row.designation, row.department, row.company, row.branch, tenure]
			.filter(Boolean).map(esc).join("<i>•</i>");

		// The addresses matter here specifically: seeing the personal address the
		// candidate applied with next to the company one is what makes the match
		// obvious rather than something to take on trust.
		const keys = (row.matched_on || [])
			.map((k) => `<span class="oer-key">${esc(k)}</span>`).join("");

		return `
			<a class="oer-card" href="/app/employee/${encodeURIComponent(row.name)}"
				style="--oer-fg:${t.fg};--oer-bg:${t.bg};--oer-br:${t.br}">
				<div class="oer-row">
					<span class="oer-name">${esc(row.employee_name || row.name)}</span>
					<span class="oer-id">${esc(row.name)}</span>
					${row.is_linked ? `<span class="oer-linked">${__("Linked (IJP)")}</span>` : ""}
				</div>
				<div class="oer-row">
					<span class="oer-chip"><span class="oer-chip-dot"></span>${esc(row.verdict_label || "")}</span>
					${meta ? `<span class="oer-meta">${meta}</span>` : ""}
				</div>
				${row.verdict_detail ? `<div class="oer-detail">${esc(row.verdict_detail)}</div>` : ""}
				${keys ? `<div class="oer-keys">${__("Matched on")} ${keys}</div>` : ""}
			</a>
		`;
	}

	function stripFor(data) {
		if (!data.configured) {
			return {
				quiet: true,
				text: __("No Rehire Check Settings cover this candidate's company — nothing was checked."),
			};
		}
		if (!data.total) {
			return { quiet: true, text: __("Not a past or present employee.") };
		}
		const worst = (data.matches || [])[0] || {};
		const t = tone(worst.verdict);
		if (!data.attention_count) {
			return {
				t,
				text: data.total === 1
					? __("<b>A former employee.</b> No rehire restriction applies.")
					: __("<b>{0} employee records</b> — no rehire restriction applies.", [data.total]),
			};
		}
		return {
			t,
			text: __("<b>{0}</b> — {1}", [worst.verdict_label, worst.verdict_detail || ""]),
		};
	}

	function footText(data) {
		if (!data.total) return "";
		const bits = [];
		// The employee-pool rules are decided at the JOB OFFER, not here, so the
		// wording must not imply this application is being stopped.
		if (data.allow_hiring && (data.blocking_count || data.exception_count)) {
			bits.push(__("Hiring is allowed despite this match — a job offer to this person would go to exceptional approval."));
		} else if (data.blocking_count) {
			bits.push(__("A job offer to this person would be refused by the duplicity check."));
		} else if (data.exception_count) {
			bits.push(__("A job offer to this person would need exceptional approval."));
		} else if (data.attention_count && !data.enforced) {
			// Otherwise HR reads a red banner as "the system stopped this", when
			// in fact no outcome is configured at all.
			bits.push(
				__("No employee-pool outcome is configured in TA Duplicity Check Settings — this is a warning only.")
			);
		}
		if (data.match_fields && data.match_fields.length) {
			bits.push(__("Matched on {0}.", [data.match_fields.join(", ")]));
		}
		return bits.join(" ");
	}

	// ── Render ──────────────────────────────────────────────────────────────
	function bindReload($w, frm) {
		$w.find("[data-oer-reload]").on("click", () => {
			delete frm.__oer_data;
			delete frm.__oer_name;
			load(frm, true);
		});
	}

	function paint($w, frm, data) {
		const strip = stripFor(data);
		const style = strip.t
			? `style="--oer-fg:${strip.t.fg};--oer-bg:${strip.t.bg};--oer-br:${strip.t.br}"`
			: "";
		const foot = footText(data);

		$w.html(`
			<div class="oer-strip ${strip.quiet ? "oer-quiet" : ""}" ${style}>
				<span class="oer-dot"></span>
				<span class="oer-strip-text">${strip.text}</span>
				<button class="oer-btn" data-oer-reload="1" title="${__("Refresh")}">&#8635;</button>
			</div>
			${data.total
				? `<div class="oer-list">${(data.matches || []).map(cardHtml).join("")}</div>`
				: ""}
			${foot ? `<div class="oer-foot">${esc(foot)}</div>` : ""}
		`);
		bindReload($w, frm);
		keepTabVisible(frm);
		setTabBadge(frm, data);
	}

	// Rendering nothing would make "not an employee" and "the check broke" look
	// identical, and this tab's value is that HR can trust a clear result.
	function paintError($w, frm) {
		$w.html(`
			<div class="oer-strip oer-quiet">
				<span class="oer-dot"></span>
				<span class="oer-strip-text">${__("Could not run the rehire check for this candidate.")}</span>
				<button class="oer-btn" data-oer-reload="1">${__("Retry")}</button>
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
		// The answer is about OTHER documents, so it cannot be derived from this
		// doc — cache per applicant, re-fetch on a different one or on request.
		if (!force && frm.__oer_data && frm.__oer_name === frm.doc.name) {
			render(frm, frm.__oer_data);
			return;
		}

		frappe.call({
			method: METHOD,
			args: { job_applicant: frm.doc.name },
			// Background read for a panel: a failure paints the inline retry strip
			// rather than throwing a modal over the form. The traceback still
			// reaches the console (frappe.request.cleanup logs r.exc regardless).
			silent: true,
			callback: (r) => {
				const message = r && r.message;
				if (!message) return render(frm, null);
				// The form may have moved on while the call was in flight.
				if (frm.doc.name !== message.job_applicant) return;
				frm.__oer_name = frm.doc.name;
				frm.__oer_data = message;
				render(frm, message);
				setFormIndicator(frm, message);
			},
			error: () => render(frm, null),
		});
	}

	// Re-render on tab click — the HTML control is not in the DOM until the tab
	// has been opened at least once.
	function bindTabClick(frm) {
		eachTab(frm, (t) => {
			if (!t.tab_link) return;
			t.tab_link.off("click.oer").on("click.oer", () => {
				if (frm.__oer_data) setTimeout(() => render(frm, frm.__oer_data), 50);
			});
		});
	}

	frappe.ui.form.on("Job Applicant", {
		refresh(frm) {
			try {
				injectStyles();
				// Nothing to look up until the applicant exists.
				if (frm.is_new()) { hideTab(frm); return; }
				setDuplicityFlag(frm);
				keepTabVisible(frm);
				bindTabClick(frm);
				load(frm);
			} catch (e) { /* non-fatal */ }
		},
	});
})();
