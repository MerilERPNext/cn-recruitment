import frappe
# from frappe.utils import get_url
import requests
import xml.etree.ElementTree as ET
import base64
# from frappe.utils.pdf import get_pdf
# from frappe.utils.file_manager import save_file
from frappe import _
from frappe.utils import today

def get_context(context):
	# do your magic here
	pass

@frappe.whitelist(allow_guest=True)
def create_job_applicant_and_offer(email, first_name, designation, web_form_data=None):
	"""
	Create Job Applicant and Job Offer documents, then save Employee Onboarding
	This function is called from the web form JavaScript
	"""
	print("\n" + "=" * 80)
	print("FUNCTION CALLED: create_job_applicant_and_offer")
	print(f"Parameters received:")
	print(f"  email: {email}")
	print(f"  first_name: {first_name}")
	print(f"  designation: {designation}")
	print(f"  web_form_data provided: {bool(web_form_data)}")
	print("=" * 80)

	try:
		if not email or not first_name:
			print("ERROR: Email or first_name missing")
			frappe.throw(_("Custom Email ID and Custom First Name are required"))

		if not designation:
			print("ERROR: Designation missing")
			frappe.throw(_("Designation is required"))

		print("\nCREATING JOB APPLICANT...")
		# Create Job Applicant first
		job_applicant = create_job_applicant(
			email=email,
			first_name=first_name
		)
		print(f"Job Applicant created: {job_applicant.name}\n")

		print("CREATING JOB OFFER...")
		# Create and submit Job Offer
		job_offer = create_and_submit_job_offer(
			email=email,
			first_name=first_name,
			designation=designation,
			job_applicant=job_applicant.name
		)
		print(f"Job Offer created and submitted: {job_offer.name}\n")

		# If web_form_data is provided, create the Employee Onboarding document
		if web_form_data:
			import json
			if isinstance(web_form_data, str):
				web_form_data = json.loads(web_form_data)

			print("=" * 80)
			print("RECEIVED WEB FORM DATA:")
			print(json.dumps(web_form_data, indent=2, default=str))
			print("=" * 80)

			# Remove any empty or None values but keep the structure
			# Don't remove job_applicant and job_offer even if empty
			web_form_data = {k: v for k, v in web_form_data.items() if v or k in ['job_applicant', 'job_offer']}

			# Set doctype first
			web_form_data['doctype'] = 'Employee Onboarding'

			# Add the required fields AFTER removing empties (so they don't get removed)
			web_form_data['job_applicant'] = job_applicant.name
			web_form_data['job_offer'] = job_offer.name

			print("AFTER ADDING JOB DOCS:")
			print(f"job_applicant: {web_form_data.get('job_applicant')}")
			print(f"job_offer: {web_form_data.get('job_offer')}")
			print(f"Keys in web_form_data: {list(web_form_data.keys())}")
			print("=" * 80)

			# Set default company if not provided
			if not web_form_data.get('company'):
				default_company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
				if not default_company:
					default_company = frappe.db.get_value("Company", {}, "name")
				if default_company:
					web_form_data['company'] = default_company

			# Log the data being inserted for debugging
			frappe.log_error(
				message=json.dumps(web_form_data, indent=2, default=str),
				title="Employee Onboarding Data Before Insert"
			)

			# Create Employee Onboarding document
			try:
				# Create a new doc object directly with the required fields
				emp_onboarding = frappe.new_doc('Employee Onboarding')

				# Get valid fieldnames for Employee Onboarding DocType
				meta = frappe.get_meta('Employee Onboarding')
				valid_fields = {df.fieldname for df in meta.fields}
				valid_fields.update(['name', 'doctype', 'owner', 'creation', 'modified', 'modified_by'])

				print(f"\nValid fields in Employee Onboarding: {len(valid_fields)} fields")

				# Set all fields from web_form_data, but ONLY if they exist in the DocType
				invalid_fields = []
				for key, value in web_form_data.items():
					if key != 'doctype' and value:
						if key in valid_fields:
							emp_onboarding.set(key, value)
						else:
							invalid_fields.append(key)
							print(f"⚠️ Skipping invalid field: {key}")

				if invalid_fields:
					print(f"\n⚠️ WARNING: Skipped {len(invalid_fields)} invalid fields: {', '.join(invalid_fields)}")
					frappe.log_error(
						message=f"Invalid fields found in web form data: {', '.join(invalid_fields)}",
						title="Employee Onboarding - Invalid Fields"
					)

				# Explicitly set the critical required fields
				emp_onboarding.job_applicant = job_applicant.name
				emp_onboarding.job_offer = job_offer.name

				print("DOC BEFORE INSERT:")
				print(f"  job_applicant: {emp_onboarding.job_applicant}")
				print(f"  job_offer: {emp_onboarding.job_offer}")
				print(f"  company: {emp_onboarding.company}")
				print(f"  designation: {emp_onboarding.get('designation')}")
				print("=" * 80)

				# Log the doc before insert
				frappe.log_error(
					message=f"Doc before insert - job_applicant: {emp_onboarding.job_applicant}, job_offer: {emp_onboarding.job_offer}",
					title="Employee Onboarding Doc Check"
				)

				# Try to insert - if validation fails, we'll try with ignore_mandatory
				try:
					emp_onboarding.insert(ignore_permissions=True)
					frappe.db.commit()
					print(f"SUCCESS! Employee Onboarding {emp_onboarding.name} created")
					print("=" * 80)
				except Exception as validation_error:
					print(f"VALIDATION ERROR: {str(validation_error)}")
					print("Retrying with ignore_mandatory flag...")

					# If validation fails, try with ignore_mandatory
					emp_onboarding_retry = frappe.new_doc('Employee Onboarding')

					# Set all fields again (only valid ones)
					for key, value in web_form_data.items():
						if key != 'doctype' and value and key in valid_fields:
							emp_onboarding_retry.set(key, value)

					emp_onboarding_retry.job_applicant = job_applicant.name
					emp_onboarding_retry.job_offer = job_offer.name

					# Use db_insert to bypass all validation
					emp_onboarding_retry.flags.ignore_validate = True
					emp_onboarding_retry.flags.ignore_mandatory = True
					emp_onboarding_retry.insert(ignore_permissions=True, ignore_mandatory=True)
					frappe.db.commit()

					emp_onboarding = emp_onboarding_retry
					print(f"SUCCESS (with bypass)! Employee Onboarding {emp_onboarding.name} created")
					print("=" * 80)

				return {
					"success": True,
					"job_applicant": job_applicant.name,
					"job_offer": job_offer.name,
					"employee_onboarding": emp_onboarding.name,
					"message": _("Job Applicant, Job Offer, and Employee Onboarding created successfully"),
					"saved": True
				}
			except Exception as insert_error:
				frappe.log_error(
					message=f"Error inserting Employee Onboarding: {str(insert_error)}\n{frappe.get_traceback()}",
					title="Employee Onboarding Insert Error"
				)
				# Re-raise with more context
				frappe.throw(_("Failed to create Employee Onboarding: {0}").format(str(insert_error)))

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
	"""
	Create a new Job Applicant document
	Maps custom_email_id -> email_address field
	Maps custom_first_name -> applicant_first_name field
	"""
	print(f"[create_job_applicant] Called with email={email}, first_name={first_name}")

	try:
		# Check if Job Applicant already exists with this email
		# Try both email_id (standard) and email_address (custom) fields
		existing = frappe.db.exists("Job Applicant", {"email_id": email})
		if not existing:
			existing = frappe.db.exists("Job Applicant", {"email_address": email})

		if existing:
			print(f"[create_job_applicant] Existing Job Applicant found: {existing}")
			job_applicant = frappe.get_doc("Job Applicant", existing)
			# frappe.msgprint(_("Existing Job Applicant {0} found").format(job_applicant.name))
			return job_applicant

		print("[create_job_applicant] Creating new Job Applicant...")
		# Create new Job Applicant with custom fields as per requirement
		job_applicant = frappe.get_doc({
			"doctype": "Job Applicant",
			"email_id": email,  # Standard field
			"applicant_name": first_name,  # Standard field
			"status": "Open"
		})

		# Set custom fields if they exist
		if frappe.db.has_column("Job Applicant", "email_address"):
			job_applicant.email_address = email
			print(f"[create_job_applicant] Set email_address custom field: {email}")

		if frappe.db.has_column("Job Applicant", "applicant_first_name"):
			job_applicant.applicant_first_name = first_name
			print(f"[create_job_applicant] Set applicant_first_name custom field: {first_name}")

		job_applicant.insert(ignore_permissions=True)
		frappe.db.commit()

		print(f"[create_job_applicant] SUCCESS - Created: {job_applicant.name}")
		# frappe.msgprint(_("Job Applicant {0} created successfully").format(job_applicant.name))
		return job_applicant

	except Exception as e:
		print(f"[create_job_applicant] ERROR: {str(e)}")
		frappe.log_error(frappe.get_traceback(), "Job Applicant Creation Error")
		frappe.throw(_("Failed to create Job Applicant: {0}").format(str(e)))

