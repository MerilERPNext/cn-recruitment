# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from datetime import datetime

def execute(filters=None):
	columns  = ["JOB OPENING/MPR:Data:200","CANDIDATES PER POSITION:DATA:200","TIME TO FILL(SINCE CREATION):DATA:200","TIME TO FILL(SINCE Approved):DATA:200","DELAY(IN DAYS):DATA:150"]
	data = get_report_data()
	return columns, data

def get_report_data():
	job_openings = frappe.db.get_list('Job Opening', 
    filters={'status': 'Open'}, 
    fields=['name', 'designation', 'posted_on', 'closes_on', 'custom_approved_on'],
	)

	job_applicants = frappe.db.get_list('Job Applicant', 
		fields=['name', 'job_title']
	)
	applicant_count_map = {}
	for applicant in job_applicants:
		job_title = applicant['job_title']
		if job_title in applicant_count_map:
			applicant_count_map[job_title] += 1
		else:
			applicant_count_map[job_title] = 1
		result_dict = {}
		current_date = datetime.today().date()

		for jo in job_openings:
			job_title = jo['name']
			designation = jo['designation']
			posted_on = jo['posted_on'].date() if jo['posted_on'].date() else None
			closes_on = jo['closes_on'] if jo['closes_on'] else None
			custom_approved_on = jo['custom_approved_on'] if jo['custom_approved_on'] else None
			count = applicant_count_map.get(job_title, 0)

			time_to_fill = (closes_on - posted_on).days if posted_on and closes_on else None
			time_to_fill_ap = (closes_on - custom_approved_on).days if closes_on and custom_approved_on else None

			if current_date < closes_on:
				delay = 'On Track'
			else:
				delay = f"{(current_date - closes_on).days} days delayed"

			if designation not in result_dict:
				result_dict[designation] = {
					'designation': designation,
					'count': count,
					'time_to_fill': time_to_fill,
					'time_to_fill_ap': time_to_fill_ap,
					'delay': delay
				}
			else:
				result_dict[designation].update({
					'count': result_dict[designation]['count'] + count,
					'time_to_fill': result_dict[designation]['time_to_fill'] + time_to_fill if time_to_fill else result_dict[designation]['time_to_fill'],
					'time_to_fill_ap': result_dict[designation]['time_to_fill_ap'] + time_to_fill_ap if time_to_fill_ap else result_dict[designation]['time_to_fill_ap'],
					'delay': delay
				})
	final_result = []
	for key, value in result_dict.items():
		result_row = [
			value['designation'],
			value['count'],
			value['time_to_fill'],
			value['time_to_fill_ap'],
			value['delay']
		]
		final_result.append(result_row)

	# Sort the final result by designation
	final_result = sorted(final_result, key=lambda x: x[0])
	return final_result
