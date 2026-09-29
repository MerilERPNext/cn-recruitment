// Copyright (c) 2026, NextAI and contributors
// For license information, please see license.txt

// Direct Applicant Form — visual form builder.
// ---------------------------------------------
// Left: every Job Applicant field a candidate may fill (Job Applicant Profile
// Settings + the Aadhaar fields — the server decides, see
// recruitment.api.direct_applicant_fields.get_catalog_options), grouped and
// searchable. Right: the form's sections. Drag a field (or click it) into a
// section, drag to reorder fields and sections, tick Required, pick a table's
// columns. The builder only reads / writes the `fields` child table (row order
// = display order, `section` = heading), which stays under "Advanced".

frappe.ui.form.on("Direct Applicant Form", {
	refresh(frm) {
		load_catalog(frm).then(() => mount_builder(frm));
	},
	after_save(frm) {
		// The server fills labels / types / default sections on save.
		if (frm._dafb) {
			frm._dafb.init_from_table();
			frm._dafb.render();
		}
	},
});

frappe.ui.form.on("Direct Applicant Form Field", {
	fieldname(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		const entry = (frm._da_catalog || {})[row.fieldname];
		frappe.model.set_value(cdt, cdn, "label", entry ? entry.label : "");
		frappe.model.set_value(cdt, cdn, "fieldtype", entry ? entry.description : "");
		if (entry && !row.section) frappe.model.set_value(cdt, cdn, "section", entry.section);
	},
	// Hand edits in the raw table redraw the builder.
	fields_remove(frm) {
		if (frm._dafb) { frm._dafb.init_from_table(); frm._dafb.render(); }
	},
});

function load_catalog(frm) {
	if (frm._da_catalog) return Promise.resolve();
	return frappe.call({ method: "recruitment.api.direct_applicant_fields.get_catalog_options" }).then((r) => {
		const options = r.message || [];
		frm._da_catalog_list = options;
		frm._da_catalog = {};
		options.forEach((o) => { frm._da_catalog[o.value] = o; });
		frm.fields_dict.fields.grid.update_docfield_property(
			"fieldname", "options",
			options.map((o) => ({ value: o.value, label: `${o.label} — ${o.value}`, description: o.description }))
		);
	});
}

function mount_builder(frm) {
	const field = frm.get_field("builder_html");
	if (!field || !field.$wrapper) return;
	inject_dafb_styles();
	frm._dafb = new DAFormBuilder(frm, field.$wrapper);
	frm._dafb.init_from_table();
	frm._dafb.render();
}

const DAFB_TABLE_TYPES = ["Table", "Table MultiSelect"];
const DAFB_TYPE_COLORS = {
	Table: "#8a3ffc", Link: "#2490ef", Select: "#0f9d58", Attach: "#e8710a", "Attach Image": "#e8710a",
	Date: "#c2185b", Check: "#5f6368",
};

class DAFormBuilder {
	constructor(frm, $wrapper) {
		this.frm = frm;
		this.$wrapper = $wrapper;
		this.catalog = frm._da_catalog || {};
		this.list = frm._da_catalog_list || [];
		this.sections = [];
		this.search = "";
		this.uid = 0;
	}

	nid() {
		this.uid += 1;
		return `s${this.uid}`;
	}

	// ------------------------------------------------------------- state --
	init_from_table() {
		const rows = (this.frm.doc.fields || []).slice().sort((a, b) => (a.idx || 0) - (b.idx || 0));
		const byTitle = {};
		this.sections = [];
		rows.forEach((row) => {
			if (!row.fieldname) return;
			const entry = this.catalog[row.fieldname] || {};
			const title = row.section || entry.section || __("Details");
			if (!byTitle[title]) {
				byTitle[title] = { id: this.nid(), title, fields: [] };
				this.sections.push(byTitle[title]);
			}
			byTitle[title].fields.push({
				fieldname: row.fieldname,
				label: row.label || entry.label || row.fieldname,
				fieldtype: row.fieldtype || entry.description || "Data",
				mandatory: !!row.mandatory,
				child_fields: row.child_fields || "",
				mandatory_child_fields: row.mandatory_child_fields || "",
			});
		});
	}

	commit() {
		const frm = this.frm;
		frm.clear_table("fields");
		const written = {};
		this.sections.forEach((sec) => {
			sec.fields.forEach((f) => {
				if (written[f.fieldname]) return;
				written[f.fieldname] = true;
				frm.add_child("fields", {
					fieldname: f.fieldname,
					label: f.label,
					fieldtype: f.fieldtype,
					section: sec.title,
					mandatory: f.mandatory ? 1 : 0,
					child_fields: f.child_fields || "",
					mandatory_child_fields: f.mandatory_child_fields || "",
				});
			});
		});
		frm.refresh_field("fields");
		frm.dirty();
		this.render();
	}

