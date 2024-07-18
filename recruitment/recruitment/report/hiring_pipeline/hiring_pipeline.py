# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	report_data = get_report_data()
	columns=report_data["columns"]
	data = report_data["data"]
	
	return columns, data

def get_report_data():
	column_array = ["POSTING TITLE:DATA:180"]
	current_user = frappe.session.user
	roles = frappe.get_roles(current_user)
	sql_qry = None
	if "System Manager" in roles or "Recruiter Admin" in roles or "HR User" in roles:
		sql_qry = """select jo.job_title as designation,ja.status,count(ja.name) as count from `tabJob Applicant` as ja,`tabJob Opening` as jo where jo.name = ja.job_title group by ja.status,jo.job_title"""
	elif current_user == "Administrator":
		sql_qry = """select jo.job_title as designation,ja.status,count(ja.name) as count from `tabJob Applicant` as ja,`tabJob Opening` as jo where jo.name = ja.job_title group by ja.status,jo.job_title"""
	else:
		if "Hiring Manager" in roles:
			sql_qry = """select jo.job_title as designation,ja.status,count(ja.name) as count from `tabJob Applicant` as ja,`tabJob Opening` as jo, `tabJob Requisition` as jr where jo.name = ja.job_title and jr.name = jo.job_requisition and jr.owner = '"""+current_user+"""' group by ja.status,jo.job_title"""
		if "Job Recruiter" in roles:
			sql_qry = """select jo.job_title as designation,ja.status,count(ja.name) as count from `tabJob Applicant` as ja,`tabJob Opening` as jo, `tabJob Requisition` as jr where jo.name = ja.job_title and jr.name = jo.job_requisition and ja.owner = '"""+current_user+"""' group by ja.status,jo.job_title"""
	
	hp_data_qry = frappe.db.sql(sql_qry,as_dict=True)
	
	
	select_options = frappe.db.get_value("Property Setter",{"doc_type":"Job Applicant","field_name":"status"},["value"])
	options_list = select_options.split("\n")
	for cl in options_list:
		column_array.append(cl+":Data:150")
	result_dict = {}
	for entry in hp_data_qry:
		designation = entry['designation']
		status = entry['status']
		count = entry['count']
		
		if designation not in result_dict:
			result_dict[designation] = {status: count}
		else:
			result_dict[designation][status] = count
	final_result = []
	for designation, counts in result_dict.items():
		result_row = [designation]
		for col in options_list:
			result_row.append(counts.get(col, 0))
		final_result.append(result_row)
	return {"columns":column_array,"data":final_result}
