frappe.ui.form.on("Exit Interview", {
    refresh: function(frm) {
        if (frm.is_new()) return;

        const allowed_statuses = ["Pending", "Scheduled", "Rescheduled"];
        if (allowed_statuses.includes(frm.doc.status)) {
            frm.add_custom_button("Reschedule", () => {
                let d = new frappe.ui.Dialog({
                    title: 'Reschedule Exit Interview',
                    fields: [
                        {
                            label: 'New Date',
                            fieldname: 'new_date',
                            fieldtype: 'Date',
                            reqd: true
                        }
                    ],
                    primary_action_label: 'Submit',
                    primary_action(values) {
                        frm.set_value("date", values.new_date);
                        frm.set_value("status", "Rescheduled");
                        frm.save();
                        d.hide();
                    }
                });
                d.show();
            });
        }
        const current_user = frappe.session.user;
        const interviewers = frm.doc.interviewers || [];

        const is_interviewer = interviewers.some(i => i.user === current_user);
        if (is_interviewer && !frm.is_new()) {
            frm.add_custom_button("Submit Feedback", () => {
                frm.events.open_feedback_dialog(frm);
            });
        }

        // Load comments if any
        frm.events.render_feedback_html(frm);

        setup_teams_buttons(frm, {
            scheduled_on_field: 'date',
            from_time_field: 'custom_from_time',
            to_time_field: 'custom_to_time',
            zoom_link_field: 'custom_meeting_link',
            event_id_field: 'custom_calendar_event_id',
            meeting_status_field: 'custom_meeting_status'
        }, {
            candidate_email_field: 'email',
            interviewers_field: 'interviewers',
            interviewers_fieldtype: 'Table MultiSelect'
        });
    },

    open_feedback_dialog: function (frm) {
        const d = new frappe.ui.Dialog({
            title: "Submit Interview Summary",
            fields: [
                {
                    fieldname: "note",
                    label: "Summary / Comment",
                    fieldtype: "Small Text",
                    reqd: 1
                }
            ],
            primary_action_label: "Submit",
            primary_action(values) {
                const row = frm.add_child("custom_comment", {
                    note: values.note,
                    added_by: frappe.session.user,
                    added_on: frappe.datetime.now_datetime()
                });

                frm.refresh_field("custom_comment");

                // Toggle hidden field to force save
                // frm.set_value("custom_approval_pending_from_management", frm.doc.custom_approval_pending_from_management ? 0 : 1);

                frm.save().then(() => {
                    frm.events.render_feedback_html(frm);
                    d.hide();
                });
            }
        });

        d.show();
    },

    render_feedback_html: function (frm) {
        const wrapper = frm.fields_dict.custom_comments.$wrapper;
        wrapper.empty();
    
        if (frm.doc.custom_comment && frm.doc.custom_comment.length) {
            const user_ids = frm.doc.custom_comment.map(row => row.added_by);
    
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "User",
                    filters: { name: ["in", user_ids] },
                    fields: ["name", "full_name"]
                },
                callback: function (r) {
                    const userMap = {};
                    r.message.forEach(u => {
                        userMap[u.name] = u.full_name;
                    });
    
                    let table_html = `
                        <table class="table table-bordered" style="margin-top: 10px;">
                            <thead>
                                <tr>
                                    <th style="width: 25%;">Added By</th>
                                    <th style="width: 50%;">Comment</th>
                                    <th style="width: 25%;">Added On</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
    
                    // Sort comments by newest first
                    const sorted = frm.doc.custom_comment.sort((a, b) =>
                        new Date(b.added_on) - new Date(a.added_on)
                    );
    
                    sorted.forEach(row => {
                        const full_name = userMap[row.added_by] || row.added_by;
                        table_html += `
                            <tr>
                                <td>${full_name}</td>
                                <td>${frappe.utils.escape_html(row.note)}</td>
                                <td>${frappe.datetime.str_to_user(row.added_on)}</td>
                            </tr>
                        `;
                    });
    
                    table_html += `</tbody></table>`;
                    wrapper.html(table_html);
                }
            });
        } else {
            wrapper.html(`<p>No comments submitted yet.</p>`);
        }
    }
    
});
