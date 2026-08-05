// Copyright (c) 2026, NextAI and contributors
// For license information, please see license.txt

// Job Requisition Form Settings — visual Form Builder
// ---------------------------------------------------
// Renders an HTML builder into the `builder_html` field: a palette of the
// available Job Requisition fields (parent + each child table) on the left, and
// a Tabs -> Sections canvas on the right. HR drags fields into sections and
// arranges them. The builder is pure UI: it reads/writes the `field_overrides`
// child table (the canonical store the API already consumes), so the backend is
// untouched. The raw grid stays under "Advanced" as a fallback.

frappe.ui.form.on("Job Requisition Form Settings", {
	onload(frm) {
		load_available_fields(frm);
	},
	refresh(frm) {
		if (frm._jrfb_fields) {
			mount_builder(frm);
		} else {
			load_available_fields(frm);
		}
	},
	// Ticking / unticking the option shows or hides the per-chip Hiring Type
	// picker, so the builder has to redraw.
	basis_hiring_type(frm) {
		if (frm._jrfb) frm._jrfb.render();
	},
});

// Default Hiring Type for a field in the builder. Inert while
// `basis_hiring_type` is off; "Lateral" is the documented default when it is on.
const DEFAULT_HIRING_TYPE = "Lateral";
const HIRING_TYPES = ["Both", "Fresher", "Lateral"];

// Keep the raw-grid Fieldname cell as a filtered picker too (advanced users).
frappe.ui.form.on("Job Requisition Form Field", {
	applies_to(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.fieldname) frappe.model.set_value(cdt, cdn, "fieldname", "");
		set_grid_fieldname_options(frm, row.applies_to);
	},
	form_render(frm, cdt, cdn) {
		set_grid_fieldname_options(frm, locals[cdt][cdn].applies_to);
	},
});

function load_available_fields(frm) {
	frappe.call({
		method: "recruitment.api.job_requisition.get_available_job_requisition_fields",
		callback(r) {
			const msg = r.message;
			if (!msg || msg.status === "error") return;

			const map = { Parent: (msg.parent_fields || []).map(simplify) };
			const child = msg.child_fields || {};
			// table fieldname -> its child columns, so a placed Table field can
			// open a child-columns picker.
			frm._jrfb_child_by_table = {};
			Object.keys(child).forEach((group) => {
				const info = child[group] || {};
				map[group] = (info.fields || []).map(simplify);
				if (info.table_field) {
					frm._jrfb_child_by_table[info.table_field] = {
						group,
						doctype: info.child_doctype,
						fields: info.fields || [],
					};
				}
			});
			frm._jrfb_fields = map;
			frm._jrfb_lookup = {};
			Object.keys(map).forEach((group) => {
				map[group].forEach((f) => {
					frm._jrfb_lookup[`${group}::${f.fieldname}`] = f;
				});
			});
			mount_builder(frm);
		},
	});
}

function simplify(f) {
	return {
		fieldname: f.fieldname,
		label: f.label || f.fieldname,
		fieldtype: f.fieldtype || "Data",
		tab_label: f.tab_label || "",
		section_label: f.section_label || "",
	};
}

function set_grid_fieldname_options(frm, applies_to) {
	const map = frm._jrfb_fields;
	const grid = frm.fields_dict.field_overrides && frm.fields_dict.field_overrides.grid;
	if (!map || !grid) return;
	const opts = (map[applies_to || "Parent"] || []).map((f) => ({
		value: f.fieldname,
		label: `${f.label} — ${f.fieldname}`,
		description: f.fieldtype,
	}));
	grid.update_docfield_property("fieldname", "options", opts);
}

