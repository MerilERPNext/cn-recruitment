// Copyright (c) 2026, NextAI and contributors
// For license information, please see license.txt

// Onboarding Portal Forms — visual Form Builder
// ---------------------------------------------
// Replaces the old Field Inspector with a drag-and-drop builder rendered into
// `available_fields_html`: a palette of Employee Onboarding fields on the left,
// a Tabs -> Sections canvas on the right. It reads/writes the `portal_fields`
// child table (the candidate portal already consumes it). Per-field approval
// data on existing rows (approval_status, hr_comment, current_value, reviewer)
// is PRESERVED across edits — only layout/flag columns are rewritten.

frappe.ui.form.on("Onboarding Portal Forms", {
	onload(frm) {
		load_onb_fields(frm);
	},
	refresh(frm) {
		if (frm._onb_fields) {
			mount_onb_builder(frm);
		} else {
			load_onb_fields(frm);
		}
	},
});

function load_onb_fields(frm) {
	frappe.call({
		method: "recruitment.api.candidate_portal.get_all_onboarding_fields",
		callback(r) {
			if (!r.message || r.message.status !== "success") return;
			frm._onb_fields = (r.message.fields || []).map((f) => ({
				fieldname: f.fieldname,
				label: f.label || f.fieldname,
				fieldtype: f.fieldtype || "Data",
				options: f.options || "",
			}));
			frm._onb_lookup = {};
			frm._onb_fields.forEach((f) => (frm._onb_lookup[f.fieldname] = f));
			mount_onb_builder(frm);
		},
	});
}

const ONB_FT = {
	Link: { c: "#2490ef", t: "Link" },
	"Dynamic Link": { c: "#2490ef", t: "Link" },
	Table: { c: "#8a3ffc", t: "Table" },
	"Table MultiSelect": { c: "#8a3ffc", t: "Multi" },
	Select: { c: "#f5803e", t: "Select" },
	Check: { c: "#21a366", t: "Check" },
	Date: { c: "#0fb5ae", t: "Date" },
	Datetime: { c: "#0fb5ae", t: "Date" },
	Attach: { c: "#d4380d", t: "File" },
	"Attach Image": { c: "#d4380d", t: "Img" },
	Currency: { c: "#4f46e5", t: "₹" },
	Float: { c: "#4f46e5", t: "Num" },
	Int: { c: "#4f46e5", t: "Num" },
	"Text Editor": { c: "#6b7280", t: "Rich" },
	"Small Text": { c: "#6b7280", t: "Text" },
	Text: { c: "#6b7280", t: "Text" },
};
function onb_ft(ft) {
	return ONB_FT[ft] || { c: "#6b7280", t: "Data" };
}

function mount_onb_builder(frm) {
	const field = frm.get_field("available_fields_html");
	if (!field || !field.$wrapper) return;
	onb_inject_styles();
	const b = new OnbBuilder(frm, field.$wrapper);
	frm._onb_builder = b;
	b.init_state_from_table();
	b.render();
}

class OnbBuilder {
	constructor(frm, $wrapper) {
		this.frm = frm;
		this.$wrapper = $wrapper;
		this.fields = frm._onb_fields || [];
		this.lookup = frm._onb_lookup || {};
		this.uid = 0;
		this.state = { tabs: [], activeTab: null };
		this.search = "";
	}

	nid(p) {
		this.uid += 1;
		return `${p}${this.uid}`;
	}

	// --- state <-> portal_fields -----------------------------------------

	init_state_from_table() {
		const rows = this.frm.doc.portal_fields || [];
		const tabs = [];
		const tabIdx = {};
		const secIdx = {};

		rows.forEach((row) => {
			if (!row.fieldname) return;
			const meta = this.lookup[row.fieldname] || {};
			const tabTitle = row.tab_label || "General";
			const secTitle = row.section_label || "";

			if (!(tabTitle in tabIdx)) {
				const tab = { id: this.nid("tab"), title: tabTitle, sections: [] };
				tabs.push(tab);
				tabIdx[tabTitle] = tab;
			}
			const tab = tabIdx[tabTitle];
			const secKey = `${tabTitle}||${secTitle}`;
			if (!(secKey in secIdx)) {
				const sec = { id: this.nid("sec"), title: secTitle, fields: [] };
				tab.sections.push(sec);
				secIdx[secKey] = sec;
			}
			secIdx[secKey].fields.push({
				fieldname: row.fieldname,
				label: row.label || meta.label || row.fieldname,
				fieldtype: row.fieldtype || meta.fieldtype || "Data",
				options: row.options || meta.options || "",
				mandatory: !!row.is_mandatory,
				read_only: !!row.read_only,
				hidden: !!row.hidden,
				selected_child_fields: row.selected_child_fields || "",
				mandatory_child_fields: row.mandatory_child_fields || "",
			});
		});

		this.state.tabs = tabs;
		this.state.activeTab = tabs.length ? tabs[0].id : null;
	}

