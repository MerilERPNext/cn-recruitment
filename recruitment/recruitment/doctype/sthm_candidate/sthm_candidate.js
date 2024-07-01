// Copyright (c) 2024, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on("STHM Candidate", {
	refresh(frm) {
        this.frm.doc.docstatus == 1 ? this.frm.save("Update") : this.frm.save();
	},
});
