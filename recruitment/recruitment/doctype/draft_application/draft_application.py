import json

import frappe
from frappe.model.document import Document


class DraftApplication(Document):
    def validate(self):
        if not self.form_data:
            self.form_data = "{}"
            return

        if isinstance(self.form_data, (dict, list)):
            self.form_data = json.dumps(self.form_data, default=str)
            return

        try:
            json.loads(self.form_data)
        except (TypeError, ValueError):
            frappe.throw("Form Data must be valid JSON.")