	placed(fieldname) {
		return this.sections.some((s) => s.fields.some((f) => f.fieldname === fieldname));
	}

	field_from_catalog(fieldname) {
		const entry = this.catalog[fieldname] || {};
		return {
			fieldname,
			label: entry.label || fieldname,
			fieldtype: entry.description || "Data",
			mandatory: false,
			child_fields: "",
			mandatory_child_fields: "",
		};
	}

	// ---------------------------------------------------------- mutations --
	add_field(fieldname, section) {
		if (this.placed(fieldname)) return;
		let sec = section;
		if (!sec) {
			const entry = this.catalog[fieldname] || {};
			// Click-to-add: into the section of the same name, else the last one.
			sec = this.sections.find((s) => s.title === entry.section) || this.sections[this.sections.length - 1];
			if (!sec) {
				sec = { id: this.nid(), title: entry.section || __("Details"), fields: [] };
				this.sections.push(sec);
			}
		}
		sec.fields.push(this.field_from_catalog(fieldname));
		this.commit();
	}

	add_section() {
		frappe.prompt(
			[{ fieldname: "title", label: __("Section heading"), fieldtype: "Data", reqd: 1 }],
			(v) => {
				this.sections.push({ id: this.nid(), title: v.title, fields: [] });
				this.render();
			},
			__("Add Section"), __("Add")
		);
	}

	rename_section(sec) {
		frappe.prompt(
			[{ fieldname: "title", label: __("Section heading"), fieldtype: "Data", reqd: 1, default: sec.title }],
			(v) => { sec.title = v.title; this.commit(); },
			__("Rename Section"), __("Save")
		);
	}

	remove_section(sec) {
		const drop = () => {
			this.sections = this.sections.filter((s) => s !== sec);
			this.commit();
		};
		if (!sec.fields.length) return drop();
		frappe.confirm(__("Remove section {0} and its {1} field(s)?", [sec.title, sec.fields.length]), drop);
	}

	remove_field(sec, f) {
		sec.fields = sec.fields.filter((x) => x !== f);
		this.commit();
	}

	edit_columns(f) {
		const columns = (this.catalog[f.fieldname] || {}).child_fields || [];
		if (!columns.length) {
			frappe.msgprint(__("This table has no columns a candidate can fill."));
			return;
		}
		const split = (v) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
		const shown = split(f.child_fields);
		const required = split(f.mandatory_child_fields);
		const d = new frappe.ui.Dialog({
			title: __("Columns — {0}", [f.label]),
			size: "large",
			fields: [
				{ fieldtype: "HTML", options: `<p class="text-muted">${__("Tick the columns the candidate fills. None ticked = every column.")}</p>` },
				{
					fieldname: "shown", fieldtype: "MultiCheck", label: __("Show"), columns: 2,
					options: columns.map((c) => ({ label: c.label, value: c.fieldname, checked: shown.includes(c.fieldname) })),
				},
				{
					fieldname: "required", fieldtype: "MultiCheck", label: __("Required in every row"), columns: 2,
					options: columns.map((c) => ({ label: c.label, value: c.fieldname, checked: required.includes(c.fieldname) })),
				},
			],
			primary_action_label: __("Apply"),
			primary_action: (v) => {
				const show = v.shown || [];
				// A required column is always shown.
				const req = (v.required || []);
				f.child_fields = show.length ? Array.from(new Set(show.concat(req))).join(", ") : "";
				f.mandatory_child_fields = req.join(", ");
				d.hide();
				this.commit();
			},
		});
		d.show();
	}

	// DOM order -> state, after a drag.
	sync_from_dom() {
		const bySec = {};
		this.sections.forEach((s) => { bySec[s.id] = s; });
		const lookup = {};
		this.sections.forEach((s) => s.fields.forEach((f) => { lookup[f.fieldname] = f; }));
		const order = [];
		this.$wrapper.find(".dafb-section").each((_, secEl) => {
			const sec = bySec[secEl.dataset.id];
			if (!sec) return;
			order.push(sec);
			sec.fields = [];
			$(secEl).find(".dafb-droplist > [data-fieldname]").each((__, el) => {
				const name = el.dataset.fieldname;
				if (sec.fields.some((f) => f.fieldname === name)) return;
				sec.fields.push(lookup[name] || this.field_from_catalog(name));
			});
		});
		this.sections = order;
		this.commit();
	}

