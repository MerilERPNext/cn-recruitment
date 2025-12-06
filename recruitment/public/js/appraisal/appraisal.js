// Employee Summary

frappe.ui.form.on('Appraisal', {
  onload: function (frm) {
    console.log('=== APPRAISAL ONLOAD ===');
    if (!frm.doc.__islocal) {
      setTimeout(() => {
        show_kra_summary(frm);
        show_hod_summary(frm);
        toggle_hod_tab_visibility(frm);
      }, 500);
    }

    // Listen for workflow_state changes dynamically
    frm.fields_dict.workflow_state.$wrapper.on('change', 'select, input', function() {
      let wrapper = frm.fields_dict.custom_employee_summarys?.$wrapper;
      if (wrapper) {
        show_kra_summary(frm);
      }
    });
  },

  after_save: function(frm) {
    setTimeout(() => {
      show_kra_summary(frm);
      show_hod_summary(frm);
      toggle_hod_tab_visibility(frm);
    }, 500);
  },

  refresh: function(frm) {
    // Toggle tab visibility
    toggle_hod_tab_visibility(frm);
    
    // Show HOD summary
    show_hod_summary(frm);
  },
  final_score: function(frm) {
    show_hod_summary(frm);
  }
});


// ============================================
// EMPLOYEE SUMMARY SECTION
// ============================================
function show_kra_summary(frm) {
  let wrapper = frm.fields_dict.custom_employee_summarys?.$wrapper;

  if (!wrapper) {
    console.error('Wrapper not found for custom_employee_summarys');
    return;
  }

  wrapper.empty();

  // Fetch goals from Goal doctype
  frappe.call({
    method: 'frappe.client.get_list',
    args: {
      doctype: 'Goal',
      filters: { 
        appraisal_cycle: frm.doc.appraisal_cycle,
        employee: frm.doc.employee
      },
      fields: ['name', 'goal_name', 'kra', 'progress', 'status', 'description', 'custom_hod_score'],
      limit_page_length: 100,
    },
    callback: function (r) {
      if (frm.doc.appraisal_kra && frm.doc.appraisal_kra.length > 0) {
        let goals = r.message || [];
        let html = generate_kra_html(frm, goals);
        wrapper.html(html);
        
        // Attach event handlers for interactive buttons
        attach_button_events(wrapper, frm);
      } else {
        wrapper.html(`<p style="padding:10px; color:#888;">No KRA data available.</p>`);
      }
    }
  });
}

