frappe.ui.form.on('Payroll Entry', {
  refresh: function(frm) {
    frm.set_value('processing__year', frappe.datetime.str_to_obj(frappe.datetime.now_date()).getFullYear());
  }
});
