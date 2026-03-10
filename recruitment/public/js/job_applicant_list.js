frappe.listview_settings['Job Applicant'] = {

    onload(listview) {

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Recruitment Settings",
                name: "Recruitment Settings"
            },
            callback: function(r) {

                if (!r.message.allow_bulk_job_offer) return;

                listview.page.add_action_item("Create Job Offer", function() {

                    let selected = listview.get_checked_items();

                    if (!selected.length) {
                        frappe.msgprint("Please select Job Applicants");
                        return;
                    }

                    frappe.confirm(
                        "Create Job Offers for selected applicants?",
                        function() {

                            let applicants = selected.map(d => d.name);

                            frappe.call({
                                method: "recruitment.api.bulk_job_offer.create_bulk_job_offer",
                                args: { applicants: JSON.stringify(applicants) },
                                callback: function(r) {

                                    frappe.msgprint(
                                        "Created: " + r.message.created +
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