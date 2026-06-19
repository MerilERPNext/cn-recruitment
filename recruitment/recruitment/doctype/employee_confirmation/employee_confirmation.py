# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import timedelta


SEPARATION_TODO_TYPE = "Initiate Separation"


def ensure_separation_todo_type():
	if frappe.db.exists("Todo Type", SEPARATION_TODO_TYPE):
		return
	frappe.get_doc({
		"doctype": "Todo Type",
		"todo_type_name": SEPARATION_TODO_TYPE,
		"is_active": 1,
		"redirect_only": 1,
		"dynamic_route": '"flow-app/separation?target_user=" + (todo.reference_name or "")',
	}).insert(ignore_permissions=True)


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
			employee = frappe.get_doc("Employee", self.employee)
			if self.extension_probation_period:
				employee.custom_probation_period = self.extension_probation_period
			employee.custom_employment_status = "Probation Extended"
			employee.save()
		elif confirmation_status == "Initiate Separation":
			employee = frappe.get_doc("Employee", self.employee)
			employee.custom_employment_status = "Pending Separation"
			employee.save()

			hrbp_user = None
			if employee.custom_hrbp:
				hrbp_user = frappe.db.get_value("Employee", employee.custom_hrbp, "user_id")

			if hrbp_user:
				ensure_separation_todo_type()

				todo = frappe.new_doc("ToDo")
				todo.owner = "Administrator"
				todo.allocated_to = hrbp_user
				todo.reference_type = "Employee"
				todo.reference_name = self.employee
				todo.description = f"Initiate separation for {employee.employee_name}"
				todo.status = "Open"
				todo.priority = "High"
				todo.custom_todo_type = SEPARATION_TODO_TYPE
				todo.flags.ignore_permissions = True
				todo.insert()

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