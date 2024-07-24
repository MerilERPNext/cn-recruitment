frappe.ready(function() {
	frappe.web_form.set_df_property('employee_code', 'read_only', 1);
})
$(function (){
	$(".navbar").remove();
	$(".web-footer").remove();
	})