function generate_kra_html(frm, goals) {
  let html = `
    <style>
      .kra-summary-container {
        padding: 15px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .kra-card {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
      }
      
      .kra-header {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid rgba(25, 118, 210, 0.2);
      }
      
      .kra-name {
        font-size: 18px;
        font-weight: 600;
        color: #1565c0;
        text-transform: uppercase;
        flex: 1;
      }
      
      .kra-weightage-badge {
        background: rgba(25, 118, 210, 0.2);
        color: #1565c0;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
      }
      
      .goal-count-badge {
        background: rgba(76, 175, 80, 0.2);
        color: #2e7d32;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
      }
      
      .goals-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        font-size: 14px;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .goals-table thead {
        background: #f5f5f5;
        border-bottom: 2px solid #e0e0e0;
      }
      
      .goals-table th {
        padding: 12px 15px;
        text-align: left;
        font-weight: 600;
        color: #424242;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .goals-table tbody tr {
        border-bottom: 1px solid #f0f0f0;
        transition: background-color 0.2s ease;
      }
      
      .goals-table tbody tr:hover {
        background-color: #f8f9fa;
      }
      
      .goals-table td {
        padding: 12px 15px;
        color: #212529;
      }
      
      .progress-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .progress-bar-mini {
        flex: 1;
        height: 8px;
        background: #e8f5e9;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .progress-fill-mini {
        height: 100%;
        background: linear-gradient(90deg, #66bb6a, #81c784);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        font-weight: 600;
        color: #43a047;
        min-width: 45px;
      }
      
      .action-buttons {
        display: flex;
        gap: 6px;
      }
      
      .btn-update, .btn-delete {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .btn-update {
        background: #64b5f6;
        color: white;
      }
      
      .btn-update:hover {
        background: #42a5f5;
        transform: translateY(-1px);
      }
      
      .btn-delete {
        background: #ef5350;
        color: white;
      }
      
      .btn-delete:hover {
        background: #e53935;
        transform: translateY(-1px);
      }
      
      .no-goals-msg {
        padding: 20px;
        text-align: center;
        color: #757575;
        font-style: italic;
        background: white;
        border-radius: 6px;
      }
    </style>
    
    <div class="kra-summary-container">
  `;

  frm.doc.appraisal_kra.forEach((kra, index) => {
    // Filter goals for this KRA
    let kra_goals = goals.filter(g => g.kra === kra.kra);
    
    let weightage = kra.per_weightage || 0;
    let goal_count = kra_goals.length;
    
    html += `
      <div class="kra-card">
        <div class="kra-header">
          <span class="kra-name">${kra.kra || 'Unnamed KRA'}</span>
          <span class="kra-weightage-badge">Weightage: ${weightage}%</span>
          <span class="goal-count-badge">${goal_count} Goal(s)</span>
        </div>
    `;
    
    if (kra_goals.length > 0) {
      html += `
        <table class="goals-table">
          <thead>
            <tr>
              <th style="width: 5%;">Sr.</th>
              <th style="width: 40%;">Goal Name</th>
              <th style="width: 25%;">Progress</th>
              <th style="width: 30%;">Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      kra_goals.forEach((goal, goalIndex) => {
        let progress = goal.progress || 0;
        
        html += `
          <tr>
            <td>${goalIndex + 1}</td>
            <td><strong>${goal.goal_name || 'Unnamed Goal'}</strong></td>
            <td>
              <div class="progress-cell">
                <div class="progress-bar-mini">
                  <div class="progress-fill-mini" style="width: ${progress}%"></div>
                </div>
                <span class="progress-text">${progress}%</span>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn-update" data-goal="${goal.name}"><i class="fa fa-edit"></i> Update Progress</button>
                <button class="btn-delete" data-goal="${goal.name}"><i class="fa fa-trash"></i> Delete</button>
              </div>
            </td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
      `;
    } else {
      html += `<div class="no-goals-msg">No goals added for this KRA yet.</div>`;
    }
    
    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

function attach_button_events(wrapper, frm) {
  // Remove old bindings to prevent duplicate popups
  wrapper.off('click', '.btn-update');
  wrapper.off('click', '.btn-delete');
  
  // Disable or enable buttons based on workflow state
  let is_readonly = ["Pending from Manager", "Pending from Reviewer", "Approved"].includes(frm.doc.workflow_state);

  if (is_readonly) {
    // Disable all update and delete buttons
    wrapper.find('.btn-update, .btn-delete')
      .prop('disabled', true)
      .css({
        'opacity': '0.6',
        'cursor': 'not-allowed',
        'pointer-events': 'none'
      });
    return; 
  }

  // Update Progress Button
  wrapper.on('click', '.btn-update', function () {
    let goal_name = $(this).data('goal');
    frappe.prompt(
      [{ fieldname: 'progress', fieldtype: 'Int', label: 'New Progress %', reqd: 1 }],
      function (values) {
        if (values.progress < 0 || values.progress > 100) {
            frappe.msgprint({
              title: 'Invalid Input',
              message: 'Please enter a value between 0 and 100.',
              indicator: 'red'
            });
            return; 
        }
        frappe.call({
          method: 'hrms.hr.doctype.goal.goal.update_progress',
          args: { goal: goal_name, progress: values.progress },
          callback: function () {
            frappe.show_alert({ message: 'Progress updated!', indicator: 'green' });
            frm.reload_doc().then(() => {
              show_kra_summary(frm);
            });
          },
        });
      },
      'Update Progress',
      'Update'
    );
  });

  // Delete Goal Button
  wrapper.on('click', '.btn-delete', function () {
    let goal_name = $(this).data('goal');
    frappe.confirm('Are you sure you want to delete this Goal?', function () {
      frappe.call({
        method: 'frappe.client.delete',
        args: { doctype: 'Goal', name: goal_name },
        callback: function () {
          frappe.show_alert({ message: 'Goal deleted!', indicator: 'red' });
          frm.reload_doc().then(() => {
            show_kra_summary(frm);
          });
        },
      });
    });
  });
}

// ============================================
// HOD SUMMARY SECTION WITH USER ACCESS CONTROL
// ============================================

// Check if user has access to HOD Summary tab
function check_hod_tab_access(frm, callback) {
  // First check if user has HR Head or Appraisal HOD Reviewer role
  let has_hr_head_role = frappe.user_roles.includes('HR Head');
  let has_hr_manager_role = frappe.user_roles.includes('Appraisal HOD Reviewer');
  
  if (has_hr_head_role || has_hr_manager_role) {
    callback(true);
    return;
  }
  
  // If not HR Head/Manager, check if user is custom_hod_user_id
  frappe.call({
    method: 'frappe.client.get',
    args: {
      doctype: 'Employee',
      name: frm.doc.employee
    },
    callback: function(emp_response) {
      let report_to_user = emp_response.message?.custom_hod_user_id;
      let current_user = frappe.session.user;
      
      let has_access = (current_user && report_to_user && 
                       current_user.trim().toLowerCase() === report_to_user.trim().toLowerCase());
      
      callback(has_access);
    }
  });
}

function toggle_hod_tab_visibility(frm) {
  check_hod_tab_access(frm, function(has_access) {
    // Find the tab containing custom_hod_summarys field
    let hod_tab = frm.fields_dict.custom_hod_summarys;
    
    if (hod_tab && hod_tab.tab) {
      if (has_access) {
        // Show tab
        frm.toggle_display(hod_tab.tab.df.fieldname, true);
        // Also show the section
        frm.toggle_display('custom_hod_summarys', true);
      } else {
        // Hide tab
        frm.toggle_display(hod_tab.tab.df.fieldname, false);
        // Also hide the section
        frm.toggle_display('custom_hod_summarys', false);
      }
    }
  });
}

function show_hod_summary(frm) {
  check_hod_tab_access(frm, function(has_access) {
    if (!has_access) {
      let wrapper = frm.fields_dict.custom_hod_summarys?.$wrapper;
      if (wrapper) {
        wrapper.html(`
          <div style="padding: 20px; text-align: center; color: #d32f2f; background: #ffebee; border-radius: 8px; margin: 15px;">
            <i class="fa fa-lock" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p style="margin: 0; font-weight: 600;">Access Denied</p>
            <p style="margin: 5px 0 0 0; font-size: 13px;">You do not have permission to view this section.</p>
          </div>
        `);
      }
      return;
    }
    
    let wrapper = frm.fields_dict.custom_hod_summarys?.$wrapper;

    if (!wrapper) {
      console.error('Wrapper not found for custom_hod_summarys');
      return;
    }

    wrapper.empty();

    frappe.call({
      method: 'frappe.client.get',
      args: {
        doctype: 'Employee',
        name: frm.doc.employee
      },
      callback: function (emp_response) {
        let report_to_user = emp_response.message?.custom_hod_user_id;
        
        console.log("Employee Data:", emp_response.message);
        console.log("Report To User from Employee:", report_to_user);
        
        frappe.call({
          method: 'frappe.client.get_list',
          args: {
            doctype: 'Goal',
            filters: { 
              appraisal_cycle: frm.doc.appraisal_cycle,
              employee: frm.doc.employee
            },
            fields: ['name', 'goal_name', 'kra', 'progress', 'status', 'description', 'custom_hod_score'],
            limit_page_length: 100,
          },
          callback: function (r) {
            if (frm.doc.appraisal_kra && frm.doc.appraisal_kra.length > 0) {
              let goals = r.message || [];
              let html = generate_hod_html(frm, goals, report_to_user);
              wrapper.html(html);
              
              attach_hod_events(wrapper, frm, report_to_user);
            } else {
              wrapper.html(`<p style="padding:10px; color:#888;">No KRA data available.</p>`);
            }
          }
        });
      }
    });
  });
}

function generate_hod_html(frm, goals, report_to_user) {
  let current_user = frappe.session.user;
  let has_hr_head_role = frappe.user_roles.includes('HR Head');
  let has_hr_manager_role = frappe.user_roles.includes('Appraisal HOD Reviewer');
  
  console.log("Current User:", current_user);
  console.log("Report To User:", report_to_user);
  console.log("Has HR Head Role:", has_hr_head_role);
  console.log("Has Appraisal HOD Reviewer Role:", has_hr_manager_role);
  console.log("Workflow State:", frm.doc.workflow_state);
  
  let is_reporting_manager = (current_user && report_to_user && 
                              current_user.trim().toLowerCase() === report_to_user.trim().toLowerCase());
  
  let is_editable = (is_reporting_manager || has_hr_head_role) && frm.doc.workflow_state === 'Pending from Manager';
  
  console.log("Is Reporting Manager:", is_reporting_manager);
  console.log("Is Editable:", is_editable);
  
  let final_score = frm.doc.final_score || 0;
  let html = `
    <style>
      .hod-summary-container {
        padding: 15px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
       .manager-score-card {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 15px;
          box-shadow: 0 2px 8px rgba(44, 62, 80, 0.25);
          display: inline-flex;
          justify-content: space-between;
          align-items: center;
          color: white;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .manager-score-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        
        .manager-score-value {
          font-size: 20px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.15);
          padding: 4px 12px;
          border-radius: 5px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      
      .hod-kra-collapsible {
        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        color: white;
        cursor: pointer;
        padding: 15px 20px;
        width: 100%;
        border: none;
        text-align: left;
        outline: none;
        font-size: 15px;
        font-weight: 600;
        border-radius: 8px;
        margin-bottom: 2px;
        transition: all 0.3s ease;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      
      .hod-kra-collapsible:hover {
        background: linear-gradient(135deg, #34495e 0%, #3d5a6b 100%);
      }
      
      .hod-kra-collapsible.active {
        background: linear-gradient(135deg, #1a252f 0%, #2c3e50 100%);
      }
      
      .hod-kra-title {
        display: flex;
        align-items: center;
        gap: 15px;
        flex: 1;
      }
      
      .hod-kra-name {
        font-size: 16px;
        text-transform: uppercase;
      }
      
      .hod-weightage-badge {
        background: rgba(255, 255, 255, 0.2);
        padding: 4px 12px;
        border-radius: 15px;
        font-size: 12px;
      }
      
      .hod-goal-count {
        background: rgba(76, 175, 80, 0.3);
        color: #a5d6a7;
        padding: 4px 10px;
        border-radius: 15px;
        font-size: 12px;
      }
      
      .hod-toggle-icon {
        font-size: 18px;
        transition: transform 0.3s ease;
      }
      
      .hod-toggle-icon.rotated {
        transform: rotate(180deg);
      }
      
      .hod-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        background: #f5f5f5;
        border-radius: 0 0 8px 8px;
      }
      
      .hod-content.show {
        max-height: 2000px;
        padding: 15px;
        margin-bottom: 10px;
      }
      
      .hod-goals-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        font-size: 14px;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .hod-goals-table thead {
        background: #e9ecef;
        color: #495057;
      }
      
      .hod-goals-table th {
        padding: 12px 15px;
        text-align: left;
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .hod-goals-table tbody tr {
        border-bottom: 1px solid #f0f0f0;
        transition: background-color 0.2s ease;
      }
      
      .hod-goals-table tbody tr:hover {
        background-color: #f8f9fa;
      }
      
      .hod-goals-table td {
        padding: 12px 15px;
        color: #212529;
      }
      
      .hod-progress-cell {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .hod-progress-bar {
        flex: 1;
        height: 8px;
        background: #eceff1;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .hod-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #2c3e50, #34495e);
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .hod-progress-text {
        font-weight: 600;
        color: #2c3e50;
        min-width: 45px;
      }
      
      .hod-action-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      
      .hod-btn-update, .hod-btn-description {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
        color: white;
      }

      .hod-btn-update {
        background: #64b5f6;
      }

      .hod-btn-update:hover {
        background: #42a5f5;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .hod-btn-update:disabled {
        background: #ccc;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .hod-btn-update:disabled:hover {
        background: #ccc;
        transform: none;
        box-shadow: none;
      }

      .hod-btn-description {
        background: #8d6e63;
      }

      .hod-btn-description:hover {
        background: #6d4c41;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .hod-no-goals {
        padding: 20px;
        text-align: center;
        color: #757575;
        font-style: italic;
        background: white;
        border-radius: 6px;
      }

      .access-info-banner {
        background: #fff3cd;
        border: 1px solid #ffc107;
        color: #856404;
        padding: 10px 15px;
        border-radius: 6px;
        margin-bottom: 15px;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .hr-head-view-banner {
        background: #e3f2fd;
        border: 1px solid #2196f3;
        color: #0d47a1;
        padding: 10px 15px;
        border-radius: 6px;
        margin-bottom: 15px;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
    </style>
    
    <div class="hod-summary-container">
      <div class="manager-score-card">
        <div class="manager-score-label">
          <i class="fa fa-star"></i> Manager Score
        </div>
        <div class="manager-score-value">
          ${final_score.toFixed(3)}
        </div>
      </div>
  `;

  if (has_hr_head_role && !is_reporting_manager) {
    html += `
      <div class="hr-head-view-banner">
        <i class="fa fa-eye"></i>
        <span>You are viewing this as HR Head (Edit Access Enabled).</span>
      </div>
    `;
  } else if (has_hr_manager_role && !is_reporting_manager) {
    html += `
      <div class="hr-head-view-banner">
        <i class="fa fa-eye"></i>
        <span>You are viewing this as Appraisal HOD Reviewer (View Only Mode).</span>
      </div>
    `;
  }

  if (!is_editable) {
    if (!is_reporting_manager && !has_hr_head_role && !has_hr_manager_role) {
      html += `
        <div class="access-info-banner">
          <i class="fa fa-info-circle"></i>
          <span>Only the reporting manager can update scores.</span>
        </div>
      `;
    } else if ((is_reporting_manager || has_hr_head_role) && frm.doc.workflow_state !== 'Pending from Manager') {
      html += `
        <div class="access-info-banner">
          <i class="fa fa-info-circle"></i>
          <span>Scores can only be updated when the workflow state is "Pending from Manager".</span>
        </div>
      `;
    }
  }

  frm.doc.appraisal_kra.forEach((kra, index) => {
    let kra_goals = goals.filter(g => g.kra === kra.kra);
    let weightage = kra.per_weightage || 0;
    let goal_count = kra_goals.length;
    
    html += `
      <button class="hod-kra-collapsible" data-kra-index="${index}">
        <div class="hod-kra-title">
          <span class="hod-kra-name">${kra.kra || 'Unnamed KRA'}</span>
          <span class="hod-weightage-badge">Weightage: ${weightage}%</span>
          <span class="hod-goal-count">${goal_count} Goal(s)</span>
        </div>
        <i class="fa fa-chevron-down hod-toggle-icon"></i>
      </button>
      
      <div class="hod-content" data-kra-content="${index}">
    `;
    
    if (kra_goals.length > 0) {
      html += `
        <table class="hod-goals-table">
          <thead>
            <tr>
              <th style="width: 5%;">Sr.</th>
              <th style="width: 35%;">Goal Name</th>
              <th style="width: 18%;">Progress</th>
              <th style="width: 18%;">Manager Score</th>
              <th style="width: 24%;">Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      kra_goals.forEach((goal, goalIndex) => {
        let progress = goal.progress || 0;
        let hod_score = goal.custom_hod_score || 0;

        html += `
          <tr>
            <td>${goalIndex + 1}</td>
            <td><strong>${goal.goal_name || 'Unnamed Goal'}</strong></td>
            <td>
              <div class="hod-progress-cell">
                <div class="hod-progress-bar">
                  <div class="hod-progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="hod-progress-text">${progress}%</span>
              </div>
            </td>
            <td>
              <div class="hod-progress-cell">
                <div class="hod-progress-bar">
                  <div class="hod-progress-fill" style="width: ${hod_score}%"></div>
                </div>
                <span class="hod-progress-text">${hod_score}%</span>
              </div>
            </td>
            <td>
              <div class="hod-action-buttons">
                <button class="hod-btn-update" data-goal="${goal.name}" ${!is_editable ? 'disabled' : ''}>
                    <i class="fa fa-edit"></i> Update Score
                </button>
                <button class="hod-btn-description" data-description="${goal.description || ''}">
                  <i class="fa fa-info-circle"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
      `;
    } else {
      html += `<div class="hod-no-goals">No goals found for this KRA</div>`;
    }
    
    html += `</div>`;
  });
  
  html += `</div>`;
  
  return html;
}

function attach_hod_events(wrapper, frm, report_to_user) {
  wrapper.off('click', '.hod-kra-collapsible');
  wrapper.off('click', '.hod-btn-update');
  wrapper.off('click', '.hod-btn-description');

  wrapper.on('click', '.hod-kra-collapsible', function () {
    let index = $(this).data('kra-index');
    let content = wrapper.find(`.hod-content[data-kra-content="${index}"]`);
    let icon = $(this).find('.hod-toggle-icon');
    
    $(this).toggleClass('active');
    content.toggleClass('show');
    icon.toggleClass('rotated');
  });

  // Update HOD Score Button
  wrapper.on('click', '.hod-btn-update', function (e) {
    e.stopPropagation(); 
    
    let current_user = frappe.session.user;
    let has_hr_head_role = frappe.user_roles.includes('HR Head');
    
    console.log("Button Click - Current User:", current_user);
    console.log("Button Click - Report To User:", report_to_user);
    
    let is_reporting_manager = (current_user && report_to_user && 
                                current_user.trim().toLowerCase() === report_to_user.trim().toLowerCase());
    
    if (!is_reporting_manager && !has_hr_head_role) {
        frappe.msgprint({
          title: 'Access Denied',
          message: 'Only the reporting manager or HR Head can update scores.',
          indicator: 'red'
        });
        return;
    }

    if (frm.doc.workflow_state !== 'Pending from Manager') {
        frappe.msgprint({
          title: 'Access Denied',
          message: 'Scores can only be updated when workflow state is "Pending from Manager".',
          indicator: 'red'
        });
        return;
    }

    let goal_name = $(this).data('goal');
    
    frappe.prompt(
      [{ 
        fieldname: 'custom_hod_score', 
        fieldtype: 'Int', 
        label: 'Manager Score %', 
        reqd: 1,
        description: 'Enter a value between 0 and 100'
      }],
      function (values) {
        if (values.custom_hod_score < 0 || values.custom_hod_score > 100) {
            frappe.msgprint({
              title: 'Invalid Input',
              message: 'Please enter a Manager Score between 0 and 100.',
              indicator: 'red'
            });
            return;
        }
        frappe.call({
          method: 'recruitment.server_script.appraisal.appraisal.update_hod_progress',  
          args: {
            goal: goal_name,
            hod_progress: values.custom_hod_score
          },
          callback: function (response) {
            console.log("HOD Progress Update Response:", response);
            frappe.show_alert({ message: 'Manager Score updated!', indicator: 'green' });
            frm.reload_doc().then(() => {
              show_hod_summary(frm);
            });
          },
        });
      },
      'Update Score',
      'Update'
    );
  });

  // Description Button 
  wrapper.on('click', '.hod-btn-description', function (e) {
    e.stopPropagation();
    let description = $(this).data('description') || 'No description available.';

    let d = new frappe.ui.Dialog({
      title: 'Goal Description',
      fields: [
        {
          fieldname: 'desc',
          fieldtype: 'Small Text',
          label: 'Description',
          read_only: 1,
          default: description
        }
      ],
    });
    d.show();
  });
}



// Hide Feedback Questions

frappe.ui.form.on('Appraisal', {
    employee: function(frm) {
        set_field_permissions(frm);
    },
    
    onload: function(frm) {
        set_field_permissions(frm);
    }
});

function set_field_permissions(frm) {
    let fields = [
        'custom_q1_feedback',
        'custom_q2_feedback',
        'custom_q3_feedback',
        'custom_q4_feedback',
        'custom_q5_feedback'
    ];
    
    let current_user = frappe.session.user;
    
    if (frm.is_new()) {
        fields.forEach(function(field) {
            frm.set_df_property(field, 'read_only', 0);
            frm.set_df_property(field, 'hidden', 0);
        });
        frm.refresh_fields();
        return;
    }
    
    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'Employee',
            filters: { name: frm.doc.employee },
            fieldname: 'user_id'
        },
        async: false,
        callback: function(r) {
            let employee_user = r.message ? r.message.user_id : null;
            
            let is_hr_head = frappe.user.has_role('HR Head');
            
            let is_employee = (current_user === employee_user);
            
            fields.forEach(function(field) {
                if (is_employee) {
                    frm.set_df_property(field, 'read_only', 0);
                    frm.set_df_property(field, 'hidden', 0);
                } else if (is_hr_head) {
                    frm.set_df_property(field, 'read_only', 1);
                    frm.set_df_property(field, 'hidden', 0);
                } else {
                    frm.set_df_property(field, 'hidden', 1);
                }
            });
            
            frm.refresh_fields();
        }
    });
}



// Hide fields

frappe.ui.form.on('Appraisal', {
    onload: function(frm) {
        const promotion_fields = [
            'custom_promotion',
            'custom_new_designation',
            'custom_special_appraisal',
            'custom_special_appraisal_amount'
        ];
        
        const rating_fields = [
            'custom_rating',
            'custom_overall_feedback'
        ];
        
        [...promotion_fields, ...rating_fields].forEach(f => {
            frm.set_df_property(f, 'hidden', 1);
        });
        
        if (frm.doc.employee) {
            frappe.db.get_value('Employee', frm.doc.employee, 'custom_hod_user_id')
                .then(r => {
                    const hod_user = r.message ? r.message.custom_hod_user_id : null;
                    const current_user = frappe.session.user;
                    const is_hod = hod_user && hod_user === current_user;
                    const is_appraisal_reviewer = frappe.user.has_role('Appraisal HOD Reviewer');
                    const is_hr_head = frappe.user.has_role('HR Head');
                    
                    promotion_fields.forEach(fieldname => {
                        if (is_appraisal_reviewer) {
                            frm.set_df_property(fieldname, 'hidden', 0);
                            frm.set_df_property(fieldname, 'read_only', 0);
                        } else if (is_hod || is_hr_head) {
                            frm.set_df_property(fieldname, 'hidden', 0);
                            frm.set_df_property(fieldname, 'read_only', 1);
                        } else {
                            frm.set_df_property(fieldname, 'hidden', 1);
                        }
                    });
                    
                    rating_fields.forEach(fieldname => {
                        if (is_hod || is_hr_head) {
                            frm.set_df_property(fieldname, 'hidden', 0);
                            frm.set_df_property(fieldname, 'read_only', 0);
                        } else if (is_appraisal_reviewer) {
                            frm.set_df_property(fieldname, 'hidden', 0);
                            frm.set_df_property(fieldname, 'read_only', 1);
                        } else {
                            frm.set_df_property(fieldname, 'hidden', 1);
                        }
                    });
                    
                    frm.refresh_fields();
                })
                .catch(err => {
                    console.error('Error fetching HOD user:', err);
                    frm.refresh_fields();
                });
        } else {
            frm.refresh_fields();
        }
    },
    
    custom_promotion: function(frm) {
        frm.refresh_field('custom_new_designation');
        frm.save();
    },
    
    custom_new_designation: function(frm) {
        frm.save();
    },
    
    custom_special_appraisal: function(frm) {
        frm.refresh_field('custom_special_appraisal_amount');
        frm.save();
    },
    
    custom_special_appraisal_amount: function(frm) {
        frm.save();
    },
    
    custom_rating: function(frm) {
        frm.save();
    },
    
    custom_overall_feedback: function(frm) {
        frm.save();
    }
});



// Hide Goal Child Table button

frappe.ui.form.on('Appraisal', {
    onload: function(frm) {
        console.log('=== APPRAISAL ONLOAD ===');
        hide_goals_add_row(frm);
        hide_appraisal_kra_add_row(frm);
    },
    
    refresh: function(frm) {
        console.log('=== APPRAISAL REFRESH ===');
        hide_goals_add_row(frm);
        hide_appraisal_kra_add_row(frm);
    }
});

function hide_goals_add_row(frm) {
    if (frm.fields_dict['goals'] && frm.fields_dict['goals'].grid) {
        let grid = frm.fields_dict['goals'].grid;
        
        console.log('Hiding Goals Add Row button...');
        
        // Method 1: Set cannot_add_rows to true
        grid.cannot_add_rows = true;
        grid.df.cannot_add_rows = 1;
        
        // Method 2: Refresh grid to apply changes
        grid.refresh();
        
        // Method 3: Hide the button directly with CSS
        setTimeout(() => {
            let add_row_btn = grid.wrapper.find('.grid-add-row');
            
            if (add_row_btn.length > 0) {
                add_row_btn.hide();
                console.log('✓ Add Row button hidden');
            } else {
                console.log('⚠ Add Row button not found (might already be hidden)');
            }
            
            // Also hide the "Add Multiple" button if exists
            let add_multiple_btn = grid.wrapper.find('.grid-add-multiple-rows');
            if (add_multiple_btn.length > 0) {
                add_multiple_btn.hide();
                console.log('✓ Add Multiple button hidden');
            }
        }, 100);
        
        console.log('=== END ===\n');
    } else {
        console.error('ERROR: Goals field or grid not found!');
    }
}

function hide_appraisal_kra_add_row(frm) {
    if (frm.fields_dict['appraisal_kra'] && frm.fields_dict['appraisal_kra'].grid) {
        let grid = frm.fields_dict['appraisal_kra'].grid;
        
        console.log('Hiding Appraisal KRA Add Row button...');
        
        // Method 1: Set cannot_add_rows to true
        grid.cannot_add_rows = true;
        grid.df.cannot_add_rows = 1;
        
        // Method 2: Refresh grid to apply changes
        grid.refresh();
        
        // Method 3: Hide the button directly with CSS
        setTimeout(() => {
            let add_row_btn = grid.wrapper.find('.grid-add-row');
            
            if (add_row_btn.length > 0) {
                add_row_btn.hide();
                console.log('✓ Add Row button hidden');
            } else {
                console.log('⚠ Add Row button not found (might already be hidden)');
            }
            
            // Also hide the "Add Multiple" button if exists
            let add_multiple_btn = grid.wrapper.find('.grid-add-multiple-rows');
            if (add_multiple_btn.length > 0) {
                add_multiple_btn.hide();
                console.log('✓ Add Multiple button hidden');
            }
        }, 100);
        
        console.log('=== END ===\n');
    } else {
        console.error('ERROR: Appraisal KRA field or grid not found!');
    }
}



// Hide View Goals

frappe.ui.form.on('Appraisal', {
    onload(frm) {
        hide_buttons(frm);
    },
    workflow_state(frm) {
        hide_buttons(frm);
    },
    after_save(frm) {
        hide_buttons(frm);
    },
    on_submit(frm) {
        hide_buttons(frm);
    }
});

frappe.ui.form.on('Appraisal KRA', {
    form_render(frm, cdt, cdn) {
        if (frm.doc.workflow_state !== 'Draft') {
            setTimeout(() => $(`[data-name="${cdn}"] [data-fieldname="custom_add_goal"]`).hide(), 200);
        }
    }
});

function hide_buttons(frm) {
    setTimeout(() => {
        $('button:contains("View Goals")').hide();
        
        if (frm.doc.workflow_state !== 'Draft') {
            $('[data-fieldname="custom_add_goal"]').hide();
        }
    }, 500);
}


// Store Data in Child Table

frappe.ui.form.on("Appraisal", {
    onload: function(frm) {
        remove_deleted_goals(frm);
    },
    refresh: function(frm) {
        remove_deleted_goals(frm);
    }
});

function remove_deleted_goals(frm) {
    if (!frm.doc.custom_goal_summary_ct || frm.doc.custom_goal_summary_ct.length === 0) return;

    frappe.db.get_list("Goal", { fields: ["goal_name", "progress"], limit: 1000 }).then(r => {
        let existing_goal_names = r.map(g => g.goal_name);
        let grid = frm.fields_dict.custom_goal_summary_ct.grid;
        let changed = false;

        for (let i = frm.doc.custom_goal_summary_ct.length - 1; i >= 0; i--) {
            let row = frm.doc.custom_goal_summary_ct[i];

            if (!existing_goal_names.includes(row.goal_name)) {
                frm.doc.custom_goal_summary_ct.splice(i, 1);
                grid.grid_rows[i].remove();
                changed = true;
            } else {
                let goal_data = r.find(g => g.goal_name === row.goal_name);
                if (goal_data) {
                    update_child_table_progress(frm, row.goal_name, goal_data.progress || 0);
                }
            }
        }

        if (changed) {
            frm.refresh_field("custom_goal_summary_ct");
            frm.save_or_update(); 
        }
    });
}

function update_child_table_progress(frm, goal_name, progress) {
    if (!frm.doc.custom_goal_summary_ct) return;

    let updated = false;
    frm.doc.custom_goal_summary_ct.forEach(row => {
        if (row.goal_name === goal_name) {
            if (row.progress !== progress) {
                row.progress = progress;
                updated = true;
            }
        }
    });

    if (updated) {
        frm.refresh_field("custom_goal_summary_ct");
    }
}


frappe.ui.form.on('Appraisal KRA', {
    custom_add_goal: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row) {
            frappe.msgprint(__('KRA row not found'));
            return;
        }

        let dialog = new frappe.ui.Dialog({
            title: __('Add Goal for: {0}', [row.kra]),
            fields: [
                { fieldname: 'goal_name', fieldtype: 'Data', label: __('Goal Name'), reqd: 1 },
                { fieldname: 'employee', fieldtype: 'Link', label: __('Employee'), options: 'Employee', default: frm.doc.employee, reqd: 1 },
                { fieldname: 'progress', fieldtype: 'Int', label: __('Progress'), default: 0 },
                { fieldname: 'start_date', fieldtype: 'Date', label: __('Start Date') },
                { fieldname: 'end_date', fieldtype: 'Date', label: __('End Date') },
                { fieldname: 'appraisal_cycle', fieldtype: 'Link', label: __('Appraisal Cycle'), options: 'Appraisal Cycle', default: frm.doc.appraisal_cycle },
                { fieldname: 'kra', fieldtype: 'Link', label: __('KRA'), options: 'KRA', default: row.kra },
                { fieldname: 'description', fieldtype: 'Small Text', label: __('Description') }
            ],
            primary_action_label: __('Add Goal'),
            primary_action: function(values) {
                let summary_row = frm.add_child("custom_goal_summary_ct");
                summary_row.goal_name = values.goal_name;
                summary_row.description = values.description;
                summary_row.progress = values.progress;
                summary_row.kra = values.kra; 
                frm.refresh_field("custom_goal_summary_ct");

                add_goal_to_goals_table(frm, row, values);

                dialog.hide();

                setTimeout(() => {
                    render_custom_goal_summary(frm, cdn);
                }, 100);
            }
        });

        dialog.show();
    },

    form_render: function(frm, cdt, cdn) {
        render_custom_goal_summary(frm, cdn);
    },

    kra: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.kra) {
            suggest_default_goals(frm, row);
        }
    },

    goal_completion: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.per_weightage && row.goal_completion) {
            row.goal_score = (row.per_weightage * row.goal_completion) / 100;
            frm.refresh_field('appraisal_kra');
        }
        calculate_total_score(frm);
    },

    per_weightage: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.per_weightage && row.goal_completion) {
            row.goal_score = (row.per_weightage * row.goal_completion) / 100;
            frm.refresh_field('appraisal_kra');
        }
        calculate_total_score(frm);
    }
});

