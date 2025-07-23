import frappe
from frappe import _

@frappe.whitelist()
def submit_shift_request(docname):
    """
    Custom API to submit a Shift Request by its name.
    """
    if not docname:
        frappe.throw(_("Document name is required"))

    try:
        doc = frappe.get_doc("Shift Request", docname)
        if doc.docstatus != 0:
            return {"status": "failed", "message": "Document is already submitted or cancelled."}
        
        doc.submit()
        return {"status": "success", "message": f"Shift Request {docname} submitted successfully."}

    except frappe.DoesNotExistError:
        return {"status": "failed", "message": f"Shift Request {docname} not found."}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Shift Request Submission Error")
        return {"status": "failed", "message": str(e)}
