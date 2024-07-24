// Copyright (c) 2024, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("No Dues Clearance", {
	refresh(frm) {
        let date1 = new Date(frm.doc.date_of_joining);
        let date2 = new Date(frm.doc.resigned_on);
        let differenceInTime = date2.getTime() - date1.getTime();
        let differenceInDays = differenceInTime / (1000 * 3600 * 24);
        frm.set_value('number_of_days_served', differenceInDays);
        // $('[data-fieldname="plant_hr_tab"]').hide();
        // frm.set_df_property("plant_hr_tab","hidden",1)
	}
});
