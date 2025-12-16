frappe.ui.form.on("Employee Onboarding", {
    refresh: function (frm) {
        ["job_offer", "job_applicant", "custom_educational_details","employee_name"].forEach(field => {
            if (frm.fields_dict[field]) {
                // 🔸 Make non-mandatory
                frm.fields_dict[field].df.reqd = 0;

                // 🔸 Change fieldtype from Link to Data
                frm.fields_dict[field].df.fieldtype = "Data";

                // 🔸 Remove options (unlink it from any Doctype)
                frm.fields_dict[field].df.options = "";

                // 🔸 Make non-mandatory
                frm.fields_dict[field].df.reqd = 0;
                






                // 🔸 Refresh field to apply changes
                frm.refresh_field(field);

                console.log(`[DeskForm] Converted '${field}' to Data field`);
            }
        });
        // Show "Create Employee" button only if workflow_state is "Approved" and employee not created yet
        if (!frm.doc.employee && frm.doc.workflow_state === "Approved") {
            frm.remove_custom_button("Employee", "Create");

            frm.add_custom_button(
                __("Create Employee"),
                () => frm.events.create_employee(frm),
                __("Create")
            );
            frm.page.set_inner_btn_group_as_primary(__("Create"));
        }
    },

    // Auto-fetch employee data when ITS ID is entered
    custom_its_id: function(frm) {
        if (frm.doc.custom_its_id && frm.doc.custom_its_id.trim()) {
            console.log("[ITS ID] Fetching employee data for:", frm.doc.custom_its_id);

            frappe.call({
                method: "recruitment.customizations.employee_onboarding.employee_onboarding.fetch_employee_data_by_its_id",
                args: {
                    its_id: frm.doc.custom_its_id.trim()
                },
                freeze: true,
                freeze_message: __("Fetching employee data..."),
                callback: function(r) {
                    if (r.message && r.message.success) {
                        console.log("[ITS ID] Employee data fetched:", r.message);

                        // Populate the fields with fetched data
                        if (r.message.employee_name) {
                            frm.set_value('employee_name', r.message.employee_name);
                        }
                        if (r.message.custom_primary_mobile_number) {
                            frm.set_value('custom_primary_mobile_number', r.message.custom_primary_mobile_number);
                        }
                        if (r.message.custom_whatsapp_number) {
                            frm.set_value('custom_whatsapp_number', r.message.custom_whatsapp_number);
                        }
                        if (r.message.custom_email_id) {
                            frm.set_value('custom_email_id', r.message.custom_email_id);
                        }
                        if (r.message.custom_farig_year) {
                            frm.set_value('custom_farig_year', r.message.custom_farig_year);
                        }
                        if (r.message.custom_farig_darajah) {
                            frm.set_value('custom_farig_darajah', r.message.custom_farig_darajah);
                        }

                        // Show success message
                        frappe.show_alert({
                            message: __('Employee data fetched and populated successfully!'),
                            indicator: 'green'
                        }, 5);
                    } else {
                        console.warn("[ITS ID] Failed to fetch employee data");
                        frappe.msgprint({
                            title: __('Error'),
                            indicator: 'red',
                            message: __('Failed to fetch employee data. Please check the ITS ID and try again.')
                        });
                    }
                },
                error: function(err) {
                    console.error("[ITS ID] Error fetching employee data:", err);
                    frappe.msgprint({
                        title: __('Error'),
                        indicator: 'red',
                        message: __('An error occurred while fetching employee data.')
                    });
                }
            });
        }
    },

    create_employee(frm) {
        frappe.call({
            method: "recruitment.customizations.employee_onboarding.employee_onboarding.make_employee",
            args: { source_name: frm.doc.name },
            freeze: true,
            freeze_message: __("Creating Employee..."),
            callback: function (r) {
                if (r.message) {
                    frappe.model.sync(r.message);
                    frappe.set_route("Form", r.message.doctype, r.message.name);
                    frappe.show_alert({
                        message: __('Employee created successfully!'),
                        indicator: 'green'
                    }, 5);
                }
            },
            error: function(err) {
                frappe.msgprint({
                    title: __('Error'),
                    indicator: 'red',
                    message: __('Failed to create employee. Please try again.')
                });
            }
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

