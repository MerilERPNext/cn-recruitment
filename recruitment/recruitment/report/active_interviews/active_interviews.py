# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns= ["INTERVIEW NAME:DATA:180","FROM:DATA:150","TO:DATA:150","CANDIDATE NAME:DATA:200","DEPARTMENT NAME:DATA:200"]
	data = get_report_data()
	return columns, data

def get_report_data():
	report_data = []
	interview_data = frappe.db.sql("""select inter.interview_round, DATE_FORMAT(CONCAT(inter.scheduled_on," ", inter.from_time), '%b %d %l:%i%p') AS from_dt,DATE_FORMAT(CONCAT(inter.scheduled_on," ", inter.to_time), '%b %d %l:%i%p') AS to_dt,ja.applicant_name,jo.department
					from `tabInterview` as inter JOIN `tabJob Applicant` as ja on ja.name = inter.job_applicant JOIN `tabJob Opening` as jo on jo.name = inter.job_opening""",as_dict=True)
	for in_dict in interview_data:
		report_data.append(list(in_dict.values()))
	return report_data
	