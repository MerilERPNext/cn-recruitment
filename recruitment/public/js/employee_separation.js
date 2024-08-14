frappe.ui.form.on("Employee Separation", {
    validate:function(frm){
        if(frm.is_new()){
            d = new Date(frm.doc.custom_resignation_date);
            if (frm.doc.custom_employment_type=="Full-time"){
                d.setDate(d.getDate() + 60);
            }
            if (frm.doc.custom_employment_type=="Probation"){
                d.setDate(d.getDate() + 7);
            }
            let formattedDate = d.toISOString().split('T')[0]   ;
            frm.set_value('custom_last_working_date',formattedDate);
            frm.set_value('custom_actual_last_working_date', formattedDate);
        }
        else{
            if(frm.doc.custom_manual_relieving_date){
                var d2 = new Date(frm.doc.custom_manual_relieving_date);
                d2.setDate(d2.getDate());
                var formatted_date2 = d2.toISOString().split('T')[0];
                frm.set_value('custom_actual_last_working_date', formatted_date2);
            }
            else{
                var d2 = new Date(frm.doc.custom_last_working_date);
                d2.setDate(d2.getDate());
                var formatted_date2 = d2.toISOString().split('T')[0];
                frm.set_value('custom_actual_last_working_date', formatted_date2);
            }
        }
    },
    custom_actual_last_working_date(frm){
        if(frm.doc.custom_actual_last_working_date){
            var d2 = new Date(frm.doc.custom_actual_last_working_date);
            d2.setDate(d2.getDate()-2);
            var formatted_date2 = d2.toISOString().split('T')[0];
            frm.set_value('boarding_begins_on', formatted_date2);
        } 
    },
    custom_manual_relieving(frm){
        if(frm.doc.custom_manual_relieving==0){
            frm.set_value('custom_manual_relieving_date', "");
        }
    }
});
function get_last_working_date(employee){
    frappe.db.get_value('Employee', employee, 'employment_type')
    .then(r => {
        var formattedDate;
        if(r.message.employment_type=="Full-time"){
            d = new Date();
            d.setDate(d.getDate() + 60);
            formattedDate = d.toISOString().split('T')[0];
        }
        else{
            d = new Date();
            d.setDate(d.getDate() + 7);
            formattedDate = d.toISOString().split('T')[0];
        }
        console.log(r.message.employment_type)
        return formattedDate
    })
}