// Field-type → accent colour + short tag, for at-a-glance scanning.
const FT_META = {
	Link: { c: "#2490ef", t: "Link" },
	"Dynamic Link": { c: "#2490ef", t: "Link" },
	Table: { c: "#8a3ffc", t: "Table" },
	"Table MultiSelect": { c: "#8a3ffc", t: "Multi" },
	Select: { c: "#f5803e", t: "Select" },
	Check: { c: "#21a366", t: "Check" },
	Date: { c: "#0fb5ae", t: "Date" },
	Datetime: { c: "#0fb5ae", t: "Date" },
	Time: { c: "#0fb5ae", t: "Time" },
	Duration: { c: "#0fb5ae", t: "Dur" },
	Currency: { c: "#4f46e5", t: "₹" },
	Float: { c: "#4f46e5", t: "Num" },
	Int: { c: "#4f46e5", t: "Num" },
	Percent: { c: "#4f46e5", t: "%" },
	"Text Editor": { c: "#6b7280", t: "Rich" },
	"Small Text": { c: "#6b7280", t: "Text" },
	Text: { c: "#6b7280", t: "Text" },
	"Long Text": { c: "#6b7280", t: "Text" },
};
function ftmeta(ft) {
	return FT_META[ft] || { c: "#6b7280", t: "Data" };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function mount_builder(frm) {
	const field = frm.get_field("builder_html");
	if (!field || !field.$wrapper) return;
	inject_styles();
	const b = new FormBuilder(frm, field.$wrapper);
	frm._jrfb = b;
	b.init_state_from_table();
	b.render();
}

class FormBuilder {
	constructor(frm, $wrapper) {
		this.frm = frm;
		this.$wrapper = $wrapper;
		this.fields = frm._jrfb_fields || {};
		this.lookup = frm._jrfb_lookup || {};
		this.childByTable = frm._jrfb_child_by_table || {};
		this.uid = 0;
		this.state = { tabs: [], activeTab: null };
		this.search = "";
	}

	nid(prefix) {
		this.uid += 1;
		return `${prefix}${this.uid}`;
	}

	// --- state <-> child table -------------------------------------------

	init_state_from_table() {
		const rows = (this.frm.doc.field_overrides || [])
			.slice()
			.sort((a, b) => (a.order || 0) - (b.order || 0));

		const tabs = [];
		const tabIdx = {};
		const secIdx = {};

		// One slot per field. Rows are sorted by `order`, so the first row seen
		// for a field is its lowest-ordered one — the same row the API resolves
		// to (see _load_form_overrides). Without this a duplicate row would draw
		// the field in two tabs, and the tab HR happened to look at would not be
		// the one the form actually serves.
		const placed = {};

		rows.forEach((row) => {
			if (!row.fieldname) return;
			const applies_to = row.applies_to || "Parent";
			const key = `${applies_to}::${row.fieldname}`;
			if (placed[key]) return;
			placed[key] = true;
			const meta = this.lookup[key] || {};
			const tabTitle = row.tab_override || meta.tab_label || "Details";
			const secTitle = row.section_override || meta.section_label || "";

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
				applies_to,
				fieldname: row.fieldname,
				label: meta.label || row.fieldname,
				fieldtype: meta.fieldtype || "Data",
				mandatory: row.mandatory_override === "Required",
				read_only: row.read_only_override === "Read Only",
				hidden: row.expose === "Hide",
				label_override: row.label_override || "",
				hiring_type: row.hiring_type || DEFAULT_HIRING_TYPE,
				selected_child_fields: row.selected_child_fields || "",
				mandatory_child_fields: row.mandatory_child_fields || "",
			});
		});

		this.state.tabs = tabs;
		this.state.activeTab = tabs.length ? tabs[0].id : null;
	}

	sync_to_table() {
		const frm = this.frm;
		frm.clear_table("field_overrides");
		let order = 0;
		// Belt and braces: never emit the same field twice, so saving from the
		// builder also heals a table that already carried duplicates.
		const written = {};
		this.state.tabs.forEach((tab) => {
			tab.sections.forEach((sec) => {
				sec.fields.forEach((f) => {
					const key = `${f.applies_to}::${f.fieldname}`;
					if (written[key]) return;
					written[key] = true;
					order += 10;
					frm.add_child("field_overrides", {
						applies_to: f.applies_to,
						fieldname: f.fieldname,
						tab_override: tab.title,
						section_override: sec.title,
						order: order,
						expose: f.hidden ? "Hide" : "Show",
						mandatory_override: f.mandatory ? "Required" : "Default",
						read_only_override: f.read_only ? "Read Only" : "Default",
						label_override: f.label_override || "",
						hiring_type: f.hiring_type || DEFAULT_HIRING_TYPE,
						selected_child_fields: f.selected_child_fields || "",
						mandatory_child_fields: f.mandatory_child_fields || "",
					});
				});
			});
		});
		frm.refresh_field("field_overrides");

		const has = this.state.tabs.some((t) => t.sections.some((s) => s.fields.length));
		if (cint(frm.doc.restrict_to_configured) !== (has ? 1 : 0)) {
			frm.set_value("restrict_to_configured", has ? 1 : 0);
		}
		frm.dirty();
	}

	is_placed(applies_to, fieldname) {
		return this.state.tabs.some((t) =>
			t.sections.some((s) =>
				s.fields.some((f) => f.applies_to === applies_to && f.fieldname === fieldname)
			)
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

	load_current_form() {
		const run = (overwrite) => {
			frappe.call({
				method: "recruitment.api.job_requisition.load_current_form_into_settings",
				args: { overwrite: overwrite ? 1 : 0 },
				freeze: true,
				freeze_message: __("Loading current Job Requisition form..."),
				callback: (r) => {
					if (r.message && r.message.success) {
						frappe.show_alert({ message: r.message.message, indicator: "green" });
						this.frm.reload_doc().then(() => {
							this.fields = this.frm._jrfb_fields;
							this.init_state_from_table();
							this.render();
						});
					} else if (r.message) {
						frappe.msgprint({ message: r.message.message, indicator: "orange" });
					}
				},
			});
		};

		if (this.counts() > 0) {
			frappe.confirm(
				__("This replaces the current builder layout with the live Job Requisition form. Continue?"),
				() => run(true)
			);
		} else {
			run(false);
		}
	}

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

	// --- placement --------------------------------------------------------
	// Tabs, sections and fields are all serialised by sync_to_table() into a
	// single ascending `order` walked tab -> section -> field. That number is the
	// ONLY sequence the API sorts by (_sequence_key gives a tab/section the
	// position of its earliest-ordered field), so moving anything here is what
	// makes get_job_requisition_form_config emit it in the new position.

	move_in_list(list, id, where) {
		const i = list.findIndex((x) => x.id === id);
		if (i < 0) return false;
		const target = {
			top: 0,
			bottom: list.length - 1,
			up: i - 1,
			down: i + 1,
			left: i - 1,
			right: i + 1,
		}[where];
		if (target === undefined || target < 0 || target >= list.length || target === i) {
			return false;
		}
		const [item] = list.splice(i, 1);
		list.splice(target, 0, item);
		return true;
	}

	move_section(tab, sec, where) {
		if (this.move_in_list(tab.sections, sec.id, where)) this.commit();
	}

	move_tab(tab, where) {
		if (this.move_in_list(this.state.tabs, tab.id, where)) this.commit();
	}

	move_section_to_tab(tab, sec) {
		const others = this.state.tabs.filter((t) => t.id !== tab.id);
		if (!others.length) {
			frappe.msgprint({
				message: __("Add another tab first — there is nowhere to move this section."),
				indicator: "orange",
			});
			return;
		}
		frappe.prompt(
			[
				{
					fieldname: "tab",
					label: __("Move to tab"),
					fieldtype: "Select",
					reqd: 1,
					options: others.map((t) => ({ label: t.title || __("—"), value: t.id })),
					default: others[0].id,
				},
				{
					fieldname: "position",
					label: __("Place at"),
					fieldtype: "Select",
					options: ["Bottom", "Top"],
					default: "Bottom",
				},
			],
			(v) => {
				const target = this.state.tabs.find((t) => t.id === v.tab);
				if (!target) return;
				// The section keeps its id and its fields — only its parent changes.
				tab.sections = tab.sections.filter((s) => s.id !== sec.id);
				if (v.position === "Top") target.sections.unshift(sec);
				else target.sections.push(sec);
				this.state.activeTab = target.id;
				this.commit();
				frappe.show_alert({
					message: __("Section moved to {0}", [target.title || __("tab")]),
					indicator: "green",
				});
			},
			__("Move section"),
			__("Move")
		);
	}

	// Reorder state to match what the user dragged into place.
	sync_sections_from_dom() {
		const tab = this.active();
		if (!tab) return;
		const ordered = [];
		this.$wrapper.find(`[data-tab="${tab.id}"] > [data-secid]`).each((_, el) => {
			const sec = tab.sections.find((s) => s.id === el.getAttribute("data-secid"));
			if (sec && !ordered.includes(sec)) ordered.push(sec);
		});
		// Anything the DOM didn't report (shouldn't happen) keeps its old place
		// rather than being dropped.
		tab.sections.forEach((s) => {
			if (!ordered.includes(s)) ordered.push(s);
		});
		tab.sections = ordered;
		this.commit();
	}

	sync_tabs_from_dom() {
		const ordered = [];
		this.$wrapper.find(".jrfb-tabs > [data-tabid]").each((_, el) => {
			const tab = this.state.tabs.find((t) => t.id === el.getAttribute("data-tabid"));
			if (tab && !ordered.includes(tab)) ordered.push(tab);
		});
		this.state.tabs.forEach((t) => {
			if (!ordered.includes(t)) ordered.push(t);
		});
		this.state.tabs = ordered;
		this.commit();
	}

	add_field_to_active(applies_to, fieldname) {
		if (this.is_placed(applies_to, fieldname)) return;
		let tab = this.active();
		if (!tab) {
			tab = { id: this.nid("tab"), title: "Details", sections: [] };
			this.state.tabs.push(tab);
			this.state.activeTab = tab.id;
		}
		if (!tab.sections.length) {
			tab.sections.push({ id: this.nid("sec"), title: "", fields: [] });
		}
		const meta = this.lookup[`${applies_to}::${fieldname}`] || {};
		tab.sections[tab.sections.length - 1].fields.push({
			applies_to,
			fieldname,
			label: meta.label || fieldname,
			fieldtype: meta.fieldtype || "Data",
			mandatory: false,
			read_only: false,
			hidden: false,
			label_override: "",
			hiring_type: DEFAULT_HIRING_TYPE,
		});
		this.commit();
	}

	remove_field(sec, f) {
		sec.fields = sec.fields.filter(
			(x) => !(x.applies_to === f.applies_to && x.fieldname === f.fieldname)
		);
		this.commit();
	}

	move_field(fromTab, fromSec, f) {
		const NEW_TAB = "➕ New tab";
		const NEW_SEC = "➕ New section";
		const tabTitles = this.state.tabs.map((t) => t.title);
		const secTitles = Array.from(
			new Set(fromTab.sections.map((s) => s.title))
		);

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

				const secTitle =
					v.target_section === NEW_SEC ? (v.new_section || "").trim() : v.target_section;
				let tsec = ttab.sections.find((s) => s.title === secTitle);
				if (!tsec) {
					tsec = { id: this.nid("sec"), title: secTitle, fields: [] };
					ttab.sections.push(tsec);
				}

				// Remove from origin, then add to target (guard against duplicates).
				fromSec.fields = fromSec.fields.filter(
					(x) => !(x.applies_to === f.applies_to && x.fieldname === f.fieldname)
				);
				if (!tsec.fields.some((x) => x.applies_to === f.applies_to && x.fieldname === f.fieldname)) {
					tsec.fields.push(f);
				}

				this.state.activeTab = ttab.id;
				this.commit();
				frappe.show_alert({
					message: __("Moved “{0}” to {1}", [f.label_override || f.label, tabTitle]),
					indicator: "green",
				});
			},
			__("Move field"),
			__("Move")
		);
	}

	edit_child_fields(f) {
		const info = this.childByTable[f.fieldname];
		const cols = info && info.fields;
		if (!cols || !cols.length) {
			frappe.msgprint(__("No configurable columns found for this table."));
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
					"<tr><td>" +
					frappe.utils.escape_html(c.label || c.fieldname) +
					' <span class="text-muted" style="font-size:11px">' +
					frappe.utils.escape_html(c.fieldname) +
					'</span></td><td style="text-align:center"><input type="checkbox" class="cf-show" data-fn="' +
					c.fieldname +
					'" ' +
					showChecked +
					'></td><td style="text-align:center"><input type="checkbox" class="cf-man" data-fn="' +
					c.fieldname +
					'" ' +
					manChecked +
					"></td></tr>"
				);
			})
			.join("");

		const d = new frappe.ui.Dialog({
			title: __("Child columns — {0}", [f.label_override || f.label]),
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
				f.selected_child_fields = show.length === cols.length ? "" : JSON.stringify(show);
				f.mandatory_child_fields = man.length ? JSON.stringify(man) : "";
				d.hide();
				this.commit();
				frappe.show_alert({ message: __("Updated child columns"), indicator: "green" });
			},
		});

		d.fields_dict.html.$wrapper.html(
			'<div class="text-muted" style="font-size:12px;margin-bottom:6px">' +
				__("Choose which columns of this table appear, and which are mandatory.") +
				'</div><table class="table table-bordered" style="font-size:12px;margin:0"><thead><tr><th>' +
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
					const [applies_to, fieldname] = key.split("::");
					let f = find_field(this.state, applies_to, fieldname);
					if (!f) {
						const meta = this.lookup[key] || {};
						f = {
							applies_to,
							fieldname,
							label: meta.label || fieldname,
							fieldtype: meta.fieldtype || "Data",
							mandatory: false,
							read_only: false,
							hidden: false,
							label_override: "",
							hiring_type: DEFAULT_HIRING_TYPE,
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
			'<div class="jrfb-brand">' +
				'<span class="jrfb-logo">⚡</span>' +
				'<div><div class="jrfb-title">' +
				__("Form Builder") +
				'</div><div class="jrfb-sub">' +
				(total
					? __("{0} field(s) placed · drag to rearrange", [total])
					: __("Drag fields from the left, or leave empty to serve the full form")) +
				"</div></div></div>"
		);
		const $actions = $('<div class="jrfb-actions"></div>');
		$('<button class="jrfb-btn jrfb-btn-ghost">⟲ ' + __("Load current form") + "</button>")
			.appendTo($actions)
			.on("click", () => this.load_current_form());
		$('<button class="jrfb-btn jrfb-btn-primary">＋ ' + __("Add Tab") + "</button>")
			.appendTo($actions)
			.on("click", () => this.add_tab());
		$h.append($actions);
		return $h;
	}

	render_palette() {
		const $p = $('<div class="jrfb-palette"></div>');
		const $top = $('<div class="jrfb-palette-top"></div>');
		$top.append('<div class="jrfb-palette-title">' + __("Available Fields") + "</div>");
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
		const $scroll = $('<div class="jrfb-groups"></div>');
		Object.keys(this.fields).forEach((group) => {
			const items = (this.fields[group] || []).filter((f) => this.match(f));
			if (!items.length) return;
			$scroll.append(
				'<div class="jrfb-group-head">' +
					frappe.utils.escape_html(group) +
					'<span class="jrfb-group-count">' +
					items.length +
					"</span></div>"
			);
			items.forEach((f) => {
				const placed = this.is_placed(group, f.fieldname);
				const fm = ftmeta(f.fieldtype);
				const $it = $('<div class="jrfb-pitem ' + (placed ? "is-placed" : "") + '" draggable="true"></div>')
					.attr("data-fkey", `${group}::${f.fieldname}`)
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
				$it.append(
					'<span class="jrfb-ptag" style="background:' + fm.c + '1a;color:' + fm.c + '">' +
						fm.t +
						"</span>"
				);
				if (placed) {
					$it.append('<span class="jrfb-check">✓</span>');
				} else {
					$it.on("dblclick", () => this.add_field_to_active(group, f.fieldname));
				}
				$scroll.append($it);
			});
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
		return (
			(f.label || "").toLowerCase().includes(s) ||
			(f.fieldname || "").toLowerCase().includes(s)
		);
	}

	render_canvas() {
		const $c = $('<div class="jrfb-canvas"></div>');

		const $tabs = $('<div class="jrfb-tabs"></div>');
		this.state.tabs.forEach((tab, tabIdx) => {
			const n = tab.sections.reduce((a, s) => a + s.fields.length, 0);
			const $pill = $(
				'<div class="jrfb-pill ' + (tab.id === this.state.activeTab ? "active" : "") + '"></div>'
			).attr("data-tabid", tab.id);
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
			// Tab sequence drives the order the API emits its tabs in, so it needs
			// to be settable here and not only by dragging.
			this.move_btn(
				$pill,
				"‹",
				__("Move tab left"),
				tabIdx === 0,
				() => this.move_tab(tab, "left"),
				true
			);
			this.move_btn(
				$pill,
				"›",
				__("Move tab right"),
				tabIdx === this.state.tabs.length - 1,
				() => this.move_tab(tab, "right"),
				true
			);
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
			$empty.append('<div class="jrfb-empty-title">' + __("Start building your form") + "</div>");
			$empty.append(
				'<div class="jrfb-empty-sub">' +
					__("Add a tab, then drag fields into it. Leave the builder empty to serve the complete Job Requisition form.") +
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
		const $s = $('<div class="jrfb-section"></div>').attr("data-secid", sec.id);
		const $head = $('<div class="jrfb-sec-head"></div>');
		$head.append(
			'<span class="jrfb-sec-grip" title="' +
				__("Drag to reorder section") +
				'">⠿</span><span class="jrfb-sec-title">' +
				frappe.utils.escape_html(sec.title || __("Untitled section")) +
				'</span><span class="jrfb-sec-count">' +
				sec.fields.length +
				"</span>"
		);

		// Section placement. The whole section moves with its fields, and the
		// order written to `field_overrides` is what the API sorts by — see
		// sync_to_table / _sequence_key. Arrows are disabled at the ends so the
		// control never lies about what it will do.
		const idx = tab.sections.findIndex((s) => s.id === sec.id);
		const first = idx <= 0;
		const last = idx >= tab.sections.length - 1;
		const $ht = $('<span class="jrfb-sec-tools"></span>');
		this.move_btn($ht, "⤒", __("Move section to top"), first, () =>
			this.move_section(tab, sec, "top")
		);
		this.move_btn($ht, "↑", __("Move section up"), first, () =>
			this.move_section(tab, sec, "up")
		);
		this.move_btn($ht, "↓", __("Move section down"), last, () =>
			this.move_section(tab, sec, "down")
		);
		this.move_btn($ht, "⤓", __("Move section to bottom"), last, () =>
			this.move_section(tab, sec, "bottom")
		);
		this.move_btn($ht, "⇄", __("Move section to another tab"), false, () =>
			this.move_section_to_tab(tab, sec)
		);
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
		const fm = ftmeta(f.fieldtype);
		const $chip = $('<div class="jrfb-chip"></div>')
			.attr("data-fkey", `${f.applies_to}::${f.fieldname}`)
			.css("--accent", fm.c);
		if (f.hidden) $chip.addClass("is-hidden");

		$chip.append('<span class="jrfb-grip">⠿</span>');
		const tag =
			f.applies_to === "Parent"
				? ""
				: '<span class="jrfb-chip-src">' + frappe.utils.escape_html(f.applies_to) + "</span>";
		$chip.append(
			'<span class="jrfb-chip-main"><span class="jrfb-chip-label">' +
				frappe.utils.escape_html(f.label_override || f.label) +
				"</span>" +
				tag +
				"</span>"
		);
		if (cint(this.frm.doc.basis_hiring_type)) {
			$chip.append(this.render_hiring_type(f));
		}
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
					[{ fieldname: "label", label: __("Label override"), fieldtype: "Data", default: f.label_override }],
					(v) => {
						f.label_override = v.label || "";
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

	// Per-field Hiring Type picker, shown on each chip only while
	// `basis_hiring_type` is ticked. Writes straight to the field_overrides row.
	render_hiring_type(f) {
		const current = f.hiring_type || DEFAULT_HIRING_TYPE;
		const $sel = $('<select class="jrfb-ht"></select>').attr(
			"title",
			__("Which hiring type shows this field")
		);
		HIRING_TYPES.forEach((t) => {
			$('<option></option>')
				.attr("value", t)
				.prop("selected", t === current)
				.text(__(t))
				.appendTo($sel);
		});
		$sel.addClass(current === "Both" ? "is-both" : current === "Fresher" ? "is-fresher" : "is-lateral");
		$sel.on("change", (e) => {
			f.hiring_type = e.target.value || DEFAULT_HIRING_TYPE;
			this.commit();
		});
		return $sel;
	}

	// Placement button. `disabled` renders it inert rather than hiding it, so the
	// control set doesn't reflow as a section moves between the ends of a tab.
	move_btn($parent, glyph, title, disabled, handler, stop) {
		const $b = $(
			'<span class="jrfb-mini jrfb-move' + (disabled ? " is-disabled" : "") + '"></span>'
		)
			.attr("title", title)
			.text(glyph)
			.appendTo($parent);
		if (disabled) return $b;
		$b.on("click", (e) => {
			if (stop) e.stopPropagation();
			handler();
		});
		return $b;
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
				group: { name: "jrfb", pull: "clone", put: false },
				sort: false,
				filter: ".is-placed, .jrfb-group-head",
				draggable: ".jrfb-pitem",
				animation: 150,
			});
		});

		const self = this;

		// Sections reorder by dragging their grip. `handle` keeps this from
		// competing with the chip sortable nested inside each section, and
		// `draggable` keeps the "+ Add Section" button out of the drag set.
		this.$wrapper.find(".jrfb-sections").each((_, el) => {
			Sortable.create(el, {
				group: "jrfb-sections",
				draggable: ".jrfb-section",
				handle: ".jrfb-sec-grip",
				animation: 150,
				ghostClass: "jrfb-ghost",
				onUpdate() {
					self.sync_sections_from_dom();
				},
			});
		});

		// Tabs reorder by dragging the pill; the mini buttons stay clickable.
		this.$wrapper.find(".jrfb-tabs").each((_, el) => {
			Sortable.create(el, {
				group: "jrfb-tabs",
				draggable: ".jrfb-pill",
				filter: ".jrfb-mini",
				preventOnFilter: false,
				animation: 150,
				ghostClass: "jrfb-ghost",
				onUpdate() {
					self.sync_tabs_from_dom();
				},
			});
		});

		this.$wrapper.find(".jrfb-droplist").each((_, el) => {
			Sortable.create(el, {
				group: { name: "jrfb", pull: true, put: true },
				draggable: ".jrfb-chip, .jrfb-pitem",
				// Don't start a drag from the Hiring Type select — a mousedown on
				// it must reach the native dropdown, not begin dragging the chip.
				filter: ".jrfb-ht",
				preventOnFilter: false,
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

function find_field(state, applies_to, fieldname) {
	for (const tab of state.tabs) {
		for (const sec of tab.sections) {
			const hit = sec.fields.find((f) => f.applies_to === applies_to && f.fieldname === fieldname);
			if (hit) return hit;
		}
	}
	return null;
}

function inject_styles() {
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
.jrfb-btn-ghost { background:rgba(255,255,255,.12); color:#fff; }
.jrfb-btn-ghost:hover { background:rgba(255,255,255,.22); }
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
.jrfb-sec-grip { cursor:grab; opacity:.45; font-size:12px; letter-spacing:-1px; user-select:none; }
.jrfb-sec-grip:active { cursor:grabbing; }
.jrfb-sec-head:hover .jrfb-sec-grip { opacity:.9; }
.jrfb-move { font-size:12px; line-height:1; }
.jrfb-mini.is-disabled { opacity:.18; cursor:default; pointer-events:none; }
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
.jrfb-chip-src { font-size:9px; color:var(--text-muted); background:var(--subtle-fg,#eef0f2); border-radius:5px; padding:2px 6px; }
.jrfb-chip-tools { display:flex; align-items:center; gap:5px; }
.jrfb-ht { flex:0 0 auto; border:1px solid var(--border-color); border-radius:5px; padding:2px 4px; font-size:10px; font-weight:700; cursor:pointer; background:var(--card-bg,#fff); color:var(--text-muted); height:20px; line-height:1; outline:none; }
.jrfb-ht:hover { border-color:#2490ef; }
.jrfb-ht.is-lateral { background:#2490ef1a; color:#2490ef; border-color:#2490ef59; }
.jrfb-ht.is-fresher { background:#21a3661a; color:#21a366; border-color:#21a36659; }
.jrfb-ht.is-both { background:#8a3ffc1a; color:#8a3ffc; border-color:#8a3ffc59; }
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