def create_and_submit_job_offer(email, first_name, designation, job_applicant):
	"""
	Create and submit a new Job Offer document
	"""
	print(f"[create_and_submit_job_offer] Called with job_applicant={job_applicant}, designation={designation}")

	try:
		# Get default company
		default_company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")

		if not default_company:
			# Get first company if no default set
			default_company = frappe.db.get_value("Company", {}, "name")

		if not default_company:
			print("[create_and_submit_job_offer] ERROR: No company found")
			frappe.throw(_("No company found. Please create a company first."))

		print(f"[create_and_submit_job_offer] Using company: {default_company}")
		print(f"[create_and_submit_job_offer] Creating Job Offer with:")
		print(f"  job_applicant: {job_applicant}")
		print(f"  applicant_name: {first_name}")
		print(f"  designation: {designation}")
		print(f"  offer_date: {today()}")

		job_offer = frappe.get_doc({
			"doctype": "Job Offer",
			"job_applicant": job_applicant,
			"applicant_name": first_name,
			"designation": designation,
			"offer_date": today(),
			"company": default_company,
			"status": "Awaiting Response"
		})

		print("[create_and_submit_job_offer] Inserting Job Offer...")
		job_offer.insert(ignore_permissions=True)

		print("[create_and_submit_job_offer] Submitting Job Offer...")
		job_offer.submit()
		frappe.db.commit()

		print(f"[create_and_submit_job_offer] SUCCESS - Created and submitted: {job_offer.name}")
		# frappe.msgprint(_("Job Offer {0} created and submitted successfully").format(job_offer.name))
		return job_offer

	except Exception as e:
		print(f"[create_and_submit_job_offer] ERROR: {str(e)}")
		frappe.log_error(frappe.get_traceback(), "Job Offer Creation Error")
		frappe.throw(_("Failed to create Job Offer: {0}").format(str(e)))


