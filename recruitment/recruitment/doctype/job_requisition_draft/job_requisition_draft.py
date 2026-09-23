# Copyright (c) 2026, NextAI and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class JobRequisitionDraft(Document):
	"""An unfinished Job Requisition form, saved by its author.

	Only a holder for the form's own state — see
	`recruitment.api.requisition_draft` for the endpoints that write and read it,
	and for who may see one.
	"""

	pass
