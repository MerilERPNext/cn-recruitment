frappe.ui.form.on("Interview", {
    refresh: function(frm){
		if(frm.doc.status=="Pending"){
			  frm.add_custom_button(__('Travel Request'), function(){
				// frappe.call({
				// 	method: "recruitment.customizations.interview.interview.generate_travel_request",
				// 	args:{
				// 		"interview_id": frm.doc.name
				// 	},
				// 	callback: function(r) {
				// 		// code snippet
				// 	}
				// });
				frappe.db.get_value('Employee', {"user_id":frappe.session.user}, 'name', (r) => {
					frappe.new_doc("Travel Request", {
						travel_type: "Domestic",
						employee:r.name,
						purpose_of_travel:"Interview"
					}).then(doc => {
						frappe.set_route("Form", doc.doctype, doc.name);
					});
				});

				
				

			},__("Create"));
		}
    }
})