	sync_to_table() {
		const frm = this.frm;
		const prev = {};
		(frm.doc.portal_fields || []).forEach((r) => {
			if (r.fieldname) prev[r.fieldname] = r;
		});

		frm.clear_table("portal_fields");
		this.state.tabs.forEach((tab) => {
			tab.sections.forEach((sec) => {
				sec.fields.forEach((f) => {
					const old = prev[f.fieldname] || {};
					frm.add_child("portal_fields", {
						fieldname: f.fieldname,
						label: f.label,
						fieldtype: f.fieldtype,
						options: f.options || old.options || "",
						tab_label: tab.title,
						section_label: sec.title,
						is_mandatory: f.mandatory ? 1 : 0,
						read_only: f.read_only ? 1 : 0,
						hidden: f.hidden ? 1 : 0,
						// Child-column selection is builder-owned; fall back to the
						// existing row value when the field was never edited here.
						selected_child_fields:
							f.selected_child_fields != null
								? f.selected_child_fields
								: old.selected_child_fields || "",
						mandatory_child_fields:
							f.mandatory_child_fields != null
								? f.mandatory_child_fields
								: old.mandatory_child_fields || "",
						// Preserve everything else the builder doesn't own.
						approval_status: old.approval_status || undefined,
						reviewed_by: old.reviewed_by || undefined,
						reviewed_on: old.reviewed_on || undefined,
						hr_comment: old.hr_comment || undefined,
						current_value: old.current_value || undefined,
					});
				});
			});
		});
		frm.refresh_field("portal_fields");
		frm.dirty();
	}

	is_placed(fieldname) {
		return this.state.tabs.some((t) =>
			t.sections.some((s) => s.fields.some((f) => f.fieldname === fieldname))
		);
	}

	active() {
		return this.state.tabs.find((t) => t.id === this.state.activeTab) || null;
	}

	counts() {
		let n = 0;
		this.state.tabs.forEach((t) => t.sections.forEach((s) => (n += s.fields.length)));
		return n;
	}

	// --- mutations --------------------------------------------------------

	add_tab() {
		frappe.prompt(
			[{ fieldname: "title", label: __("Tab name"), fieldtype: "Data", reqd: 1 }],
			(v) => {
				const tab = { id: this.nid("tab"), title: v.title, sections: [] };
				this.state.tabs.push(tab);
				this.state.activeTab = tab.id;
				this.commit();
			},
			__("Add Tab"),
			__("Create")
		);
	}

	rename(obj, title) {
		frappe.prompt(
			[{ fieldname: "title", label: title || __("Name"), fieldtype: "Data", default: obj.title }],
			(v) => {
				obj.title = v.title || obj.title;
				this.commit();
			},
			__("Rename"),
			__("Save")
		);
	}

	delete_tab(tab) {
		this.state.tabs = this.state.tabs.filter((t) => t.id !== tab.id);
		if (this.state.activeTab === tab.id) {
			this.state.activeTab = this.state.tabs.length ? this.state.tabs[0].id : null;
		}
		this.commit();
	}

	add_section(tab) {
		frappe.prompt(
			[{ fieldname: "title", label: __("Section name"), fieldtype: "Data" }],
			(v) => {
				tab.sections.push({ id: this.nid("sec"), title: v.title || "", fields: [] });
				this.commit();
			},
			__("Add Section"),
			__("Create")
		);
	}

	delete_section(tab, sec) {
		tab.sections = tab.sections.filter((s) => s.id !== sec.id);
		this.commit();
	}

