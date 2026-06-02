// Phase-1 Onboarding: single-task trigger button on the Task form.
//
// Shown only when the Task belongs to an Employee Onboarding project and is
// still Open. Click sends the email named `<Task.subject>` to the candidate
// and marks the Task Completed.

frappe.ui.form.on("Task", {
    async refresh(frm) {
        if (frm.is_new()) return;
        if (!frm.doc.project) return;
        if (frm.doc.status === "Completed" || frm.doc.status === "Cancelled") return;

        // Task.project stores the Project autoname (e.g. PROJ-0001), not its
        // display name. Look up whether an Employee Onboarding owns this
        // Project before showing the trigger button.
        const onboarding_exists = await frappe.db.get_value(
            "Employee Onboarding",
            { project: frm.doc.project },
            "name"
        );
        if (!onboarding_exists?.message?.name) return;

        frm.add_custom_button(
            __("Send Interaction Email & Mark Done"),
            () => {
                frappe.confirm(
                    __("Send '{0}' email to the candidate and mark this Task Completed?",
                        [frm.doc.subject]),
                    () => {
                        frappe.call({
                            method: "recruitment.recruitment.onboarding_extras.trigger_interaction_email",
                            args: { task: frm.doc.name },
                            freeze: true,
                            freeze_message: __("Sending..."),
                            callback: (r) => {
                                const m = r.message;
                                if (m && m.ok) {
                                    frappe.show_alert({
                                        message: __("Sent to {0}", [m.sent_to]),
                                        indicator: "green",
                                    });
                                    frm.reload_doc();
                                }
                            },
                        });
                    }
                );
            },
            __("Onboarding")
        );
    },
});
