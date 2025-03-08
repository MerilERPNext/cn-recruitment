frappe.ui.form.on('Recruitment Settings', {
    refresh: function(frm) {
        // Apply filter for source_doctype in the child table
        frm.fields_dict['recruitment_tool'].grid.get_field('source_doctype').get_query = function() {
            return {
                filters: [
                    ['name', 'in', ['Job Requisition', 'Job Applicant', 'Job Offer', 'Employee Onboarding', 'Employee']]
                ]
            };
        };
    }
});



frappe.ui.form.on('Recruitment Settings', {
    onload: function(frm) {
        apply_target_doctype_filter(frm);
    },
    refresh: function(frm) {
        apply_target_doctype_filter(frm);
    }
});

function apply_target_doctype_filter(frm) {
    frm.fields_dict['recruitment_tool'].grid.get_field('target_doctype').get_query = function(doc, cdt, cdn) {
        let row = locals[cdt][cdn];
        let allowed_targets = [];

        if (row.source_doctype === 'Job Requisition') {
            allowed_targets = ['Job Applicant', 'Job Offer', 'Employee Onboarding', 'Employee'];
        } else if (row.source_doctype === 'Job Applicant') {
            allowed_targets = ['Job Offer', 'Employee Onboarding', 'Employee'];
        } else if (row.source_doctype === 'Job Offer') {
            allowed_targets = ['Employee Onboarding', 'Employee'];
        } else if (row.source_doctype === 'Employee Onboarding') {
            allowed_targets = ['Employee'];
        }

        return {
            filters: [['name', 'in', allowed_targets]]
        };
    };
}

frappe.ui.form.on('Recruitment Tool', {
    source_doctype: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        let target_options = [];
        if (row.source_doctype === 'Job Requisition') {
            target_options = ['Job Applicant', 'Job Offer', 'Employee Onboarding', 'Employee'];
        } else if (row.source_doctype === 'Job Applicant') {
            target_options = ['Job Offer', 'Employee Onboarding', 'Employee'];
        } else if (row.source_doctype === 'Job Offer') {
            target_options = ['Employee Onboarding', 'Employee'];
        } else if (row.source_doctype === 'Employee Onboarding') {
            target_options = ['Employee'];
        }

        // Apply the filter for the current row
        apply_target_doctype_filter(frm);

        // Clear target_doctype if the selected value is not allowed
        if (row.target_doctype && !target_options.includes(row.target_doctype)) {
            frappe.model.set_value(cdt, cdn, 'target_doctype', null);
        }

        frm.refresh_field('recruitment_tool'); // Ensure UI updates properly
    }
});


function set_field_options(frm, cdt, cdn, doctype_name, doctype_fields, filter_by_type = null) {
    let row = locals[cdt][cdn];

    if (row[doctype_name]) {
        frappe.call({
            method: 'recruitment.recruitment.doctype.recruitment_settings.recruitment_settings.get_doctype_fields',
            args: { doctype_name: row[doctype_name] },
            callback: function(response) {
                if (response.message) {
                    let field_options = response.message
                        .filter(d => !filter_by_type || d.fieldtype === filter_by_type)  // Apply filtering based on fieldtype
                        .map(d => `${d.label} (${d.fieldname}) [${d.fieldtype}]`);

                    let grid = frm.fields_dict['recruitment_tool'].grid;
                    grid.update_docfield_property(
                        doctype_fields,
                        'options',
                        [''].concat(field_options).join('\n')
                    );

                    frm.refresh_field('recruitment_tool');
                } else {
                    frappe.msgprint(`No fields found for ${row[doctype_name]}`);
                }
            }
        });
    }
}

frappe.ui.form.on('Recruitment Tool', {
    source_doctype: function(frm, cdt, cdn) {
        set_field_options(frm, cdt, cdn, 'source_doctype', 'source_field');
    },
    target_doctype: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        // Agar source_field set hai, to uska fieldtype fetch karein
        if (row.source_field) {
            frappe.call({
                method: 'recruitment.recruitment.doctype.recruitment_settings.recruitment_settings.get_fieldtype',
                args: {
                    doctype_name: row.source_doctype,
                    fieldname: row.source_field.split(' (')[1].split(') ')[0] // Extract fieldname from UI string
                },
                callback: function(response) {
                    if (response.message) {
                        let field_type = response.message;
                        set_field_options(frm, cdt, cdn, 'target_doctype', 'target_field', field_type);
                    } else {
                        frappe.msgprint(__('Unable to fetch field type for filtering.'));
                    }
                }
            });
        } else {
            // Agar source_field select nahi hai, to sare fields dikhao
            set_field_options(frm, cdt, cdn, 'target_doctype', 'target_field');
        }
    }
});