	add_field_to_active(fieldname) {
		if (this.is_placed(fieldname)) return;
		let tab = this.active();
		if (!tab) {
			tab = { id: this.nid("tab"), title: "General", sections: [] };
			this.state.tabs.push(tab);
			this.state.activeTab = tab.id;
		}
		if (!tab.sections.length) {
			tab.sections.push({ id: this.nid("sec"), title: "", fields: [] });
		}
		const meta = this.lookup[fieldname] || {};
		tab.sections[tab.sections.length - 1].fields.push({
			fieldname,
			label: meta.label || fieldname,
			fieldtype: meta.fieldtype || "Data",
			options: meta.options || "",
			mandatory: false,
			read_only: false,
			hidden: false,
		});
		this.commit();
	}

	remove_field(sec, f) {
		sec.fields = sec.fields.filter((x) => x.fieldname !== f.fieldname);
		this.commit();
	}

	move_field(fromTab, fromSec, f) {
		const NEW_TAB = "➕ New tab";
		const NEW_SEC = "➕ New section";
		const tabTitles = this.state.tabs.map((t) => t.title);
		const secTitles = Array.from(new Set(fromTab.sections.map((s) => s.title)));

		frappe.prompt(
			[
				{
					fieldname: "target_tab",
					fieldtype: "Select",
					label: __("Move to tab"),
					options: tabTitles.concat([NEW_TAB]).join("\n"),
					default: fromTab.title,
					reqd: 1,
				},
				{
					fieldname: "new_tab",
					fieldtype: "Data",
					label: __("New tab name"),
					depends_on: `eval:doc.target_tab=='${NEW_TAB}'`,
					mandatory_depends_on: `eval:doc.target_tab=='${NEW_TAB}'`,
				},
				{
					fieldname: "target_section",
					fieldtype: "Select",
					label: __("Into section"),
					options: secTitles.concat([NEW_SEC]).join("\n"),
					default: fromSec.title,
					description: __("Reuse a section name or create a new one in the target tab"),
				},
				{
					fieldname: "new_section",
					fieldtype: "Data",
					label: __("New section name (blank = no title)"),
					depends_on: `eval:doc.target_section=='${NEW_SEC}'`,
				},
			],
			(v) => {
				const tabTitle = v.target_tab === NEW_TAB ? (v.new_tab || "New tab").trim() : v.target_tab;
				let ttab = this.state.tabs.find((t) => t.title === tabTitle);
				if (!ttab) {
					ttab = { id: this.nid("tab"), title: tabTitle, sections: [] };
					this.state.tabs.push(ttab);
				}
				const secTitle = v.target_section === NEW_SEC ? (v.new_section || "").trim() : v.target_section;
				let tsec = ttab.sections.find((s) => s.title === secTitle);
				if (!tsec) {
					tsec = { id: this.nid("sec"), title: secTitle, fields: [] };
					ttab.sections.push(tsec);
				}
				fromSec.fields = fromSec.fields.filter((x) => x.fieldname !== f.fieldname);
				if (!tsec.fields.some((x) => x.fieldname === f.fieldname)) tsec.fields.push(f);
				this.state.activeTab = ttab.id;
				this.commit();
				frappe.show_alert({
					message: __("Moved “{0}” to {1}", [f.label, tabTitle]),
					indicator: "green",
				});
			},
			__("Move field"),
			__("Move")
		);
	}

