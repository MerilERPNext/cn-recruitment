// Phase-1 Onboarding: bulk-trigger interaction emails from the Task list.
//
// Adds a "Send Interaction Email & Mark Done" action to the Task list view's
// Actions menu. Operates only on selected Tasks whose project is an Employee
// Onboarding project; the backend rejects others with a clear error.
//
// Usage:
//   1. HR opens /app/task
//   2. Filters: subject = "Culture Book Mailer" (or whichever interaction),
//               status = Open,
//               project LIKE "Employee Onboarding%"
//   3. Selects rows -> Actions -> "Send Interaction Email & Mark Done"

frappe.listview_settings = frappe.listview_settings || {};
frappe.listview_settings["Task"] = frappe.listview_settings["Task"] || {};

(function () {
    const original_onload = frappe.listview_settings["Task"].onload;

    frappe.listview_settings["Task"].onload = function (listview) {
        if (typeof original_onload === "function") {
            try { original_onload(listview); } catch (e) { console.error(e); }
        }

        listview.page.add_actions_menu_item(
            __("Send Interaction Email & Mark Done"),
            () => {
                const selected = listview.get_checked_items() || [];
                if (!selected.length) {
                    frappe.msgprint({
                        title: __("No tasks selected"),
                        message: __("Tick the rows you want to trigger, then re-open this action."),
                        indicator: "orange",
                    });
                    return;
                }

                // Filter out tasks with no project upfront; backend rejects
                // (with a clear per-task error) any project that isn't tied to
                // an Employee Onboarding record.
                const without_project = selected.filter((t) => !t.project);
                if (without_project.length === selected.length) {
                    frappe.msgprint({
                        title: __("Selected tasks have no project"),
                        message: __("Pick Tasks that belong to an Employee Onboarding project."),
                        indicator: "red",
                    });
                    return;
                }

                const subjects = [...new Set(selected.map((t) => t.subject))];
                const subject_summary = subjects.length === 1
                    ? `'${subjects[0]}'`
                    : __("{0} different interaction types", [subjects.length]);

                frappe.confirm(
                    __("Send {0} to {1} candidate(s) and mark these Tasks Completed?",
                        [subject_summary, selected.length]),
                    () => {
                        frappe.call({
                            method: "recruitment.recruitment.onboarding_extras.bulk_trigger_interactions",
                            args: { tasks: selected.map((t) => t.name) },
                            freeze: true,
                            freeze_message: __("Sending interaction emails..."),
                            callback: (r) => {
                                const m = r.message || {};
                                const indicator = m.failed ? "orange" : "green";
                                let msg = __("Sent: {0}, Failed: {1}", [m.sent || 0, m.failed || 0]);
                                if (m.errors && m.errors.length) {
                                    msg += "<br><br><b>Errors:</b><br>" +
                                        m.errors.map(frappe.utils.escape_html).join("<br>");
                                }
                                frappe.msgprint({
                                    title: __("Interaction Trigger Result"),
                                    message: msg,
                                    indicator,
                                });
                                listview.refresh();
                            },
                        });
                    }
                );
            },
            false
        );
    };
})();
