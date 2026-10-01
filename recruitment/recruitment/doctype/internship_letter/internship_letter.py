# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class InternshipLetter(Document):
	pass

import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def update_internship_status(val, status):
     if not val or not status:
         frappe.throw(_("Invalid request"))

     allowed_status = ["Accepted", "Cancelled"]
     if status not in allowed_status:
         frappe.throw(_("Invalid status"))

     doc = frappe.get_doc("Internship Letter", val)

     if doc.status != "Issued":
         frappe.throw(_("Action not allowed"))
     doc.status = status
     doc.save(ignore_permissions=True)

     frappe.db.commit()

     return {
         "success": True,
         "message": f"Status updated to {status}"
     }



@frappe.whitelist(allow_guest=True)
def get_internship_status(val):
     if not val:
         frappe.throw(_("Invalid request"))

     if not frappe.db.exists("Internship Letter", val):
         frappe.throw(_("Invalid Internship ID"))

     doc = frappe.get_doc("Internship Letter", val)

     return {
         "status": doc.status
     }