	// ------------------------------------------------------------- render --
	render() {
		const $w = this.$wrapper.empty();
		const $root = $(`<div class="dafb">
			<div class="dafb-palette">
				<div class="dafb-head">${__("Available Fields")}</div>
				<input type="text" class="form-control input-xs dafb-search" placeholder="${__("Search fields")}">
				<div class="dafb-groups"></div>
			</div>
			<div class="dafb-canvas">
				<div class="dafb-head">${__("Form")} <span class="text-muted">· ${__("{0} field(s)", [this.count()])}</span></div>
				<div class="dafb-sections"></div>
				<button class="btn btn-default btn-xs dafb-add-section">+ ${__("Add Section")}</button>
			</div>
		</div>`).appendTo($w);
		$root.find(".dafb-search").val(this.search).on("input", (e) => {
			this.search = e.target.value;
			this.render_palette($root.find(".dafb-groups"));
			this.wire_palette($root.find(".dafb-groups"));
		});
		$root.find(".dafb-add-section").on("click", () => this.add_section());
		this.render_palette($root.find(".dafb-groups"));
		this.render_sections($root.find(".dafb-sections"));
		this.wire_palette($root.find(".dafb-groups"));
		this.wire_canvas($root);
	}

	count() {
		return this.sections.reduce((n, s) => n + s.fields.length, 0);
	}

	render_palette($groups) {
		$groups.empty();
		const q = this.search.trim().toLowerCase();
		const groups = {};
		this.list.forEach((o) => {
			if (q && !`${o.label} ${o.value}`.toLowerCase().includes(q)) return;
			const g = o.section || __("Other");
			(groups[g] = groups[g] || []).push(o);
		});
		Object.keys(groups).forEach((g) => {
			const $list = $(`<div class="dafb-plist"></div>`);
			groups[g].forEach((o) => {
				const placed = this.placed(o.value);
				$(`<div class="dafb-pitem ${placed ? "is-placed" : ""}" data-fieldname="${frappe.utils.escape_html(o.value)}"
					title="${placed ? __("Already on the form") : __("Drag into a section, or click to add")}">
					${type_badge(o.description)}<span>${frappe.utils.escape_html(o.label)}</span>
				</div>`).appendTo($list);
			});
			$(`<div class="dafb-group"><div class="dafb-group-head">${frappe.utils.escape_html(g)}</div></div>`)
				.append($list).appendTo($groups);
		});
		if (!Object.keys(groups).length) $groups.html(`<div class="text-muted small">${__("No fields match.")}</div>`);
	}

	render_sections($sections) {
		$sections.empty();
		if (!this.sections.length) {
			$sections.html(`<div class="dafb-empty">${__("Add a section, then drag fields into it — or click a field on the left.")}</div>`);
			return;
		}
		this.sections.forEach((sec) => {
			const $sec = $(`<div class="dafb-section" data-id="${sec.id}">
				<div class="dafb-sec-head">
					<span class="dafb-grip" title="${__("Drag to reorder")}">⋮⋮</span>
					<b>${frappe.utils.escape_html(sec.title)}</b>
					<span class="dafb-sec-actions">
						<a class="dafb-rename">${__("Rename")}</a> · <a class="dafb-remove-sec">${__("Remove")}</a>
					</span>
				</div>
				<div class="dafb-droplist"></div>
			</div>`).appendTo($sections);
			$sec.find(".dafb-rename").on("click", () => this.rename_section(sec));
			$sec.find(".dafb-remove-sec").on("click", () => this.remove_section(sec));
			const $drop = $sec.find(".dafb-droplist");
			if (!sec.fields.length) $drop.append(`<div class="dafb-drop-hint">${__("Drop fields here")}</div>`);
			sec.fields.forEach((f) => $drop.append(this.chip(sec, f)));
		});
	}

	chip(sec, f) {
		const is_table = DAFB_TABLE_TYPES.includes(f.fieldtype);
		const cols = (f.child_fields || "").split(",").filter((x) => x.trim()).length;
		const $c = $(`<div class="dafb-chip" data-fieldname="${frappe.utils.escape_html(f.fieldname)}">
			<span class="dafb-grip">⋮⋮</span>
			${type_badge(f.fieldtype)}
			<span class="dafb-chip-label">${frappe.utils.escape_html(f.label)}</span>
			<span class="dafb-chip-actions">
				${is_table ? `<a class="dafb-cols">${cols ? __("{0} column(s)", [cols]) : __("All columns")}</a>` : ""}
				<span class="dafb-tg ${f.mandatory ? "on" : ""}" title="${__("Required")}">${__("Required")}</span>
				<a class="dafb-x" title="${__("Remove")}">&times;</a>
			</span>
		</div>`);
		$c.find(".dafb-tg").on("click", () => { f.mandatory = !f.mandatory; this.commit(); });
		$c.find(".dafb-x").on("click", () => this.remove_field(sec, f));
		$c.find(".dafb-cols").on("click", () => this.edit_columns(f));
		return $c;
	}

