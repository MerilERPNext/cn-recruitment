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
			source AS Source,
			
			COUNT(*) AS Count
		FROM
			`tabJob Applicant`
		GROUP BY
			source
	"""

	data = frappe.db.sql(sql_query, as_dict=True)

	mydataset = {"values": [d["Count"] for d in data]}

	chart = {'data': {'labels': [d["Source"] for d in data], 'datasets': [mydataset]}, 'type': 'bar'}

	data = columns, [[d["Source"], d["Count"]] for d in data], None, chart, None

	
	return  data
