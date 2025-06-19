import frappe
from frappe.model.document import Document

class TrainingMaterial(Document):
    def validate(self):
        if not self.course_link and not self.attachment:
            frappe.throw("Please provide either a Course Link or upload an Attachment.")
