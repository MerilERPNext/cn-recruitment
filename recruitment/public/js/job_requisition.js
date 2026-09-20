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
        apply_scope_field_filters(frm);
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
        // Department narrows which records can still apply, so what remains
        // selectable for Designation can change.
        refresh_scope_allowance(frm);
    },

    company(frm) {
        refresh_scope_allowance(frm);
    },

    custom_job_description_template(frm) {
        const jd = frm.doc.custom_job_description_template;
        if (!jd) {
            return;
        }
        hydrate_from_job_description(frm, jd);
    },
});

// Restrict Company / Department / Designation to what Raise Requisition Scope
// actually permits this user, so the pickers can't offer a value that would be
// rejected at save. The server API is context-aware — a record only contributes
// values for a field when its other bases agree with what is already chosen —
// so the allowance is re-fetched whenever Company or Department changes.
//
// Only applied to NEW requisitions: the gate runs on insert, so an existing
// document must stay editable even if the scope has since been narrowed,
// otherwise its current values would become unselectable.
// Fields whose pickers get a scope filter installed. The server answers per
// fieldname and only mentions fields some assignment actually restricts, so a
// field scoped later needs adding here and nothing else.
const SCOPE_FILTERED_FIELDS = ["company", "department", "designation", "custom_location"];

function apply_scope_field_filters(frm) {
    if (!frm.is_new()) {
        return;
    }
    SCOPE_FILTERED_FIELDS.forEach((fieldname) => {
        if (!frm.fields_dict[fieldname]) {
            return;
        }
        frm.set_query(fieldname, () => {
            const allowance = (frm.__scope_allowance || {})[fieldname];
            // Absent means no assignment restricts this field, so the picker
            // stays open. Only an explicit, non-unrestricted entry narrows it.
            if (!allowance || allowance.unrestricted) {
                return {};
            }
            // No permitted values => match nothing, rather than falling back to
            // showing everything.
            return { filters: { name: ["in", allowance.values.length ? allowance.values : [""]] } };
        });
    });
    refresh_scope_allowance(frm);
}

