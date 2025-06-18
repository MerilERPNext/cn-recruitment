window.setup_teams_buttons = function (frm, config, participant_config = {}) {

    frappe.call({
        method: "recruitment.recruitment.doctype.microsoft_teams_app_settings.microsoft_teams_app_settings.is_teams_enabled",
        callback(enabled_res) {
            if (!enabled_res.message) return;

            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Microsoft Teams User Token",
                    filters: { user: frappe.session.user },
                    fieldname: "name"
                },
                callback(r) {
                    const token_exists = !!(r.message && r.message.name);
                    const link = frm.doc[config.zoom_link_field];
                    const calendar_id = frm.doc[config.event_id_field];

                    if (!token_exists) {
                    frm.add_custom_button('Authorize Teams', () => {
                        const doctype = frm.doctype;
                        const docname = frm.doc.name;


                        if (!doctype || !docname) {
                            frappe.msgprint("Missing document context for Teams authorization.");
                            return;
                        }

                        frappe.call({
                            method: "recruitment.customizations.interview.interview.get_teams_auth_url",
                            args: {
                                user_id: frappe.session.user,
                                doctype,
                                docname
                            },
                            callback: function(r) {
                                if (r.message) {
                                    window.open(r.message, '_blank');
                                } else {
                                    console.warn("No auth URL returned.");
                                }
                            }
                        });
                    }, 'Teams Actions');
                }



                    if (token_exists && (!link || !calendar_id)) {
                        frm.add_custom_button('Schedule Teams Meeting', () => {

                            frappe.call({
                                method: "recruitment.customizations.interview.interview.schedule_teams_meeting",
                                args: {
                                    doctype: frm.doctype,
                                    docname: frm.doc.name,
                                    field_config: JSON.stringify(config),
                                    participant_config: JSON.stringify(participant_config),
                                },
                                callback: function(r) {
                                    if (r.message) {
                                        frappe.msgprint(`Meeting Scheduled: <a href="${r.message}" target="_blank">Join</a>`);
                                        frm.reload_doc();
                                    }
                                }
                            });
                        }, 'Teams Actions');
                    }

                    if (link && calendar_id) {
                        frm.add_custom_button('Reschedule Teams Meeting', () => {
                            let d = new frappe.ui.Dialog({
                                title: 'Reschedule Teams Meeting',
                                fields: [
                                    { fieldname: 'scheduled_on', fieldtype: 'Date', label: 'New Scheduled On', reqd: 1, default: frm.doc[config.scheduled_on_field] },
                                    { fieldname: 'from_time', fieldtype: 'Time', label: 'New From Time', reqd: 1, default: frm.doc[config.from_time_field] },
                                    { fieldname: 'to_time', fieldtype: 'Time', label: 'New To Time', reqd: 1, default: frm.doc[config.to_time_field] }
                                ],
                                primary_action_label: 'Reschedule',
                                primary_action(values) {
                                    d.hide();

                                    frappe.call({
                                        method: "recruitment.customizations.interview.interview.reschedule_teams_meeting",
                                        args: {
                                            doctype: frm.doctype,
                                            docname: frm.doc.name,
                                            field_config: JSON.stringify(config),
                                            participant_config: JSON.stringify(participant_config),
                                            scheduled_on: values.scheduled_on,
                                            from_time: values.from_time,
                                            to_time: values.to_time
                                        },
                                        callback: function(r) {
                                            if (r.message) {
                                                frappe.msgprint(`Meeting Rescheduled: <a href="${r.message}" target="_blank">Join</a>`);
                                                frm.reload_doc();
                                            }
                                        }
                                    });
                                }
                            });
                            d.show();
                        }, 'Teams Actions');

                        frm.add_custom_button('Cancel Teams Meeting', () => {
                            frappe.confirm('Are you sure you want to cancel the meeting?', () => {
                                frappe.call({
                                    method: 'recruitment.customizations.interview.interview.cancel_teams_meeting',
                                    args: {
                                        doctype: frm.doctype,
                                        docname: frm.doc.name,
                                        field_config: config
                                    },
                                    callback: function(r) {
                                        if (r.message) {
                                            frappe.msgprint(r.message);
                                            frm.reload_doc();
                                        }
                                    }
                                });
                            });
                        }, 'Teams Actions');
                    }
                }
            });
        }
    });
}