	edit_child_fields(f) {
		const child = f.options;
		if (!child) {
			frappe.msgprint(__("This field is not linked to a child table."));
			return;
		}
		frappe.call({
			method: "recruitment.api.candidate_portal.get_child_doctype_fields",
			args: { child_doctype: child },
			callback: (r) => {
				const cols = (r.message && r.message.fields) || [];
				if (!cols.length) {
					frappe.msgprint(__("No columns found for {0}.", [child]));
					return;
				}

				let selected = [];
				let mandatory = [];
				try {
					selected = JSON.parse(f.selected_child_fields || "[]");
				} catch (e) {
					selected = [];
				}
				try {
					mandatory = JSON.parse(f.mandatory_child_fields || "[]");
				} catch (e) {
					mandatory = [];
				}
				const allShown = !selected.length; // empty = all columns
				const selSet = new Set(selected);
				const manSet = new Set(mandatory);

				const rows = cols
					.map((c) => {
						const showChecked = allShown || selSet.has(c.fieldname) ? "checked" : "";
						const manChecked = manSet.has(c.fieldname) ? "checked" : "";
						return (
							"<tr>" +
							'<td>' +
							frappe.utils.escape_html(c.label || c.fieldname) +
							' <span class="text-muted" style="font-size:11px">' +
							frappe.utils.escape_html(c.fieldname) +
							"</span></td>" +
							'<td style="text-align:center"><input type="checkbox" class="cf-show" data-fn="' +
							c.fieldname +
							'" ' +
							showChecked +
							"></td>" +
							'<td style="text-align:center"><input type="checkbox" class="cf-man" data-fn="' +
							c.fieldname +
							'" ' +
							manChecked +
							"></td></tr>"
						);
					})
					.join("");

				const d = new frappe.ui.Dialog({
					title: __("Child columns — {0}", [f.label]),
					fields: [{ fieldtype: "HTML", fieldname: "html" }],
					primary_action_label: __("Apply"),
					primary_action: () => {
						const $w = d.fields_dict.html.$wrapper;
						const show = $w
							.find(".cf-show:checked")
							.map((i, el) => el.dataset.fn)
							.get();
						const man = $w
							.find(".cf-man:checked")
							.map((i, el) => el.dataset.fn)
							.get();
						// Empty "selected" means all columns, so store '' when everything is shown.
						f.selected_child_fields = show.length === cols.length ? "" : JSON.stringify(show);
						f.mandatory_child_fields = man.length ? JSON.stringify(man) : "";
						d.hide();
						this.commit();
						frappe.show_alert({ message: __("Updated child columns"), indicator: "green" });
					},
				});

				d.fields_dict.html.$wrapper.html(
					'<div class="text-muted" style="font-size:12px;margin-bottom:6px">' +
						__("Choose which columns of this table the candidate sees, and which are mandatory.") +
						"</div>" +
						'<table class="table table-bordered" style="font-size:12px;margin:0">' +
						"<thead><tr><th>" +
						__("Column") +
						'</th><th style="width:60px;text-align:center">' +
						__("Show") +
						'</th><th style="width:90px;text-align:center">' +
						__("Mandatory") +
						"</th></tr></thead><tbody>" +
						rows +
						"</tbody></table>"
				);
				d.show();
			},
		});
	}

	sync_from_dom() {
		const seen = {};
		this.state.tabs.forEach((tab) => {
			const $tab = this.$wrapper.find(`[data-tab="${tab.id}"]`);
			if (!$tab.length) return;
			tab.sections.forEach((sec) => {
				const $list = $tab.find(`[data-seclist="${sec.id}"]`);
				if (!$list.length) return;
				const ordered = [];
				$list.children("[data-fkey]").each((_, el) => {
					const key = el.getAttribute("data-fkey");
					if (seen[key]) return;
					seen[key] = true;
					let f = find_onb_field(this.state, key);
					if (!f) {
						const meta = this.lookup[key] || {};
						f = {
							fieldname: key,
							label: meta.label || key,
							fieldtype: meta.fieldtype || "Data",
							options: meta.options || "",
							mandatory: false,
							read_only: false,
							hidden: false,
						};
					}
					ordered.push(f);
				});
				sec.fields = ordered;
			});
		});
		this.commit();
	}

	commit() {
		this.sync_to_table();
		this.render();
	}

	// --- rendering --------------------------------------------------------

	render() {
		const $root = $('<div class="jrfb"></div>');
		$root.append(this.render_header());
		const $body = $('<div class="jrfb-body"></div>');
		$body.append(this.render_palette());
		$body.append(this.render_canvas());
		$root.append($body);
		this.$wrapper.empty().append($root);
		this.wire_sortables();
	}

	render_header() {
		const total = this.counts();
		const $h = $('<div class="jrfb-header"></div>');
		$h.append(
			'<div class="jrfb-brand"><span class="jrfb-logo">⚡</span><div>' +
				'<div class="jrfb-title">' +
				__("Onboarding Form Builder") +
				'</div><div class="jrfb-sub">' +
				(total
					? __("{0} field(s) placed · drag to rearrange", [total])
					: __("Drag Employee Onboarding fields from the left to design the portal form")) +
				"</div></div></div>"
		);
		const $actions = $('<div class="jrfb-actions"></div>');
		$('<button class="jrfb-btn jrfb-btn-primary">＋ ' + __("Add Tab") + "</button>")
			.appendTo($actions)
			.on("click", () => this.add_tab());
		$h.append($actions);
		return $h;
	}

