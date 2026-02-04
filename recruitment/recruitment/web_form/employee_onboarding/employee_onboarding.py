import frappe
import requests
from frappe import _
from frappe.utils import today


def get_context(context):
	pass


@frappe.whitelist(allow_guest=True)
def create_job_applicant_and_offer(email=None, first_name=None, designation=None, web_form_data=None):
	"""
	Create Job Applicant -> Job Offer -> Employee Onboarding
	Called from the web form Save button override.
	"""
	try:
		if not first_name:
			frappe.throw(_("Employee Name is required"))

		# Step 1: Job Applicant
		job_applicant = create_job_applicant(email=email, first_name=first_name)

		# Step 2: Job Offer
		job_offer = create_and_submit_job_offer(
			email=email,
			first_name=first_name,
			designation=designation,
			job_applicant=job_applicant.name
		)

		# Step 3: Employee Onboarding (if web_form_data provided)
		if web_form_data:
			import json
			if isinstance(web_form_data, str):
				web_form_data = json.loads(web_form_data)

			# Remove empty values, keep job_applicant/job_offer keys
			web_form_data = {k: v for k, v in web_form_data.items() if v or k in ['job_applicant', 'job_offer']}
			web_form_data['doctype'] = 'Employee Onboarding'
			web_form_data['job_applicant'] = job_applicant.name
			web_form_data['job_offer'] = job_offer.name

			# Default company
			if not web_form_data.get('company'):
				default_company = (
					frappe.defaults.get_user_default("Company")
					or frappe.db.get_single_value("Global Defaults", "default_company")
					or frappe.db.get_value("Company", {}, "name")
				)
				if default_company:
					web_form_data['company'] = default_company

			# Create Employee Onboarding
			emp_onboarding = frappe.new_doc('Employee Onboarding')

			meta = frappe.get_meta('Employee Onboarding')
			valid_fields = {df.fieldname for df in meta.fields}
			valid_fields.update(['name', 'doctype', 'owner', 'creation', 'modified', 'modified_by'])

			for key, value in web_form_data.items():
				if key != 'doctype' and value and key in valid_fields:
					emp_onboarding.set(key, value)

			emp_onboarding.job_applicant = job_applicant.name
			emp_onboarding.job_offer = job_offer.name

			emp_onboarding.insert(ignore_permissions=True, ignore_mandatory=True)
			frappe.db.commit()

			return {
				"success": True,
				"job_applicant": job_applicant.name,
				"job_offer": job_offer.name,
				"employee_onboarding": emp_onboarding.name,
				"message": _("Job Applicant, Job Offer, and Employee Onboarding created successfully"),
				"saved": True
			}

		return {
			"success": True,
			"job_applicant": job_applicant.name,
			"job_offer": job_offer.name,
			"message": _("Job Applicant and Job Offer created successfully"),
			"saved": False
		}

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Create Job Applicant and Offer Error")
		frappe.throw(_("Failed to create Job Applicant and Job Offer: {0}").format(str(e)))


def create_job_applicant(email, first_name):
	"""Create a new Job Applicant document."""
	import time

	# Generate fallback email if not provided
	if not email:
		email = f"{first_name.lower().replace(' ', '_')}_{int(time.time())}@onboarding.local"

	try:
		# Check if Job Applicant already exists
		existing = frappe.db.exists("Job Applicant", {"email_id": email})
		if not existing:
			existing = frappe.db.exists("Job Applicant", {"email_address": email})

		if existing:
			return frappe.get_doc("Job Applicant", existing)

		job_applicant = frappe.get_doc({
			"doctype": "Job Applicant",
			"email_id": email,
			"applicant_name": first_name,
			"status": "Open"
		})

		if frappe.db.has_column("Job Applicant", "email_address"):
			job_applicant.email_address = email

		if frappe.db.has_column("Job Applicant", "applicant_first_name"):
			job_applicant.applicant_first_name = first_name

		job_applicant.insert(ignore_permissions=True, ignore_mandatory=True)
		frappe.db.commit()
		return job_applicant

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Job Applicant Creation Error")
		frappe.throw(_("Failed to create Job Applicant: {0}").format(str(e)))


def create_and_submit_job_offer(email, first_name, designation, job_applicant):
	"""Create and submit a new Job Offer document."""
	try:
		default_company = (
			frappe.defaults.get_user_default("Company")
			or frappe.db.get_single_value("Global Defaults", "default_company")
			or frappe.db.get_value("Company", {}, "name")
		)

		if not default_company:
			frappe.throw(_("No company found. Please create a company first."))

		job_offer = frappe.get_doc({
			"doctype": "Job Offer",
			"job_applicant": job_applicant,
			"applicant_name": first_name,
			"designation": designation,
			"offer_date": today(),
			"company": default_company,
			"status": "Awaiting Response"
		})

		job_offer.insert(ignore_permissions=True)
		job_offer.submit()
		frappe.db.commit()
		return job_offer

	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Job Offer Creation Error")
		frappe.throw(_("Failed to create Job Offer: {0}").format(str(e)))


@frappe.whitelist(allow_guest=True)
def fetch_employee_data_by_its_id(its_id):
	"""Fetch employee data from payroll API based on ITS ID."""
	if not its_id:
		frappe.throw("ITS ID is required")

	try:
		its_settings = frappe.get_single("ITS Settings")
		api_url = its_settings.api_url
		api_key = its_settings.api_key

		if not api_url or not api_key:
			frappe.throw("ITS Settings: API URL and API Key are required. Please configure ITS Settings.")
	except Exception as e:
		frappe.throw(f"Failed to fetch ITS Settings. Please configure ITS Settings first. Error: {str(e)}")

	payload = {
		"its": str(its_id),
		"key": api_key
	}
	headers = {"Content-Type": "application/json"}

	try:
		response = requests.post(api_url, json=payload, headers=headers, timeout=30)
		response.raise_for_status()

		if not response.text or response.text.strip() == "":
			return {"success": False, "error": "The Payroll API returned an empty response."}

		try:
			data = response.json()
		except ValueError:
			return {"success": False, "error": "The Payroll API returned an invalid response."}

		if not data.get("fullname") and not data.get("email"):
			return {"success": False, "error": f"No employee data found for ITS ID: {its_id}"}

		mobile = data.get("mobile") or data.get("mobile_number") or data.get("phone") or ""
		whatsapp = data.get("whatsapp") or data.get("whatsapp_number") or data.get("whatsapp_no") or ""

		return {
			"success": True,
			"custom_email_id": data.get("email") or "",
			"custom_farig_year": data.get("farig_year") or "",
			"custom_farig_darajah": data.get("farig_darajah") or "",
			"employee_name": data.get("fullname") or "",
			"custom_primary_mobile_number": mobile,
			"custom_whatsapp_number": whatsapp,
		}

	except requests.exceptions.Timeout:
		return {"success": False, "error": "The Payroll API request timed out. Please try again later."}
	except requests.exceptions.RequestException as req_err:
		frappe.log_error(str(req_err), "Payroll API Request Error")
		return {"success": False, "error": f"Failed to connect to Payroll API: {str(req_err)}"}
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Payroll API Error")
		return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}
