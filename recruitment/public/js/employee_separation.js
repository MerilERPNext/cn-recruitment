frappe.ui.form.on("Employee Separation", {
    refresh: function (frm) {
        if (frappe.session.user !== "Administrator" && frm.is_new()) {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Employee",
                    filters: { user_id: frappe.session.user },
                    fieldname: "name",
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_value("employee", r.message.name);
                    }
                },
            });
        }
    },
    custom_final_last_working_day: async function (frm) {
        if (frm.doc.custom_final_last_working_day) {
            let boardingDate = frappe.datetime.add_days(frm.doc.custom_final_last_working_day, -2);

            if (frm.doc.employee) {
                // Call Frappe API to check holidays
                let newBoardingDate = await check_and_adjust_holiday(boardingDate, frm.doc.employee);
                frm.set_value("boarding_begins_on", newBoardingDate);
            } else {
               frm.set_value("boarding_begins_on", boardingDate);
            }
        }
    },

    custom_manual_relieving: function (frm) {
        if (frm.doc.custom_manual_relieving == 0) {
            frm.set_value("custom_manual_relieving_date", "");
        }
    },

    custom_manual_relieving_date: function (frm) {
        if (frm.doc.custom_manual_relieving_date) {
            frappe.call({
                method: "recruitment.www.job_offer.custom_manual_relieving_date",
                args:{doc: frm.doc},
                callback: function (r) {
                    if (r.message) {
                        console.log(r.message)
                        frm.set_value("custom_final_last_working_day", r.message.relieving_date);
                        frm.set_value("custom_number_days_served", r.message.days_served);
                        frm.set_value("custom_exceeding_noof_days", r.message.days_exceeded === 0 ? "" : r.message.days_exceeded);
                        frm.set_value("custom_notice_period_served_", r.message.custom_notice_period_served);
                    }
                }
            })
        } else {
            frm.set_value("custom_final_last_working_day", frm.doc.custom_last_working_date);
            frm.set_value("custom_number_days_served", "");
            frm.set_value("custom_exceeding_noof_days", "");
            frm.set_value("custom_notice_period_served_","");
        }
    }
});

// Function to check holidays and adjust date
async function check_and_adjust_holiday(date, employee) {
    let newDate = date;

    while (true) {
        let response = await frappe.call({
            method: "recruitment.www.job_offer.get_next_working_day",
            args: { date: frappe.datetime.obj_to_str(newDate), employee: employee }
        });
        if (response.message) {
            return response.message
        }
    }
}

frappe.ui.form.on("Employee Separation", {
    employee: async function(frm) {
        await set_actual_last_working_date(frm);
    },
    before_save: async function(frm) {
        if (!frm.doc.custom_final_last_working_day) {
            await set_actual_last_working_date(frm);
        }
    }
});

async function set_actual_last_working_date(frm) {
    if (!frm.doc.employee) return;

    let resignation_date = frm.doc.custom_resignation_date || frappe.datetime.get_today();

    let r = await frappe.call({
        method: "recruitment.customizations.employee_separation.employee_separation.calculate_lwd_api",
        args: {
            employee: frm.doc.employee,
            resignation_date: resignation_date
        }
    });

    if (r && r.message) {
        await frm.set_value("custom_final_last_working_day", r.message);
    }
}


