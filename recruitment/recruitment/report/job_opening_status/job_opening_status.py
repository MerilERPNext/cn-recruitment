# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	





	columns = [

	("Status") + "::300",

	("Count") + "::300",

	

		

	]

	job_openings = frappe.db.get_list('Job Opening',
		fields=['status as Status', {'COUNT': '*', 'as': 'Count'}],
		group_by='status'
	)

	mydataset = {"values": [d["Count"] for d in job_openings]}


	chart = {'data':{'labels':[d["Status"] for d in job_openings],'datasets':[mydataset]},'type':'bar'}

	data = columns, [[d["Status"], d["Count"]] for d in job_openings], None, chart, None


	return data
