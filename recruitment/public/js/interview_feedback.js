// Interview Feedback — two campus-only sections: Region Recommendation and Work Location.
//
// Region routing selects a Campus Drive Round panel and the work location list is
// drawn from the candidate's region, so neither means anything for a lateral /
// referral / IJP candidate. Both sections are hidden there rather than letting an
// interviewer fill in something that goes nowhere — the server clears the fields
// too (recruitment.api.interview_work_location.validate_work_location), this just
// keeps the form honest about it.
//
// The Work Location the panel picks becomes the candidate's final location on
// submit, so the options are restricted to locations of the region that owns the
// candidate — or of the region recommended above, when the panel ticked one.
// The panel now arrives here straight from the Interview's "Submit Feedback" (see
// public/js/interview_feedback_route.js), so this form is the first thing they see —
// and on its own it shows an interview ID and nothing about the interview. The
// context strip below carries what they need in front of them while they write:
// which round and mode, who the candidate is, the resume, and the slot.
// Both round fieldnames are listed on purpose — HRMS v15 calls it
// `interview_round`, v16 renamed it to `interview_type` — but see
// interviewFieldsOnThisSite(): the list is filtered to what this version really
// has before it is sent, because the server rejects the read outright otherwise.
const CONTEXT_FIELDS = [
    "interview_type",
    "interview_round",
    "custom_interview_type",
    "job_applicant",
    "designation",
    "custom_resume_attachment",
    "scheduled_on",
    "from_time",
    "to_time",
    "custom_interview_panel",
];

function renderInterviewContext(frm) {
    if (!frm.doc.interview) return;
    // Cached against the interview: refresh() fires on load, every save and every tab
    // switch, and none of this changes in between.
    if (frm.__context_for === frm.doc.interview) return;
    frm.__context_for = frm.doc.interview;

    interviewFieldsOnThisSite(CONTEXT_FIELDS, (fieldname) => {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Interview",
                filters: { name: frm.doc.interview },
                fieldname: fieldname,
            },
            callback: (r) => {
                const iv = (r && r.message) || {};
                if (!Object.keys(iv).length) return;
                drawContext(frm, iv);
            },
        });
    });
}

/**
 * Narrow `fields` to the ones the Interview doctype actually has here.
 *
 * `frappe.client.get_value` does NOT ignore a field the doctype lacks — it
 * throws `DataError: Field not permitted in query` and the whole read fails
 * (frappe/desk/reportview.py, `raise_invalid_field`). Listing both the v15
 * (`interview_round`) and v16 (`interview_type`) round fieldnames to "let the
 * missing one come back empty" therefore breaks the request on EVERY site
 * instead of on none, which is why this strip errored on open.
 *
 * `with_doctype` caches, so this costs one meta load per page at most — and the
 * panel usually arrives from the Interview form, where it is already loaded.
 */
function interviewFieldsOnThisSite(fields, done) {
    frappe.model.with_doctype("Interview", () => {
        done(fields.filter((f) => frappe.meta.has_field("Interview", f)));
    });
}