frappe.ui.form.on('Employee Separation', {
    async onload_post_render(frm) {
        if (frm.doc.name && !frm.__form_conversations_loaded) {
            frm.__form_conversations_loaded = true;

            let r = await frappe.call({
                method: "nextai.api.chatnext.form_conversation.get_all_from_doc",
                args: {
                    doctype: "Employee Separation",
                    docname: frm.doc.name
                }
            });

            if (r.message && Array.isArray(r.message)) {
                const users = [...new Set(r.message.map(item => item.user).filter(u => u))];

                const userNameMap = {};
                await Promise.all(users.map(async (user) => {
                    try {
                        let res = await frappe.db.get_value("User", user, "full_name");
                        userNameMap[user] = (res && res.message && res.message.full_name) || "Unknown";
                    } catch (e) {
                        userNameMap[user] = "Unknown";
                    }
                }));

                let html = `
                <style>
                .frappe-table-wrapper {
                    overflow-x: auto;
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    box-shadow: 0 0 10px rgb(0 0 0 / 0.1);
                    background-color: #fff;
                    padding: 10px;
                    font-family: "Open Sans", Arial, sans-serif;
                    font-size: 14px;
                }
                .frappe-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                    border: 1px solid #ddd;
                    background-color: #fff;
                }
                .frappe-table th, .frappe-table td {
                    padding: 12px 15px;
                    border: 1px solid #ddd;
                    text-align: left;
                    vertical-align: top;
                }
                .frappe-table thead {
                    background-color: #f5f6f7;
                    color: #555;
                    font-weight: 600;
                }
                .frappe-table tbody tr:hover {
                    background-color: #f1f7fb;
                }
                .form-header {
                    font-weight: 600;
                    font-size: 15px;
                    margin-bottom: 8px;
                    color: #333;
                    cursor: pointer;
                    user-select: none;
                }
                .form-meta {
                    font-size: 12px;
                    color: #777;
                    margin-bottom: 12px;
                }
                .form-details {
                    display: none;
                    margin-top: 10px;
                }
                </style>

                <script>
                function toggleFormDetails(id) {
                    var el = document.getElementById(id);
                    if (el.style.display === "none" || el.style.display === "") {
                        var allDetails = document.getElementsByClassName('form-details');
                        for (var i = 0; i < allDetails.length; i++) {
                            allDetails[i].style.display = 'none';
                        }
                        el.style.display = "block";
                    } else {
                        el.style.display = "none";
                    }
                }
                </script>`;

                r.message.forEach(function(item, idx) {
                    let container_id = "form-details-" + (idx + 1);

                    let parsedMessage;
                    try {
                        parsedMessage = JSON.parse(item.message);
                    } catch (e) {
                        parsedMessage = null;
                    }
                    if (!parsedMessage) return;

                    let components = (parsedMessage.form && parsedMessage.form.components) || [];
                    let submission = parsedMessage.submission_data || {};
                    let user_name = userNameMap[item.user] || "Unknown";

                    html += `
                    <div class="frappe-table-wrapper">
                        <div class="form-header" onclick="toggleFormDetails('${container_id}')">
                            Form Submission #${idx + 1} &mdash; Submitted by: ${user_name} | Created: ${item.creation}
                        </div>
                        <div id="${container_id}" class="form-details">
                            <table class="frappe-table">
                                <thead>
                                    <tr><th>Question</th><th>Answer</th></tr>
                                </thead>
                                <tbody>`;

                    let rows_count = 0;
                    components.forEach(function(comp) {
                        let question = comp.label;
                        let key = comp.key;
                        if (!question || !key) return;

                        let answer = submission[key];
                        if (answer === null || answer === undefined || answer === true || answer === false || answer === 'submit') return;

                        let answerStr;
                        if (typeof answer === "object" && !Array.isArray(answer)) {
                            let checked = Object.entries(answer).filter(([k,v]) => v).map(([k]) => k);
                            answerStr = checked.length ? checked.join(", ") : "None";
                        } else {
                            answerStr = String(answer);
                        }

                        html += `<tr><td>${question}</td><td>${answerStr}</td></tr>`;
                        rows_count++;
                    });

                    if (rows_count === 0) {
                        html += `<tr><td colspan="2" style="text-align:center; color:#999;">No answers found in this form submission</td></tr>`;
                    }

                    html += `</tbody></table></div></div>`;
                });

                frm.fields_dict['custom_form_details'].html(html);
            } else {
                frm.fields_dict['custom_form_details'].html('<p style="color:#999; text-align:center;">No form submissions found.</p>');
            }
        }
    }
});
