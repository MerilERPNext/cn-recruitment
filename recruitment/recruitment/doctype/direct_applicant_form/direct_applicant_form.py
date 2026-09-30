# Copyright (c) 2026, NextAI and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class DirectApplicantForm(Document):
	def validate(self):
		from recruitment.api.direct_applicant_fields import validate_form_template

		validate_form_template(self)
