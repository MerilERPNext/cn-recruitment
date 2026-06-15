// Bulk "Statutory Forms" actions on the Employee Onboarding list view.
//
// Mirrors the per-record buttons in employee_onboarding_statutory.js: HR selects
// one or more onboardings, then picks PF Form 11, Gratuity Nomination, or both.
// Each selected onboarding is autofilled, rendered to PDF and attached back onto
// its Statutory tab fields server-side (recruitment.recruitment.statutory_forms).
//
// The actions appear in the list "Actions" menu (shown only when rows are
// checked) and only when `Onboarding Settings.enable_statutory_forms_button`
// is on — the same global gate as the on-form buttons.

frappe.listview_settings["Employee Onboarding"] = {
    onload(listview) {
        frappe.db
            .get_single_value("Onboarding Settings", "enable_statutory_forms_button")
            .then((enabled) => {
                if (!enabled) return;

                listview.page.add_action_item(__("Generate PF Form 11"), () =>
                    runBulkStatutory(listview, "pf")
                );
                listview.page.add_action_item(__("Generate Gratuity Nomination"), () =>
                    runBulkStatutory(listview, "gratuity")
                );
                listview.page.add_action_item(__("Generate Both (PF + Gratuity)"), () =>
                    runBulkStatutory(listview, "all")
                );
            });
    },
};

function runBulkStatutory(listview, mode) {
    const selected = listview.get_checked_items();
    if (!selected.length) {
        frappe.msgprint(__("Please select at least one Employee Onboarding."));
        return;
    }

    const names = selected.map((d) => d.name);
    const labelByMode = {
        pf: __("PF Form 11"),
        gratuity: __("Gratuity Nomination"),
        all: __("PF Form 11 + Gratuity Nomination"),
    };

    frappe.confirm(
        __("Generate {0} for {1} selected onboarding(s)? Existing PDFs are overwritten unless a form is Signed or Filed.", [
            labelByMode[mode],
            names.length,
        ]),
        () => {
            frappe.call({
                method: "recruitment.recruitment.statutory_forms.generate_bulk",
                args: { onboarding_names: JSON.stringify(names), mode: mode, force: 1 },
                freeze: true,
                freeze_message: __("Generating statutory forms..."),
                callback: (r) => {
                    const res = r.message || {};
                    frappe.msgprint({
                        title: __("Statutory Forms"),
                        indicator: res.failed ? "orange" : "green",
                        message: __("Processed: {0}<br>✔ Generated: {1}<br>⏭ Skipped (locked): {2}<br>✖ Failed: {3}", [
                            res.processed || 0,
                            res.succeeded || 0,
                            res.skipped || 0,
                            res.failed || 0,
                        ]),
                    });
                    if (listview.clear_checked_items) listview.clear_checked_items();
                    listview.refresh();
                },
            });
        }
    );
}
