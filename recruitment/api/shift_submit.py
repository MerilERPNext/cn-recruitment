
import frappe
from frappe import _

@frappe.whitelist()
def process_shift_request(docname: str, action: str):
    if action not in ["Approved", "Rejected"]:
        frappe.throw(_("Invalid action"))

    doc = frappe.get_doc("Shift Request", docname)

    if doc.docstatus != 0:
        frappe.throw(_("Only draft documents can be processed."))

    # Only the designated approver (or HR/admin) may approve/reject — previously
    # any user with generic Shift Request submit rights could process anyone's.
    approver = doc.get("approver")
    privileged = bool({"HR Manager", "System Manager"} & set(frappe.get_roles()))
    if approver and frappe.session.user != approver and not privileged:
        frappe.throw(_("Only the assigned approver can process this request."), frappe.PermissionError)

    doc.status = action
    doc.save()

    doc.submit()

    return {"message": f"Shift Request {action.lower()} successfully"}
