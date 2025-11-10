frappe.ui.form.on('Role Field Mapping', {
    refresh: function(frm) {        
        frm.add_custom_button(__('Add Mapping'), function() {
            open_new_mapping_dialog(frm);
        }, __('Actions'));
        frm.add_custom_button(__('Edit Mappings'), function() {
            open_edit_all_mappings_dialog(frm);
        }, __('Actions'));
        
        frm.refresh_field('mapping');
    }
});

function open_new_mapping_dialog(frm) {
    const dialog = new frappe.ui.Dialog({
        title: 'Add Multiple Field Mappings',
        fields: [
            {
                fieldname: 'temp_mapping',
                label: 'Mapping',
                fieldtype: 'Table',
                fields: [
                    { fieldname: 'from_doctype', label: 'Doctype', fieldtype: 'Link', options: 'DocType', in_list_view: 1,
                        onchange: function() {
                            let d = this.grid_row.doc;
                            set_dynamic_link_fields(this, d, dialog);
                        }
                    },
                    { fieldname: 'linked__field_doctype', label: 'Linked Field Doctype', fieldtype: 'Select', options: '\nEmployee\nUser', in_list_view: 1,
                        onchange: function() {
                            let d = this.grid_row.doc;
                            set_dynamic_link_fields(this, d, dialog);
                        }
                    },
                    { fieldname: 'link_field', label: 'Link Field', fieldtype: 'Select', options: "", in_list_view: 1,
                        onchange: function() {
                            let d = this.grid_row.doc;
                            if (!d.link_field || !d.from_doctype || !d.linked__field_doctype) return;
                            frappe.call({
                                method: 'recruitment.recruitment.doctype.role_field_mapping.role_field_mapping.get_link_fields_for_doctype',
                                args: {
                                    from_doctype: d.from_doctype,
                                    linked_field_doctype: d.linked__field_doctype
                                },
                                callback: function(r) {
                                    let found = r.message.fields.find(f => f.label === d.link_field);
                                    d.link_field_name = found ? found.fieldname : '';
                                    let link_field_name_ctrl = dialog.fields_dict.temp_mapping.grid.grid_rows_by_docname[d.name].on_grid_fields_dict.link_field_name;
                                    link_field_name_ctrl.set_value(d.link_field_name);
                                    link_field_name_ctrl.refresh();
                                }
                            });
                        }
                    },
                    { fieldname: 'link_field_name', label: 'Link Field Name', fieldtype: 'Select', options: "", in_list_view: 1 },
                    { fieldname: 'role', label: 'Role', fieldtype: 'Link', options: 'Role', in_list_view: 1,}
                ]
            }
        ],
        primary_action_label: 'Save',
        primary_action: function() {
            let mappings = dialog.get_value('temp_mapping') || [];
            mappings.forEach(row => {
                frm.add_child('mapping', {
                    from_doctype: row.from_doctype,
                    linked__field_doctype: row.linked__field_doctype,
                    link_field: row.link_field,
                    link_field_name: row.link_field_name,
                    role: row.role
                });
            });
            frm.refresh_field('mapping');
            dialog.hide();
            frappe.show_alert({ message: 'Mappings added: ' + mappings.length + ' rows', indicator: 'green' });
        }
    });
    dialog.show();
    dialog.$wrapper.find('.modal-dialog').css('width', '1000px');
}

function set_dynamic_link_fields(ctrl, d, dialog) {
    if (!d.from_doctype || !d.linked__field_doctype) {
        let lf_ctrl = dialog.fields_dict.temp_mapping.grid.grid_rows_by_docname[d.name].on_grid_fields_dict.link_field;
        let lfn_ctrl = dialog.fields_dict.temp_mapping.grid.grid_rows_by_docname[d.name].on_grid_fields_dict.link_field_name;
        if (lf_ctrl) { lf_ctrl.df.options = ""; lf_ctrl.refresh(); }
        if (lfn_ctrl) { lfn_ctrl.df.options = ""; lfn_ctrl.refresh(); }
        d.link_field = '';
        d.link_field_name = '';
        return;
    }
    frappe.call({
        method: 'recruitment.recruitment.doctype.role_field_mapping.role_field_mapping.get_link_fields_for_doctype',
        args: {
            from_doctype: d.from_doctype,
            linked_field_doctype: d.linked__field_doctype
        },
        callback: function(r) {
            if (!r.message || !r.message.fields) return;
            let field_labels = ['', ...r.message.fields.map(f => f.label)];
            let field_names = ['', ...r.message.fields.map(f => f.fieldname)];
            let lf_ctrl = dialog.fields_dict.temp_mapping.grid.grid_rows_by_docname[d.name].on_grid_fields_dict.link_field;
            let lfn_ctrl = dialog.fields_dict.temp_mapping.grid.grid_rows_by_docname[d.name].on_grid_fields_dict.link_field_name;
            if (lf_ctrl) { lf_ctrl.df.options = field_labels.join('\n'); lf_ctrl.refresh(); }
            if (lfn_ctrl) { lfn_ctrl.df.options = field_names.join('\n'); lfn_ctrl.refresh(); }
            d.link_field = '';
            d.link_field_name = '';
        }
    });
}


