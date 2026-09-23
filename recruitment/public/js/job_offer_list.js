// Bulk "Notify HR Ops" — the list-view half of the handover on the Job Offer form.
// Added only when Recruitment Settings -> Require HR Ops Verification Before Sending
// Offer is on. Cancelled and already-notified offers are sorted out by the server,
// which reports them back in the counts.
function add_notify_hr_ops_action(listview) {

    listview.page.add_action_item("Notify HR Ops", function() {

        let selected = listview.get_checked_items();

        if (!selected.length) {
            frappe.msgprint("Please select Job Offers");
            return;
        }

        frappe.confirm(
            `Notify HR Ops to verify and release ${selected.length} offer(s)?`,
            function() {

                frappe.call({
                    method: "recruitment.api.hr_ops_notify.notify_hr_ops",
                    args: {
                        job_offers: JSON.stringify(selected.map(d => d.name))
                    },
                    freeze: true,
                    freeze_message: "Notifying HR Ops…",
                    callback: function(r) {

                        let m = r.message || {};

                        frappe.msgprint(
                            "Notified: " + (m.notified || 0) +
                            (m.already_notified ? "<br>Already Notified: " + m.already_notified : "") +
                            (m.skipped ? "<br>Skipped (Cancelled): " + m.skipped : "") +
                            "<br>Failed: " + (m.failed || 0)
                        );

                        listview.refresh();
                    }
                });

            }
        );

    });
}

frappe.listview_settings['Job Offer'] = {

    // Draft -> Awaiting Response (sent) -> Accepted / Rejected / Withdrawn /
    // Expired (validity period passed unanswered). Also
    // drives the form header, which otherwise reads "Draft" for any unsubmitted
    // offer whatever its status.
    add_fields: ["status"],
    has_indicator_for_draft: 1,
    get_indicator(doc) {
        const colours = {
            "Draft": "gray",
            "Awaiting Response": "orange",
            "Accepted": "green",
            "Rejected": "red",
            "Withdrawn": "darkgrey",
            "Expired": "darkgrey",
        };
        if (doc.docstatus === 2) return [__("Cancelled"), "red", "docstatus,=,2"];
        const status = doc.status || "Draft";
        return [__(status), colours[status] || "gray", "status,=," + status];
    },

    onload(listview) {

        const df = {
            fieldname: "docstatus",
            label: "Document Status",
            fieldtype: "Select",
            input_class: "input-xs",
            is_filter: 1,
            options: "0\n1\n2",
            onchange: function() {
                listview.refresh();
            }
        };

        let standard_filters_wrapper = listview.page.page_form.find('.standard-filter-section');
        listview.page.add_field(df, standard_filters_wrapper);

        setTimeout(() => {

            let doc_filter = listview.page.page_form
                .find('select[data-fieldname="docstatus"]')[0];

            if (doc_filter) {
                doc_filter.innerHTML = "";
                doc_filter.add(new Option("", ""));
                doc_filter.add(new Option("Draft", "0"));
                doc_filter.add(new Option("Submitted", "1"));
                doc_filter.add(new Option("Cancelled", "2"));
            }

            let status_filter = listview.page.page_form
                .find('select[data-fieldname="status"]');

            if (status_filter.length) {
                status_filter.find('option[value="Cancelled"]').remove();
            }

        }, 300);


        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Recruitment Settings",
                name: "Recruitment Settings"
            },
            callback: function(r) {

                // Recruitment Settings -> Require HR Ops Verification Before Sending
                // Offer. Off (the default) means this whole block behaves exactly as
                // it did before: no extra action, no extra gate on sending.
                if (r.message.enable_hr_ops_offer_verification) {
                    add_notify_hr_ops_action(listview);
                }

                if (!r.message.allow_bulk_job_offer_email) return;

                listview.page.add_action_item("Send Job Offer", function() {

                    let selected = listview.get_checked_items();

                    if (!selected.length) {
                        frappe.msgprint("Please select Job Offers");
                        return;
                    }

                    let submitted = selected.filter(d => d.docstatus === 1);
                    let not_submitted = selected.filter(d => d.docstatus !== 1);

                    if (!submitted.length) {
                        frappe.msgprint("Only submitted Job Offers can be sent.");
                        return;
                    }

                    let message = `
                        You selected ${selected.length} record(s).<br><br>
                        ✔ Will Send: ${submitted.length}<br>
                        ✖ Skipped (Not Submitted): ${not_submitted.length}<br><br>
                        Do you want to proceed?
                    `;

                    frappe.confirm(message, function() {

                        let job_offers = submitted.map(d => d.name);

                        frappe.call({
                            method: "recruitment.api.bulk_job_offer.send_bulk_job_offer",
                            args: {
                                job_offers: JSON.stringify(job_offers)
                            },
                            callback: function(r) {

                                frappe.msgprint(
                                    "Emails Sent: " + r.message.sent +
                                    "<br>Skipped: " + r.message.skipped +
                                    (r.message.already_sent ? " (already sent: " + r.message.already_sent + ")" : "") +
                                    // Only ever non-zero while HR Ops verification is on.
                                    (r.message.pending_hr_ops
                                        ? "<br>Pending HR Ops verification: " + r.message.pending_hr_ops
                                        : "") +
                                    "<br>Failed: " + r.message.failed
                                );

                                listview.refresh();
                            }
                        });

                    });

                });

            }
        });

    },

    before_render: function() {
        frappe.meta.get_docfield("Job Offer", "status").options =
            "Draft\nAwaiting Response\nAccepted\nRejected\nWithdrawn\nExpired";
    }
};