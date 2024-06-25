# Copyright (c) 2024, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns  = ["JOB OPENING/MPR:Data:200","CANDIDATES PER POSITION:DATA:200","TIME TO FILL(SINCE CREATION):DATA:200","TIME TO FILL(SINCE Approved):DATA:200","DELAY(IN DAYS):DATA:150"]
	data = get_report_data()
	return columns, data

def get_report_data():
	final_data = []
	data_qry = frappe.db.sql("""select Distinct(jo.designation),COUNT(ja.name) as count,
    DATEDIFF(CURDATE(), jo.posted_on) AS time_to_fill,
	DATEDIFF(CURDATE(), jo.custom_approved_on) AS time_to_fill_ap,
    CASE
        WHEN CURDATE() < jo.closes_on THEN 'On Track'
        ELSE CONCAT(DATEDIFF(CURDATE(), jo.closes_on), ' days delayed')
    END AS delay
	
	from `tabJob Opening` as jo JOIN `tabJob Applicant` as ja on ja.job_title = jo.name and jo.status ='Open' group by jo.designation order by jo.designation""",as_dict=True)
	for data_dict in data_qry:
		final_data.append(list(data_dict.values()))
	return final_data
