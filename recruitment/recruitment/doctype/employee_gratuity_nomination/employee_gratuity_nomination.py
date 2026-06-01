import frappe
from frappe import _
from frappe.model.document import Document


LOCKED_STATUSES = ("Signed", "Filed")


class EmployeeGratuityNomination(Document):
    def validate(self):
        self._warn_if_share_not_100()
        self._enforce_signed_lock()

    def _warn_if_share_not_100(self):
        if not self.nominees:
            return
        total = sum((n.share_percentage or 0) for n in self.nominees)
        if abs(total - 100) > 0.01:
            frappe.msgprint(
                _("Nominee share percentages add up to {0}%, not 100%. Form saved — please verify before printing.").format(round(total, 2)),
                indicator="orange",
                alert=True,
            )

    def _enforce_signed_lock(self):
        if self.status not in LOCKED_STATUSES:
            return
        previous = self.get_doc_before_save()
        if not previous:
            return
        if previous.status not in LOCKED_STATUSES:
            return
        for f in self.meta.fields:
            if f.fieldname == "status" or f.fieldtype in ("Section Break", "Column Break", "Tab Break", "Table"):
                continue
            if self.get(f.fieldname) != previous.get(f.fieldname):
                frappe.throw(_("This form is {0}. No further edits allowed except status changes.").format(self.status))
