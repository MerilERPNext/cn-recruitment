# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns = [
   
			("Source") + "::300",
			("Count") + "::300",
		]
	current_user = frappe.session.user
	roles = frappe.get_roles(current_user)
	sql_query=None
	if "Hiring Manager" in roles:
		sql_query = """
			SELECT
				COALESCE(ja.source, 'Not defined') AS Source,
				COUNT(*) AS Count
			FROM
				`tabJob Applicant` as ja,`tabJob Opening` as jo, `tabJob Requisition` as jr where jo.name = ja.job_title
				 and jr.name = jo.job_requisition and jr.owner = '"""+current_user+"""' 
			GROUP BY
				COALESCE(ja.source, 'Not defined');
		"""
	if "Job Recruiter" in roles:
		sql_query = """
			SELECT
				COALESCE(ja.source, 'Not defined') AS Source,
				COUNT(*) AS Count
			FROM
				`tabJob Applicant` as ja,`tabJob Opening` as jo where jo.name = ja.job_title
				 and jo.owner = '"""+current_user+"""' 
			GROUP BY
				COALESCE(ja.source, 'Not defined');
		"""
	if "Administrator" in roles or "System Manager" in roles or "Recruiter Admin" in roles:
		sql_query = """
			SELECT
				COALESCE(ja.source, 'Not defined') AS Source,
				COUNT(*) AS Count
			FROM
				`tabJob Applicant` as ja
			GROUP BY
				COALESCE(ja.source, 'Not defined');
		"""

	data = frappe.db.sql(sql_query, as_dict=True)
	data =  [[d["Source"], d["Count"]] for d in data]

	
	return  columns,data


