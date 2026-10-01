frappe.ui.form.on("Internship Letter", {
    refresh(frm) {

        // Button: Send Internship Offer Letter
        if (!frm.is_new() && frm.doc.status === "Draft") {
            frm.add_custom_button(
                __("Send Internship Offer Letter"),
                function () {
                    frm.set_value("status", "Issued");
                    frm.save();
                },
                __("Actions")
            );
            frm.page.set_inner_btn_group_as_primary(__("Actions"));
        }

        // Button: Send Internship Experience Letter
        if (
            !frm.is_new() &&
            frm.doc.status === "Accepted" &&
            frm.doc.end_date >= frappe.datetime.get_today()
        ) {
            frm.add_custom_button(
                __("Send Internship Experience Letter"),
                function () {
                    frm.set_value("status", "Completed");
                    frm.save();
                },
                __("Actions")
            );
            frm.page.set_inner_btn_group_as_primary(__("Actions"));
        }
    },
});
