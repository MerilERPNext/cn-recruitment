// Interview Feedback — draws the configured evaluation form, when the interview has one.
//
// The recruiter picks a Microapp Form Widget on the Interview; the panel fills it in
// here. Everything else about this form is unchanged, which is the point: the panel
// still clicks the same "Submit Feedback" button on the Interview (see
// interview_feedback_route.js, which already lands them on THIS form), and submitting
// still produces an ordinary Interview Feedback, so the whole on_submit chain — the
// Interview's verdict, the work location, the region suggestion and the hiring-stage
// advance — runs exactly as before.
//
// `result` (Cleared / Rejected) is NOT part of the dynamic form and stays a native
// field. It is what every downstream hook reads to move the candidate on; burying it
// in a builder means one badly-built form silently stops candidates advancing.
//
// The server half is recruitment.api.interview_feedback_form — it serves the schema
// (cached), re-checks required answers (browser validation is bypassable) and freezes
// the label map. See that module for the whole design.

frappe.ui.form.on("Interview Feedback", {
	refresh(frm) {
		renderEvaluationForm(frm);
	},

	// A feedback opened straight from the Interview arrives with `interview` already
	// set, so refresh() is normally enough. This covers the plain "New Interview
	// Feedback" path, where the form can only be known once the interview is picked.
	interview(frm) {
		frm.__ifb_form_key = null;
		renderEvaluationForm(frm);
	},
});

function renderEvaluationForm(frm) {
	if (!frm.doc.interview) return;
	// The HTML wrapper only exists once the custom fields have been migrated in.
	if (!frm.fields_dict.custom_form_html) return;

	// refresh() fires on load, on every save and on every tab switch, and none of
	// this changes in between. Re-rendering would also throw away whatever the
	// interviewer has typed but not yet saved. docstatus is in the key because the
	// form has to be redrawn read-only once the feedback is submitted.
	const key = `${frm.doc.interview}::${frm.doc.docstatus}`;
	if (frm.__ifb_form_key === key) return;
	frm.__ifb_form_key = key;

	frappe.call({
		method: "recruitment.api.interview_feedback_form.get_interview_feedback_form",
		args: { interview: frm.doc.interview },
		callback: (r) => {
			const config = (r && r.message) || {};
			if (!config.schema) {
				// No form configured for this interview — leave the standard skill
				// grid exactly as it is.
				return;
			}
			// Setting this makes the "Feedback Form" section appear — it depends_on
			// the field — and saves the server having to stamp it. Harmless on a
			// saved doc: it is the same value validate would set.
			//
			// Awaited before drawing, because Formio measures its own inputs as it
			// builds them. Rendering into a section that is still collapsed gives
			// zero-width dropdowns and misplaced labels that only fix themselves if
			// the panel happens to resize something.
			const sectionReady = frm.doc.custom_evaluation_form
				? Promise.resolve()
				: frm.set_value("custom_evaluation_form", config.widget);

			Promise.resolve(sectionReady).then(() => {
				hideSkillGrid(frm);
				drawForm(frm, config);
			});
		},
	});
}

// The dynamic form REPLACES the skill grid — showing both asks the panel to rate the
// same candidate twice against two different scales. The grid's `reqd` is dropped by
// a Property Setter so this is safe; the server re-imposes "one or the other".
function hideSkillGrid(frm) {
	["skill_assessment", "average_rating"].forEach((fieldname) => {
		if (frm.fields_dict[fieldname]) frm.set_df_property(fieldname, "hidden", 1);
	});
}

