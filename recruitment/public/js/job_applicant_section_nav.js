/* global frappe, $ */

/*
 * Job Applicant — horizontal section navigation for the "Application Details" tab.
 *
 * That tab now carries every section the form used to spread across separate tabs
 * (Details, Auto-Screening, Final Interview Record, Pre Onboarding, …), so it is a
 * long scroll. This renders a horizontal pill bar at the top of the tab — one pill
 * per visible, labelled section — that jumps to a section on click and tracks the
 * section you are looking at while you scroll.
 *
 * Purely presentational: it reads Frappe's own `frm.layout.sections`, so sections
 * added / hidden / relabelled later show up here without any change.
 */
(function () {
	const TAB = "custom_application_details_tab";
	const HOST_ID = "ja-secnav";
	// Scroll offset that clears Frappe's sticky navbar + page head.
	const SCROLL_OFFSET = 120;

	// Rebuilt on every refresh; the scroll handler reads from here so it never
	// holds a stale form or section list after you route to another document.
	let state = { frm: null, sections: [], $host: null };

	function injectStyles() {
		if (document.getElementById("ja-secnav-styles")) return;
		const style = document.createElement("style");
		style.id = "ja-secnav-styles";
		style.textContent = `
			.ja-secnav {
				display: flex; gap: 8px; flex-wrap: nowrap; overflow-x: auto;
				padding: 12px 0 14px; margin-bottom: 2px;
				scrollbar-width: thin;
			}
			.ja-secnav::-webkit-scrollbar { height: 4px; }
			.ja-secnav::-webkit-scrollbar-thumb { background: var(--gray-300, #d1d8dd); border-radius: 4px; }
			.ja-secnav-pill {
				flex: 0 0 auto; cursor: pointer; white-space: nowrap;
				padding: 5px 14px; border-radius: 999px;
				border: 1px solid var(--border-color, #e2e6e9);
				background: var(--fg-color, #fff);
				color: var(--text-muted, #6b7280);
				font-size: 12px; font-weight: 500; line-height: 1.5;
				transition: background .12s, color .12s, border-color .12s;
			}
			.ja-secnav-pill:hover {
				background: var(--control-bg-on-gray, #f4f5f6);
				color: var(--text-color, #1f272e);
			}
			.ja-secnav-pill.active {
				background: var(--blue-50, #f0f7ff);
				border-color: var(--blue-300, #a3cfff);
				color: var(--blue-600, #1479d6);
			}
		`;
		document.head.appendChild(style);
	}

	function getTab(frm) {
		return ((frm.layout && frm.layout.tabs) || []).find(
			(t) => t.df && t.df.fieldname === TAB
		);
	}

	// The visible, labelled sections of the Application Details tab, in form order.
	// `empty-section` / `hide-control` are the classes Frappe itself puts on
	// sections with nothing to show, so we mirror exactly what the user can see.
	function visibleSections(frm, tab) {
		const paneId = tab.wrapper.attr("id");
		return ((frm.layout && frm.layout.sections) || []).filter((s) => {
			if (!s.df || !s.df.label || !s.wrapper || !s.wrapper.length) return false;
			if (s.wrapper.closest(".tab-pane").attr("id") !== paneId) return false;
			return !s.wrapper.hasClass("hide-control") && !s.wrapper.hasClass("empty-section");
		});
	}

	function setActive($host, idx) {
		$host.find(".ja-secnav-pill").each(function () {
			$(this).toggleClass("active", Number(this.getAttribute("data-idx")) === idx);
		});
	}

	function goToSection(section, idx) {
		if (!section) return;
		// A collapsed section can't be read — open it before jumping there.
		if (section.df.collapsible && section.body && section.body.hasClass("hide")) {
			section.collapse(false);
			invalidateTops();   // everything below just moved
		}
		setActive(state.$host, idx);
		frappe.utils.scroll_to(section.wrapper, true, SCROLL_OFFSET);
	}

	// Section tops, measured once and reused. Reading offset() per section on every
	// scroll event forces a layout flush each time — with a dozen sections that is
	// the difference between a smooth scroll and a janky one. Invalidated whenever
	// the layout can actually have moved (rebuild, resize, a section collapsing).
	function sectionTops() {
		if (state.tops) return state.tops;
		state.tops = state.sections.map((s) => {
			const el = s.wrapper;
			return el && el.length && el.is(":visible") ? el.offset().top : null;
		});
		return state.tops;
	}

	function invalidateTops() { state.tops = null; }

	// Highlight the section currently under the top of the viewport.
	function syncActiveFromScroll() {
		const { sections, $host } = state;
		if (!$host || !$host.length || !sections.length || !$host.is(":visible")) return;
		const y = window.pageYOffset + SCROLL_OFFSET + 10;
		const tops = sectionTops();
		let active = 0;
		for (let i = 0; i < tops.length; i++) {
			if (tops[i] === null) continue;
			if (tops[i] <= y) active = i;
			else break;
		}
		setActive($host, active);
	}

	function build(frm) {
		const tab = getTab(frm);
		if (!tab || !tab.wrapper || !tab.wrapper.length) return;
		injectStyles();

		let $host = tab.wrapper.find("#" + HOST_ID);
		if (!$host.length) {
			$host = $(`<div id="${HOST_ID}" class="ja-secnav"></div>`);
			tab.wrapper.prepend($host);
		}

		const sections = visibleSections(frm, tab);
		state = { frm: frm, sections: sections, $host: $host, tops: null };

		// One section is not a navigation.
		if (sections.length < 2) {
			$host.empty().hide();
			return;
		}

		$host.show().html(
			sections.map((s, i) =>
				`<button type="button" class="ja-secnav-pill${i === 0 ? " active" : ""}" data-idx="${i}">` +
				`${frappe.utils.escape_html(__(s.df.label, null, s.df.parent))}</button>`
			).join("")
		);

		$host.find(".ja-secnav-pill").on("click", function () {
			const idx = Number(this.getAttribute("data-idx"));
			goToSection(state.sections[idx], idx);
		});

		syncActiveFromScroll();
	}

	// One scroll listener for the whole desk session, reading the current state.
	let ticking = false;
	$(window).on("scroll.jasecnav", function () {
		if (ticking) return;
		ticking = true;
		window.requestAnimationFrame(() => {
			ticking = false;
			try { syncActiveFromScroll(); } catch (e) { /* non-fatal */ }
		});
	});
	// A resize moves every section; a click inside the tab may have collapsed one.
	$(window).on("resize.jasecnav", invalidateTops);
	$(document).on("click.jasecnav", ".form-section .section-head", invalidateTops);

	frappe.ui.form.on("Job Applicant", {
		refresh(frm) {
			// Section visibility is settled by Frappe's own refresh_sections(),
			// which runs as part of this same refresh — rebuild just after it.
			setTimeout(() => {
				try { build(frm); } catch (e) { /* non-fatal */ }
			}, 0);
		},
	});
})();
