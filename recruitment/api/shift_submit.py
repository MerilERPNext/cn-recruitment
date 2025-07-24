
import frappe
from frappe import _

@frappe.whitelist()
def process_shift_request(docname: str, action: str):
    if action not in ["Approved", "Rejected"]:
        frappe.throw(_("Invalid action"))

    doc = frappe.get_doc("Shift Request", docname)

    if doc.docstatus != 0:
        frappe.throw(_("Only draft documents can be processed."))

    doc.status = action
    doc.save()

    doc.submit()

    return {"message": f"Shift Request {action.lower()} successfully"}
