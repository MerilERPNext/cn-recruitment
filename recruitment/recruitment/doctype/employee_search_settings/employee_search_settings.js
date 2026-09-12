// Copyright (c) 2026, hybrowlabs and contributors
// For license information, please see license.txt

// Fieldtypes that hold no value in the Employee table, so there is nothing to
// search on. Mirrors no_value_fields (plus Password) on the server.
const UNSEARCHABLE_FIELDTYPES = [
	"Section Break",
	"Column Break",
	"Tab Break",
	"HTML",
	"Table",
	"Table MultiSelect",
	"Button",
	"Image",
	"Fold",
	"Heading",
	"Password",
];

// Employee carries well over a thousand custom fields on some sites; rendering
// every checkbox at once makes the dialog crawl, so the list is capped and the
// search box is how you reach the rest.
const MAX_VISIBLE_FIELDS = 150;

const ID_FIELD = {
	fieldname: "name",
	label: __("Employee ID"),
	fieldtype: "Data",
	options: "",
};

frappe.ui.form.on("Employee Search Settings", {
	refresh(frm) {
		frm.trigger("toggle_empty_state_message");
	},

	toggle_empty_state_message(frm) {
		frm.dashboard.clear_comment();
		if (!(frm.doc.search_fields || []).length) {
			frm.dashboard.add_comment(
				__("No fields configured - employee search falls back to its defaults: ID, name, department, designation, branch and company."),
				"blue",
				true
			);
		}
	},

	select_fields_btn(frm) {
		frappe.model.with_doctype("Employee", () => {
			open_field_picker(frm);
		});
	},

	load_defaults_btn(frm) {
		frappe.call({
			method: "recruitment.recruitment.doctype.employee_search_settings.employee_search_settings.get_default_search_fields",
			freeze: true,
			callback(r) {
				if (!r.message) return;

				frm.clear_table("search_fields");
				r.message.forEach((row) => frm.add_child("search_fields", row));
				frm.refresh_field("search_fields");
				frm.trigger("toggle_empty_state_message");
			},
		});
	},
});

