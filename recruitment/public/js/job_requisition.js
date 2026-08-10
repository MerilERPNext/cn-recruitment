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
    onload(frm) {
        // Only the Active version of a JD may be attached to a requisition.
        // Superseded versions stay readable by name but must not be selectable —
        // otherwise a recruiter could pick an outdated JD by hand, which is
        // exactly what the server-side matchers already refuse to do.
        // Legacy JDs have status "" rather than "Active", so both are allowed.
        frm.set_query("custom_job_description_template", () => ({
            filters: { status: ["in", ["Active", ""]] },
        }));

        gate_raise_requisition(frm);
    },

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

// Gate: on a NEW requisition, check Raise Requisition Scope up front so a user
// who isn't permitted gets a clean popup and is bounced back instead of filling
// the form only to be blocked at save. Raising is deny-by-default, so this fires
// for anyone not covered by a scope record. The server-side before_insert hook
// remains the authoritative block.
function gate_raise_requisition(frm) {
    if (!frm.is_new()) {
        return;
    }
    frappe.call({
        method: "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.check_can_raise_requisition",
        callback(r) {
            const res = r.message || {};
            if (res.allowed) {
                return;
            }
            frappe.msgprint({
                title: __("Not Allowed to Raise Requisition"),
                indicator: "red",
                message: res.reason || __("You are not permitted to raise requisitions."),
            });
            // Send them somewhere harmless rather than leaving a form they
            // cannot save open.
            frappe.set_route("List", "Job Requisition");
        },
    });
}

// Hiring Lead Configuration — restrict the Hiring lead (Employee) and Assign to
// Recruiter (User) dropdowns to the configured users when a config matches:
// "Company Wise" by the requisition's company, or "Assignment Framework" by the
// Hiring Manager (Requested By) via its Dynamic User Assignments. No matching
// config → no filter (full lists), so the flow is never blocked.
frappe.ui.form.on("Job Requisition", {
    refresh(frm) {
        apply_hiring_lead_config_filters(frm);
    },
    company(frm) {
        apply_hiring_lead_config_filters(frm);
    },
    requested_by(frm) {
        apply_hiring_lead_config_filters(frm);
    },
});

// Recruitment Settings — post-creation edit locks (Desk UX; the server enforces
// the same rules in validate_requisition_settings so the API/UI path is covered too):
//  * "Disable Editing of Requisition Initiation Form": once the requisition is
//    saved, lock the whole form (workflow actions still work).
//  * "Allow Hiring Manager Override": when OFF, "Requested By" is read-only after
//    creation; when ON it stays editable.
// Both default to the editable behaviour, so nothing changes unless enabled.
frappe.ui.form.on("Job Requisition", {
    refresh(frm) {
        apply_requisition_edit_locks(frm);
    },
});

// Requisition actions — Duplicate / Archive / Move to Draft / Activate.
//
// Which of the four are available depends on the requisition status AND the
// status of its positions. That rule lives server-side in
// recruitment.api.requisition_status.ACTION_MATRIX; get_requisition_actions
// returns the verdict per action plus, when refused, the reason. We draw an
// enabled button for every allowed action and a disabled one carrying the reason
// as a tooltip for the rest — so the sheet is legible from the form itself rather
// than the user guessing why nothing happens.
//
// "Send for Approval" is not one of the four; it is how a Draft re-enters the
// approval flow, and it only appears on a Draft.
frappe.ui.form.on("Job Requisition", {
    refresh(frm) {
        add_requisition_action_buttons(frm);
    },
});

const REQUISITION_ACTIONS = [
    { key: "activate", label: __("Activate"), primary: true },
    { key: "move_to_draft", label: __("Move to Draft") },
    { key: "duplicate", label: __("Duplicate") },
    { key: "archive", label: __("Archive") },
];

function add_requisition_action_buttons(frm) {
    if (frm.is_new()) {
        return;
    }
    frappe.call({
        method: "recruitment.api.requisition_status.get_requisition_actions",
        args: { job_requisition: frm.doc.name },
        callback(r) {
            const res = (r && r.message) || {};
            const verdicts = res.actions || {};
            const group = __("Actions");

            REQUISITION_ACTIONS.forEach((action) => {
                const verdict = verdicts[action.key] || {};
                const $btn = frm.add_custom_button(
                    action.label,
                    () => run_requisition_action(frm, action.key),
                    group
                );
                if (verdict.allowed) {
                    $btn.prop("disabled", false).attr("title", "");
                } else {
                    // Kept visible but inert: the matrix is easier to understand
                    // when you can see the action you *can't* take and why.
                    $btn.prop("disabled", true).attr("title", verdict.reason || "");
                }
            });

            // Standard HRMS adds "Create Job Opening" / "Associate Job Opening"
            // only when status === "Open & Approved". That value no longer
            // exists (the client's wording is "Approved Draft"), so core's
            // buttons never appear — re-add them here against the real status.
            // "Create Job Opening" still routes through HRMS's mapper, which
            // hooks.py already redirects to our own make_job_opening.
            if (res.requisition_status === "Approved Draft") {
                frm.add_custom_button(__("Create Job Opening"), () => {
                    frappe.model.open_mapped_doc({
                        method: "hrms.hr.doctype.job_requisition.job_requisition.make_job_opening",
                        frm: frm,
                    });
                }, group);
            }

            if (verdicts.activate && verdicts.activate.allowed) {
                frm.page.set_inner_btn_group_as_primary(group);
            }

            if (res.can_send_for_approval) {
                frm.add_custom_button(__("Send for Approval"), () => {
                    frappe.call({
                        method: "recruitment.api.requisition_status.send_for_approval",
                        args: { job_requisition: frm.doc.name },
                        freeze: true,
                        freeze_message: __("Sending for approval…"),
                        callback: () => {
                            frappe.show_alert({
                                message: __("Sent for approval"),
                                indicator: "green",
                            });
                            frm.reload_doc();
                        },
                    });
                }).addClass("btn-primary");
            }
        },
    });
}

