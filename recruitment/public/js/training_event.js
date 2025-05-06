frappe.ui.form.on("Training Event", {
    custom_get_employees: function(frm) {
        let d = new frappe.ui.Dialog({
            title: 'Filter Employees',
            fields: [
                {
                    label: 'Grades',
                    fieldname: 'grades',
                    fieldtype: 'MultiSelectPills',
                    get_data: function(txt) {
                        return frappe.db.get_link_options('Employee Grade', txt);
                    }
                },
                {
                    label: 'Departments',
                    fieldname: 'departments',
                    fieldtype: 'MultiSelectPills',
                    get_data: function(txt) {
                        return frappe.db.get_link_options('Department', txt);
                    }
                },
                {
                    label: 'Designations',
                    fieldname: 'designations',
                    fieldtype: 'MultiSelectPills',
                    get_data: function(txt) {
                        return frappe.db.get_link_options('Designation', txt);
                    }
                },
                {
                    label: 'Is Mandatory',
                    fieldname: 'is_mandatory',
                    fieldtype: 'Check'
                }
            ],
            primary_action_label: 'Fetch',
            primary_action(values) {
                frappe.call({
                    method: 'recruitment.customizations.training_event.training_event.get_filtered_employees',
                    args: {
                        grades: values.grades,
                        departments: values.departments,
                        designations: values.designations
                    },
                    callback: function(r) {
                        if (r.message && r.message.length > 0) {
                            frm.clear_table('employees');
                            r.message.forEach(emp => {
                                let row = frm.add_child('employees', {
                                    employee: emp.name,
                                    employee_name: emp.employee_name,
                                    department: emp.department,
                                    status: 'Open',
                                    attendance: 'Present',
                                    is_mandatory: values.is_mandatory
                                });
                            });
                            frm.refresh_field('employees');
                            frappe.msgprint(__('Added {0} employees.', [r.message.length]));
                        } else {
                            frappe.msgprint(__('No employees found matching the selected filters.'));
                        }
                        d.hide();
                    }
                });
            }
        });
        d.show();
    }
});

frappe.ui.form.on('Training Event', {
    training_program: function(frm) {
        if (frm.doc.training_program) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Training Program',
                    name: frm.doc.training_program
                },
                callback: function(r) {
                    if (r.message) {
                        let program = r.message;
                        frm.clear_table('custom_day_wise_plan');
                        (program.custom__day_wise_plan || []).forEach(d => {
                            let row = frm.add_child('custom_day_wise_plan');
                            row.day_number = d.day_number;
                            row.training_material = d.training_material;
                            row.course_link = d.course_link;
                            row.attachment = d.attachment;
                            row.material_type = d.material_type;
                            row.session_duration = d.session_duration;
                            row.is_mandatory = d.is_mandatory;
                        });
                        frm.refresh_field('custom_day_wise_plan');
                    }
                }
            });
        }
    }
});

frappe.ui.form.on('Training Event', {
    onload_post_render(frm) {
        frm.fields_dict.custom_day_wise_plan.grid.wrapper.on('mouseup', function() {
            update_event_day_numbers(frm);
        });
    },
    validate(frm) {
        update_event_day_numbers(frm);
    }
});

frappe.ui.form.on('Training Program Day Plan', {
    training_material: function(frm, cdt, cdn) {
        update_event_day_numbers(frm);
    },
    custom_day_wise_plan_add: function(frm, cdt, cdn) {
        update_event_day_numbers(frm);
    }
});

function update_event_day_numbers(frm) {
    frm.doc.custom_day_wise_plan.forEach((row, index) => {
        row.day_number = index + 1;
    });
    frm.refresh_field('custom_day_wise_plan');
}