// --------------------- Render HTML table in one row ---------------------
function render_custom_goal_summary(frm, cdn) {
    let row = locals["Appraisal KRA"][cdn];
    let field = frm.fields_dict["appraisal_kra"]
        .grid.grid_rows_by_docname[cdn]
        .grid_form.fields_dict["custom_goal_summary"];
    if (!field) return;

    let goals = frm.doc.custom_goal_summary_ct.filter(g => g.kra === row.kra);

    let html = `
        <style>
            .wide-table { 
                width: 100%; 
                font-family: "Segoe UI", Tahoma, sans-serif;
                box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                border-radius: 6px;
                overflow: hidden;
            }
            .wide-table th, .wide-table td { 
                padding: 8px 12px; 
                text-align: left; 
            }
            .wide-table th { 
                background-color: #f5f6fa; 
                font-weight: 600;
                color: #333;
                border-bottom: 2px solid #e1e1e1;
            }
            .wide-table tr:nth-child(even) { 
                background-color: #fafafa; 
            }
        </style>
        <table class="wide-table">
            <thead>
                <tr>
                    <th>Goal Name</th>
                    <th>Description</th>
                    <th>Progress</th>
                </tr>
            </thead>
            <tbody>
                ${goals.map(g => `
                    <tr>
                        <td>${g.goal_name || ''}</td>
                        <td>${g.description || ''}</td>
                        <td>${g.progress || 0}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    $(field.wrapper).html(html);
}


