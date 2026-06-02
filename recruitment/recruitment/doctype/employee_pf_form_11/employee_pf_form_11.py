import frappe
from frappe import _
from frappe.model.document import Document


LOCKED_STATUSES = ("Signed", "Filed")


class EmployeePFForm11(Document):
    def validate(self):
        self._enforce_signed_lock()

    def _enforce_signed_lock(self):
        if self.status not in LOCKED_STATUSES:
            return
        previous = self.get_doc_before_save()
        if not previous:
            return
        if previous.status not in LOCKED_STATUSES:
            return
        for f in self.meta.fields:
            if f.fieldname == "status" or f.fieldtype in ("Section Break", "Column Break", "Tab Break"):
                continue
            if self.get(f.fieldname) != previous.get(f.fieldname):
                frappe.throw(_("This form is {0}. No further edits allowed except status changes.").format(self.status))
