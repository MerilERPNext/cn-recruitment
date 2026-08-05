/* global frappe */
/**
 * interview_round_link.js
 *
 * Hiring workflow — an **Interview** stage must name a real interview round.
 *
 * Campus (and the stage → Interview integration generally) maps a scheduled
 * Interview back to its hiring stage *by name only*, so a free-typed stage name
 * silently breaks the mapping. This retypes the stage/round name cell of a
 * hiring-workflow grid into a Link picker for rows whose type is "Interview",
 * and leaves it as plain Data for every other stage type (Screening, Offer, …)
 * which are not interviews and have no doctype to link to.
 *
 * The target doctype is NOT hardcoded: HRMS v15 links an Interview to
 * "Interview Round" (`Interview.interview_round`) while v16 renamed the field to
 * `interview_type` and points it at "Interview Type". The server resolves which
 * one this site actually has — see
 * `recruitment.api.hiring_stage.get_interview_round_doctype` — so the picker
 * works unchanged on both versions.
 *
 * Only the *client-side* docfield copy of the row is retyped (the official
 * per-row `frm.set_df_property(..., docname, table_field, table_row_name)` API).
 * The stored DocType field stays `Data`, so nothing is link-validated on save
 * and existing stage names — including any that predate this picker — keep
 * saving exactly as before.
 */

frappe.provide("recruitment.interview_round_link");

(function () {
	const IRL = recruitment.interview_round_link;

	// undefined = not fetched yet, null = this site has no round doctype.
	IRL._doctype = undefined;
	IRL._pending = null;

	/** Resolve (once per page load) the doctype an Interview links its round to. */
	IRL.doctype = function () {
		if (IRL._doctype !== undefined) return Promise.resolve(IRL._doctype);
		if (IRL._pending) return IRL._pending;
		IRL._pending = frappe
			.call({ method: "recruitment.api.hiring_stage.get_interview_round_doctype" })
			.then((r) => {
				IRL._doctype = (r && r.message) || null;
				IRL._pending = null;
				return IRL._doctype;
			})
			.catch(() => {
				IRL._doctype = null;
				IRL._pending = null;
				return null;
			});
		return IRL._pending;
	};

	function isInterview(row, opts) {
		return (row && (row[opts.type_field] || "").trim()) === "Interview";
	}

	/** The child doctype the grid's rows belong to, per the grid's own docfields. */
	function child_doctype(grid, fieldname) {
		const df = (grid.docfields || []).find((d) => d && d.fieldname === fieldname);
		return df ? df.parent : null;
	}

	/**
	 * Rebuild the on-grid control after its docfield was retyped.
	 *
	 * A grid cell's control is created ONCE — `grid_row.make_control()` returns
	 * early while `column.field` exists, and `refresh_field()` only re-renders the
	 * value — so a fieldtype change alone never reaches a row the user has already
	 * clicked into. Dropping the control makes the row build a fresh one from the
	 * updated docfield. The expanded row form needs no such treatment: it rebuilds
	 * its whole layout from the row's docfields on every open, so it only gets a
	 * re-render while it happens to be open right now.
	 */
	function rebuild_control(grid, fieldname, cdn) {
		const gridRow = grid.grid_rows_by_docname && grid.grid_rows_by_docname[cdn];
		if (!gridRow) return;

		const column = gridRow.columns && gridRow.columns[fieldname];
		if (column && column.field) {
			const i = (gridRow.on_grid_fields || []).indexOf(column.field);
			if (i >= 0) gridRow.on_grid_fields.splice(i, 1);
			delete gridRow.on_grid_fields_dict[fieldname];
			if (column.field_area) column.field_area.empty();
			column.field = null;
			column.attr("data-fieldtype", column.df.fieldtype);
			gridRow.make_control(column);
		}
		gridRow.refresh_field(fieldname);

		if (gridRow.grid_form && grid.open_grid_row === gridRow.grid_form) {
			gridRow.grid_form.render();
		}
	}

	/**
	 * Retype ONE grid row's name cell.
	 * @param {object} opts {grid, name_field, type_field}
	 */
	IRL.apply_row = function (frm, opts, row, roundDoctype) {
		if (!row || !row.name) return;
		const gridField = frm.fields_dict[opts.grid];
		if (!gridField || !gridField.grid) return;

		const childDoctype = child_doctype(gridField.grid, opts.name_field);
		if (!childDoctype) return;

		// Seed this row's docfield copy from the grid's own docfields — the same
		// source grid_row.set_docfields() uses — so a row we reach before it has
		// rendered still inherits any grid-level docfield customisation.
		const df = frappe.meta.get_docfield_copy(childDoctype, row.name, gridField.grid.docfields)[
			opts.name_field
		];
		if (!df) return;

		const asLink = !!roundDoctype && isInterview(row, opts);
		const fieldtype = asLink ? "Link" : "Data";
		const options = asLink ? roundDoctype : "";
		if (df.fieldtype === fieldtype && (df.options || "") === options) return;

		const set = (prop, value) =>
			frm.set_df_property(opts.grid, prop, value, frm.doc.name, opts.name_field, row.name);

		// `options` first when linking, so the control never exists as a Link with
		// nothing to look up; cleared last when going back to plain text.
		if (asLink) {
			set("options", options);
			set("fieldtype", fieldtype);
		} else {
			set("fieldtype", fieldtype);
			set("options", options);
		}
		rebuild_control(gridField.grid, opts.name_field, row.name);
	};

	/** Retype every row of the grid. Safe to call on any refresh. */
	IRL.sync = function (frm, opts) {
		if (!frm.fields_dict[opts.grid] || !frm.fields_dict[opts.grid].grid) return;
		IRL.doctype().then((roundDoctype) => {
			(frm.doc[opts.grid] || []).forEach((row) => IRL.apply_row(frm, opts, row, roundDoctype));
		});
	};

	/** Retype a single row by its child docname (row-level triggers). */
	IRL.sync_row = function (frm, opts, cdt, cdn) {
		const row = frappe.get_doc(cdt, cdn);
		if (!row) return;
		IRL.doctype().then((roundDoctype) => IRL.apply_row(frm, opts, row, roundDoctype));
	};
})();
