frappe.ui.form.on("Employee Onboarding", {
    refresh: function (frm) {
        if (!frm.doc.employee) {
            frm.remove_custom_button("Employee", "Create");

            frm.add_custom_button(
                __("Create Employee"),
                () => frm.events.create_employee(frm),  
                __("Create")
            );
            frm.page.set_inner_btn_group_as_primary(__("Create"));
        }
    },

    create_employee(frm) {
        frappe.call({
            method: "recruitment.auto_fetch_fields.make_employee",  // Update this path as per your setup
            args: { source_name: frm.doc.name },
            callback: function (r) {
                if (r.message) {
                    frappe.model.sync(r.message);
                    frappe.set_route("Form", r.message.doctype, r.message.name);
                }
            },
        });
    },

	validate: function(frm) {
       
        var mobile_pattern = /^[0-9]{10}$/;
        if (frm.doc.mobile && !mobile_pattern.test(frm.doc.custom_personal_contact_no)) {
            frappe.msgprint(__('Please enter a valid 10-digit mobile number'));
            frappe.validated = false;
        }
        var pan_pattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (frm.doc.custom_pan_card_number && !pan_pattern.test(frm.doc.custom_pan_card_number)) {
            frappe.msgprint(__('Please enter a valid PAN card number'));
            frappe.validated = false;
        }
        var aadhaar_pattern = /^[0-9]{12}$/;
        if (frm.doc.custom_aadhar_card_number && !aadhaar_pattern.test(frm.doc.custom_aadhar_card_number)) {
            frappe.msgprint(__('Please enter a valid 12-digit Aadhaar card number'));
            frappe.validated = false;
        }
		var pincode_pattern = /^[0-9]{6}$/;
        if (frm.doc.pincode && !pincode_pattern.test(frm.doc.pincode)) {
            frappe.msgprint(__('Please enter a valid 6-digit pincode number'));
            frappe.validated = false;
        }
    },
	custom_have_applied_for_pan(frm){
		if(frm.doc.custom_have_applied_for_pan==1){
			frm.set_df_property('custom_upload_pan_card', 'hidden', 1);
			frm.set_df_property('custom_pan_card_number', 'hidden', 1);
		}
		else{
			frm.set_df_property('custom_upload_pan_card', 'hidden', 0);
			frm.set_df_property('custom_pan_card_number', 'hidden', 0);
		}
	}
})



frappe.ui.form.on('Employee Onboarding', {
    refresh: function (frm) {
        if (frm.doc.docstatus === 0) {
            let all_tasks_created = frm.doc.activities && frm.doc.activities.every(activity => activity.task);

            if (!frm.doc.project || !all_tasks_created) {
                frm.add_custom_button(__('Create Onboarding Tasks'), function () {
                    let project_message = frm.doc.project
                        ? __('Project is already created.')
                        : __('Project will be created.');

                    let tasks_to_create = frm.doc.activities.filter(activity => !activity.task);

                    let task_table_html = tasks_to_create.length > 0
                        ? `<table class="table table-bordered" style="margin-top: 10px;">
                            <thead>
                                <tr>
                                    <th>Activity Name</th>
                                    <th>User</th>
                                    <th>Begin On (Days)</th>
                                    <th>Duration (Days)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tasks_to_create.map(activity => `
                                    <tr>
                                        <td>${activity.activity_name || '-'}</td>
                                        <td>${activity.user || '-'}</td>
                                        <td>${activity.begin_on || '-'}</td>
                                        <td>${activity.duration || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>`
                        : `<div><strong>${__('All tasks are already created.')}</strong></div>`;

                    let d = new frappe.ui.Dialog({
                        title: __('Confirmation'),
                        size: 'large',
                        fields: [
                            {
                                fieldname: 'project_info',
                                fieldtype: 'HTML',
                                options: `<div><strong>${project_message}</strong></div>`,
                            },
                            {
                                fieldname: 'task_info',
                                fieldtype: 'HTML',
                                options: tasks_to_create.length > 0
                                    ? `<div><strong>${__('Tasks to be created:')}</strong></div>${task_table_html}`
                                    : `<div><strong>${__('All tasks are already created.')}</strong></div>`,
                            }
                        ],
                        primary_action_label: __('Proceed'),
                        primary_action: function () {
                            frappe.call({
                                method: 'recruitment.customizations.employee_onboarding.overide_class.manually_create_onboarding_tasks',
                                args: {
                                    onboarding_name: frm.doc.name,
                                },
                                callback: function (r) {
                                    if (!r.exc) {
                                        frappe.msgprint(__('Tasks and Project created successfully.'));
                                        frm.reload_doc();
                                    }
                                }
                            });
                            d.hide();
                        },
                        secondary_action_label: __('Cancel'),
                        secondary_action: function () {
                            d.hide();
                        }
                    });

                    d.show();
                });
            }
        }
    }
});



// Retrigger Onboarding: re-send the candidate's invite and re-open their Action
// Center card, or — on a cancelled onboarding — initiate a fresh one.
frappe.ui.form.on('Employee Onboarding', {
    refresh: function (frm) {
        if (frm.doc.__islocal || !frm.doc.job_applicant) return;
        if ((frm.doc.boarding_status || '').toLowerCase() === 'completed' && frm.doc.docstatus !== 2) return;

        const cancelled = frm.doc.docstatus === 2;
        frm.add_custom_button(__('Retrigger Onboarding'), () => {
            frappe.confirm(
                cancelled
                    ? __('This onboarding is cancelled. Initiate a new onboarding for this candidate and send them the portal invite?')
                    : __('Re-send the onboarding invite to the candidate and re-open their Action Center task?'),
                () => {
                    frappe.call({
                        method: 'recruitment.api.onboarding_retrigger.retrigger_onboarding',
                        args: { employee_onboarding: frm.doc.name },
                        freeze: true,
                        freeze_message: __('Retriggering onboarding...'),
                        callback(r) {
                            const res = r.message || {};
                            if (res.existing) {
                                // An older cancelled onboarding: open the live one.
                                frappe.msgprint(res.warning);
                                frappe.set_route('Form', 'Employee Onboarding', res.employee_onboarding);
                                return;
                            }
                            if (res.warning) frappe.msgprint(res.warning);
                            frappe.show_alert({
                                message: res.reinitiated
                                    ? __('New onboarding {0} created.', [res.employee_onboarding])
                                    : __('Onboarding retriggered.'),
                                indicator: 'green',
                            });
                            if (res.reinitiated) {
                                frappe.set_route('Form', 'Employee Onboarding', res.employee_onboarding);
                            } else {
                                frm.reload_doc();
                            }
                        },
                    });
                }
            );
        }, __('Actions'));
    }
});
