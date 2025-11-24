# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class EmployeeConfirmation(Document):
    	
	def on_submit(self):
		confirmation_policy = frappe.get_doc("Confirmation Policy", self.confirmation_policy)
		confirmation_status = self.status

		if confirmation_status == "Confirmed":
			employee_type = confirmation_policy.employee_type
			employee = frappe.get_doc("Employee", self.employee)
			employee.employment_type = employee_type
			employee.save()
		elif confirmation_status == "Probation Extended":
			probation_period = confirmation_policy.auto_assign_probation_period_on_addition
			employee = frappe.get_doc("Employee", self.employee)
			employee.custom_probation_period = probation_period
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

