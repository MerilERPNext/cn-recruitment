import frappe
from frappe.model.document import Document


class TAExternalRecruiter(Document):
	def validate(self):
		self.validate_contract_period()

	def validate_contract_period(self):
		if (
			self.contract_period_from
			and self.contract_period_to
			and self.contract_period_to < self.contract_period_from
		):
			frappe.throw(
				frappe._("Contract Period To cannot be earlier than Contract Period From.")
			)
