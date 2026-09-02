# Copyright (c) 2026, Hybrowlabs and contributors
# For license information, please see license.txt

from frappe.model.document import Document


class AlumniPortalSettings(Document):
	"""Server-side authority for what alumni may do in the Alumni Portal.

	Mirrors chatnext_work_connect's "Work Connect Settings" precedent: the
	toggles live here and are read by `alumni_portal.alumni_action_allowed`,
	never trusted from the client.

	Every flag defaults to 1, so installing this doctype changes nothing until
	an administrator switches something off.
	"""

	pass