	render_palette() {
		const $p = $('<div class="jrfb-palette"></div>');
		const $top = $('<div class="jrfb-palette-top"></div>');
		$top.append('<div class="jrfb-palette-title">' + __("Onboarding Fields") + "</div>");
		const $search = $(
			'<div class="jrfb-searchbox"><span>🔎</span><input type="text" placeholder="' +
				__("Search fields") +
				'"></div>'
		);
		$search.find("input").val(this.search).on("input", (e) => {
			this.search = e.target.value || "";
			this.refresh_palette_only();
		});
		$top.append($search);
		$p.append($top);
		$p.append(this.render_groups());
		return $p;
	}

	render_groups() {
		const items = this.fields.filter((f) => this.match(f));
		const $scroll = $('<div class="jrfb-groups"></div>');
		$scroll.append(
			'<div class="jrfb-group-head">' +
				__("Employee Onboarding") +
				'<span class="jrfb-group-count">' +
				items.length +
				"</span></div>"
		);
		items.forEach((f) => {
			const placed = this.is_placed(f.fieldname);
			const fm = onb_ft(f.fieldtype);
			const $it = $('<div class="jrfb-pitem ' + (placed ? "is-placed" : "") + '" draggable="true"></div>')
				.attr("data-fkey", f.fieldname)
				.attr("title", f.fieldname)
				.css("--accent", fm.c);
			$it.append('<span class="jrfb-grip">⠿</span>');
			$it.append(
				'<span class="jrfb-pmain"><span class="jrfb-plabel">' +
					frappe.utils.escape_html(f.label) +
					'</span><span class="jrfb-pname">' +
					frappe.utils.escape_html(f.fieldname) +
					"</span></span>"
			);
			$it.append('<span class="jrfb-ptag" style="background:' + fm.c + '1a;color:' + fm.c + '">' + fm.t + "</span>");
			if (placed) {
				$it.append('<span class="jrfb-check">✓</span>');
			} else {
				$it.on("dblclick", () => this.add_field_to_active(f.fieldname));
			}
			$scroll.append($it);
		});
		return $scroll;
	}

	refresh_palette_only() {
		// Replace ONLY the field list, not the search box, so the input keeps focus.
		this.$wrapper.find(".jrfb-groups").replaceWith(this.render_groups());
		this.wire_sortables();
	}

	match(f) {
		if (!this.search) return true;
		const s = this.search.toLowerCase();
		return (f.label || "").toLowerCase().includes(s) || (f.fieldname || "").toLowerCase().includes(s);
	}

	render_canvas() {
		const $c = $('<div class="jrfb-canvas"></div>');
		const $tabs = $('<div class="jrfb-tabs"></div>');
		this.state.tabs.forEach((tab) => {
			const n = tab.sections.reduce((a, s) => a + s.fields.length, 0);
			const $pill = $('<div class="jrfb-pill ' + (tab.id === this.state.activeTab ? "active" : "") + '"></div>');
			$pill.append(
				'<span class="jrfb-pill-label">' +
					frappe.utils.escape_html(tab.title || "—") +
					'</span><span class="jrfb-pill-badge">' +
					n +
					"</span>"
			);
			$pill.on("click", () => {
				this.state.activeTab = tab.id;
				this.render();
			});
			$('<span class="jrfb-mini" title="Rename">✎</span>')
				.appendTo($pill)
				.on("click", (e) => {
					e.stopPropagation();
					this.rename(tab, __("Tab name"));
				});
			$('<span class="jrfb-mini jrfb-mini-danger" title="Delete">✕</span>')
				.appendTo($pill)
				.on("click", (e) => {
					e.stopPropagation();
					this.delete_tab(tab);
				});
			$tabs.append($pill);
		});
		$c.append($tabs);

		const tab = this.active();
		if (!tab) {
			const $empty = $('<div class="jrfb-empty"></div>');
			$empty.append('<div class="jrfb-empty-ico">🗂️</div>');
			$empty.append('<div class="jrfb-empty-title">' + __("Start building the portal form") + "</div>");
			$empty.append(
				'<div class="jrfb-empty-sub">' +
					__("Add a tab, then drag Employee Onboarding fields into it.") +
					"</div>"
			);
			$('<button class="jrfb-btn jrfb-btn-primary">＋ ' + __("Add your first tab") + "</button>")
				.appendTo($empty)
				.on("click", () => this.add_tab());
			$c.append($empty);
			return $c;
		}

		const $sections = $('<div class="jrfb-sections" data-tab="' + tab.id + '"></div>');
		tab.sections.forEach((sec) => $sections.append(this.render_section(tab, sec)));
		$('<button class="jrfb-addsec">＋ ' + __("Add Section") + "</button>")
			.appendTo($sections)
			.on("click", () => this.add_section(tab));
		$c.append($sections);
		return $c;
	}