	wire_palette($groups) {
		$groups.find(".dafb-pitem:not(.is-placed)").on("click", (e) => {
			this.add_field(e.currentTarget.dataset.fieldname);
		});
		const Sortable = window.Sortable;
		if (!Sortable) return;
		$groups.find(".dafb-plist").each((_, el) => {
			Sortable.create(el, {
				group: { name: "dafb", pull: "clone", put: false },
				sort: false,
				filter: ".is-placed",
				draggable: ".dafb-pitem",
				animation: 150,
			});
		});
	}

	wire_canvas($root) {
		const Sortable = window.Sortable;
		if (!Sortable) return;
		const self = this;
		Sortable.create($root.find(".dafb-sections")[0], {
			draggable: ".dafb-section",
			handle: ".dafb-sec-head .dafb-grip",
			animation: 150,
			ghostClass: "dafb-ghost",
			onUpdate() { self.sync_from_dom(); },
		});
		$root.find(".dafb-droplist").each((_, el) => {
			Sortable.create(el, {
				group: { name: "dafb", pull: true, put: true },
				draggable: ".dafb-chip, .dafb-pitem",
				filter: ".dafb-tg, .dafb-x, .dafb-cols",
				preventOnFilter: false,
				animation: 150,
				ghostClass: "dafb-ghost",
				onAdd() { self.sync_from_dom(); },
				onUpdate() { self.sync_from_dom(); },
			});
		});
	}
}

function type_badge(ft) {
	const color = DAFB_TYPE_COLORS[ft] || "#9aa0a6";
	return `<span class="dafb-type" style="border-color:${color};color:${color}">${frappe.utils.escape_html(ft || "")}</span>`;
}

function inject_dafb_styles() {
	if (document.getElementById("dafb-styles")) return;
	const css = `
	.dafb { display: grid; grid-template-columns: minmax(220px, 300px) 1fr; gap: 16px; }
	@media (max-width: 768px) { .dafb { grid-template-columns: 1fr; } }
	.dafb-head { font-weight: 600; margin-bottom: 8px; }
	.dafb-palette { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; max-height: 620px; overflow: auto; }
	.dafb-search { margin-bottom: 8px; }
	.dafb-group { margin-bottom: 10px; }
	.dafb-group-head { font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
	.dafb-pitem { display: flex; gap: 6px; align-items: center; padding: 5px 8px; border: 1px solid var(--border-color);
		border-radius: 6px; margin-bottom: 4px; cursor: grab; background: var(--card-bg); font-size: 12px; }
	.dafb-pitem:hover { border-color: var(--primary); }
	.dafb-pitem.is-placed { opacity: .45; cursor: default; }
	.dafb-canvas { min-width: 0; }
	.dafb-section { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 12px; background: var(--subtle-fg); }
	.dafb-sec-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
	.dafb-sec-actions { margin-left: auto; font-size: 12px; }
	.dafb-sec-actions a { cursor: pointer; }
	.dafb-grip { cursor: grab; color: var(--text-muted); user-select: none; }
	.dafb-droplist { min-height: 38px; }
	.dafb-drop-hint, .dafb-empty { color: var(--text-muted); font-size: 12px; padding: 10px; text-align: center;
		border: 1px dashed var(--border-color); border-radius: 6px; }
	.dafb-chip { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--border-color);
		border-radius: 6px; margin-bottom: 6px; background: var(--card-bg); font-size: 13px; }
	.dafb-chip-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.dafb-chip-actions { display: flex; gap: 8px; align-items: center; font-size: 12px; }
	.dafb-chip-actions a { cursor: pointer; }
	.dafb-x { font-size: 16px; color: var(--text-muted); }
	.dafb-tg { cursor: pointer; padding: 1px 8px; border-radius: 10px; border: 1px solid var(--border-color); color: var(--text-muted); }
	.dafb-tg.on { background: var(--red-100, #fde2e2); border-color: var(--red-400, #f87171); color: var(--red-600, #dc2626); }
	.dafb-type { font-size: 10px; border: 1px solid; border-radius: 4px; padding: 0 4px; white-space: nowrap; }
	.dafb-ghost { opacity: .4; }
	`;
	$("<style id='dafb-styles'>").text(css).appendTo("head");
}
