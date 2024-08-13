# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns = [
   
    ("Employee") + "::300",
    ("Count") + "::300",
		]

	sql_query = """
			SELECT
				requested_by_name AS Employee,
				
				COUNT(*) AS Count
			FROM
				`tabJob Requisition`
			
			GROUP BY
				requested_by_name
		"""

	data = frappe.db.sql(sql_query, as_dict=True)

	mydataset = {"values": [d["Count"] for d in data]}

	chart = {'data': {'labels': [d["Employee"] for d in data], 'datasets': [mydataset]}, 'type': 'bar'}

	data = columns, [[d["Employee"], d["Count"]] for d in data], None, chart, None
	return data
