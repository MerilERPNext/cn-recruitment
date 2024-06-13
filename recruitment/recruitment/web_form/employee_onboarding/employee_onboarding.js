frappe.ready(function() {
     frappe.web_form.set_df_property('job_applicant', 'read_only', 1);
	 frappe.web_form.set_df_property('job_offer', 'read_only', 1);
	 frappe.web_form.set_df_property('boarding_begins_on', 'read_only', 1);
})
$(function (){
$(".navbar").remove();
$(".web-footer").remove();
})