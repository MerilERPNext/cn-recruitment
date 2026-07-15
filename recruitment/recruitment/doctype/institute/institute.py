import frappe
from frappe.model.document import Document


class Institute(Document):
	pass


@frappe.whitelist()
def make_campus_invite(source_name, target_doc=None):
	"""Open a new Campus Invite pre-filled from this Institute.

	Copies the Institute (as the link), its Region and a default Invite Name so the
	user only fills the drive-specific bits (job openings, etc.) and saves. TPO
	Contacts are intentionally not copied here — Campus Invite.validate() mirrors
	them from the selected Institute automatically.
	"""
	from frappe.model.mapper import get_mapped_doc

	def post_process(source, target):
		target.institute = source.name
		target.region = source.region
		if not target.campus_invite_name:
			target.campus_invite_name = source.institute_name

	return get_mapped_doc(
		"Institute",
		source_name,
		{"Institute": {"doctype": "Campus Invite"}},
		target_doc,
		post_process,
	)
