frappe.ui.form.on("Salary Slip", {
    refresh: function(frm) {
        let is_employee = frappe.user.has_role('Employee');
        let is_payroll_manager = frappe.user.has_role('Payroll manager');
        
        console.log("is_employee:", is_employee); 
        console.log("is_payroll_manager:", is_payroll_manager); 
        console.log("Docstatus:", frm.doc.docstatus); 

        
        if (is_employee && is_payroll_manager) {
            console.log("User has both Employee and Payroll Manager roles. Draft documents are accessible.");
            return; 
        }

        
        if (is_employee && !is_payroll_manager) {
            if (frm.doc.docstatus === 0) {
                frappe.msgprint(__("You are not allowed to view Draft Salary Slips."));
                frappe.set_route("List", "Salary Slip");
            }
        }
    }
});
