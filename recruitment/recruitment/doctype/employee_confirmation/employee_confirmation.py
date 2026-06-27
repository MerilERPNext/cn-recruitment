# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import timedelta
from frappe.utils import getdate, today, add_days


class EmployeeConfirmation(Document):
    	
	def before_save(self):
		if self.set_separation_date and not self.separation_applicable_date:
			applicable_date = self.get_separation_applicable_date()
			self.separation_applicable_date = applicable_date or add_days(getdate(today()), 1)

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
		elif confirmation_status == "Initiate Separation" or self.recommended_for_separation:
			employee = frappe.get_doc("Employee", self.employee)
			employee.custom_employment_status = "Recommended for Separation"
			employee.save()

	def create_employee_separation(self, employee=None):
		if employee is None:
			employee = frappe.get_doc("Employee", self.employee)

		separation = frappe.new_doc("Employee Separation")
		separation.employee = self.employee
		separation.custom_resignation_type = "Separation"
		separation.custom_created_from_confirmation = 1
		if employee.company:
			separation.company = employee.company
		separation.boarding_begins_on = frappe.utils.today()

		separation.flags.ignore_mandatory = True
		separation.insert(ignore_permissions=True)
		return separation.name

	def get_separation_applicable_date(self):
		tracker_name = frappe.db.get_value(
			"Approval Tracker",
			{"doc_type": "Employee Confirmation", "doc_name": self.name},
			"name",
			order_by="creation desc"
		)
		if not tracker_name:
			return None

		stages = frappe.get_all(
			"Approval Stages",
			filters={"parent": tracker_name, "parenttype": "Approval Tracker"},
			fields=["approver_type", "employee_doc_field"],
			order_by="idx asc"
		)
		hrbp_index = None
		for position, stage in enumerate(stages):
			if stage.approver_type != "Employee Doc Field":
				continue
			field_values = [v.strip() for v in (stage.employee_doc_field or "").replace("\n", ",").split(",") if v.strip()]
			if "custom_hrbp" in field_values:
				hrbp_index = position
				break
		if hrbp_index is None:
			return None

		response_data = frappe.db.get_value(
			"Approval Log Entry",
			{"parent": tracker_name, "parenttype": "Approval Tracker", "stage_index": hrbp_index},
			"approval_response_data"
		)
		if not response_data:
			return None

		data = frappe.parse_json(response_data)
		if not isinstance(data, dict):
			return None
		from_time = data.get("onSubmitFieldApplicableFromTime")
		if not from_time:
			return None
		return getdate(from_time)

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