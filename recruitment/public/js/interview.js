frappe.ui.form.on("Interview", {
    on_submit: function(frm){
		if(frm.doc.status=="Pending"){
			  frm.add_custom_button(__('Travel Request'), function(){
				frappe.call({
					method: "recruitment.customizations.interview.interview.generate_travel_request",
					args:{
						"interview_id": frm.doc.name
					},
					callback: function(r) {
						// code snippet
					}
				});

			},__("Create"));
		}
    }
})