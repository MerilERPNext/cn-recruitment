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
        applyCampusSections(frm);
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
        });
}

function render(frm, ctx) {
    toggle(frm, Boolean(ctx.is_campus));
    if (ctx.is_campus) applyWorkLocation(frm, ctx);
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

    // Region changed under a location that was already picked (the panel ticked a
    // recommendation, say) — drop it rather than submit a location the new region
    // does not run.
    if (
        frm.doc.docstatus === 0 &&
        frm.doc.custom_work_location &&
        ctx.restricted &&
        !(ctx.branches || []).includes(frm.doc.custom_work_location)
    ) {
        frm.set_value("custom_work_location", null);
    }

    frm.set_df_property("custom_work_location", "description", describe(ctx));
}

function describe(ctx) {
    const base = __(
        "On submit this becomes the candidate's final work location, and carries through to the offer and onboarding."
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
