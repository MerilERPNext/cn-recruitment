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
    custom_actual_last_working_date: async function (frm) {
        if (frm.doc.custom_actual_last_working_date) {
            let boardingDate = frappe.datetime.add_days(frm.doc.custom_actual_last_working_date, -2);

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
                        frm.set_value("custom_actual_last_working_date", r.message.relieving_date);
                        frm.set_value("custom_number_days_served", r.message.days_served);
                        frm.set_value("custom_exceeding_noof_days", r.message.days_exceeded === 0 ? "" : r.message.days_exceeded);
                        frm.set_value("custom_notice_period_served_", r.message.custom_notice_period_served);
                    }
                }
            })
        } else {
            frm.set_value("custom_actual_last_working_date", frm.doc.custom_last_working_date);
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
        if (!frm.doc.custom_actual_last_working_date) {
            await set_actual_last_working_date(frm);
        }
    }
});

async function set_actual_last_working_date(frm) {
    if (!frm.doc.employee) return;

    let resignation_date = frm.doc.custom_resignation_date || frappe.datetime.get_today();

    let emp = await frappe.db.get_value("Employee", frm.doc.employee, "employment_type");
    if (emp && emp.message && emp.message.employment_type) {
        let type = await frappe.db.get_value("Employment Type", emp.message.employment_type, "custom_notice_period_days");
        if (type && type.message) {
            let notice_period_days = type.message.custom_notice_period_days || 0;

            let last_working_date = frappe.datetime.add_days(resignation_date, notice_period_days);

            await frm.set_value("custom_actual_last_working_date", last_working_date);
            await frm.set_value("custom_last_working_date", last_working_date);
        }
    }
}
