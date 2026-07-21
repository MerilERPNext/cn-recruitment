import frappe
from frappe.model.document import Document
from frappe.utils import flt


class ReferralReward(Document):
	def validate(self):
		self.update_totals()

	def update_totals(self):
		"""Keep totals and roll-up status in sync with the schedule rows."""
		total = sum(flt(s.amount) for s in self.schedules)
		paid = sum(flt(s.amount) for s in self.schedules if s.status == "Paid")

		self.total_amount = total
		self.paid_amount = paid

		# Manual / terminal states are never auto-overwritten.
		if self.status in ("Blocked", "Cancelled"):
			return

		if total > 0 and paid >= total:
			self.status = "Paid"
		elif paid > 0:
			self.status = "Partially Paid"
		else:
			self.status = "Eligible"
