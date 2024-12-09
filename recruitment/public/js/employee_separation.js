frappe.ui.form.on("Employee Separation", {
    refresh: function(frm) {
        if (frappe.session.user !== "Administrator" && frm.is_new()) {
            frappe.call({
              method: "frappe.client.get_value",
              args: {
                doctype: "Employee",
                filters: { user_id: frappe.session.user },
                fieldname: "name",
              },
              callback: (r) => {
                if (r.message) {
                    console.log(r.message);
                  frm.set_value("employee", r.message.name);
                }
              },
            });
        }      
    },
    before_save:function(frm){
        if(frm.is_new()){
            if (!frm.doc.boarding_begins_on) {
                let resignationDate = new Date(frm.doc.custom_resignation_date);
                frappe.db.get_value('Employment Type', frm.doc.custom_employment_type, 'custom_notice_period_days')
                .then(r => {
                    let noticePeriodDays = r.message.custom_notice_period_days;
                    resignationDate.setDate(resignationDate.getDate() + noticePeriodDays);
                    let lastWorkingDate = resignationDate.toISOString().split('T')[0];
                    frm.set_value('custom_last_working_date', lastWorkingDate);
                    frm.set_value('custom_actual_last_working_date', lastWorkingDate);
                    resignationDate.setDate(resignationDate.getDate() - 2);
                    let boardingDate = resignationDate.toISOString().split('T')[0];
                    frm.set_value('boarding_begins_on', boardingDate);
                    frm.save_or_update();
                    $('.modal-content').hide();
                });
            }
            if(frm?.doc?.custom_resignation_date && frm?.doc?.custom_employment_type){
                var d2 = new Date(frm?.doc?.custom_resignation_date);
                frappe.db.get_value('Employment Type', frm?.doc?.custom_employment_type, 'custom_notice_period_days').then(r => {
                    d2.setDate(d2.getDate() + r.message.custom_notice_period_days);
                    var formatted_date2 = d2.toISOString().split('T')[0];
                    frm.set_value('custom_last_working_date', formatted_date2);
                    frm.set_value('custom_actual_last_working_date', formatted_date2);
                })
            }else{
                frm.set_value('custom_last_working_date', "");
            }  
            
        }
        // else{
        //     if(frm.doc.custom_manual_relieving_date){
        //         var d2 = new Date(frm.doc.custom_manual_relieving_date);
        //         d2.setDate(d2.getDate());
        //         var formatted_date2 = d2.toISOString().split('T')[0];
        //         frm.set_value('custom_actual_last_working_date', formatted_date2);
        //     }
        //     else{
        //         var d2 = new Date(frm.doc.custom_last_working_date);
        //         d2.setDate(d2.getDate());
        //         var formatted_date2 = d2.toISOString().split('T')[0];
        //         frm.set_value('custom_actual_last_working_date', formatted_date2);
        //     }
        // }
    },
    custom_resignation_date(frm){
        if(frm?.doc?.custom_resignation_date && frm?.doc?.custom_employment_type){
            var d2 = new Date(frm?.doc?.custom_resignation_date);
            frappe.db.get_value('Employment Type', frm?.doc?.custom_employment_type, 'custom_notice_period_days').then(r => {
                d2.setDate(d2.getDate() + r.message.custom_notice_period_days);
                var formatted_date2 = d2.toISOString().split('T')[0];
                frm.set_value('custom_last_working_date', formatted_date2);
            })
        }else{
            frm.set_value('custom_last_working_date', "");
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
    },
    custom_manual_relieving_date(frm){
        if(frm.doc.custom_manual_relieving_date){
            console.log("custom_manual_relieving_date")
            var d2 = new Date(frm.doc.custom_manual_relieving_date);
            d2.setDate(d2.getDate());
            var formatted_date2 = d2.toISOString().split('T')[0];
            frm.set_value('custom_actual_last_working_date', formatted_date2);
            let custom_last_working_date = new Date(frm.doc.custom_last_working_date);
            let custom_resignation_date=new Date(frm.doc.custom_resignation_date);
            frm.set_value('custom_number_days_served', d2.getDate() - custom_resignation_date.getDate());
            // Compare dates and set values for notice period fields
            if (custom_last_working_date > d2) {
                frm.set_value("custom_notice_period_to_be_waved_off", 1);
                frm.set_value("custom_notice_period_served_", 0);
            } else if (custom_last_working_date < d2) {
                frm.set_value("custom_notice_period_to_be_waved_off", 0);
                frm.set_value("custom_notice_period_served_", 1);
            }
        }else{
            var d2 = new Date(frm.doc.custom_last_working_date);
            d2.setDate(d2.getDate());
            var formatted_date2 = d2.toISOString().split('T')[0];
            frm.set_value('custom_actual_last_working_date', formatted_date2);
            frm.set_value("custom_notice_period_to_be_waved_off", 0);
            frm.set_value("custom_notice_period_served_", 0);
            frm.set_value("custom_reason","")
            frm.set_value("custom_number_days_served","");
            frm.set_value("custom_remarks_for_short_notice_period_to_be_deducted","")
        }
    }
    // custom_last_working_date(frm){
    //     if(frm.doc.custom_last_working_date){
    //         frm.set_value('custom_actual_last_working_date', frm.doc.custom_last_working_date);
    //         frm.save()
    //     }else{
    //         frm.set_value('custom_actual_last_working_date', "");
    //     }
    // }
});
// function get_last_working_date(employee){
//     frappe.db.get_value('Employee', employee, 'employment_type')
//     .then(r => {
//         var formattedDate;
//         if(r.message.employment_type=="Full-time"){
//             d = new Date();
//             d.setDate(d.getDate() + 60);
//             formattedDate = d.toISOString().split('T')[0];
//         }
//         else{
//             d = new Date();
//             d.setDate(d.getDate() + 7);
//             formattedDate = d.toISOString().split('T')[0];
//         }
//         console.log(r.message.employment_type)
//         return formattedDate
//     })
// }