function drawContext(frm, iv) {
    const esc = (v) => frappe.utils.escape_html(String(v == null ? "" : v));
    const time = (t) => (t ? String(t).slice(0, 5) : null);
    const slot =
        [time(iv.from_time), time(iv.to_time)].filter(Boolean).join(" – ") || null;

    const items = [
        [__("Candidate"), iv.job_applicant],
        [__("Designation"), iv.designation],
        [__("Interview Type"), iv.interview_type || iv.interview_round],
        [__("Mode of Interview"), iv.custom_interview_type],
        [__("Panel"), iv.custom_interview_panel],
        [__("Scheduled On"), iv.scheduled_on ? frappe.datetime.str_to_user(iv.scheduled_on) : null],
        [__("Time"), slot],
    ].filter(([, value]) => value);

    const cells = items
        .map(
            ([label, value]) =>
                `<div class="ifb-ctx-item"><div class="ifb-ctx-label">${esc(
                    label
                )}</div><div class="ifb-ctx-value">${esc(value)}</div></div>`
        )
        .join("");

    const resume = iv.custom_resume_attachment
        ? `<a class="btn btn-xs btn-default" href="${esc(
              iv.custom_resume_attachment
          )}" target="_blank" rel="noopener">${__("Open Resume")}</a>`
        : "";

    const html = `<div class="ifb-ctx">
        <div class="ifb-ctx-grid">${cells}</div>
        ${resume ? `<div class="ifb-ctx-actions">${resume}</div>` : ""}
    </div>
    <style>
        .ifb-ctx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 16px}
        .ifb-ctx-label{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted)}
        .ifb-ctx-value{font-weight:600}
        .ifb-ctx-actions{margin-top:10px}
    </style>`;

    // add_section rather than a custom field: this is context to read, not data to
    // store, and the dashboard already sits above the form where they start reading.
    frm.dashboard.add_section(html, __("Interview"));
}

frappe.ui.form.on("Interview Feedback", {
    setup(frm) {
        // Registered once. The allowed list is read from the form at query time, so
        // it always reflects the latest context without re-registering the query.
        frm.set_query("custom_work_location", () => {
            const allowed = (frm.__work_location_ctx || {}).branches || [];
            return allowed.length ? { filters: { name: ["in", allowed] } } : {};
        });
    },
    refresh(frm) {
        renderInterviewContext(frm);
        applyCampusSections(frm);
    },
    interview(frm) {
        renderInterviewContext(frm);
    },
    job_applicant(frm) {
        applyCampusSections(frm);
    },
    custom_recommend_other_region(frm) {
        applyCampusSections(frm);
    },
    custom_recommended_region(frm) {
        applyCampusSections(frm);
    },
});

const REGION_FIELDS = [
    "custom_region_recommendation_section",
    "custom_recommend_other_region",
    "custom_recommended_region",
    "custom_region_recommendation_reason",
];

const WORK_LOCATION_FIELDS = [
    "custom_work_location_section",
    "custom_work_location_region",
    "custom_work_location",
];

function applyCampusSections(frm) {
    if (!frm.doc.job_applicant) {
        frm.__work_location_ctx = null;
        frm.__work_location_key = null;
        toggle(frm, false);
        return;
    }

    const recommended = frm.doc.custom_recommend_other_region
        ? frm.doc.custom_recommended_region || null
        : null;

    // refresh() fires on load, after every save and on tab switches, so the answer is
    // cached against the only two inputs that change it. Without this the form makes
    // a server round trip every time the user glances at it.
    const key = `${frm.doc.job_applicant}|${recommended || ""}`;
    if (frm.__work_location_key === key && frm.__work_location_ctx) {
        render(frm, frm.__work_location_ctx);
        return;
    }

    // One call answers both questions — is this a campus candidate, and which
    // locations may the panel choose from.
    frappe
        .call({
            method: "recruitment.api.interview_work_location.get_work_location_context",
            args: { job_applicant: frm.doc.job_applicant, recommended_region: recommended },
        })
        .then((r) => {
            const ctx = (r && r.message) || {};
            frm.__work_location_ctx = ctx;
            frm.__work_location_key = key;
            render(frm, ctx);
        })
        .catch(() => {
            // Without this the sections keep whatever state they were last left in,
            // which reads as "this form does not have them" — the one outcome that
            // must never happen silently, because they are the panel's whole job.
            frm.__work_location_key = null;
            toggle(frm, false);
            explain(
                frm,
                __(
                    "Could not load the Region Recommendation and Work Location options for this candidate. Refresh the page, and tell HR if it keeps happening."
                )
            );
        });
}