// --------------------- Add Goal Function ---------------------
function add_goal_to_goals_table(frm, kra_row, goal_data) {
    frappe.call({
        method: "hrms.hr.doctype.goal.goal.add_tree_node",
        args: {
            doctype: "Goal",
            goal_name: goal_data.goal_name,
            employee: goal_data.employee,
            progress: goal_data.progress,
            start_date: goal_data.start_date,
            end_date: goal_data.end_date,
            appraisal_cycle: goal_data.appraisal_cycle,
            kra: goal_data.kra,
            description: goal_data.description,
            is_root: true,
        },
        callback: function(r) {
            if (r.message) {
                let goal_row = frm.add_child("goals");
                goal_row.goal = r.message.name;
                goal_row.goal_name = r.message.goal_name;
                goal_row.employee = r.message.employee;
                goal_row.kra = r.message.kra;
                goal_row.progress = r.message.progress;
                goal_row.weightage = kra_row.per_weightage || 0;

                frm.refresh_field("goals");
                frm.save_or_update();

                frappe.msgprint({
                    title: __('Success'),
                    message: __('Goal "{0}" has been created and linked to KRA: {1}', 
                        [goal_data.goal_name, kra_row.kra]),
                    indicator: 'green'
                });

                update_kra_goal_status(frm, kra_row);
                calculate_total_score(frm);
            }
        }
    });
}