function open_edit_all_mappings_dialog(frm) {
    const existing = (frm.doc.mapping || []).map(row => ({
        from_doctype: row.from_doctype,
        linked__field_doctype: row.linked__field_doctype,
        link_field: row.link_field,
        link_field_name: row.link_field_name,
        role: row.role,
        name: row.name
    }));

    const dialog = new frappe.ui.Dialog({
        title: 'Edit All Field Mappings',
        fields: [
            {
                fieldname: 'temp_mapping',
                label: 'Mapping',
                fieldtype: 'Table',
                data: existing,
                fields: [
                    {   fieldname: 'from_doctype',  label: 'Doctype',  fieldtype: 'Link',  options: 'DocType',  in_list_view: 1, read_only: 1 },
                    {
                        fieldname: 'linked__field_doctype',
                        label: 'Linked Field Doctype',
                        fieldtype: 'Select',
                        options: '\nEmployee\nUser',
                        in_list_view: 1,
                        onchange: function() {
                            let d = this.grid_row.doc;
                            update_link_fields_for_row(d, dialog);
                        }
                    },
                    { fieldname: 'link_field', label: 'Link Field', fieldtype: 'Select', options: "",  in_list_view: 1, read_only: 1  },
                    { fieldname: 'link_field_name', label: 'Link Field Name', fieldtype: 'Select', options: "", in_list_view: 1, read_only: 1 },
                    { fieldname: 'role', label: 'Role', fieldtype: 'Link', options: 'Role',  in_list_view: 1 }
                ]
            }
        ],
        primary_action_label: 'Update',
        primary_action: function() {
            let rows = dialog.get_value('temp_mapping') || [];
            frm.clear_table('mapping');
            rows.forEach(row => {
                frm.add_child('mapping', {
                    from_doctype: row.from_doctype,
                    linked__field_doctype: row.linked__field_doctype,
                    link_field: row.link_field,
                    link_field_name: row.link_field_name,
                    role: row.role
                });
            });
            frm.refresh_field('mapping');
            dialog.hide();
            frappe.show_alert({ message: 'All mappings updated.', indicator: 'green' });
        }
    });
    dialog.show();
    dialog.$wrapper.find('.modal-dialog').css('width', '1000px');
}

function update_link_fields_for_row(d, dialog) {
    let grid_row = dialog.fields_dict.temp_mapping.grid.grid_rows_by_docname[d.name];
    if (!grid_row) return;

    let link_field_ctrl = grid_row.on_grid_fields_dict.link_field;
    let link_field_name_ctrl = grid_row.on_grid_fields_dict.link_field_name;

    if (!d.from_doctype || !d.linked__field_doctype) {
        set_row_link_field_options(d, dialog, [''], ['']);
        if (link_field_ctrl) { link_field_ctrl.df.read_only = 1; link_field_ctrl.refresh(); }
        if (link_field_name_ctrl) { link_field_name_ctrl.df.read_only = 1; link_field_name_ctrl.refresh(); }
        return;
    }

    if (d.linked__field_doctype === "Employee") {
        if (link_field_ctrl) { link_field_ctrl.df.read_only = 1; link_field_ctrl.refresh(); }
        if (link_field_name_ctrl) { link_field_name_ctrl.df.read_only = 1; link_field_name_ctrl.refresh(); }
        set_row_link_field_options(d, dialog, [d.link_field], [d.link_field_name]);
    } else if (d.linked__field_doctype === "User") {
        if (link_field_ctrl) { link_field_ctrl.df.read_only = 0; }
        if (link_field_name_ctrl) { link_field_name_ctrl.df.read_only = 0; }

        frappe.call({
            method: 'recruitment.recruitment.doctype.role_field_mapping.role_field_mapping.get_link_fields_for_doctype',
            args: {
                from_doctype: d.from_doctype,
                linked_field_doctype: d.linked__field_doctype
            },
            callback: function(r) {
                if (!r.message || !r.message.fields) {
                    set_row_link_field_options(d, dialog, [''], ['']);
                    return;
                }
                const labels = ['', ...r.message.fields.map(f => f.label)];
                const fieldnames = ['', ...r.message.fields.map(f => f.fieldname)];
                set_row_link_field_options(d, dialog, labels, fieldnames);
            }
        });
    }
}


function set_row_link_field_options(d, dialog, label_options, fieldname_options) {
    let grid_row = dialog.fields_dict.temp_mapping.grid.grid_rows_by_docname[d.name];
    if (!grid_row) return;
    let link_field_ctrl = grid_row.on_grid_fields_dict.link_field;
    let link_field_name_ctrl = grid_row.on_grid_fields_dict.link_field_name;
    if (link_field_ctrl) {
        link_field_ctrl.df.options = label_options.join('\n');
        link_field_ctrl.refresh();
    }
    if (link_field_name_ctrl) {
        link_field_name_ctrl.df.options = fieldname_options.join('\n');
        link_field_name_ctrl.refresh();
    }
}


