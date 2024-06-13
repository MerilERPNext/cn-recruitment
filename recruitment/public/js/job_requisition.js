frappe.ui.form.on("Job Requisition", {
    refresh: function(frm){
		if(frm.doc.status=="Open & Approved"){
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
		}
<<<<<<< HEAD
=======
		frm.set_query("custom_salary", function() {
        return {
            "filters": {
                "disabled": 0,
            }
        };
    });
>>>>>>> 4552f31145f99b9ab0755e8d07dcb8d2c4948b54
    }
})