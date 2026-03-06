# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import timedelta


class EmployeeConfirmation(Document):
    	
	def on_submit(self):
		confirmation_policy = frappe.get_doc("Confirmation Policy", self.confirmation_policy)
		confirmation_status = self.status

		if confirmation_status == "Confirmed":
			employee_type = confirmation_policy.employee_type
			employee = frappe.get_doc("Employee", self.employee)
			employee.employment_type = employee_type
			employee.custom_employment_status = "Confirmed"
			employee.save()
		elif confirmation_status == "Probation Extended":
			probation_period = confirmation_policy.auto_assign_probation_period_on_addition
			employee = frappe.get_doc("Employee", self.employee)
			employee.custom_probation_period = probation_period
			employee.custom_employment_status = "Probation Extended"

			# if not probation_period:
			# 	return 

			# probation_period_doc = frappe.get_doc('Probation Period', probation_period)

			# date_of_joining = employee.date_of_joining
			# if not date_of_joining:
			# 	return 

			# probation_duration = probation_period_doc.duration_of_probation
			# probation_period_in = probation_period_doc.probation_period_in

			# if probation_period_in == 'Months':
			# 	probation_end_date = frappe.utils.add_months(date_of_joining, probation_duration)
			# else: 
			# 	probation_end_date = date_of_joining + timedelta(days=probation_duration)
			
			# self.probation_end_date = probation_end_date
			# self.save()
			employee.save()
		elif confirmation_status == "Initiate Separation":
			employee = frappe.get_doc("Employee", self.employee)
			employee.custom_employment_status = "Pending Separation"
			employee.save()

	def validate(self):
		draft_exists = frappe.db.exists(
			"Employee Confirmation",
			{
				"employee": self.employee,
				"docstatus": 0,
				"name": ["!=", self.name]
			}
		)
		if draft_exists:
			frappe.throw("There is already a pending confirmation request for this employee. Please complete or cancel it before creating a new one.")

		active_exists = frappe.get_all(
			"Employee Confirmation",
			filters={
				"employee": self.employee,
				"docstatus": 1,
				"status": ["!=", "Probation Extended"],
				"name": ["!=", self.name]
			},
			fields=["name"]
		)
		if active_exists:
			frappe.throw("This employee has already been confirmed. You cannot create another confirmation at this time.")

		probation_extended_exists = frappe.db.exists(
			"Employee Confirmation",
			{
				"employee": self.employee,
				"docstatus": 1,
				"status": "Probation Extended"
			}
		)
		if probation_extended_exists:
			pass  