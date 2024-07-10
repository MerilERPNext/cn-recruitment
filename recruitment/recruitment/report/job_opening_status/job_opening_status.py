# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	





	columns = [

	("Status") + "::300",

	("Count") + "::300",

	

		

	]

	current_user = frappe.session.user
	roles = frappe.get_roles(current_user)
	sql_query = None
	if "Hiring Manager" in roles:
		sql_query = """
				SELECT
					jo.Status,
					COUNT(*) AS Count
				FROM
					`tabJob Opening` as jo JOIN `tabJob Requisition` as jr on jr.name = jo.job_requisition
				WHERE jr.owner ='"""+current_user+"""'
				GROUP BY
					status
			
		"""
	if "Job Recruiter" in roles:
		sql_query = """
				SELECT
					jo.Status,
					COUNT(*) AS Count
				FROM
					`tabJob Opening` as jo
				WHERE jo.owner ='"""+current_user+"""'
				GROUP BY
					status
			
		"""
	if "Administrator" in roles or "System Manager" in roles or "Recruiter Admin" in roles:
		sql_query = """
				SELECT
					jo.Status,
					COUNT(*) AS Count
				FROM
					`tabJob Opening` as jo
				GROUP BY
					status
			
		"""

	data = frappe.db.sql(sql_query, as_dict=True)


	mydataset = {"values": [d["Count"] for d in data]}


	chart = {'data':{'labels':[d["Status"] for d in data],'datasets':[mydataset]},'type':'bar'}

	data = columns, [[d["Status"], d["Count"]] for d in data], None, chart, None


	return data
