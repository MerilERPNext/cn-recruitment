frappe.listview_settings['Job Offer'] = {

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
            "Awaiting Response\nAccepted\nRejected";
    }
};