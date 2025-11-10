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