function open_field_picker(frm) {
	const meta = frappe.get_meta("Employee");
	if (!meta) {
		frappe.msgprint(__("Could not load Employee metadata"));
		return;
	}

	// fieldname -> { link_field }, seeded from what is already in the table so
	// reopening the dialog doesn't lose the linked field someone picked.
	const selection = {};
	(frm.doc.search_fields || []).forEach((row) => {
		selection[row.field_name] = { link_field: row.link_field || "" };
	});

	const fields = [ID_FIELD].concat(
		meta.fields
			.filter(
				(df) =>
					!UNSEARCHABLE_FIELDTYPES.includes(df.fieldtype) &&
					!df.is_virtual &&
					!cint(df.permlevel)
			)
			.map((df) => ({
				fieldname: df.fieldname,
				label: df.label || df.fieldname,
				fieldtype: df.fieldtype,
				options: df.fieldtype === "Link" ? df.options || "" : "",
			}))
	);

	const link_fields_cache = {};

	const dialog = new frappe.ui.Dialog({
		title: __("Select Employee Search Fields"),
		size: "large",
		fields: [{ fieldtype: "HTML", fieldname: "fields_html" }],
		primary_action_label: __("Update"),
		primary_action() {
			apply_selection(frm, fields, selection);
			dialog.hide();
		},
	});

	dialog.fields_dict.fields_html.$wrapper.html(`
		<div class="employee-search-field-picker">
			<div class="mb-3">
				<input type="text" class="form-control field-search" placeholder="${__("Search fields...")}">
			</div>
			<div class="mb-2">
				<button class="btn btn-xs btn-default select-visible">${__("Select Visible")}</button>
				<button class="btn btn-xs btn-default deselect-visible">${__("Deselect Visible")}</button>
				<span class="text-muted small ml-2 field-count"></span>
			</div>
			<div class="fields-container" style="max-height: 420px; overflow-y: auto;"></div>
		</div>
	`);

	const $wrapper = dialog.$wrapper;
	const $container = $wrapper.find(".fields-container");
	const $count = $wrapper.find(".field-count");

	function visible_fields(term) {
		const clean = (term || "").trim().toLowerCase();
		const matches = fields.filter(
			(f) =>
				!clean ||
				f.label.toLowerCase().includes(clean) ||
				f.fieldname.toLowerCase().includes(clean)
		);

		// Always keep the already-selected fields in view, whatever the filter is.
		const selected = matches.filter((f) => f.fieldname in selection);
		const rest = matches.filter((f) => !(f.fieldname in selection));

		return {
			total: matches.length,
			shown: selected.concat(rest).slice(0, MAX_VISIBLE_FIELDS),
		};
	}

	function render(term) {
		const { total, shown } = visible_fields(term);
		const esc = frappe.utils.escape_html;

		$container.html(
			shown
				.map((f) => {
					const checked = f.fieldname in selection;
					const is_link = f.fieldtype === "Link" && f.options;

					return `
						<div class="field-item checkbox" data-fieldname="${esc(f.fieldname)}">
							<label class="mb-0">
								<input type="checkbox" class="field-checkbox" data-fieldname="${esc(f.fieldname)}" ${checked ? "checked" : ""}>
								<span class="label-area">${esc(f.label)}</span>
								<span class="text-muted small"> (${esc(f.fieldname)} - ${esc(f.fieldtype)}${
									is_link ? " &rarr; " + esc(f.options) : ""
								})</span>
							</label>
							${
								is_link
									? `<div class="link-field-selector ml-4 mt-1 ${checked ? "" : "hide"}">
											<select class="form-control form-control-sm link-field" data-fieldname="${esc(f.fieldname)}" data-link-doctype="${esc(f.options)}" style="max-width: 280px;">
												<option value="">${__("Search the ID")}</option>
											</select>
											<small class="text-muted">${__("Field on {0} to search and show instead of the ID", [esc(f.options)])}</small>
										</div>`
									: ""
							}
						</div>
					`;
				})
				.join("")
		);

		$count.text(
			total > shown.length
				? __("Showing {0} of {1} fields - type to narrow down", [shown.length, total])
				: __("{0} fields", [total])
		);

		// Only the selected rows need their linked-field dropdown filled; each one
		// costs a meta fetch for the doctype it points to.
		$container.find(".link-field-selector:not(.hide) select.link-field").each(function () {
			populate_link_fields($(this));
		});
	}

	function populate_link_fields($select) {
		const fieldname = $select.data("fieldname");
		const link_doctype = $select.data("link-doctype");

		const fill = ($el, link_fields) => {
			if ($el.find("option").length > 1) return;

			const esc = frappe.utils.escape_html;
			link_fields.forEach((df) => {
				$el.append(
					`<option value="${esc(df.fieldname)}">${esc(df.label)} (${esc(df.fieldname)})</option>`
				);
			});
			$el.val((selection[fieldname] || {}).link_field || "");
		};

		if (link_fields_cache[link_doctype]) {
			fill($select, link_fields_cache[link_doctype]);
			return;
		}

		frappe.model.with_doctype(link_doctype, () => {
			const link_meta = frappe.get_meta(link_doctype);
			link_fields_cache[link_doctype] = (link_meta ? link_meta.fields : [])
				.filter(
					(df) =>
						!UNSEARCHABLE_FIELDTYPES.includes(df.fieldtype) &&
						!df.is_virtual &&
						!cint(df.permlevel)
				)
				.map((df) => ({ fieldname: df.fieldname, label: df.label || df.fieldname }));

			// The list may have re-rendered while the meta was loading.
			$container.find(`select.link-field[data-fieldname="${fieldname}"]`).each(function () {
				fill($(this), link_fields_cache[link_doctype]);
			});
		});
	}

	$wrapper.on("change", ".field-checkbox", function () {
		const fieldname = $(this).data("fieldname");
		const $item = $(this).closest(".field-item");

		if ($(this).is(":checked")) {
			selection[fieldname] = selection[fieldname] || { link_field: "" };
		} else {
			delete selection[fieldname];
		}

		const $selector = $item.find(".link-field-selector");
		$selector.toggleClass("hide", !$(this).is(":checked"));

		if ($(this).is(":checked") && $selector.length) {
			populate_link_fields($selector.find("select.link-field"));
		}
	});

	$wrapper.on("change", "select.link-field", function () {
		const fieldname = $(this).data("fieldname");
		if (selection[fieldname]) {
			selection[fieldname].link_field = $(this).val() || "";
		}
	});

	const $search = $wrapper.find(".field-search");
	$search.on(
		"input",
		frappe.utils.debounce(() => render($search.val()), 200)
	);

	$wrapper.find(".select-visible").on("click", (e) => {
		e.preventDefault();
		$container.find(".field-checkbox:not(:checked)").prop("checked", true).trigger("change");
	});

	$wrapper.find(".deselect-visible").on("click", (e) => {
		e.preventDefault();
		$container.find(".field-checkbox:checked").prop("checked", false).trigger("change");
	});

	render("");
	dialog.show();
}

function apply_selection(frm, fields, selection) {
	// Keep the flags an admin already set on rows that survive this edit.
	const existing = {};
	(frm.doc.search_fields || []).forEach((row) => {
		existing[row.field_name] = row;
	});

	const rows = fields
		.filter((f) => f.fieldname in selection)
		.map((f) => {
			const previous = existing[f.fieldname];
			const link_field = f.options ? selection[f.fieldname].link_field || "" : "";

			return {
				field_name: f.fieldname,
				field_label: previous ? previous.field_label : f.label,
				field_type: f.fieldtype,
				link_doctype: link_field ? f.options : "",
				link_field: link_field,
				searchable: previous ? previous.searchable : 1,
				show_in_result: previous ? previous.show_in_result : 0,
			};
		});

	frm.clear_table("search_fields");
	rows.forEach((row) => frm.add_child("search_fields", row));
	frm.refresh_field("search_fields");
	frm.trigger("toggle_empty_state_message");
}
