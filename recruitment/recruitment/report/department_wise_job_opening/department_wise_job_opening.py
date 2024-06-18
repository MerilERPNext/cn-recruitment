# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	


	columns = [

		("Department") + "::300",

		("Count") + "::300",

	

		

	]


	sql_query = """
		SELECT
			department AS Department,
			COUNT(*) AS Count
		FROM
			`tabJob Opening`
		GROUP BY
			department
	"""


	data = frappe.db.sql(sql_query, as_dict=True)


	mydataset = {"values": [d["Count"] for d in data]}


	chart = {'data':{'labels':[d["Department"] for d in data],'datasets':[mydataset]},'type':'bar'}

	data = columns, [[d["Department"], d["Count"]] for d in data], None, chart, None




	return data
