# Copyright (c) 2024, Hybrowlabs technologies and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns = [
   
			("Source") + "::300",
			("Count") + "::300",
		]
	job_applicants = frappe.db.get_list('Job Applicant', fields=['source'])
	source_counts = {}

	for applicant in job_applicants:
		source = applicant.source if applicant.source else 'Not defined'
		if source in source_counts:
			source_counts[source] += 1
		else:
			source_counts[source] = 1
	result = [{'Source': key, 'Count': value} for key, value in source_counts.items()]
	
	data =  [[d["Source"], d["Count"]] for d in result]
	
	return  columns,data


