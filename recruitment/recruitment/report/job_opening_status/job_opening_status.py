# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	





	columns = [

	("Status") + "::300",

	("Count") + "::300",

	

		

	]

	# Raw SQL keeps DB-side aggregation and is v16-safe (Frappe v16 rejects SQL
	# functions passed as strings in the get_list/get_all `fields` param).
	job_openings = frappe.db.sql(
		"""
		SELECT status AS Status, COUNT(*) AS Count
		FROM `tabJob Opening`
		GROUP BY status
		""",
		as_dict=True,
	)

	mydataset = {"values": [d["Count"] for d in job_openings]}


	chart = {'data':{'labels':[d["Status"] for d in job_openings],'datasets':[mydataset]},'type':'bar'}

	data = columns, [[d["Status"], d["Count"]] for d in job_openings], None, chart, None


	return data
