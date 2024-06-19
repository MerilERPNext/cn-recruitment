import frappe


def sthm_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if "Hiring Manager" in roles:
		return "(`tabSubmit To Hiring Manager`.assigned_to = {user})".format(user=frappe.db.escape(user))