function refresh_scope_allowance(frm) {
    if (!frm.is_new()) {
        return;
    }
    frappe.call({
        method: "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.allowed_requisition_values",
        args: {
            company: frm.doc.company || null,
            department: frm.doc.department || null,
            designation: frm.doc.designation || null,
            custom_location: frm.doc.custom_location || null,
        },
        callback(r) {
            frm.__scope_allowance = r.message || {};
        },
    });
}

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
// *attributes* on its User Assignments, matched against this requisition's field
// values. No matching config → no filter (full lists), so the flow is never
// blocked, and a field an assignment scopes by that is still empty defers rather
// than closes the picker.
//
// Every field that could be scoped by re-triggers the fetch. There is no list of
// scopeable fieldnames here on purpose: which fields matter is configuration on
// the assignments, so naming them client-side would mean a release every time
// somebody scopes by a new one. `department` / `designation` are the common ones
// and are wired explicitly; the rest arrive on the next refresh.
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
    department(frm) {
        apply_hiring_lead_config_filters(frm);
    },
    designation(frm) {
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
    const dialog = frappe.prompt(
        [
            {
                fieldname: "job_opening",
                label: __("Job Opening"),
                fieldtype: "Link",
                options: "Job Opening",
                reqd: 1,
                // A Job Opening belongs to at most one requisition, so the picker
                // must exclude openings already associated with another one —
                // otherwise they show up here and only fail on submit.
                get_query: () => {
                    const filters = { job_requisition: frm.doc.name };
                    if (frm.doc.company) filters.company = frm.doc.company;
                    if (frm.doc.designation) filters.designation = frm.doc.designation;
                    if (frm.doc.department) filters.department = frm.doc.department;
                    return {
                        query: "recruitment.api.job_requisition.unassociated_job_opening_query",
                        filters,
                    };
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

    prefill_new_opening_from_requisition(dialog, { frm });
}

// The picker's built-in "+ Create a new Job Opening" is Frappe's generic new-doc
// action, so it opens a blank opening — none of the requisition's details come
// with it. Point it at the same mapper "Actions → Create Job Opening" uses, so
// whichever way you get there the opening arrives pre-filled.
//
// Deliberately an override on THIS dialog's control instance only: Frappe reads
// `this.new_doc` each time it renders the dropdown (`item.action.apply(me)`), so
// nothing else — no other link field, doctype or the Activate flow itself —
// changes behaviour. `source` is {frm} from the form, {source_name} from the list.
function prefill_new_opening_from_requisition(dialog, source) {
    const field = dialog && dialog.fields_dict && dialog.fields_dict.job_opening;
    if (!field) return;

    field.new_doc = () => {
        dialog.hide();
        // hooks.py redirects this HRMS method to our own make_job_opening.
        frappe.model.open_mapped_doc({
            method: "hrms.hr.doctype.job_requisition.job_requisition.make_job_opening",
            ...source,
        });
    };
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
    frappe.db
        .get_value("Recruitment Settings", "Recruitment Settings", [
            "disable_editing_requisition_initiation_form",
            "allow_hiring_manager_override",
        ])
        .then((r) => {
            const s = (r && r.message) || {};

            // 1) Whole-form lock once the requisition exists. A brand-new
            //    requisition is always editable, so this one only applies to a
            //    saved document.
            if (!frm.is_new() && cint(s.disable_editing_requisition_initiation_form)) {
                frm.set_read_only();
                frm.disable_save();
                return; // everything is read-only; nothing else to toggle
            }

            // 2) "Requested By" is locked unless hiring-manager override is
            //    allowed — on a NEW requisition too, not only after it is saved.
            //    Locking it only afterwards meant the setting had no effect at
            //    the one moment it matters: choosing who the requisition is for.
            //    The React form applies the same rule, so both agree.
            frm.set_df_property(
                "requested_by",
                "read_only",
                cint(s.allow_hiring_manager_override) ? 0 : 1
            );
        });
}

// The requisition's own values, as the attribute engine wants them: scalars only,
// non-empty, no child tables and no framework bookkeeping. Sent whole rather than
// cherry-picked so scoping by a new Link field stays a configuration change —
// the engine reads only the fields its rows name and ignores everything else.
function requisition_attribute_context(frm) {
    const out = {};
    Object.keys(frm.doc || {}).forEach((key) => {
        if (key.startsWith("__")) {
            return;
        }
        const value = frm.doc[key];
        if (value === null || value === undefined || value === "" || typeof value === "object") {
            return;
        }
        out[key] = value;
    });
    return out;
}

function apply_hiring_lead_config_filters(frm) {
    frappe.call({
        method: "recruitment.recruitment.doctype.hiring_lead_configuration.hiring_lead_configuration.get_hiring_lead_config_users",
        args: {
            company: frm.doc.company,
            employee: frm.doc.requested_by,
            context: JSON.stringify(requisition_attribute_context(frm)),
        },
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

// ---------------------------------------------------------------------------
// Existing workforce vs. hiring already in flight.
//
// The numbers are stored on the requisition (written server-side after every
// save, see recruitment.api.requisition_headcount), so a saved form already has
// them. Two things are added here:
//
//  1. "Refresh Counts" — the masters move on after a requisition is raised, so
//     there has to be a way to re-read them without editing the document.
//  2. A live preview while the form is being filled in. The whole point of these
//     numbers is to inform the ASK, so waiting for the first save to see them is
//     too late: as soon as a designation and its regions are picked, the totals
//     are fetched and shown.
// ---------------------------------------------------------------------------

frappe.ui.form.on("Job Requisition", {
    refresh(frm) {
        if (frm.is_new()) {
            return;
        }
        frm.add_custom_button(__("Refresh Counts"), () => {
            frappe.call({
                method: "recruitment.api.requisition_headcount.refresh_requisition_headcount",
                args: { job_requisition: frm.doc.name },
                freeze: true,
                freeze_message: __("Re-reading the Employee master…"),
                callback(r) {
                    const totals = ((r && r.message) || {}).totals || {};
                    frappe.show_alert({
                        message: __("{0} active employees · {1} already being hired", [
                            totals.active_employees || 0,
                            totals.active_openings || 0,
                        ]),
                        indicator: "green",
                    });
                    frm.reload_doc();
                },
            });
        }, __("Actions"));
    },

    designation(frm) {
        preview_headcount(frm);
    },
});

// ---------------------------------------------------------------------------
// Over Budget banner. `custom_over_budget` marks a live requisition whose
// Department / Cost Center budget left no longer covers it (see
// recruitment.api.requisition_budget); the banner says which one and by how much.
//
// Rendered in its own block rather than the dashboard headline: HRMS's own
// refresh clears that headline to show its Employee Referral note, which would
// wipe this banner whenever both apply.
// ---------------------------------------------------------------------------

frappe.ui.form.on("Job Requisition", {
    refresh(frm) {
        frm.layout.wrapper.find(".over-budget-banner").remove();
        if (frm.is_new() || !frm.doc.custom_over_budget) {
            return;
        }
        const name = frm.doc.name;
        frappe.call({
            method: "recruitment.api.requisition_budget.get_budget_status",
            args: { job_requisition: name },
            callback(r) {
                const status = (r && r.message) || {};
                // The user may have moved to another requisition while this loaded.
                if (!status.over_budget || frm.doc.name !== name) {
                    return;
                }
                const rows = status.shortfalls
                    .map((row) => `<li>${frappe.utils.escape_html(row.summary)}</li>`)
                    .join("");
                frm.layout.wrapper.find(".over-budget-banner").remove();
                $(`<div class="form-message red over-budget-banner">
                        <div><b>${__("Over Budget")}</b>: ${__(
                            "the budget that is left no longer covers this requisition."
                        )}</div>
                        <ul class="mb-0 mt-1">${rows}</ul>
                    </div>`).insertBefore(frm.layout.message);
            },
        });
    },
});

frappe.ui.form.on("Job Requisition Region", {
    region(frm) {
        preview_headcount(frm);
    },
    custom_regions_remove(frm) {
        preview_headcount(frm);
    },
});

// A lateral requisition counts against its position rows' locations, not a region.
frappe.ui.form.on("Position Details", {
    location(frm) {
        preview_headcount(frm);
    },
    custom_position_details_remove(frm) {
        preview_headcount(frm);
    },
});

// The two flows are counted on different axes and must not be mixed:
//   fresher / campus -> the Regions table (headcount is budgeted per region)
//   lateral          -> each position row's Location, narrowed by the requisition's
//                       company + department + designation, because that is the
//                       exact job the requisition is asking for.
function preview_headcount(frm) {
    const regions = (frm.doc.custom_regions || []).map((r) => r.region).filter(Boolean);
    const locations = (frm.doc.custom_position_details || [])
        .map((r) => r.location)
        .filter(Boolean);
    const axis = regions.length ? "region" : locations.length ? "location" : null;

    // Nothing to count against yet — blank the totals rather than leaving a stale
    // number from the previous designation sitting on screen.
    if (!frm.doc.designation || !axis) {
        set_headcount_totals(frm, {});
        return;
    }

    frappe.call({
        method: "recruitment.api.requisition_headcount.preview_headcount",
        args: {
            designation: frm.doc.designation,
            regions: axis === "region" ? regions : [],
            locations: axis === "location" ? locations : [],
            company: frm.doc.company,
            department: frm.doc.department,
            job_requisition: frm.is_new() ? null : frm.doc.name,
        },
        callback(r) {
            const res = (r && r.message) || {};
            set_headcount_totals(frm, res.totals || {});

            const byKey = {};
            (res.rows || []).forEach((row) => {
                byKey[row.key] = row;
            });

            if (res.axis === "region") {
                // Each region row shows its own strength, exactly as it will read
                // once saved.
                (frm.doc.custom_regions || []).forEach((row) => {
                    const c = byKey[row.region] || {};
                    row.active_employees = c.active_employees || 0;
                    row.active_requisitions = c.active_requisitions || 0;
                    row.active_openings = c.active_openings || 0;
                });
                frm.refresh_field("custom_regions");
            } else if (res.axis === "location") {
                // Rows sharing a branch all show that branch's number; the totals
                // above count each branch once.
                (frm.doc.custom_position_details || []).forEach((row) => {
                    const c = byKey[row.location] || {};
                    row.active_employees = c.active_employees || 0;
                });
                frm.refresh_field("custom_position_details");
            }
        },
    });
}

function set_headcount_totals(frm, totals) {
    // display-only: these are recomputed and stored server-side on save, so the
    // preview must not make the form dirty.
    ["active_employees", "active_requisitions", "active_openings"].forEach((key) => {
        const fieldname = "custom_" + key;
        if (frm.fields_dict[fieldname]) {
            frm.doc[fieldname] = totals[key] || 0;
            frm.refresh_field(fieldname);
        }
    });
}
