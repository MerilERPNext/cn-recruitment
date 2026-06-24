// Job Requisition — auto-fetch Job Description on (designation + department).
//
// Flow:
//  1. User picks designation and department.
//  2. As soon as both are present, look up a Job Description whose
//     designation/department tables include the chosen values.
//  3. If found, set custom_job_description_template to it and copy
//     description + skills into Job Requisition.
//  4. If the user picks/clears custom_job_description_template
//     manually, sync description + skills accordingly.
//  5. The HTML `custom_preview` field renders the live `description`
//     value as a styled card so the user can see the final JD layout
//     without scrolling through raw Text Editor markup.

frappe.ui.form.on("Job Requisition", {
    refresh(frm) {
        render_description_preview(frm);
    },

    description(frm) {
        render_description_preview(frm);
    },

    designation(frm) {
        try_autofetch_jd(frm);
    },

    department(frm) {
        try_autofetch_jd(frm);
    },

    custom_job_description_template(frm) {
        const jd = frm.doc.custom_job_description_template;
        if (!jd) {
            return;
        }
        hydrate_from_job_description(frm, jd);
    },
});

// Hiring Lead Configuration — when a "Company Wise" config matches the
// requisition's company, restrict the Hiring lead (Employee) and Assign to
// Recruiter (User) dropdowns to the configured users. No matching config →
// no filter (full lists), so the flow is never blocked.
frappe.ui.form.on("Job Requisition", {
    refresh(frm) {
        apply_hiring_lead_config_filters(frm);
    },
    company(frm) {
        apply_hiring_lead_config_filters(frm);
    },
});

function apply_hiring_lead_config_filters(frm) {
    frappe.call({
        method: "recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration.get_hiring_lead_config_users",
        args: { company: frm.doc.company },
        callback: (r) => {
            const data = (r && r.message) || { hiring_leads: [], recruiters: [] };
            const leads = data.hiring_leads || [];
            const recruiters = data.recruiters || [];

            // Hiring lead links to Employee → filter by the employee's linked User.
            frm.set_query("custom_hiring_lead", () =>
                leads.length ? { filters: { user_id: ["in", leads] } } : {}
            );
            // Recruiter links to User directly.
            frm.set_query("custom_assign_to_recruiter", () =>
                recruiters.length ? { filters: { name: ["in", recruiters] } } : {}
            );
        },
    });
}

function try_autofetch_jd(frm) {
    const { designation, department } = frm.doc;
    if (!designation || !department) {
        return;
    }

    frappe.call({
        method: "recruitment.api.job_description.find_matching_job_description",
        args: { designation, department },
        callback: (r) => {
            const data = r && r.message;
            if (!data || !data.name) {
                return;
            }
            if (frm.doc.custom_job_description_template === data.name) {
                apply_jd_payload(frm, data);
                return;
            }
            frm.set_value("custom_job_description_template", data.name).then(() => {
                apply_jd_payload(frm, data);
            });
        },
    });
}

function hydrate_from_job_description(frm, jd_name) {
    frappe.call({
        method: "recruitment.api.job_description.get_job_description_payload",
        args: { name: jd_name },
        callback: (r) => {
            const data = r && r.message;
            if (!data || !data.name) {
                return;
            }
            apply_jd_payload(frm, data);
        },
    });
}

function apply_jd_payload(frm, data) {
    if (data.description != null) {
        frm.set_value("description", data.description);
    }

    frm.clear_table("custom_skills");
    (data.skills || []).forEach((skill) => {
        if (!skill) return;
        const row = frm.add_child("custom_skills");
        row.skill = skill;
    });
    frm.refresh_field("custom_skills");

    render_description_preview(frm);
}

function render_description_preview(frm) {
    const wrapper = frm.fields_dict.custom_preview && frm.fields_dict.custom_preview.$wrapper;
    if (!wrapper) {
        return;
    }
    const html = frm.doc.description || "";
    wrapper.empty();
    wrapper.append(`
        <div class="custom-jd-preview" style="
            border: 1px solid var(--border-color, #d1d8dd);
            border-radius: 6px;
            padding: 14px 18px;
            background: var(--bg-color, #fff);
            min-height: 60px;
            line-height: 1.55;
            font-size: 14px;
            color: var(--text-color, #1F272E);
        ">
            ${html || `<span style="color: var(--text-muted, #6c7680);">${__("Job description preview will appear here once a description is filled in.")}</span>`}
        </div>
    `);
}
