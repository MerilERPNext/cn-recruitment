import frappe


def execute():
    eo_fields = ["custom_first_name","custom_middle_name","custom_last_name","custom_gender","custom_date_of_birth",
                 "custom_marital_status","custom_aadhar_card_number","custom_pan_card_number","custom_current_address",
                 "job_applicant","custom_bank_account_no","custom_name_of_bank","custom_ifsc_code","custom_blood_group"
                 ]
    e_field = ["first_name","middle_name","last_name","gender","date_of_birth","marital_status","custom_aadhar_no","pan_number","current_address",
                "job_applicant","ban_ac_no","bank_name","ifsc_code","blood_group"
                ]
    recruitment_settings = frappe.get_doc("Recruitment Settings")
    for idx,field in enumerate(eo_fields):
        new_row = recruitment_settings.append("mapping_fields", {})
        new_row.employee_onboarding = field
        new_row.employee = e_field[idx]
    recruitment_settings.save()
    frappe.db.commit()