function render(frm, ctx) {
    const campus = Boolean(ctx.is_campus);
    toggle(frm, campus);

    if (campus) {
        explain(frm, null);
        applyWorkLocation(frm, ctx);
        return;
    }

    // Hidden is correct for a lateral / referral / IJP candidate — there is no region
    // routing behind them, so there is nothing to recommend or post. It is NOT correct
    // when the candidate record has gone: the panel is then writing feedback against a
    // candidate who no longer exists, and two sections quietly missing looks exactly
    // like the feature being broken for them. Say which it is.
    explain(
        frm,
        ctx.reason === "applicant_missing"
            ? __(
                  "This interview's Job Applicant record no longer exists, so the Region Recommendation and Work Location sections cannot be shown. Please tell HR — the feedback is being written against a deleted candidate."
              )
            : null
    );
}

// One reusable notice above the form. Cleared by passing null, so a form that
// recovers (the candidate is filled in, the retry succeeds) does not keep a stale
// warning on screen.
//
// Re-set on every call rather than memoised: the layout message is wiped whenever the
// form re-renders, and this runs from refresh(), so skipping a repeat set would make
// the notice disappear on the next tab switch — the exact silence it exists to fix.
function explain(frm, message) {
    if (!message) {
        if (frm.__campus_notice) {
            frm.dashboard.clear_headline();
            frm.__campus_notice = null;
        }
        return;
    }
    frm.__campus_notice = message;
    frm.dashboard.set_headline(message, "orange");
}

function toggle(frm, on) {
    REGION_FIELDS.concat(WORK_LOCATION_FIELDS).forEach((f) => frm.toggle_display(f, on));
}

function applyWorkLocation(frm, ctx) {
    // Assigned rather than set_value: the server stamps this same value on every
    // save, so the form only has to show it — set_value here would mark a doc the
    // user has merely opened as unsaved.
    const region = ctx.region || null;
    if ((frm.doc.custom_work_location_region || null) !== region) {
        frm.doc.custom_work_location_region = region;
        frm.refresh_field("custom_work_location_region");
    }

    // An earlier round already settled where this candidate goes. Carry that value
    // and lock it, so a later panel records the same posting instead of quietly
    // moving the candidate somewhere else. The server enforces this too — read-only
    // on a form is only a hint.
    const locked = Boolean(ctx.locked_to);
    if (locked) {
        if (frm.doc.docstatus === 0 && frm.doc.custom_work_location !== ctx.locked_to) {
            frm.set_value("custom_work_location", ctx.locked_to);
        }
    } else if (
        // Region changed under a location that was already picked (the panel ticked a
        // recommendation, say) — drop it rather than submit a location the new region
        // does not run.
        frm.doc.docstatus === 0 &&
        frm.doc.custom_work_location &&
        ctx.restricted &&
        !(ctx.branches || []).includes(frm.doc.custom_work_location)
    ) {
        frm.set_value("custom_work_location", null);
    }

    frm.set_df_property("custom_work_location", "read_only", locked ? 1 : 0);
    frm.set_df_property("custom_work_location", "description", describe(ctx));
}

function describe(ctx) {
    if (ctx.locked_to) {
        return __("Already set to {0} by {1} in an earlier round, so it cannot be changed here. HR can still change it on the candidate.", [
            `<b>${frappe.utils.escape_html(ctx.locked_to)}</b>`,
            frappe.utils.escape_html(ctx.locked_by || __("an earlier panel")),
        ]);
    }
    const base = __(
        "On submit this becomes the candidate's final work location for every later round, and carries through to the offer and onboarding."
    );
    if (!ctx.region) {
        return `${__("No region could be resolved for this candidate, so every location is listed.")} ${base}`;
    }
    if (!ctx.restricted) {
        return `${__("No locations are mapped to region {0} yet, so every location is listed — ask HR to map them.", [
            ctx.region_label || ctx.region,
        ])} ${base}`;
    }
    return `${__("Locations of region {0}.", [ctx.region_label || ctx.region])} ${base}`;
}
