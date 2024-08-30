frappe.ui.form.on('Employee Promotion', {
	refresh(frm) {

        if(!frm.is_new() && frm.doc.custom_new_salary_structure_assignment_id==undefined)
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



        if(!frm.is_new() && frm.doc.custom_new_salary_structure_assignment_id)
        {

            frm.add_custom_button("Calculate Arrears",function()
            {
                get_old_new_structure(frm)

            })

        }

        frm.change_custom_button_type('Calculate Arrears', null, 'primary');
		
	}
})

function get_old_new_structure(frm, callback) {
    let old_component_dict = [];
    let new_component_dict = [];

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Salary Structure Assignment",
            filters: { employee: frm.doc.employee, 'docstatus': 1 },
            fields: ["*"],
            limit: 2,
            order_by: "from_date desc"
        },
        callback: function(res) {
            if (res.message && res.message.length > 1) {
                

                let old_salary_structure = res.message[1].salary_structure;
                let old_from_date = res.message[1].from_date;

                let new_salary_structure = res.message[0].salary_structure;
                let new_from_date = res.message[0].from_date;

                console.log(old_salary_structure)
                console.log(new_salary_structure)

                fetchOldSalaryComponents(frm, old_salary_structure, old_from_date, old_component_dict, () => {
                    fetchNewSalaryComponents(frm, new_salary_structure, new_from_date, new_component_dict, () => {
                        let combinedDict = {};
                        old_component_dict.forEach(item => {
                            combinedDict[item.component] = {
                                component: item.component,
                                old_amount: item.value,
                                new_amount: 0
                            };
                        });

                        new_component_dict.forEach(item => {
                            if (combinedDict[item.component]) {
                                combinedDict[item.component].new_amount = item.value;
                            } else {
                                combinedDict[item.component] = {
                                    component: item.component,
                                    old_amount: 0,
                                    new_amount: item.value
                                };
                            }
                        });

                        final_array = Object.values(combinedDict);
                        console.log(final_array,"final_arrayfinal_array")

                        // frm.clear_table("old_structure_child");
                        // final_array.forEach(item => {
                        //     let child = frm.add_child("old_structure_child");
                        //     frappe.model.set_value(child.doctype, child.name, "salary_component", item.component);
                        //     frappe.model.set_value(child.doctype, child.name, "old_amount", item.old_amount);
                        //     frappe.model.set_value(child.doctype, child.name, "new_amount", item.new_amount);
                        // });

                        // frm.refresh_field("old_structure_child");
                        // if (typeof callback === 'function') callback();



                                    frappe.db.insert({
                                                "doctype": "Salary Appraisal Calculation",
                                                "employee": frm.doc.employee,
                                                "employee_name": frm.doc.employee_name,
                                                "company": frm.doc.company,
                                                "posting_date":frm.doc.promotion_date,
                                                
                                                
                                                "old_structure_child": final_array.map(row => ({
                                                    "salary_component": row.component,
                                                    "old_amount": row.old_amount,
                                                    "new_amount": row.new_amount
                                                    
                                                }))
                                            })




                    });
                });
            }
            else{
                msgprint("Please Create New Salary Structure Assignment")
            }
        }
    });
}

function fetchOldSalaryComponents(frm, salary_structure, from_date, old_component_dict, callback) {
    frappe.call({
        method: "hrms.payroll.doctype.salary_structure.salary_structure.make_salary_slip",
        args: {
            source_name: salary_structure,
            employee: frm.doc.employee,
            print_format: 'Salary Slip Standard for CTC',
            docstatus: 1,
            posting_date: from_date
        },
        callback: function(response) {
            if (response.message) {
                let ctc_old_array = [
                    ...(response.message.earnings || []).map(v => ({
                        salary_component: v.salary_component,
                        amount: v.amount
                    })),
                    ...(response.message.deductions || []).map(v => ({
                        salary_component: v.salary_component,
                        amount: v.amount
                    }))
                ];
                fetchSalaryComponentDetails(frm, ctc_old_array, old_component_dict, callback);
            }
        }
    });
}

function fetchNewSalaryComponents(frm, salary_structure, from_date, new_component_dict, callback) {
    frappe.call({
        method: "hrms.payroll.doctype.salary_structure.salary_structure.make_salary_slip",
        args: {
            source_name: salary_structure,
            employee: frm.doc.employee,
            print_format: 'Salary Slip Standard for CTC',
            docstatus: 1,
            posting_date: from_date
        },
        callback: function(response) {
            if (response.message) {
                let ctc_new_array = [
                    ...(response.message.earnings || []).map(v => ({
                        salary_component: v.salary_component,
                        amount: v.amount
                    })),
                    ...(response.message.deductions || []).map(v => ({
                        salary_component: v.salary_component,
                        amount: v.amount
                    }))
                ];
                fetchSalaryComponentDetails(frm, ctc_new_array, new_component_dict, callback);
            }
        }
    });
}

function fetchSalaryComponentDetails(frm, ctc_array, component_dict, callback) {
    let fetchDetails = (index) => {

        
        if (index < ctc_array.length) {
            let item = ctc_array[index];
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Salary Component",
                    name: item.salary_component
                },
                callback: function(res) {
                    if (res.message && res.message.custom_is_part_of_appraisal == 1) {
                        component_dict.push({
                            component: res.message.name,
                            value: item.amount
                        });
                    }
                    fetchDetails(index + 1);

                   
                }
            });
        } 
        else 
        {
            callback();
        }
    };
    fetchDetails(0);
}
