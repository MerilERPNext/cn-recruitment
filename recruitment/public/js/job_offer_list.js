// frappe.listview_settings['Job Offer'] = {

//     onload(listview) {

//         frappe.call({
//             method: "frappe.client.get",
//             args: {
//                 doctype: "Recruitment Settings",
//                 name: "Recruitment Settings"
//             },
//             callback: function(r) {

//                 if (!r.message.allow_bulk_job_offer_email) return;

//                 listview.page.add_action_item("Send Job Offer", function() {

//                     let selected = listview.get_checked_items();

//                     if (!selected.length) {
//                         frappe.msgprint("Please select Job Offers");
//                         return;
//                     }

//                     frappe.confirm(
//                         "Send Job Offer emails to selected candidates?",
//                         function() {

//                             let job_offers = selected.map(d => d.name);

//                             frappe.call({
//                                 method: "recruitment.api.bulk_job_offer.send_bulk_job_offer",
//                                 args: {
//                                     job_offers: JSON.stringify(job_offers)
//                                 },
//                                 callback: function(r) {

//                                     frappe.msgprint(
//                                         "Emails Sent: " + r.message.sent +
//                                         "<br>Skipped: " + r.message.skipped +
//                                         "<br>Failed: " + r.message.failed
//                                     );

//                                     listview.refresh();

//                                 }
//                             });

//                         }
//                     );

//                 });

//             }
//         });

//     }

// };

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

    }

};