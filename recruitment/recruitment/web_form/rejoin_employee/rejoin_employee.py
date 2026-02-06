import frappe

def get_context(context):
	pass


@frappe.whitelist(allow_guest=True)
def get_employee_data(employee_id):
	"""Fetch employee data for the rejoinee web form."""
	if not employee_id:
		return {"found": False, "message": "Missing employee_id"}

	if not frappe.db.exists("Employee", employee_id):
		return {"found": False, "message": "Employee not found"}

	# All fields present in the rejoin-employee web form
	fields = [
		"name", "employee_name", "gender", "date_of_birth", "marital_status",
		"custom_its_id", "custom_farigh_year", "custom_its_mobile", "custom_whatsapp_no",
		"custom_its_name", "custom_farigh_darajah", "custom_its_email",
		"custom_citizenship", "custom_ocipassportnri", "company",
		"cell_number", "personal_email", "company_email", "prefered_email",
		"person_to_be_contacted", "emergency_phone_number", "relation",
		"custom_adhaar_number", "pan_number", "passport_number",
		"current_address", "permanent_address",
		"salary_mode", "bank_name", "bank_ac_no", "ifsc_code", "micr_code", "iban",
	]

	data = frappe.db.get_value("Employee", employee_id, fields, as_dict=True)
	if not data:
		return {"found": False, "message": "Employee data not found"}

	data["found"] = True
	return data


@frappe.whitelist(allow_guest=True)
def update_employee_data(employee_id, form_data):

	
	"""Update employee record from the rejoinee web form submission."""
	import json

	if not employee_id:
		return {"success": False, "message": "Missing employee_id"}

	if not frappe.db.exists("Employee", employee_id):
		return {"success": False, "message": "Employee not found"}

	if isinstance(form_data, str):
		form_data = json.loads(form_data)

	# Only allow updating these fields from the web form
	allowed_fields = [
		"gender", "date_of_birth", "marital_status",
		"custom_its_id", "custom_farigh_year", "custom_its_mobile", "custom_whatsapp_no",
		"custom_its_name", "custom_farigh_darajah", "custom_its_email",
		"custom_citizenship", "custom_ocipassportnri",
		"cell_number", "personal_email", "company_email",
		"person_to_be_contacted", "emergency_phone_number", "relation",
		"custom_adhaar_number", "pan_number", "passport_number",
		"current_address", "permanent_address",
		"bank_name", "bank_ac_no", "ifsc_code", "micr_code", "iban",
	]

	employee = frappe.get_doc("Employee", employee_id)

	for field in allowed_fields:
		if field in form_data:
			employee.set(field, form_data[field])

	employee.save(ignore_permissions=True)
	frappe.db.commit()

	return {"success": True, "message": "Employee details updated successfully"}
