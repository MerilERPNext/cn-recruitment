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
			employee = frappe.get_doc("Employee", self.employee)
			if self.extension_probation_period:
				employee.custom_probation_period = self.extension_probation_period
			employee.custom_employment_status = "Probation Extended"
			employee.save()
		elif confirmation_status == "Initiate Separation":
			employee = frappe.get_doc("Employee", self.employee)
			employee.custom_employment_status = "Pending Separation"
			employee.save()

			self.create_employee_separation_from_map(employee)

	def create_employee_separation_from_map(self, employee=None):
		if employee is None:
			employee = frappe.get_doc("Employee", self.employee)

		separation = frappe.new_doc("Employee Separation")
		separation.employee = self.employee
		separation.custom_created_from_confirmation = 1
		if employee.company:
			separation.company = employee.company
		separation.boarding_begins_on = frappe.utils.today()

		mapping = frappe.get_single("Confirmation To Separation Map")
		for row in mapping.mapping or []:
			if not row.confirmation_fieldname or not row.separation_fieldname:
				continue
			value = self.get(row.confirmation_fieldname)
			separation.set(row.separation_fieldname, value)

		separation.flags.ignore_mandatory = True
		separation.insert(ignore_permissions=True)
		return separation.name

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