import frappe


def sthm_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator":
		if "Hiring Manager" in roles:
			return "(`tabSubmit To Hiring Manager`.assigned_to = {user})".format(user=frappe.db.escape(user))

def jr_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator":
		if "Job Recruiter" in roles:
			return "(`tabJob Requisition`.custom_assign_to_recruiter = {user})".format(user=frappe.db.escape(user))