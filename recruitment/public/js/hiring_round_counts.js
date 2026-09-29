/* global frappe, __ */
/**
 * hiring_round_counts.js
 *
 * Hiring workflow — "Rounds per Stage": how many Shortlisting, Screening and
 * Interview rounds a workflow runs, set as three numbers above the stages grid.
 * Used by the Job Opening (Hiring workflow tab) and the TA Interview Strategy
 * Template.
 *
 * The grid rows stay the source of truth — each round is still one row, with its
 * own name, panel and mandatory flag. Editing a number grows or shrinks the rows
 * of that type; editing the grid by hand (or prefilling it from a template)
 * re-counts. The counts are also recomputed server-side on save
 * (recruitment.api.hiring_stage.set_round_counts), so they never drift.
 */

frappe.provide("recruitment.hiring_round_counts");

(function () {
	const HRC = recruitment.hiring_round_counts;

	// Round types in pipeline order, with the counter field and the name a new
	// round of that type gets ("Screening Round 2").
	const TYPES = [
		{ type: "Shortlist", field: "no_of_shortlisting_rounds", label: "Shortlisting" },
		{ type: "Screening", field: "no_of_screening_rounds", label: "Screening" },
		{ type: "Interview", field: "no_of_interview_rounds", label: "Interview" },
	];

	// Stages that close the workflow — new rounds always go before these.
	const TERMINAL = ["Pre Offer", "Offer", "Done"];

	const CONFIGS = {
		"Job Opening": {
			grid: "custom_hiring_stages",
			child: "Job Opening Hiring Stage",
			type_field: "stage_type",
			name_field: "stage_name",
			prefix: "custom_",
		},
		"TA Interview Strategy Template": {
			grid: "interview_rounds",
			child: "TA Interview Strategy Round",
			type_field: "step_type",
			name_field: "round_name",
			prefix: "",
			// A template round with no step type runs as Screening (see
			// _stage_type_for_round on the server).
			blank_type: "Screening",
		},
	};

	function rowType(cfg, row) {
		return (row[cfg.type_field] || "").trim() || cfg.blank_type || "";
	}

	function rowsOf(frm, cfg, type) {
		return (frm.doc[cfg.grid] || []).filter((r) => rowType(cfg, r) === type);
	}

	/** Write the counters from the grid without firing their change handlers. */
	HRC.recount = function (frm) {
		const cfg = CONFIGS[frm.doctype];
		if (!cfg) return;
		TYPES.forEach((t) => {
			const field = cfg.prefix + t.field;
			if (!frm.fields_dict[field]) return;
			frm.doc[field] = rowsOf(frm, cfg, t.type).length;
			frm.refresh_field(field);
		});
	};

	/** Where a new round of `type` belongs: after its own type, else before later ones. */
	function insertIndex(frm, cfg, type) {
		const rows = frm.doc[cfg.grid] || [];
		const same = rows.map((r, i) => (rowType(cfg, r) === type ? i : -1)).filter((i) => i >= 0);
		if (same.length) return same[same.length - 1] + 1;

		const later = TYPES.slice(TYPES.findIndex((t) => t.type === type) + 1).map((t) => t.type);
		const next = rows.findIndex((r) => {
			const rt = rowType(cfg, r);
			return later.includes(rt) || TERMINAL.includes(rt);
		});
		return next >= 0 ? next : rows.length;
	}

	function renumber(frm, cfg) {
		(frm.doc[cfg.grid] || []).forEach((r, i) => (r.idx = i + 1));
	}

	function addRounds(frm, cfg, t, howMany) {
		const used = new Set((frm.doc[cfg.grid] || []).map((r) => r[cfg.name_field]));
		let n = rowsOf(frm, cfg, t.type).length;
		for (let i = 0; i < howMany; i++) {
			let name;
			do {
				name = __("{0} Round {1}", [__(t.label), ++n]);
			} while (used.has(name));
			used.add(name);

			const at = insertIndex(frm, cfg, t.type);
			const row = frm.add_child(cfg.grid, {
				[cfg.type_field]: t.type,
				[cfg.name_field]: name,
			});
			const rows = frm.doc[cfg.grid];
			rows.splice(rows.indexOf(row), 1);
			rows.splice(at, 0, row);
			renumber(frm, cfg);
		}
	}

	function removeRounds(frm, cfg, t, howMany) {
		const drop = new Set(rowsOf(frm, cfg, t.type).slice(-howMany).map((r) => r.name));
		frm.doc[cfg.grid] = (frm.doc[cfg.grid] || []).filter((r) => {
			if (!drop.has(r.name)) return true;
			frappe.model.clear_doc(r.doctype, r.name);
			return false;
		});
		renumber(frm, cfg);
	}

	function finish(frm, cfg) {
		frm.refresh_field(cfg.grid);
		// Interview rows name a real round — re-apply the picker to new rows.
		if (recruitment.interview_round_link) {
			recruitment.interview_round_link.sync(frm, {
				grid: cfg.grid,
				name_field: cfg.name_field,
				type_field: cfg.type_field,
			});
		}
		frm.dirty();
	}

	function onCountChange(frm, cfg, t) {
		const field = cfg.prefix + t.field;
		const wanted = Math.max(0, cint(frm.doc[field]));
		const have = rowsOf(frm, cfg, t.type).length;
		if (wanted === have) return;

		if (wanted > have) {
			addRounds(frm, cfg, t, wanted - have);
			finish(frm, cfg);
			return;
		}

		const removing = rowsOf(frm, cfg, t.type).slice(wanted).map((r) => r[cfg.name_field]);
		frappe.confirm(
			__("This removes {0} round(s) from the stages table: {1}. Continue?", [
				removing.length,
				removing.map((n) => frappe.utils.escape_html(n || __("(unnamed)"))).join(", "),
			]),
			() => {
				removeRounds(frm, cfg, t, have - wanted);
				finish(frm, cfg);
			},
			() => HRC.recount(frm)
		);
	}

	Object.entries(CONFIGS).forEach(([doctype, cfg]) => {
		const handlers = {
			refresh: (frm) => HRC.recount(frm),
			[`${cfg.grid}_add`]: (frm) => HRC.recount(frm),
			[`${cfg.grid}_remove`]: (frm) => HRC.recount(frm),
		};
		TYPES.forEach((t) => {
			handlers[cfg.prefix + t.field] = (frm) => onCountChange(frm, cfg, t);
		});
		frappe.ui.form.on(doctype, handlers);

		frappe.ui.form.on(cfg.child, {
			[cfg.type_field]: (frm) => HRC.recount(frm),
		});
	});
})();
