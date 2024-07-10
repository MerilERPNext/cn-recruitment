import frappe


def sthm_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator":
		if "Hiring Manager" in roles:
			return "(`tabSubmit To Hiring Manager`.assigned_to = {user})".format(user=frappe.db.escape(user))
		if "Job Recruiter" in roles:
			return "(`tabSubmit To Hiring Manager`.owner = {user})".format(user=frappe.db.escape(user))
def jr_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator":
		if "Job Recruiter" in roles:
			return "(`tabJob Requisition`.custom_assign_to_recruiter = {user})".format(user=frappe.db.escape(user))
		if "Hiring Manager" in roles:
			return "(`tabJob Requisition`.owner = {user})".format(user=frappe.db.escape(user))

def ja_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
	if frappe.session.user != "Administrator":
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
	return ""

def jo_query(user):
	if not user:
		user = frappe.session.user
	roles = frappe.get_roles(user)
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
	return ""