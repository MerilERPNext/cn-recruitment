import frappe


def sthm_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator"  or "System Manager" not in roles or "Recruiter Admin" not in roles:
		if "Hiring Manager" in roles:
			return "(`tabSubmit To Hiring Manager`.assigned_to = {user})".format(user=frappe.db.escape(user))
		if "Job Recruiter" in roles:
			return "(`tabSubmit To Hiring Manager`.owner = {user})".format(user=frappe.db.escape(user))
	else:
		return "1 = 1"
	
def jr_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator"  or "System Manager" not in roles or "Recruiter Admin" not in roles:
		if "Job Recruiter" in roles:
			return "(`tabJob Requisition`.custom_assign_to_recruiter = {user})".format(user=frappe.db.escape(user))
		if "Hiring Manager" in roles:
			return "(`tabJob Requisition`.owner = {user})".format(user=frappe.db.escape(user))
	else:
		return "1 = 1"

def ja_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator"  or "System Manager" not in roles or "Recruiter Admin" not in roles:
		if "Job Recruiter" in roles:
			return "(`tabJob Applicant`.owner = {user})".format(user=frappe.db.escape(user))
		if "Hiring Manager" in frappe.get_roles(user):
			return """
				`tabJob Applicant`.job_title IN (
					SELECT name FROM `tabJob Opening`
					WHERE job_requisition IN (
						SELECT name FROM `tabJob Requisition`
						WHERE owner = '{0}'
					)
				)
			""".format(user)
	else:
		return "1 = 1"

def jo_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator"  or "System Manager" not in roles or "Recruiter Admin" not in roles:
		if "Job Recruiter" in roles:
			return "(`tabJob Opening`.owner = {user})".format(user=frappe.db.escape(user))
		if "Hiring Manager" in roles:
			return """
			`tabJob Opening`.`job_requisition` IN (
				SELECT name 
				FROM `tabJob Requisition` 
				WHERE owner = {user}
			)
		""".format(user=frappe.db.escape(user))
	else:
		return "1 = 1"