function drawForm(frm, config) {
	const wrapper = frm.fields_dict.custom_form_html.$wrapper;

	if (!window.Formio) {
		// Formio comes from nextai's chatnext-app bundle. If that ever stops loading
		// in Desk, say so rather than showing the panel an empty box they cannot fill.
		console.error(
			"Interview Feedback: window.Formio is not loaded — the evaluation form " +
				"cannot render. Check that nextai's chatnext-app.bundle.js is in app_include_js."
		);
		wrapper.html(
			`<div class="alert alert-warning">${__(
				"The feedback form could not be loaded. Please contact your administrator."
			)}</div>`
		);
		return;
	}

	// Tear down the previous instance before drawing another — Formio attaches its
	// own listeners, and on a re-render (submit, or the interview being changed)
	// leaving the old one behind leaks it and double-fires every change.
	if (frm.__ifb_formio) {
		try {
			frm.__ifb_formio.destroy(true);
		} catch (e) {
			// A destroyed-twice instance must not stop the new one being drawn, but
			// it still means the teardown is wrong somewhere — say so rather than
			// letting a leak accumulate in silence.
			console.warn("Interview Feedback: could not destroy the previous form", e);
		}
		frm.__ifb_formio = null;
	}

	wrapper.empty();
	const container = $('<div class="ifb-dynamic-form"></div>').appendTo(wrapper)[0];

	window.Formio.createForm(container, stripSubmitButtons(config.schema))
		.then((instance) => {
			frm.__ifb_formio = instance;

			// Seed the answers already on the doc — a reopened draft, or an amended
			// feedback — so the panel carries on where they left off.
			instance.submission = { data: readResponse(frm) };

			// A submitted feedback is a record, not an input.
			if (frm.doc.docstatus === 1) instance.setDisabled(true);

			instance.on("change", () => writeResponse(frm, instance));
		})
		.catch((e) => {
			// The panel gets a plain sentence; the console gets what actually broke.
			// Without this the schema could be malformed and the only symptom would
			// be a warning box with no way to find out why.
			console.error(
				`Interview Feedback: Formio could not render ${config.widget}`, e
			);
			wrapper.html(
				`<div class="alert alert-warning">${__(
					"This feedback form could not be displayed. It may have been changed since the interview was scheduled."
				)}</div>`
			);
		});
}

// Formio schemas built in the widget builder usually carry their own Submit button.
// Pressing it does nothing here — the doc is saved and submitted by Frappe's own
// toolbar — so leaving it in only invites the panel to click the wrong thing and
// believe they are done.
function stripSubmitButtons(schema) {
	const prune = (components) =>
		(components || [])
			.filter((c) => !(c && c.type === "button" && c.action === "submit"))
			.map((c) => {
				if (!c || typeof c !== "object") return c;
				const copy = { ...c };
				if (copy.components) copy.components = prune(copy.components);
				if (copy.columns) {
					copy.columns = copy.columns.map((col) =>
						col && col.components ? { ...col, components: prune(col.components) } : col
					);
				}
				if (copy.rows) {
					copy.rows = copy.rows.map((row) =>
						(row || []).map((cell) =>
							cell && cell.components ? { ...cell, components: prune(cell.components) } : cell
						)
					);
				}
				return copy;
			});

	return { ...schema, components: prune(schema.components) };
}

function readResponse(frm) {
	const raw = frm.doc.custom_form_response;
	if (!raw) return {};
	if (typeof raw === "object") return raw;
	try {
		return JSON.parse(raw) || {};
	} catch (e) {
		// Falling back to {} redraws the form EMPTY, which looks to the interviewer
		// like their answers were never saved. Rare enough to keep the fallback, bad
		// enough that it must never happen unnoticed.
		console.error("Interview Feedback: stored form response is not valid JSON", e, raw);
		return {};
	}
}

// Formio fires `change` on every keystroke. Writing straight through would call
// set_value hundreds of times while someone types a paragraph of feedback, each one
// re-rendering the form's dirty state. Debounced, and skipped entirely when nothing
// actually changed (Formio also fires `change` on its own redraws).
const writeResponse = frappe.utils.debounce((frm, instance) => {
	if (frm.doc.docstatus !== 0) return;
	if (frm.__ifb_formio !== instance) return; // a stale instance mid-teardown

	const data = (instance.submission && instance.submission.data) || {};
	const next = JSON.stringify(data);
	if (next === JSON.stringify(readResponse(frm))) return;

	frm.set_value("custom_form_response", next);
}, 300);
