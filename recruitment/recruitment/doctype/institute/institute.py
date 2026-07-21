import frappe
from frappe import _
from frappe.model.document import Document

from recruitment.recruitment.tpo_access import PRIMARY_TPO_ROLE


class Institute(Document):
	def validate(self):
		self._validate_single_primary_tpo()

	def _validate_single_primary_tpo(self):
		"""An Institute may list many TPO Contacts, but only one Primary TPO.

		The Primary TPO is the sole contact a Campus Invite provisions a portal user
		for and emails, so a second one would make that ambiguous.
		"""
		primaries = [row for row in (self.tpo_contacts or []) if row.role == PRIMARY_TPO_ROLE]
		if len(primaries) < 2:
			return

		frappe.throw(
			_(
				"Only one TPO Contact can be the {0} for an Institute, but rows {1} all have that role. "
				"Keep one and give the others a different role."
			).format(
				frappe.bold(PRIMARY_TPO_ROLE),
				", ".join(str(row.idx) for row in primaries),
			),
			title=_("Duplicate Primary TPO"),
		)


@frappe.whitelist()
def make_campus_invite(source_name, target_doc=None):
	"""Open a new Campus Invite pre-filled from this Institute.

	Seeds the invite's Institutes table with this Institute (more can be added on the
	new form), plus its Region and a default Invite Name, so the user only fills the
	drive-specific bits (job openings, etc.) and saves. TPO Contacts are intentionally
	not copied here — Campus Invite.validate() mirrors them from the selected
	Institutes automatically.
	"""
	from frappe.model.mapper import get_mapped_doc

	def post_process(source, target):
		target.append("institutes", {"institute": source.name})
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