// --------------------- Score Calculation Helpers ---------------------
function update_kra_goal_status(frm, kra_row) {
    let kra_goals = frm.doc.goals?.filter(goal => goal.kra === kra_row.kra) || [];

    if (kra_goals.length > 0) {
        let total_completion = kra_goals.reduce((sum, goal) => sum + (goal.target_completion || 0), 0);
        let avg_completion = total_completion / kra_goals.length;

        kra_row.goal_completion = avg_completion;
        kra_row.goal_score = (kra_row.per_weightage * avg_completion) / 100;

        frm.refresh_field('appraisal_kra');
        frm.refresh_field('goals');
    }
}

function calculate_total_score(frm) {
    let total_score = 0;

    if (frm.doc.appraisal_kra) {
        frm.doc.appraisal_kra.forEach(kra => {
            total_score += kra.goal_score || 0;
        });
    }

    frm.set_value('total_score', total_score);
    frm.set_value('goal_score_percentage', total_score);
}

// --------------------- CSS Styling ---------------------
const custom_css = `
[data-fieldname="custom_add_goal"] .btn {
    background-color: black !important;
    color: white !important;
    border: none !important;
}
`;
if (!document.getElementById('appraisal-kra-btn-css')) {
    let style = document.createElement('style');
    style.id = 'appraisal-kra-btn-css';
    style.textContent = custom_css;
    document.head.appendChild(style);
}



