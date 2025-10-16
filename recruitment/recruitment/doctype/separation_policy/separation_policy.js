// Copyright (c) 2025, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("Separation Policy", {
    refresh(frm) {
        frm.trigger("update_approval_flow_child");
        frm.trigger("render_workflow_table");
    },
    
    capture_date_of_resignation(frm){
        frm.trigger("update_approval_flow_child");
    },
    
    update_approval_flow_child: function(frm){
        if (!frm.doc.capture_date_of_resignation) return;
        (frm.doc.approval_flow_configuration || []).forEach(row => {
            frappe.model.set_value(row.doctype, row.name, "exclude_capture", 0);
            frappe.model.set_value(row.doctype, row.name, "exception", 0);
        });
        ["exclude_capture", "exception"].forEach(field => {
            frm.fields_dict.approval_flow_configuration.grid.update_docfield_property(field, "read_only", 1);
        });
    },

    render_workflow_table: function(frm) {
        // Get existing data from JSON field
        let workflow_data = [];
        try {
            workflow_data = frm.doc.workflow_configuration_data ? 
                JSON.parse(frm.doc.workflow_configuration_data) : [];
        } catch(e) {
            workflow_data = [];
        }

        // Generate HTML table
        const html = frm.get_field('workflow_configuration').$wrapper;
        html.empty();

        const tableHTML = `
            <style>
                .workflow-table-container {
                    background: white;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-top: 10px;
                }

                .workflow-table-wrapper {
                    overflow-x: auto;
                    border-radius: 0.5rem;
                }

                .workflow-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }

                .workflow-table thead {
                    background: #d1d8dd64;
                }

                .workflow-table thead th {
                    padding: 12px 15px;
                    text-align: left;
                    font-weight: 500;
                    color: #6c7680;
                    border-bottom: 1px solid #d1d8dd64;
                    background-color: #a8b4bd64;
                    font-size: 12px;
                }

                .workflow-table tbody tr {
                    border-bottom: 1px solid #ebeff2;
                }

                .workflow-table tbody tr:last-child {
                    border-bottom: none;
                }

                .workflow-table tbody td {
                    padding: 12px 15px;
                    vertical-align: top;
                }

                .workflow-order-cell {
                    color: #8d99a6;
                    font-weight: 500;
                    width: 60px;
                }

                .workflow-delete-cell {
                    width: 50px;
                    text-align: center;
                }

                .workflow-input,
                .workflow-select,
                .workflow-textarea {
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid #d1d8dd;
                    border-radius: 4px;
                    font-size: 13px;
                    font-family: inherit;
                    transition: border-color 0.2s;
                    background: white;
                }

                .workflow-textarea {
                    min-height: 80px;
                    resize: vertical;
                }

                .workflow-input:focus,
                .workflow-select:focus,
                .workflow-textarea:focus {
                    outline: none;
                    border-color: #2490ef;
                }

                .workflow-select {
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236c7680' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    padding-right: 30px;
                }

                .workflow-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .workflow-link-field-container {
                    width: 100%;
                }

                .workflow-link-field-container .link-field {
                    width: 100%;
                }

                .workflow-link-field-container .awesomplete {
                    display: block;
                    width: 100%;
                }

                .workflow-link-field-container input.input-with-feedback {
                    width: 100% !important;
                    padding: 8px 10px;
                    border: 1px solid #d1d8dd;
                    border-radius: 4px;
                    font-size: 13px;
                }

                .workflow-link-field-container input.input-with-feedback:focus {
                    outline: none;
                    border-color: #2490ef;
                }

                .workflow-delete-btn {
                    background: transparent;
                    border: none;
                    color: #d1d8dd;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 3px;
                    transition: all 0.2s;
                    font-size: 18px;
                    line-height: 1;
                }

                .workflow-delete-btn:hover {
                    color: #d63939;
                }

                .workflow-add-row-section {
                    padding: 12px 15px;
                    border-top: 1px solid #ebeff2;
                }

                .workflow-add-row-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: white;
                    border: 1px solid #d1d8dd;
                    border-radius: 4px;
                    color: #4c5a67;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .workflow-add-row-btn:hover {
                    background: #f9fafb;
                    border-color: #2490ef;
                    color: #2490ef;
                }

                .workflow-add-icon {
                    font-size: 16px;
                    font-weight: bold;
                }
            </style>

            <div class="workflow-table-container">
                <div class="workflow-table-wrapper">
                    <table class="workflow-table">
                        <thead>
                            <tr>
                                <th class="workflow-order-cell">Order</th>
                                <th style="width: 20%;">Stage Name*</th>
                                <th style="width: 25%;">Action</th>
                                <th style="width: 20%;">Assign Role</th>
                                <th style="width: 20%;">Trigger Point</th>
                                <th class="workflow-delete-cell"></th>
                            </tr>
                        </thead>
                        <tbody class="workflow-tbody">
                        </tbody>
                    </table>
                </div>
                <div class="workflow-add-row-section">
                    <button class="workflow-add-row-btn" type="button">
                        <span class="workflow-add-icon">+</span>
                        Add Row
                    </button>
                </div>
            </div>
        `;

        html.append(tableHTML);

        // Load existing rows
        const tbody = html.find('.workflow-tbody');
        workflow_data.forEach((row, index) => {
            frm.events.add_workflow_row(frm, row, index + 1);
        });

        // Add row button click
        html.find('.workflow-add-row-btn').on('click', function() {
            frm.events.add_workflow_row(frm, {}, tbody.find('tr').length + 1);
        });
    },

    add_workflow_row: function(frm, data = {}, order) {
        const html = frm.get_field('workflow_configuration').$wrapper;
        const tbody = html.find('.workflow-tbody');

        const rowHTML = `
            <tr data-row-index="${order}">
                <td class="workflow-order-cell">${order}</td>
                <td>
                    <input type="text" class="workflow-input stage-name" 
                           placeholder="Enter Here" 
                           value="${data.stage_name || ''}"
                           data-fieldname="stage_name">
                </td>
                <td>
                    <div class="workflow-field-group">
                        <input type="text" class="workflow-input action-question" 
                               placeholder="Enter Here" 
                               value="${data.action_question || ''}"
                               data-fieldname="action_question">
                        <div class="workflow-link-field-container action-type-container" data-fieldname="action_type"></div>
                        <textarea class="workflow-textarea action-options" 
                                  placeholder="Yes, No" 
                                  data-fieldname="action_options">${data.action_options || ''}</textarea>
                    </div>
                </td>
                <td>
                    <div class="workflow-field-group">
                        <div class="workflow-link-field-container assign-role-container" data-fieldname="assign_role"></div>
                        <select class="workflow-select workflow-visibility" data-fieldname="workflow_visibility">
                            <option value="show_everyone" ${data.workflow_visibility === 'show_everyone' ? 'selected' : ''}>Show Everyone in Workflow</option>
                            <option value="show_assigned" ${data.workflow_visibility === 'show_assigned' ? 'selected' : ''}>Show Only Assignee and Admin's</option>
                            <option value="show_only_employee_assignee_admin" ${data.workflow_visibility === 'show_only_employee_assignee_admin' ? 'selected' : ''}>Show Only Employee, Assignee and Admin's</option>
                        </select>
                    </div>
                </td>
                <td>
                    <div class="workflow-field-group">
                        <select class="workflow-select trigger-point" data-fieldname="trigger-point">
                            <option value="date_of_approval" ${data.trigger_point === 'date_of_approval' ? 'selected' : ''}>Date of Approval</option>
                            <option value="last_date" ${data.trigger_point === 'last_date' ? 'selected' : ''}>Last Date</option>
                        </select>
                        <select class="workflow-select trigger-timing" data-fieldname="trigger_timing">
                            <option value="after" ${data.trigger_timing === 'after' ? 'selected' : ''}>After</option>
                        </select>
                        <input type="number" class="workflow-input trigger-days" 
                               placeholder="0" 
                               value="${data.trigger_days || 0}"
                               data-fieldname="trigger_days">
                    </div>
                </td>
                <td class="workflow-delete-cell">
                    <button class="workflow-delete-btn" type="button" title="Delete Row">✕</button>
                </td>
            </tr>
        `;

        tbody.append(rowHTML);

        // Bind events to new row
        const newRow = tbody.find('tr').last();

        // Setup Link Field for Action Type (Approval Flow Actions)
        const actionTypeContainer = newRow.find('.action-type-container');
        frm.events.setup_link_field(frm, actionTypeContainer, 'Approval Flow Actions', 'action_type', data.action_type || '');

        // Setup Link Field for Assign Role (Role)
        const assignRoleContainer = newRow.find('.assign-role-container');
        frm.events.setup_link_field(frm, assignRoleContainer, 'Role', 'assign_role', data.assign_role || '');
        
        // Delete button
        newRow.find('.workflow-delete-btn').on('click', function() {
            $(this).closest('tr').remove();
            frm.events.update_workflow_order(frm);
            frm.events.save_workflow_data(frm);
        });

        // Change events for all inputs
        newRow.find('.workflow-input, .workflow-select, .workflow-textarea').on('change', function() {
            frm.events.save_workflow_data(frm);
        });

        // Save after adding row
        frm.events.save_workflow_data(frm);
    },

    setup_link_field: function(frm, container, doctype, fieldname, value) {
        // Create Frappe link field
        const link_field = frappe.ui.form.make_control({
            parent: container,
            df: {
                fieldtype: 'Link',
                fieldname: fieldname,
                options: doctype,
                only_select: false,
                change: function() {
                    frm.events.save_workflow_data(frm);
                }
            },
            render_input: true
        });

        // Set initial value
        link_field.set_value(value);

        // Save on change
        link_field.$input.on('change', function() {
            frm.events.save_workflow_data(frm);
        });

        // Store field instance in container for later access
        container.data('link_field', link_field);
    },

    update_workflow_order: function(frm) {
        const html = frm.get_field('workflow_configuration').$wrapper;
        const rows = html.find('.workflow-tbody tr');
        
        rows.each(function(index) {
            $(this).find('.workflow-order-cell').text(index + 1);
            $(this).attr('data-row-index', index + 1);
        });
    },

    save_workflow_data: function(frm) {
        const html = frm.get_field('workflow_configuration').$wrapper;
        const rows = html.find('.workflow-tbody tr');
        const workflow_data = [];

        rows.each(function() {
            const row = $(this);
            const rowData = {};

            // Get values from regular input fields
            row.find('[data-fieldname]').each(function() {
                const field = $(this);
                const fieldname = field.attr('data-fieldname');
                
                // Check if this is a link field container
                if (field.hasClass('workflow-link-field-container')) {
                    const link_field = field.data('link_field');
                    if (link_field) {
                        rowData[fieldname] = link_field.get_value() || '';
                    }
                } else {
                    // Regular input/select/textarea
                    rowData[fieldname] = field.val();
                }
            });

            workflow_data.push(rowData);
        });

        // Save to JSON field
        frm.set_value('workflow_configuration_data', JSON.stringify(workflow_data));
    }
});