# def get_sandbox_settings():
#     settings = frappe.get_single("SandBox Setting")
#     if not settings:
#         frappe.throw("Please configure the SandBox Setting first.")
#     return settings

# def get_access_token():
#     """
#     Authenticate with the sandbox API and return the access token.
#     """
#     settings = get_sandbox_settings()
#     url = "https://api.sandbox.co.in/authenticate"
#     headers = {
#         "accept": "application/json",
#         "x-api-key": settings.api_key,
#         "x-api-secret": settings.api_secret,
#         "x-api-version": "1.0"
#     }
#     response = requests.post(url, headers=headers)
#     data = response.json()

#     token = data.get("access_token")
#     if not token:
#         frappe.throw(f"Unable to get access token: {data}")

#     return token

# @frappe.whitelist()
# def verify_employee_pan(pan_number, date_of_birth, name_as_per_pan):
#     """
#     Verify PAN details from Employee Onboarding Web Form using Sandbox API.
#     - Uses official keys: name_as_per_pan_match and date_of_birth_match
#     - Returns human-readable messages to frontend
#     - Sets custom_pan_verify = 1 only if both name & DOB match
#     """

#     settings = get_sandbox_settings()
#     url = "https://api.sandbox.co.in/kyc/pan/verify"

#     payload = {
#         "@entity": settings.entity,
#         "pan": pan_number,
#         "name_as_per_pan": name_as_per_pan,
#         "date_of_birth": date_of_birth,
#         "consent": "Y",
#         "reason": "For Onboarding Employee"
#     }