// Appraisal tab showing goal

frappe.ui.form.on('Appraisal', {
  refresh: function (frm) {
    if (!frm.doc.__islocal) {
      show_simple_goal_summary(frm);
    }
  },
});

function show_simple_goal_summary(frm) {
  frappe.call({
    method: 'frappe.client.get_list',
    args: {
      doctype: 'Goal',
      filters: { 
        appraisal_cycle: frm.doc.appraisal_cycle,
        employee: frm.doc.employee // Add this line
      },
      fields: ['name', 'goal_name', 'kra', 'progress', 'status', 'description'],
      limit_page_length: 100,
    },
    callback: function (r) {
      let wrapper = frm.fields_dict.custom_goal_summary_content.$wrapper;
      wrapper.empty();

      if (r.message && r.message.length > 0) {
        let html = generate_summary_html(frm, r.message);
        wrapper.html(html);

        // Attach delegated button handlers
        attach_goal_action_events(wrapper, frm);
      } else {
        wrapper.html(`<p style="padding:10px; color:#888;">No goals found for this appraisal cycle.</p>`);
      }
    },
  });
}

function generate_summary_html(frm, goals) {
  let all_goals = goals.map(goal => ({
    name: goal.name,
    goal: goal.goal_name,
    kra: goal.kra || 'Ungrouped',
    weightage: goal.weightage || 0,
    progress: goal.progress || 0,
    target_value: goal.target || 'Not Set',
    description: goal.description || '',
  }));

  // --- Compute Stats ---
  let total = all_goals.length,
      completed = 0,
      in_progress = 0,
      not_started = 0;

  all_goals.forEach(goal => {
    let progress = getProgressValue(goal);
    if (progress >= 100) completed++;
    else if (progress > 0) in_progress++;
    else not_started++;
  });

  // --- Group by KRA ---
  let kra_groups = {};
  all_goals.forEach(goal => {
    let kra_name = goal.kra || 'Ungrouped';
    if (!kra_groups[kra_name]) kra_groups[kra_name] = [];
    kra_groups[kra_name].push(goal);
  });

  // --- Build HTML ---
  let html = `
    <style>
      .goal-summary-container { padding: 10px; font-family: -apple-system, BlinkMacSystemFont, Roboto, sans-serif; }
      .summary-header { background: #1976d2; color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px; text-align: center; }
      .summary-stats { display: flex; justify-content: space-around; margin-top: 10px; }
      .stat-box { text-align: center; }
      .stat-number { font-size: 20px; font-weight: bold; display: block; }
      .stat-label { font-size: 12px; opacity: 0.9; }

      .kra-block { background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
      .kra-title { font-weight: bold; color: #1976d2; margin-bottom: 10px; }

      .goal-item { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
      .goal-title { font-size: 15px; font-weight: bold; margin-bottom: 6px; color: #333; }
      .goal-details { font-size: 13px; margin-bottom: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 6px; }
      .progress-bar { width: 100%; height: 16px; background: #eee; border-radius: 8px; overflow: hidden; margin-top: 5px; }
      .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); color: white; font-size: 10px; text-align: center; line-height: 16px; }
      .goal-actions { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
      .goal-actions .btn-xs { padding: 2px 6px; font-size: 11px; }
    </style>
    <div class="goal-summary-container">

      <!-- Header Stats -->
      <div class="summary-header">
        <h4>Goal Summary</h4>
        <div class="summary-stats">
          <div class="stat-box"><span class="stat-number">${total}</span><span class="stat-label">Total Goals</span></div>
          <div class="stat-box"><span class="stat-number">${completed}</span><span class="stat-label">Completed</span></div>
          <div class="stat-box"><span class="stat-number">${in_progress}</span><span class="stat-label">In Progress</span></div>
          <div class="stat-box"><span class="stat-number">${not_started}</span><span class="stat-label">Not Started</span></div>
        </div>
      </div>
  `;

  // --- Goals per KRA ---
  Object.keys(kra_groups).forEach(kra_name => {
    html += `<div class="kra-block">
      <div class="kra-title">${kra_name} <span style="font-size:12px; background:#1976d2; color:white; padding:2px 6px; border-radius:10px;">${kra_groups[kra_name].length} goal(s)</span></div>
    `;

    kra_groups[kra_name].forEach((goal, index) => {
      let progress = getProgressValue(goal);
      html += `
        <div class="goal-item">
          <div class="goal-title">${getGoalTitle(goal, index)}</div>
          <div class="goal-details">
            <div><b>Weightage:</b> ${getWeightageValue(goal)}%</div>
            <div><b>Target:</b> ${getTargetValue(goal)}</div>
            <div><b>Status:</b> ${getStatus(progress)}</div>
            <div><b>Progress:</b> ${progress}%</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%">${progress}%</div></div>
          ${goal.description ? `<div style="margin-top:6px; font-size:12px; color:#555;"><b>Description:</b> ${goal.description}</div>` : ''}

          <div class="goal-actions">
            <button class="btn btn-xs btn-primary edit-goal" data-goal="${goal.name}">Edit</button>
            <button class="btn btn-xs btn-success update-progress" data-goal="${goal.name}">Update Progress</button>
            <button class="btn btn-xs btn-info completed-goal" data-goal="${goal.name}">Mark Completed</button>
            <button class="btn btn-xs btn-danger delete-goal" data-goal="${goal.name}">Delete</button>
          </div>
        </div>
      `;
    });

    html += `</div>`; // close kra-block
  });

  html += `</div>`; // close goal-summary-container
  return html;
}

