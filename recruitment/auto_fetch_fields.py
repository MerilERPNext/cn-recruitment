import frappe

@frappe.whitelist()
def job_applicant_fields(job_applicant):
    job_applicant_doc = frappe.get_doc("Job Applicant", job_applicant)
    recruitment_settings = frappe.get_doc("Recruitment Settings")

    mappings = [
        entry for entry in recruitment_settings.recruitment_tool
        if entry.source_doctype == "Job Applicant" and entry.target_doctype == "Job Offer"
    ]

    job_offer_data = {}
    
    for mapping in mappings:
        source_field = mapping.source_field.split(" (")[1].split(")")[0]
        target_field = mapping.target_field.split(" (")[1].split(")")[0]

        if hasattr(job_applicant_doc, source_field):
            job_offer_data[target_field] = getattr(job_applicant_doc, source_field)

    return job_offer_data


@frappe.whitelist()
def employee_fetch_fields(employee_onboarding):
    onboarding_doc = frappe.get_doc("Employee Onboarding", employee_onboarding)
    recruitment_settings = frappe.get_doc("Recruitment Settings")
    mappings = {
        entry.source_field.split(" (")[1].split(")")[0]: entry.target_field.split(" (")[1].split(")")[0]
        for entry in recruitment_settings.recruitment_tool
        if entry.source_doctype == "Employee Onboarding" and entry.target_doctype == "Employee"
    }
    employee_doc = frappe.new_doc("Employee")

    for source_field, target_field in mappings.items():
        value = getattr(onboarding_doc, source_field, None)
        if value is not None:
            setattr(employee_doc, target_field, value)
    return employee_doc.as_dict()









                                                                                      

