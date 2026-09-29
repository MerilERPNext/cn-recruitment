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

// ---- Job Posting page column settings ----
// The "Column" cell in both the IJP and Refer column tables is a dynamic
// dropdown of Job Opening fields (not a fixed list). Populate it on load.
frappe.ui.form.on('Recruitment Settings', {
    refresh: function(frm) {
        set_job_opening_column_options(frm);
        set_job_requisition_column_options(frm);
    }
});

function set_job_opening_column_options(frm) {
    frappe.call({
        method: 'recruitment.recruitment.doctype.recruitment_settings.recruitment_settings.get_doctype_fields',
        args: { doctype_name: 'Job Opening' },
        callback: function(r) {
            if (!r.message) return;

            const skip = ['Section Break', 'Column Break', 'Tab Break', 'HTML',
                'Button', 'Heading', 'Fold', 'Image', 'Table', 'Table MultiSelect'];

            // "name" is the Opening ID — it isn't part of meta.fields, so add it
            // explicitly as a selectable column.
            const options = ['Opening ID (name)'].concat(
                r.message
                    .filter(d => d.fieldname && d.label && !skip.includes(d.fieldtype))
                    .map(d => `${d.label} (${d.fieldname})`)
            ).join('\n');

            ['ijp_page_columns', 'refer_page_columns', 'career_page_filter_columns', 'career_page_search_filters'].forEach(function(tablefield) {
                if (frm.fields_dict[tablefield]) {
                    frm.fields_dict[tablefield].grid.update_docfield_property('column', 'options', options);
                    frm.refresh_field(tablefield);
                }
            });
        }
    });
}

// ---- Job Requisition list column settings ----
// The "Column" cell in the Requisition List column table is a dynamic dropdown
// of Job Requisition fields (not a fixed list). Populate it on load. Mirrors
// set_job_opening_column_options but sourced from the Job Requisition doctype.
function set_job_requisition_column_options(frm) {
    if (!frm.fields_dict['requisition_list_columns']) return;

    frappe.call({
        method: 'recruitment.recruitment.doctype.recruitment_settings.recruitment_settings.get_doctype_fields',
        args: { doctype_name: 'Job Requisition' },
        callback: function(r) {
            if (!r.message) return;

            const skip = ['Section Break', 'Column Break', 'Tab Break', 'HTML',
                'Button', 'Heading', 'Fold', 'Image', 'Table', 'Table MultiSelect'];

            // "name" is the Requisition ID — it isn't part of meta.fields, so add
            // it explicitly as a selectable column.
            const options = ['Requisition ID (name)'].concat(
                r.message
                    .filter(d => d.fieldname && d.label && !skip.includes(d.fieldtype))
                    .map(d => `${d.label} (${d.fieldname})`)
            ).join('\n');

            frm.fields_dict['requisition_list_columns'].grid.update_docfield_property('column', 'options', options);
            frm.refresh_field('requisition_list_columns');
        }
    });
}

frappe.ui.form.on('Recruitment Tool', {
    source_doctype: function(frm, cdt, cdn) {
        set_field_options(frm, cdt, cdn, 'source_doctype', 'source_field');
    },
    target_doctype: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

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
            set_field_options(frm, cdt, cdn, 'target_doctype', 'target_field');
        }
    }
});




// Direct Applicant Onboarding — "Add Direct Applicant — Extra Fields" picker.
// The Field cell offers only the Job Applicant fields the dialog can ask for;
// the server decides which those are (recruitment.api.direct_applicant).
frappe.ui.form.on('Recruitment Settings', {
    refresh: function(frm) {
        set_da_creation_field_options(frm);
        render_da_standard_fields(frm);
    },
    enable_direct_applicant_onboarding: function(frm) {
        set_da_creation_field_options(frm);
    }
});

frappe.ui.form.on('Direct Applicant Creation Field', {
    fieldname: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const df = row.fieldname && frappe.meta.get_docfield('Job Applicant', row.fieldname);
        frappe.model.set_value(cdt, cdn, 'label', df ? df.label : '');
        frappe.model.set_value(cdt, cdn, 'fieldtype', df ? df.fieldtype : '');
    }
});

function set_da_creation_field_options(frm) {
    const grid = frm.fields_dict.da_creation_fields && frm.fields_dict.da_creation_fields.grid;
    if (!grid || !frm.doc.enable_direct_applicant_onboarding) return;
    frappe.model.with_doctype('Job Applicant', () => {
        frappe.call({ method: 'recruitment.api.direct_applicant.get_creation_field_options' }).then((r) => {
            grid.update_docfield_property('fieldname', 'options', r.message || []);
        });
    });
}

// "Add Direct Applicant — Standard Fields" as plain checkboxes that work on the
// first click (a Frappe grid only turns a row editable once it is clicked, so
// the ticks looked read-only). The hidden `da_standard_fields` table stays the
// store; the server keeps one row per field and unticks Mandatory when hidden.
function render_da_standard_fields(frm) {
    const field = frm.get_field('da_standard_fields_ui');
    if (!field || !field.$wrapper) return;
    const rows = (frm.doc.da_standard_fields || []).slice().sort((a, b) => a.idx - b.idx);
    const $w = field.$wrapper.empty();
    if (!rows.length) {
        $w.html(`<p class="text-muted">${__('Save once to list the fields.')}</p>`);
        return;
    }
    const $t = $(`<table class="table table-bordered" style="max-width:640px;margin-bottom:4px">
        <thead><tr><th>${__('Field')}</th><th class="text-center" style="width:110px">${__('Show')}</th>
        <th class="text-center" style="width:110px">${__('Mandatory')}</th></tr></thead><tbody></tbody></table>`);
    rows.forEach((row) => {
        const $tr = $(`<tr><td>${frappe.utils.escape_html(row.label || row.field_key)}</td>
            <td class="text-center"><input type="checkbox" data-col="show"></td>
            <td class="text-center"><input type="checkbox" data-col="mandatory"></td></tr>`).appendTo($t.find('tbody'));
        const $show = $tr.find('[data-col="show"]').prop('checked', !!row.show);
        const $reqd = $tr.find('[data-col="mandatory"]').prop('checked', !!row.show && !!row.mandatory)
            .prop('disabled', !row.show);
        $show.on('change', () => {
            frappe.model.set_value(row.doctype, row.name, 'show', $show.prop('checked') ? 1 : 0);
            if (!$show.prop('checked')) {
                frappe.model.set_value(row.doctype, row.name, 'mandatory', 0);
                $reqd.prop('checked', false);
            }
            $reqd.prop('disabled', !$show.prop('checked'));
        });
        $reqd.on('change', () => frappe.model.set_value(row.doctype, row.name, 'mandatory', $reqd.prop('checked') ? 1 : 0));
    });
    $w.append($t).append(`<p class="text-muted small">${__('Untick Show to remove a field from the Add Direct Applicant dialog. First Name, Email, Company and Designation are always asked.')}</p>`);
}