function attach_goal_action_events(wrapper, frm) {
  // First remove old bindings to prevent duplicate popups
  wrapper.off('click', '.edit-goal');
  wrapper.off('click', '.update-progress');
  wrapper.off('click', '.completed-goal');
  wrapper.off('click', '.delete-goal');

  // Edit Goal
  wrapper.on('click', '.edit-goal', function () {
    frappe.set_route('Form', 'Goal', $(this).data('goal'));
  });

  // Update Progress
  wrapper.on('click', '.update-progress', function () {
    let goal_name = $(this).data('goal');
    frappe.prompt(
      [{ fieldname: 'progress', fieldtype: 'Int', label: 'New Progress %', reqd: 1 }],
      function (values) {
        frappe.call({
          method: 'hrms.hr.doctype.goal.goal.update_progress',
          args: { goal: goal_name, progress: values.progress },
          callback: function () {
            frappe.show_alert('Progress updated!');
            show_simple_goal_summary(frm);
          },
        });
      }
    );
  });

  // Mark Completed
  wrapper.on('click', '.completed-goal', function () {
    let goal_name = $(this).data('goal');
    frappe.call({
      method: 'hrms.hr.doctype.goal.goal.update_progress',
      args: { goal: goal_name, progress: 100 },
      callback: function () {
        frappe.show_alert('Goal marked as completed!');
        show_simple_goal_summary(frm);
      },
    });
  });

  // Delete Goal
  wrapper.on('click', '.delete-goal', function () {
    let goal_name = $(this).data('goal');
    frappe.confirm('Are you sure you want to delete this Goal?', function () {
      frappe.call({
        method: 'frappe.client.delete',
        args: { doctype: 'Goal', name: goal_name },
        callback: function () {
          frappe.show_alert('Goal deleted!');
          show_simple_goal_summary(frm);
        },
      });
    });
  });
}


