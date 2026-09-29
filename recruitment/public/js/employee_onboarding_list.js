// Bulk "Statutory Forms" actions on the Employee Onboarding list view.
//
// Mirrors the per-record buttons in employee_onboarding_statutory.js: HR selects
// one or more onboardings, then picks PF Form 11, Gratuity Nomination, or both.
// Each selected onboarding is autofilled, rendered to PDF and attached back onto
// its Statutory tab fields server-side (recruitment.recruitment.statutory_forms).
//
// The actions appear in the list "Actions" menu (shown only when rows are
// checked) and only when `Onboarding Settings.enable_statutory_forms_button`
// is on — the same global gate as the on-form buttons. In addition, only
// onboardings whose form is approved by the SPOC are processed; any other
// selected rows are skipped with a clear message. The list menu items can't be
// shown/hidden per selection, so this is enforced on click.
//
// "Approved by SPOC" is the doc-level rollup in `boarding_status`, which
// field_level_approval._derive_boarding_status sets to "Completed" exactly when
// every visible portal field has been approved.

frappe.listview_settings["Employee Onboarding"] = {
    // Make sure the approval rollup is available on each checked row so we can
    // gate on it. Every fieldname here goes into the list's reportview query, so
    // it must be a real field — an unknown one makes the whole list fail to load
    // with "Field not permitted in query".
    add_fields: ["boarding_status"],

    onload(listview) {
        // Accepted candidates / new hires who have no onboarding yet, with an
        // Initiate button per row.
        listview.page.add_inner_button(__("Pending Initiation"), () =>
            frappe.set_route("query-report", "Onboarding Pending Initiation")
        );

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

    // Only SPOC-approved onboardings (boarding_status = Completed) qualify; skip the rest.
    const approved = selected.filter((d) => d.boarding_status === "Completed");
    const skipped_not_approved = selected.length - approved.length;

    if (!approved.length) {
        frappe.msgprint(
            __("Statutory forms can only be generated for onboardings whose form is Approved by the SPOC. None of the selected records qualify.")
        );
        return;
    }

    const names = approved.map((d) => d.name);
    const labelByMode = {
        pf: __("PF Form 11"),
        gratuity: __("Gratuity Nomination"),
        all: __("PF Form 11 + Gratuity Nomination"),
    };

    const skip_note = skipped_not_approved
        ? __("<br><br>{0} selected record(s) are not Approved and will be skipped.", [skipped_not_approved])
        : "";

    frappe.confirm(
        __("Generate {0} for {1} Approved onboarding(s)? Existing PDFs are overwritten unless a form is Signed or Filed.", [
            labelByMode[mode],
            names.length,
        ]) + skip_note,
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
