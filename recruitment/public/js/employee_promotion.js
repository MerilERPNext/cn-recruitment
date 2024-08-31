frappe.ui.form.on('Employee Promotion', {
	refresh(frm) {

        if(!frm.is_new() && frm.doc.custom_status=="In Planning")
        {

        frm.add_custom_button("Assign CTC",function()
            {
                if(frm.doc.employee)
                {

                frappe.route_options = {"employee": frm.doc.employee,"custom_promotion_id":frm.doc.name};

                frappe.set_route("Form", "Salary Structure Assignment", 'new-salary-structure-assignment');

                }
                else{
                    msgprint("Please select employee first")
                }

                
            })

            frm.change_custom_button_type('Assign CTC', null, 'primary');

        }



        
		
	},


    employee:function(frm)
    {
        if(frm.doc.employee)
        {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Salary Structure Assignment",
                    filters: { employee: frm.doc.employee, 'docstatus': 1 },
                    fields: ["*"],
                    limit: 1,
                    order_by: "from_date desc"
                },
                callback: function(res) {
                    if (res.message && res.message.length > 0) {

                        console.log(res.message)

                        frm.set_value("custom_current_salary_structure_assignment_id",res.message[0].name)
                        frm.set_value("custom_old_effective_from",res.message[0].from_date)
                        frm.set_value("current_ctc",res.message[0].base)

                    }

                    }
                })

        }
    }



})