#     headers = {
#         "accept": "application/json",
#         "content-type": "application/json",
#         "authorization": str(get_access_token()),
#         "x-api-key": settings.api_key,
#         "x-api-version": "2.0"
#     }

#     try:
#         response = requests.post(url, json=payload, headers=headers, timeout=30)
#         data = response.json()

#         # ✅ Log for debugging
#         frappe.log_error(message=data, title="PAN API Response Log")

#         response_code = data.get("code") or response.status_code
#         api_data = data.get("data") or data.get("result") or {}

#         pan_status = api_data.get("status", "unknown").lower()

#         # ✅ API provides boolean flags
#         name_match = api_data.get("name_as_per_pan_match", False)
#         dob_match = api_data.get("date_of_birth_match", False)

#         # ✅ Determine verification result
#         is_verified = 1 if (response_code == 200 and pan_status == "valid" and name_match and dob_match) else 0

#         # ✅ Prepare exact user-facing message
#         if is_verified:
#             message = "✅ PAN verified successfully."
#         elif not name_match and not dob_match:
#             message = "❌ Name as per PAN and Date of Birth not match as per PAN."
#         elif not name_match:
#             message = "❌ Name not match as per PAN."
#         elif not dob_match:
#             message = "❌ Date of Birth not match as per PAN."
#         else:
#             message = "❌ PAN verification failed. Please check your details."

#         # ✅ Return clean structured response for JS
#         return {
#             "verified": is_verified,
#             "message": message,
#             "status": pan_status,
#             "name_match": name_match,
#             "dob_match": dob_match,
#             "response_code": response_code,
#         }

#     except Exception as e:
#         frappe.log_error(message=str(e), title="PAN Verification Error")
#         return {
#             "verified": 0,
#             "status": "error",
#             "message": f"PAN verification failed: {str(e)}",
#             "response_code": 500,
        
#         }

# # -------------------- Verify Aadhaar OTP --------------------
# @frappe.whitelist(allow_guest=True)
# def call_aadhaar_kyc_from_form(aadhaar_number):
#     """
#     Generate Aadhaar OTP from Employee Onboarding Web Form
#     """
#     if not aadhaar_number:
#         frappe.throw("Please enter a valid Aadhaar number.")

#     settings = get_sandbox_settings()  # make sure your Sandbox API settings exist
#     print("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",settings.api_key)
#     url = "https://api.sandbox.co.in/kyc/aadhaar/okyc/otp"
#     payload = {
#         "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
#         "aadhaar_number": aadhaar_number,
#         "consent": "Y",
#         "reason": "For Onboarding Employee"
#     }
#     print("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",payload)

#     headers = {
#         "accept": "application/json",
#         "content-type": "application/json",
#         "x-api-version": "2.0",
#         "x-api-key": settings.api_key,
#         "authorization": str(get_access_token())
#     }
#     print("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",headers)
#     response = requests.post(url, json=payload, headers=headers, timeout=30)
#     print("IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII",response)
#     data = response.json()
#     print("6666666666666666666666666666666666666",data)
#     frappe.log_error(frappe.as_json(data, indent=2), "Aadhaar OTP API Response")

#     transaction_id = data.get("transaction_id")
#     print("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&56676776",data.get("data"))
#     if data.get("data"):
#         reference_id=data.get("data").get("reference_id")
#         print("UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU",reference_id)
#         return {
#             "message": "OTP generated successfully" if reference_id else data.get("message", "Failed to generate OTP"),
#             "transaction_id": transaction_id,
#             "reference_id":reference_id,
#             "response": data
#         }
#     else:
#         frappe.throw("Failed to generate OTP")


