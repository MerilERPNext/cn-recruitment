frappe.ui.form.on("Job Requisition", {
    refresh: function(frm){
		//if(frm.doc.status=="Awaiting Response"){
			  frm.add_custom_button(__('Job Opening'), function(){
				frappe.call({
					method: "recruitment.customizations.job_requisition.job_requisition.generate_job_opening",
					args:{
						"job_requisition": frm.doc.name
					},
					callback: function(r) {
						// code snippet
					}
				});

			},__("Create"));
		//}
    }
})