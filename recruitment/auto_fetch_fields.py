import frappe
from frappe.model.mapper import get_mapped_doc

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
def job_requisition_fields(job_requisition):
    job_requisition_doc = frappe.get_doc("Job Requisition", job_requisition)
    recruitment_settings = frappe.get_doc("Recruitment Settings")

    mappings = [
        entry for entry in recruitment_settings.recruitment_tool
        if entry.source_doctype == "Job Requisition" and entry.target_doctype == "Job Applicant"
    ]

    job_applicant_data = {}

    for mapping in mappings:
        try:
            source_field = mapping.source_field.split(" (")[1].split(")")[0]
            target_field = mapping.target_field.split(" (")[1].split(")")[0]

            if hasattr(job_requisition_doc, source_field):
                job_applicant_data[target_field] = getattr(job_requisition_doc, source_field)

        except IndexError:
            frappe.log_error(f"Field mapping error in Recruitment Settings: {mapping.source_field} → {mapping.target_field}")

    return job_applicant_data



@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    doc = frappe.get_doc("Employee Onboarding", source_name)
    settings = frappe.get_doc("Recruitment Settings")

    field_map = {
        entry.source_field.split(" (")[1].split(")")[0]: entry.target_field.split(" (")[1].split(")")[0]
        for entry in settings.recruitment_tool
        if entry.source_doctype == "Employee Onboarding" and entry.target_doctype == "Employee"
    }

    def set_missing_values(source, target):
        target.personal_email = frappe.db.get_value("Job Applicant", source.job_applicant, "email_id")
        target.status = "Active"

        for source_field, target_field in field_map.items():
            value = getattr(source, source_field, None)
            if value is not None:
                setattr(target, target_field, value)

    employee_doc = get_mapped_doc(
        "Employee Onboarding",
        source_name,
        {
            "Employee Onboarding": {
                "doctype": "Employee",
                "field_map": field_map,
            }
        },
        target_doc,
        set_missing_values,
    )

    if not employee_doc:
        frappe.throw("Error: Employee document was not created")
    try:
        employee_doc.save(ignore_permissions=True)  
    except Exception as e:
        frappe.throw(f"Failed to save Employee: {str(e)}")

    frappe.db.set_value("Employee Onboarding", source_name, "employee", employee_doc.name)

    return employee_doc



@frappe.whitelist()
def update_employee_fields(doc, event=None):
    onboarding_doc = frappe.get_doc("Employee Onboarding", doc.name)  

    if onboarding_doc.employee:
        employee_doc = frappe.get_doc("Employee", onboarding_doc.employee)
        settings = frappe.get_doc("Recruitment Settings")

        field_map = {
            entry.source_field.split(" (")[1].split(")")[0]: entry.target_field.split(" (")[1].split(")")[0]
            for entry in settings.recruitment_tool
            if entry.source_doctype == "Employee Onboarding" and entry.target_doctype == "Employee"
        }

        employee_meta = frappe.get_meta("Employee")

        child_table_mappings = {}
        single_field_mappings = {}

        for source_field, target_field in field_map.items():
            if employee_meta.get_field(target_field) and employee_meta.get_field(target_field).fieldtype == "Table":
                child_table_mappings[source_field] = target_field  # Child tables
            else:
                single_field_mappings[source_field] = target_field  # Single fields

        if single_field_mappings:
            update_dict = {
                target_field: getattr(onboarding_doc, source_field, None)
                for source_field, target_field in single_field_mappings.items()
                if getattr(onboarding_doc, source_field, None) is not None
            }
            if update_dict:
                frappe.db.set_value("Employee", onboarding_doc.employee, update_dict)

        employee_doc.reload()

        for onboarding_child, employee_child in child_table_mappings.items():
            if employee_meta.get_field(employee_child):
                # Clear existing child table data
                employee_doc.set(employee_child, [])

                # Fetch and append child table data dynamically
                for child_row in onboarding_doc.get(onboarding_child, []):
                    new_row = employee_doc.append(employee_child, {})
                    for field in child_row.as_dict():
                        if field not in ["name", "parent", "parentfield", "parenttype", "idx", "doctype"]:
                            new_row.set(field, child_row.get(field))

        employee_doc.flags.ignore_version = True  
        employee_doc.save(ignore_permissions=True)  