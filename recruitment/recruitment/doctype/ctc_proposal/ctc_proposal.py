# Copyright (c) 2026, NextAI and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class CTCProposal(Document):
	def validate(self):
		from recruitment.api.ctc_proposal import validate_proposal

		validate_proposal(self)
