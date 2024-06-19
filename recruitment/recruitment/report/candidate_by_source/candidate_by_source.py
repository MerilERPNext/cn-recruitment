# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns = [
   
			("Source") + "::300",
			("Count") + "::300",
		]

	sql_query = """
		SELECT
			COALESCE(source, 'Not defined') AS Source,
			COUNT(*) AS Count
		FROM
			`tabJob Applicant`
		GROUP BY
			COALESCE(source, 'Not defined');
	"""

	data = frappe.db.sql(sql_query, as_dict=True)
	data =  [[d["Source"], d["Count"]] for d in data]

	
	return  columns,data
