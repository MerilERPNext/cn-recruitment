frappe.listview_settings['Job Offer'] = {

    onload(listview) {

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

                    frappe.confirm(
                        "Send Job Offer emails to selected candidates?",
                        function() {

                            let job_offers = selected.map(d => d.name);

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

                        }
                    );

                });

            }
        });

    }

};