# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	report_data = get_report_data()
	columns=report_data["columns"]
	data = report_data["data"]
	
	return columns, data

def get_report_data():
	column_array = ["POSTING TITLE:DATA:180","TOTAL CANDIDATES:INT:100"]

	# SQL equivalent Frappe ORM to fetch the job title, status, and count of job applicants
	job_applicants = frappe.db.get_list('Job Applicant', 
		fields=['job_title', 'status', 'count(name) as count'],
		filters={},
		group_by='status, job_title',
	)

	# Fetch the status options from Property Setter
	select_options = frappe.db.get_value("Property Setter", {"doc_type": "Job Applicant", "field_name": "status"}, "value")
	options_list = select_options.split("\n")
	for cl in options_list:
		column_array.append(f"{cl}:Data:150")

	# Create a result dictionary to count occurrences
	result_dict = {}

	# Fetch job titles from Job Opening for mapping
	job_openings = frappe.db.get_list('Job Opening', fields=['name', 'job_title'])
	job_title_map = {jo['name']: jo['job_title'] for jo in job_openings}

	# Process job applicants data
	for entry in job_applicants:
		job_opening_name = entry['job_title']
		status = entry['status']
		count = entry['count']

		designation = job_title_map.get(job_opening_name, 'Unknown')

		if designation not in result_dict:
			result_dict[designation] = {status: count}
		else:
			result_dict[designation][status] = count
	
	# Prepare the final result list
	final_result = []
	for designation, counts in result_dict.items():
		result_row = [designation]
		
		# Compute the sum of the values in the counts dictionary
		total_count = sum(counts.values())
		
		# Append the total_count to the 2nd index of result_row
		result_row.append(total_count)
		
		# Append counts for each option in options_list, defaulting to 0 if the option is not in counts
		for col in options_list:
			result_row.append(counts.get(col, 0))
		
		# Add the result_row to the final_result list
		final_result.append(result_row)
	return {"columns":column_array,"data":final_result}
