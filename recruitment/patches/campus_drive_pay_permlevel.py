"""Give the Campus Drive's Offer Package fields their level-1 readers.

Fixed Pay / Variable Pay sit at permlevel 1 so the salary a drive agreed is not
visible to everyone who can open the drive. Frappe only writes a doctype's shipped
permissions on FIRST install — an existing site keeps whatever is in the database —
so the level-1 rows have to be added here, once, rather than in campus_drive.json
alone.

Idempotent: add_permission is a no-op when the row already exists.
"""

import frappe
from frappe.permissions import add_permission, update_permission_property

DOCTYPE = "Campus Drive"
PERMLEVEL = 1
ROLES = ("System Manager", "HR Manager", "HR User", "Hiring Lead")
# Frappe refuses a level-1 grant to a role with no level-0 row, so the two HR roles
# that could not open a Campus Drive at all get read-only access to it here. They can
# see drives and their package; changing one still needs HR Manager / System Manager.
READ_ONLY_ROLES = ("HR User", "Hiring Lead")


def execute():
	added = []
	for role in ROLES:
		if not frappe.db.exists("Role", role):
			continue  # a site that doesn't have this role simply doesn't grant it
		if role in READ_ONLY_ROLES:
			add_permission(DOCTYPE, role, 0)
			for ptype in ("read", "report"):
				update_permission_property(DOCTYPE, role, 0, ptype, 1)
		add_permission(DOCTYPE, role, PERMLEVEL)
		for ptype in ("read", "write"):
			update_permission_property(DOCTYPE, role, PERMLEVEL, ptype, 1)
		added.append(role)

	frappe.clear_cache(doctype=DOCTYPE)
	frappe.db.commit()
	print(f"Campus Drive pay fields: level-{PERMLEVEL} access for {', '.join(added) or 'nobody'}")
