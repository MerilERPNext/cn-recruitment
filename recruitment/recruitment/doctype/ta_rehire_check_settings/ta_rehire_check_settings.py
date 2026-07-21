import frappe
from frappe.model.document import Document
from frappe.utils import today


class TARehireCheckSettings(Document):
	def before_insert(self):
		if not self.created_on:
			self.created_on = today()
