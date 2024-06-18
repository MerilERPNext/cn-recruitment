# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	





	columns = [

	("Status") + "::300",

	("Count") + "::300",

	

		

	]


	sql_query = """
			SELECT
				Status,
				COUNT(*) AS Count
			FROM
				`tabJob Opening`
			GROUP BY
				status
		
	"""


	data = frappe.db.sql(sql_query, as_dict=True)


	mydataset = {"values": [d["Count"] for d in data]}


	chart = {'data':{'labels':[d["Status"] for d in data],'datasets':[mydataset]},'type':'bar'}

	data = columns, [[d["Status"], d["Count"]] for d in data], None, chart, None


	return data