function run_requisition_action(frm, key) {
    if (key === "move_to_draft") {
        prompt_with_reason(
            frm,
            "recruitment.api.requisition_status.move_to_draft",
            __("Move to Draft"),
            __("Moving to Draft…"),
            __("Any approval currently in progress will be revoked. Positions return to Draft.")
        );
    } else if (key === "archive") {
        prompt_with_reason(
            frm,
            "recruitment.api.requisition_status.archive_requisition",
            __("Archive Requisition"),
            __("Archiving…"),
            __("The requisition and all its positions move to Archived. Any approval in progress will be revoked.")
        );
    } else if (key === "duplicate") {
        frappe.call({
            method: "recruitment.api.requisition_status.duplicate_requisition",
            args: { job_requisition: frm.doc.name },
            freeze: true,
            freeze_message: __("Duplicating…"),
            callback: (r) => {
                const res = (r && r.message) || {};
                if (res.job_requisition) {
                    frappe.show_alert({
                        message: __("Created {0}", [res.job_requisition]),
                        indicator: "green",
                    });
                    frappe.set_route("Form", "Job Requisition", res.job_requisition);
                }
            },
        });
    } else if (key === "activate") {
        prompt_activate(frm);
    }
}

// Activate = link a Job Opening and move the requisition to Approved Active.
// Same shape as the list view's "Activate Job Requisition" action.
function prompt_activate(frm) {
    frappe.prompt(
        [
            {
                fieldname: "job_opening",
                label: __("Job Opening"),
                fieldtype: "Link",
                options: "Job Opening",
                reqd: 1,
                get_query: () => {
                    const filters = { status: "Open" };
                    if (frm.doc.company) filters.company = frm.doc.company;
                    if (frm.doc.designation) filters.designation = frm.doc.designation;
                    if (frm.doc.department) filters.department = frm.doc.department;
                    return { filters };
                },
            },
        ],
        (values) => {
            frappe.call({
                method: "recruitment.api.job_requisition.activate_job_requisition",
                args: { job_requisition: frm.doc.name, job_opening: values.job_opening },
                freeze: true,
                freeze_message: __("Activating…"),
                callback: () => {
                    frappe.show_alert({
                        message: __("Requisition activated"),
                        indicator: "green",
                    });
                    frm.reload_doc();
                },
            });
        },
        __("Activate Requisition"),
        __("Activate")
    );
}

function prompt_with_reason(frm, method, title, freeze_message, description) {
    frappe.prompt(
        [
            {
                fieldname: "reason",
                label: __("Reason"),
                fieldtype: "Small Text",
                description: __("Recorded on the requisition's timeline.") + " " + description,
            },
        ],
        (values) => {
            frappe.call({
                method: method,
                args: { job_requisition: frm.doc.name, reason: values.reason },
                freeze: true,
                freeze_message: freeze_message,
                callback: () => {
                    frappe.show_alert({ message: title, indicator: "orange" });
                    frm.reload_doc();
                },
            });
        },
        title,
        title
    );
}

function apply_requisition_edit_locks(frm) {
    if (frm.is_new()) {
        return; // a brand-new requisition is always fully editable
    }
    frappe.db
        .get_value("Recruitment Settings", "Recruitment Settings", [
            "disable_editing_requisition_initiation_form",
            "allow_hiring_manager_override",
        ])
        .then((r) => {
            const s = (r && r.message) || {};

            // 1) Whole-form lock once the requisition exists.
            if (cint(s.disable_editing_requisition_initiation_form)) {
                frm.set_read_only();
                frm.disable_save();
                return; // everything is read-only; nothing else to toggle
            }

            // 2) "Requested By" is locked unless hiring-manager override is allowed.
            frm.set_df_property(
                "requested_by",
                "read_only",
                cint(s.allow_hiring_manager_override) ? 0 : 1
            );
        });
}

function apply_hiring_lead_config_filters(frm) {
    frappe.call({
        method: "recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration.get_hiring_lead_config_users",
        args: { company: frm.doc.company, employee: frm.doc.requested_by },
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
