"""Campus Invite: single `institute` Link -> `institutes` Table MultiSelect.

Campus Invites now carry several institutes. This moves each existing invite's
institute into the new `institutes` child table, and stamps every existing
Candidate Registration with the institute of its invite (the new Institute field
is what gives campus Job Applicants their institute from now on).

Reads the legacy `institute` column straight from the DB: the field no longer
exists in the schema, so the column is orphaned but its data is still there.
"""

import frappe


def execute():
	frappe.reload_doc("recruitment", "doctype", "campus_invite_institute")
	frappe.reload_doc("recruitment", "doctype", "campus_invite")
	frappe.reload_doc("recruitment", "doctype", "candidate_registration")

	if not frappe.db.has_column("Campus Invite", "institute"):
		return

	invites = frappe.db.sql(
		"""
		select name, institute
		from `tabCampus Invite`
		where ifnull(institute, '') != ''
		""",
		as_dict=True,
	)

	for invite in invites:
		# Idempotent: skip invites already carrying rows (re-runs, partial migrations).
		already = frappe.db.exists(
			"Campus Invite Institute",
			{"parenttype": "Campus Invite", "parentfield": "institutes", "parent": invite.name},
		)
		if not already and frappe.db.exists("Institute", invite.institute):
			child = frappe.get_doc(
				{
					"doctype": "Campus Invite Institute",
					"parenttype": "Campus Invite",
					"parentfield": "institutes",
					"parent": invite.name,
					"institute": invite.institute,
					"idx": 1,
				}
			)
			child.db_insert()

		# Existing registrations inherit their invite's (single) institute.
		frappe.db.sql(
			"""
			update `tabCandidate Registration`
			set institute = %(institute)s
			where campus_invite = %(invite)s and ifnull(institute, '') = ''
			""",
			{"institute": invite.institute, "invite": invite.name},
		)

	frappe.db.commit()