	render_section(tab, sec) {
		const $s = $('<div class="jrfb-section"></div>');
		const $head = $('<div class="jrfb-sec-head"></div>');
		$head.append(
			'<span class="jrfb-sec-dot"></span><span class="jrfb-sec-title">' +
				frappe.utils.escape_html(sec.title || __("Untitled section")) +
				'</span><span class="jrfb-sec-count">' +
				sec.fields.length +
				"</span>"
		);
		const $ht = $('<span class="jrfb-sec-tools"></span>');
		$('<span class="jrfb-mini" title="Rename">✎</span>')
			.appendTo($ht)
			.on("click", () => this.rename(sec, __("Section name")));
		$('<span class="jrfb-mini jrfb-mini-danger" title="Delete section">✕</span>')
			.appendTo($ht)
			.on("click", () => this.delete_section(tab, sec));
		$head.append($ht);
		$s.append($head);

		const $list = $('<div class="jrfb-droplist" data-seclist="' + sec.id + '"></div>');
		sec.fields.forEach((f) => $list.append(this.render_chip(tab, sec, f)));
		$s.append($list);
		return $s;
	}

	render_chip(tab, sec, f) {
		const fm = onb_ft(f.fieldtype);
		const $chip = $('<div class="jrfb-chip"></div>').attr("data-fkey", f.fieldname).css("--accent", fm.c);
		if (f.hidden) $chip.addClass("is-hidden");
		$chip.append('<span class="jrfb-grip">⠿</span>');
		$chip.append(
			'<span class="jrfb-chip-main"><span class="jrfb-chip-label">' +
				frappe.utils.escape_html(f.label) +
				"</span></span>"
		);
		$chip.append('<span class="jrfb-ptag" style="background:' + fm.c + '1a;color:' + fm.c + '">' + fm.t + "</span>");

		const $tools = $('<span class="jrfb-chip-tools"></span>');
		this.toggle_btn($tools, "M", f.mandatory, __("Mandatory"), () => {
			f.mandatory = !f.mandatory;
			this.commit();
		});
		this.toggle_btn($tools, "R", f.read_only, __("Read only"), () => {
			f.read_only = !f.read_only;
			this.commit();
		});
		this.toggle_btn($tools, "H", f.hidden, __("Hidden"), () => {
			f.hidden = !f.hidden;
			this.commit();
		});
		if (f.fieldtype === "Table" || f.fieldtype === "Table MultiSelect") {
			$('<span class="jrfb-mini" title="Child columns">⊞</span>')
				.appendTo($tools)
				.on("click", () => this.edit_child_fields(f));
		}
		$('<span class="jrfb-mini" title="Move to tab / section">⤿</span>')
			.appendTo($tools)
			.on("click", () => this.move_field(tab, sec, f));
		$('<span class="jrfb-mini" title="Relabel">✎</span>')
			.appendTo($tools)
			.on("click", () => {
				frappe.prompt(
					[{ fieldname: "label", label: __("Label"), fieldtype: "Data", default: f.label }],
					(v) => {
						f.label = v.label || f.label;
						this.commit();
					},
					__("Relabel field"),
					__("Save")
				);
			});
		$('<span class="jrfb-mini jrfb-mini-danger" title="Remove">✕</span>')
			.appendTo($tools)
			.on("click", () => this.remove_field(sec, f));
		$chip.append($tools);
		return $chip;
	}

	toggle_btn($parent, text, on, title, handler) {
		$('<span class="jrfb-tg ' + (on ? "on" : "") + '" title="' + title + '">' + text + "</span>")
			.appendTo($parent)
			.on("click", handler);
	}

