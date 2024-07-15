# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns = ["Company:Data:120","Department:Data:120","Reporting Head:data:180","Candidate:data:200","Email ID:Data:100","Position:Data:180",
				"CTC:Currency:120","Location:Data:120","Recruiter:Data:140"]
	return columns, get_report_data()

def get_report_data():
	report_qry = frappe.db.sql("""select ja.custom_company_finalized,ja.custom_department,ja.custom_reporting_head,concat(ja.applicant_name," ",ja.custom_applicant_last_name_) as candidate,ja.name,ja.designation,ja.custom_ctc_finalized,ja.custom_location,ja.custom_recruiter from `tabJob Applicant` as ja where ja.custom_approval_pending_from_management=1""",as_dict=True)
	result_data = []
	for ja in report_qry:
		result_data.append(list(ja.values()))
	return result_data
		
		