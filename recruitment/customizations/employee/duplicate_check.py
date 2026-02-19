import frappe
from frappe import _
import json


def validate_duplicate_employee(doc, method):
	"""
	Validate hook on Employee.
	Checks for duplicate employees based on fields configured in HR Settings.
	Trigger controlled by custom_duplicate_check_trigger setting:
	  - "before_insert": only new employees
	  - "validate": both new and existing employees
	"""
	hr_settings = frappe.get_cached_doc("HR Settings")

	if not hr_settings.get("custom_enable_duplicate_check"):
		return

	# Check trigger setting - skip if set to "New Employee Only" and doc is not new
	trigger = hr_settings.get("custom_duplicate_check_trigger") or "New Employee Only"
	if trigger == "New Employee Only" and not doc.is_new():
		return

	fields_json = hr_settings.get("custom_duplicate_check_fields")
	if not fields_json:
		return

	try:
		check_fields = json.loads(fields_json)
	except (json.JSONDecodeError, TypeError):
		return

	if not check_fields:
		return

	# Get valid Employee field names to prevent invalid field access
	employee_meta = frappe.get_meta("Employee")
	valid_fieldnames = {f.fieldname for f in employee_meta.fields}

	duplicates = []

	for field_config in check_fields:
		fieldname = field_config.get("fieldname")
		label = field_config.get("label", fieldname)

		if not fieldname:
			continue

		# Skip if field doesn't exist on Employee doctype
		if fieldname not in valid_fieldnames:
			continue

		value = doc.get(fieldname)

		# Skip empty/blank values - don't treat two blank fields as duplicates
		if not value or not str(value).strip():
			continue

		value = str(value).strip()

		# Safe field reference - validated against Employee meta above
		existing = frappe.db.sql(
			"""
			SELECT name, employee_name
			FROM `tabEmployee`
			WHERE LOWER(TRIM(`{field}`)) = LOWER(%(value)s)
			AND name != %(current_name)s
			LIMIT 1
			""".format(field=fieldname),
			{"value": value, "current_name": doc.name or ""},
			as_dict=True,
		)

		if existing:
			emp = existing[0]
			duplicates.append(
				_("{0}: <b>{1}</b> already exists in Employee {2} ({3})").format(
					label,
					value,
					frappe.bold(emp.name),
					emp.employee_name,
				)
			)

	if duplicates:
		msg = _("Duplicate Employee detected based on the following fields:") + "<br><br>"
		msg += "<ul>"
		for d in duplicates:
			msg += f"<li>{d}</li>"
		msg += "</ul>"

		frappe.throw(msg, title=_("Duplicate Employee"))


@frappe.whitelist()
def get_employee_fields_for_duplicate_check():
	"""Returns Employee fields (Data, Phone, Int, Long Int) for duplicate check configuration."""
	allowed_types = ("Data", "Phone", "Int", "Long Int")
	skip_fields = ("name", "employee_name", "naming_series")

	meta = frappe.get_meta("Employee")
	fields = []

	for f in meta.fields:
		if f.fieldtype in allowed_types and f.fieldname not in skip_fields and f.label:
			fields.append({"fieldname": f.fieldname, "label": f.label})

	fields.sort(key=lambda x: x["label"])
	return fields
