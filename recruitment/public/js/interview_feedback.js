// Interview Feedback — the Region Recommendation section is campus-only.
//
// Region routing selects a Campus Drive Round panel, so recommending one for a
// lateral / referral / IJP candidate would raise a flag HR cannot act on
// (recruitment.api.candidate_region refuses non-campus candidates). Hide the whole
// section rather than let an interviewer fill in something that goes nowhere.
frappe.ui.form.on("Interview Feedback", {
    refresh(frm) {
        toggleRegionSection(frm);
    },
    job_applicant(frm) {
        toggleRegionSection(frm);
    },
});

const REGION_FIELDS = [
    "custom_region_recommendation_section",
    "custom_recommend_other_region",
    "custom_recommended_region",
    "custom_region_recommendation_reason",
];

function toggleRegionSection(frm) {
    const show = (on) => REGION_FIELDS.forEach((f) => frm.toggle_display(f, on));

    if (!frm.doc.job_applicant) {
        show(false);
        return;
    }
    frappe.db
        .get_value("Job Applicant", frm.doc.job_applicant, [
            "source", "custom_campus_invite", "custom_campus_drive", "custom_institute",
        ])
        .then((r) => {
            const d = (r && r.message) || {};
            // Linkage as well as source: campus candidates created outside the portal
            // flow carry the invite but may have no source stamped.
            show(Boolean(
                d.custom_campus_invite || d.custom_campus_drive || d.custom_institute ||
                d.source === "Campus Hiring"
            ));
        });
}