	wire_sortables() {
		const Sortable = window.Sortable;
		if (!Sortable) return;
		this.$wrapper.find(".jrfb-groups").each((_, el) => {
			Sortable.create(el, {
				group: { name: "onb", pull: "clone", put: false },
				sort: false,
				filter: ".is-placed, .jrfb-group-head",
				draggable: ".jrfb-pitem",
				animation: 150,
			});
		});
		const self = this;
		this.$wrapper.find(".jrfb-droplist").each((_, el) => {
			Sortable.create(el, {
				group: { name: "onb", pull: true, put: true },
				draggable: ".jrfb-chip, .jrfb-pitem",
				animation: 150,
				ghostClass: "jrfb-ghost",
				onAdd() {
					self.sync_from_dom();
				},
				onUpdate() {
					self.sync_from_dom();
				},
			});
		});
	}
}

function find_onb_field(state, fieldname) {
	for (const tab of state.tabs) {
		for (const sec of tab.sections) {
			const hit = sec.fields.find((f) => f.fieldname === fieldname);
			if (hit) return hit;
		}
	}
	return null;
}

function onb_inject_styles() {
	if (document.getElementById("jrfb-styles")) return;
	const css = `
.jrfb { border:1px solid var(--border-color); border-radius:12px; overflow:hidden; background:var(--card-bg,#fff); box-shadow:0 1px 3px rgba(0,0,0,.06); font-size:13.5px; }
.jrfb-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:linear-gradient(120deg,#1f2937,#111827); color:#fff; }
.jrfb-brand { display:flex; align-items:center; gap:12px; }
.jrfb-logo { width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.12); border-radius:9px; font-size:17px; }
.jrfb-title { font-size:16px; font-weight:600; letter-spacing:.2px; }
.jrfb-sub { font-size:12px; opacity:.7; margin-top:1px; }
.jrfb-actions { display:flex; gap:8px; }
.jrfb-btn { border:none; border-radius:8px; padding:7px 14px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s ease; }
.jrfb-btn-primary { background:#2490ef; color:#fff; box-shadow:0 1px 2px rgba(36,144,239,.4); }
.jrfb-btn-primary:hover { background:#1a7ad4; transform:translateY(-1px); }
.jrfb-body { display:flex; min-height:380px; }
.jrfb-palette { width:280px; border-right:1px solid var(--border-color); display:flex; flex-direction:column; background:var(--subtle-fg,#fafbfc); }
.jrfb-palette-top { padding:12px 12px 8px; border-bottom:1px solid var(--border-color); }
.jrfb-palette-title { font-weight:600; font-size:12px; margin-bottom:8px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); }
.jrfb-searchbox { display:flex; align-items:center; gap:6px; background:var(--card-bg,#fff); border:1px solid var(--border-color); border-radius:8px; padding:5px 9px; }
.jrfb-searchbox span { font-size:11px; opacity:.6; }
.jrfb-searchbox input { border:none; outline:none; background:transparent; font-size:12px; width:100%; }
.jrfb-groups { padding:8px; overflow:auto; max-height:520px; }
.jrfb-group-head { display:flex; align-items:center; gap:6px; font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); margin:10px 4px 6px; font-weight:600; }
.jrfb-group-count { background:var(--border-color); color:var(--text-muted); border-radius:10px; padding:0 6px; font-size:9px; }
.jrfb-pitem { display:flex; align-items:center; gap:8px; padding:7px 9px; margin-bottom:5px; background:var(--card-bg,#fff); border:1px solid var(--border-color); border-left:3px solid var(--accent,#6b7280); border-radius:8px; cursor:grab; transition:all .12s ease; }
.jrfb-pitem:hover { box-shadow:0 2px 8px rgba(0,0,0,.08); transform:translateY(-1px); }
.jrfb-pitem.is-placed { opacity:.45; cursor:default; }
.jrfb-pitem.is-placed:hover { box-shadow:none; transform:none; }
.jrfb-grip { color:var(--text-muted); opacity:.4; font-size:12px; cursor:grab; letter-spacing:-2px; }
.jrfb-pmain { display:flex; flex-direction:column; flex:1; min-width:0; }
.jrfb-plabel { font-size:13.5px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.jrfb-pname { font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.jrfb-ptag { font-size:10px; font-weight:700; padding:2px 6px; border-radius:5px; letter-spacing:.02em; }
.jrfb-check { color:#21a366; font-weight:700; }
.jrfb-canvas { flex:1; padding:16px; overflow:auto; max-height:540px; background:repeating-linear-gradient(45deg,transparent,transparent 11px,rgba(0,0,0,.012) 11px,rgba(0,0,0,.012) 12px); }
.jrfb-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
.jrfb-pill { display:flex; align-items:center; gap:7px; padding:6px 12px; border:1px solid var(--border-color); border-radius:20px; cursor:pointer; background:var(--card-bg,#fff); transition:all .12s ease; }
.jrfb-pill:hover { border-color:#2490ef; }
.jrfb-pill.active { background:#2490ef; color:#fff; border-color:#2490ef; box-shadow:0 2px 6px rgba(36,144,239,.35); }
.jrfb-pill-label { font-weight:600; font-size:13.5px; }
.jrfb-pill-badge { background:rgba(0,0,0,.08); border-radius:10px; padding:0 6px; font-size:10px; font-weight:700; }
.jrfb-pill.active .jrfb-pill-badge { background:rgba(255,255,255,.25); }
.jrfb-mini { cursor:pointer; opacity:.55; font-size:11px; padding:0 2px; transition:opacity .12s; }
.jrfb-mini:hover { opacity:1; }
.jrfb-mini-danger:hover { color:#e24c4c; }
.jrfb-section { border:1px solid var(--border-color); border-radius:10px; margin-bottom:12px; background:var(--card-bg,#fff); box-shadow:0 1px 2px rgba(0,0,0,.04); }
.jrfb-sec-head { display:flex; align-items:center; gap:8px; padding:9px 12px; border-bottom:1px solid var(--border-color); background:var(--subtle-fg,#fafbfc); border-radius:10px 10px 0 0; }
.jrfb-sec-dot { width:7px; height:7px; border-radius:50%; background:#2490ef; }
.jrfb-sec-title { font-weight:600; font-size:13.5px; flex:1; }
.jrfb-sec-count { background:var(--border-color); color:var(--text-muted); border-radius:10px; padding:0 7px; font-size:10px; font-weight:700; }
.jrfb-sec-tools { display:flex; gap:4px; }
.jrfb-droplist { padding:10px; min-height:54px; display:flex; flex-direction:column; gap:6px; }
.jrfb-droplist:empty { display:flex; align-items:center; justify-content:center; }
.jrfb-droplist:empty::after { content:"⤓ Drop fields here"; color:var(--text-muted); font-size:11px; border:1px dashed var(--border-color); border-radius:8px; padding:10px 16px; width:100%; text-align:center; }
.jrfb-chip { display:flex; align-items:center; gap:9px; padding:8px 10px; background:var(--card-bg,#fff); border:1px solid var(--border-color); border-left:3px solid var(--accent,#6b7280); border-radius:8px; cursor:grab; transition:box-shadow .12s ease; }
.jrfb-chip:hover { box-shadow:0 2px 8px rgba(0,0,0,.08); }
.jrfb-chip.is-hidden { opacity:.5; }
.jrfb-chip.is-hidden .jrfb-chip-label { text-decoration:line-through; }
.jrfb-chip-main { flex:1; display:flex; align-items:center; gap:8px; min-width:0; }
.jrfb-chip-label { font-size:13.5px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.jrfb-chip-tools { display:flex; align-items:center; gap:5px; }
.jrfb-tg { width:20px; height:20px; line-height:20px; text-align:center; border-radius:5px; font-size:10px; font-weight:700; cursor:pointer; background:var(--subtle-fg,#eef0f2); color:var(--text-muted); transition:all .12s; }
.jrfb-tg:hover { transform:scale(1.08); }
.jrfb-tg.on { background:#2490ef; color:#fff; }
.jrfb-ghost { opacity:.4; }
.jrfb-addsec { width:100%; padding:9px; border:1px dashed var(--border-color); border-radius:8px; background:transparent; color:var(--text-muted); font-size:12px; font-weight:600; cursor:pointer; transition:all .12s; }
.jrfb-addsec:hover { border-color:#2490ef; color:#2490ef; background:rgba(36,144,239,.04); }
.jrfb-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:48px 24px; gap:8px; }
.jrfb-empty-ico { font-size:42px; opacity:.8; }
.jrfb-empty-title { font-size:15px; font-weight:600; }
.jrfb-empty-sub { font-size:12px; color:var(--text-muted); max-width:380px; line-height:1.5; margin-bottom:6px; }
`;
	const style = document.createElement("style");
	style.id = "jrfb-styles";
	style.textContent = css;
	document.head.appendChild(style);
}
