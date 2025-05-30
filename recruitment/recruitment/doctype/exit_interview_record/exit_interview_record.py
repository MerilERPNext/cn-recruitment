# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ExitInterviewRecord(Document):
	def autoname(self):
		if self.employee_name:
			count = frappe.db.count("Exit Interview Record") + 1
			self.name = f"{self.employee_name.strip()} - {str(count).zfill(4)}"
