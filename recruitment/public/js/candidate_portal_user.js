// Custom delete confirmation for Candidate Portal User.
//
// The actual cascade (deleting all linked Candidate Portal OTP Log + Candidate
// Portal Session records) is handled server-side in the doctype's on_trash, so
// any delete path (desk, list bulk, API) clears the whole chain in one go.
//
// Here we only replace Frappe's default "Permanently delete?" prompt on the desk
// form with a clearer one that warns it deletes everything entirely — then run
// the same delete (frappe.client.delete) which fires the server-side cascade.

frappe.ui.form.on("Candidate Portal User", {
    refresh(frm) {
        if (frm.__cpu_delete_patched) return;
        frm.__cpu_delete_patched = true;

        frm.savetrash = function () {
            frm.validate_form_action("Delete");
            frappe.confirm(
                __(
                    "Are you sure you want to delete <b>{0}</b> entirely?<br><br>This will also permanently delete <b>all linked OTP Logs and Sessions</b> for this candidate. This action cannot be undone.",
                    [frm.doc.name]
                ),
                function () {
                    frappe.call({
                        method: "frappe.client.delete",
                        args: { doctype: frm.doctype, name: frm.doc.name },
                        freeze: true,
                        freeze_message: __("Deleting {0} and all linked data...", [frm.doc.name]),
                        callback: function (r) {
                            if (!r.exc) {
                                frappe.utils.play_sound("delete");
                                frappe.model.clear_doc(frm.doctype, frm.doc.name);
                                window.history.back();
                            }
                        },
                    });
                }
            );
        };
    },
});