// --- Utility functions ---
function getGoalTitle(goal, index) {
  return goal.goal || goal.goal_name || `Goal ${index + 1}`;
}
function getWeightageValue(goal) {
  return goal.weightage || 0;
}
function getTargetValue(goal) {
  return goal.target_value || goal.target || 'Not Set';
}
function getProgressValue(goal) {
  return goal.progress || 0;
}
function getStatus(progress) {
  if (progress >= 100) return 'Completed';
  if (progress > 0) return 'In Progress';
  return 'Not Started';
}



// Appraisal html field

frappe.ui.form.on('Appraisal', {
    refresh: function(frm) {
        // Find the `custom_result_` HTML field and its wrapper
        let html_field_wrapper = frm.fields_dict['custom_result_'].wrapper;

        // Clear existing content to prevent duplication on refresh
        html_field_wrapper.innerHTML = '';

        // Check if the appraisal_kra child table has data
        if (frm.doc.appraisal_kra && frm.doc.appraisal_kra.length > 0) {
            let html_content = `
                <style>
                    .kra-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-family: sans-serif;
                    }
                    .kra-table th, .kra-table td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    .kra-table th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    .kra-table tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                </style>
                <table class="kra-table">
                    <thead>
                        <tr>
                            <th>KRA</th>
                            <th>Weightage (%)</th>
                            <th>Goal Completion (%)</th>
                            <th>Goal Score</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Loop through each row in the child table to build the HTML
            frm.doc.appraisal_kra.forEach(function(row) {
                html_content += `
                    <tr>
                        <td>${row.kra || ''}</td>
                        <td>${row.per_weightage || ''}</td>
                        <td>${row.goal_completion || ''}</td>
                        <td>${row.goal_score || ''}</td>
                    </tr>
                `;
            });

            // Close the table and set the HTML field's value
            html_content += `</tbody></table>`;
            frm.set_value('custom_result_', html_content);
        } else {
            // Display a message if no KRA data is found
            frm.set_value('custom_result_', '<p>No KRA data available for this appraisal.</p>');
        }
    }
});