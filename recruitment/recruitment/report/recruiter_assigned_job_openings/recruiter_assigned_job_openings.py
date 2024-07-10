# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	report_data = get_report_data()
	columns=report_data["columns"]
	data = report_data["data"]
	return columns, data

def get_report_data():
	column_array = ["RECRUITER:DATA:180","No of Job Opening Assigned:DATA:220"]
	select_options = frappe.db.get_value("Property Setter",{"doc_type":"Job Opening","field_name":"status"},["value"])
	options_list = select_options.split("\n")
	for cl in options_list:
		column_array.append(cl+":Data:150")
	recruiters = frappe.db.sql("""
					SELECT DISTINCT u.full_name 
					FROM `tabHas Role` hr
					JOIN `tabUser` u ON hr.parent = u.name
					WHERE hr.role = 'Job Recruiter'
				""", as_dict=True)
	recruiter_full_names = [recruiter['full_name'] for recruiter in recruiters]
	jo_recruiter_cnt = frappe.db.sql("select u.full_name as recruiter,count(jr.name) as total_count from `tabJob Requisition` as jr,`tabUser` as u where u.name = jr.custom_assign_to_recruiter group by jr.custom_assign_to_recruiter",as_dict=True)
	jo_recruiter_data = frappe.db.sql("select u.full_name as recruiter,jo.status, count(jo.status) as status_cnt from `tabJob Opening`as jo,`tabJob Requisition` as jr,`tabUser` as u where jr.name = jo.job_requisition and u.name = jr.custom_assign_to_recruiter group by jr.custom_assign_to_recruiter,jo.status",as_dict=True)
	recruiter_status_counts = {}
	for recruit_nm in recruiter_full_names:
		if recruit_nm != "Administrator":
			recruiter_status_counts[recruit_nm] = {status: 0 for status in options_list}
	for item in jo_recruiter_data:
		recruiter = item['recruiter']
		status = item['status']
		status_cnt = item['status_cnt']
		recruiter_status_counts[recruiter][status] = status_cnt

	# Build the total_counts dictionary
	total_counts_dict = {item['recruiter']: item['total_count'] for item in jo_recruiter_cnt}

	# Construct the final result list
	result = [
		[recruiter, total_counts_dict.get(recruiter, 0)] + [recruiter_status_counts[recruiter].get(status, 0) for status in options_list]
		for recruiter in recruiter_status_counts
	]
	return {"columns":column_array,"data":result}