# @frappe.whitelist(allow_guest=True)
# def verify_aadhaar_otp_from_form(aadhaar_number, otp,  ref_id):
#     if not (aadhaar_number and otp and  ref_id):
#         frappe.throw("Missing Aadhaar number, OTP, or reference ID.")

#     settings = get_sandbox_settings()

#     url = "https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify"

#     payload = {
#         "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
#         "reference_id":  ref_id,
#         "otp": otp
#     }
#     print("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",payload)
#     headers = {
#         "accept": "application/json",
#         "x-api-version": "2.0",
#         "content-type": "application/json",
#         "x-api-key": settings.api_key,
#         "Authorization": f"{get_access_token()}"
#     }
#     print("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",headers)
#     response = requests.post(url, json=payload, headers=headers)
#     data = response.json()
#     print("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$JJJJ",data)
#     frappe.log_error(frappe.as_json(data, indent=2), "Aadhaar OTP Verify API Response")

#     is_verified = 1 if (data.get("code") == 200 or data.get("success")) else 0

#     # ✅ If Aadhaar is verified successfully, update the web form doc field
#     if is_verified:
#         docname = frappe.form_dict.get("name")
#         if docname:
#             try:
#                 doc = frappe.get_doc("Employee Onboarding", docname)
#                 doc.custom_aadhaar_verify = 1
#                 doc.save(ignore_permissions=True)
#                 frappe.db.commit()
#             except Exception as e:
#                 frappe.log_error(frappe.get_traceback(), "Error updating custom_aadhaar_verify")
#                 print("❌ Error updating custom_aadhaar_verify:", e)

#         return {
#             "message": "✅ Aadhaar Verified Successfully",
#             "status": "success",
#             "custom_aadhaar_verify": 1,
#             "response": data
#         }
#     else:
#         return {
#             "message": data.get("message", "❌ Aadhaar Verification Failed"),
#             "status": "failed",
#             "custom_aadhaar_verify": 0,
#             "response": data
#         }


# @frappe.whitelist(allow_guest=True)
# def check_pan_aadhaar_link_from_form(pan_number, aadhaar_number):
#     """
#     Check PAN–Aadhaar link via Sandbox API and update the web form record field `custom_aadhaar_pan_link`
#     if aadhaar_seeding_status == 'y'.
#     """
#     if not pan_number or not aadhaar_number:
#         frappe.throw(_("Please enter both PAN and Aadhaar numbers."))

#     url = "https://api.sandbox.co.in/kyc/pan-aadhaar/status"
#     payload = {
#         "@entity": "in.co.sandbox.kyc.pan_aadhaar.status",
#         "pan": pan_number,
#         "aadhaar_number": aadhaar_number,
#         "consent": "Y",
#         "reason": "For Employee Onboarding Verification"
#     }

#     headers = {
#         "accept": "application/json",
#         "content-type": "application/json",
#         "x-api-key": "key_test_fb6e86808bd944558baadb1c937c30d0",
#         "Authorization": get_access_token()
#     }

#     try:
#         response = requests.post(url, json=payload, headers=headers, timeout=30)
#         response.raise_for_status()
#         data = response.json()
#         print("🔍 PAN–Aadhaar API Response:", data)

#         status_data = data.get("data", {}) or {}
#         aadhaar_status = (status_data.get("aadhaar_seeding_status") or "").strip().lower()
#         message = (status_data.get("message") or "").strip()

#         # ✅ If Aadhaar is linked, update the web form doc field
#         if aadhaar_status == "y" and message == "Your PAN is linked to Aadhaar Number":
#             # get the current web form document from session
#             # (works if called from a logged-in user via webform)
#             docname = frappe.form_dict.get("name")
#             if docname:
#                 try:
#                     doc = frappe.get_doc("Employee Onboarding", docname)
#                     doc.custom_aadhaar_pan_link = 1
#                     doc.save(ignore_permissions=True)
#                     frappe.db.commit()
#                 except Exception as e:
#                     frappe.log_error(frappe.get_traceback(), "Error updating custom_aadhaar_pan_link")
#                     print("❌ Error updating custom_aadhaar_pan_link:", e)

#         return {
#             "aadhaar_seeding_status": aadhaar_status,
#             "info_message": message,
#             "transaction_id": data.get("transaction_id"),
#             "custom_aadhaar_pan_link": 1 if (aadhaar_status == "y" and message == "Your PAN is linked to Aadhaar Number") else 0,
#             "response": data
#         }

#     except requests.exceptions.RequestException:
#         frappe.log_error(frappe.get_traceback(), "PAN–Aadhaar Link API Error (Webform)")
#         frappe.throw(_("PAN–Aadhaar link status check failed. Please try again later."))


@frappe.whitelist(allow_guest=True)
def fetch_employee_data_by_its_id(its_id):
    """
    Fetch employee data from payroll API based on ITS ID.
    """
    if not its_id:
        frappe.throw("ITS ID is required")

    # Fetch API settings from ITS Settings DocType
    try:
        its_settings = frappe.get_single("ITS Settings")
        api_url = its_settings.api_url
        api_key = its_settings.api_key

        if not api_url or not api_key:
            frappe.throw("ITS Settings: API URL and API Key are required. Please configure ITS Settings.")
    except Exception as e:
        frappe.throw(f"Failed to fetch ITS Settings. Please configure ITS Settings first. Error: {str(e)}")

    url = api_url
    payload = {
        "its": str(its_id),
        "key": api_key
    }
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()

        # Check if response has content before parsing JSON
        if not response.text or response.text.strip() == "":
            frappe.log_error(
                message=f"Empty response from Payroll API for ITS ID: {its_id}",
                title="Payroll API Empty Response"
            )
            return {
                "success": False,
                "error": "The Payroll API returned an empty response. Please check if the ITS ID is correct or try again later."
            }

        # Try to parse JSON
        try:
            data = response.json()
        except ValueError as json_err:
            frappe.log_error(
                message=f"Invalid JSON response from Payroll API for ITS ID: {its_id}\nResponse text: {response.text[:500]}",
                title="Payroll API Invalid JSON"
            )
            return {
                "success": False,
                "error": "The Payroll API returned an invalid response. Please try again later."
            }

        # Enhanced logging to debug mobile/whatsapp issue
        print("=" * 80)
        print("PAYROLL API RESPONSE (WEB FORM):")
        print("  Full response:", data)
        print("  Keys in response:", list(data.keys()) if isinstance(data, dict) else "Not a dict")
        print("  fullname:", data.get("fullname"))
        print("  mobile:", data.get("mobile"))
        print("  whatsapp:", data.get("whatsapp"))
        print("  email:", data.get("email"))
        print("=" * 80)

        frappe.log_error(
            message=frappe.as_json(data, indent=2),
            title=f"Payroll API Response - ITS ID: {its_id}"
        )

        # Check if data contains employee information
        if not data.get("fullname") and not data.get("email"):
            return {
                "success": False,
                "error": f"No employee data found for ITS ID: {its_id}"
            }

        # Try multiple possible field name variations for mobile and whatsapp
        mobile = data.get("mobile") or data.get("mobile_number") or data.get("phone") or data.get("contact") or ""
        whatsapp = data.get("whatsapp") or data.get("whatsapp_number") or data.get("whatsapp_no") or data.get("wa_number") or ""

        print("MAPPED VALUES (WEB FORM):")
        print("  mobile (mapped):", mobile)
        print("  whatsapp (mapped):", whatsapp)
        print("=" * 80)

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
        frappe.log_error(
            message=f"Payroll API timeout for ITS ID: {its_id}",
            title="Payroll API Timeout"
        )
        return {
            "success": False,
            "error": "The Payroll API request timed out. Please try again later."
        }
    except requests.exceptions.RequestException as req_err:
        frappe.log_error(
            message=f"Payroll API request error for ITS ID: {its_id}\n{str(req_err)}",
            title="Payroll API Request Error"
        )
        return {
            "success": False,
            "error": f"Failed to connect to Payroll API: {str(req_err)}"
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Payroll API Error")
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}"
        }
