import frappe
import json
from frappe.utils.file_manager import save_file
import base64
import re

@frappe.whitelist()
def generate_formio_from_recruitment_settings(variables):
    doc = frappe.get_single("Recruitment Settings")
    funnel_fields = doc.get("basic_info_funnel") or []

    meta = frappe.get_meta("Job Applicant")
    fieldtype_map = {f.fieldname: f.fieldtype for f in meta.fields if f.fieldname}
    field_options_map = {f.fieldname: f.options for f in meta.fields if f.fieldname}

    # Mapping ERP fieldtypes to FormIO field types
    formio_type_map = {
        "Data": "textfield",
        "Select": "select",
        "Check": "checkbox",
        "Date": "datetime",
        "Datetime": "datetime",
        "Small Text": "textarea",
        "Text": "textarea",
        "Attach": "file",
        "Attach Image": "file",
        "Link": "select"
    }

    components = []

    for row in funnel_fields:
        fieldname = row.fieldname
        field_label = row.field_label or fieldname
        is_required = row.is_mandatory

        fieldtype = fieldtype_map.get(fieldname, "Data")
        formio_type = formio_type_map.get(fieldtype, "textfield")

        component = {
            "label": field_label,
            "key": fieldname,
            "type": formio_type,
            "input": True,
            "validate": {
                "required": bool(is_required)
            }
        }

        if formio_type == "select":
            component["dataSrc"] = "values"
            values = []

            if fieldtype == "Link":
                link_doctype = field_options_map.get(fieldname)
                if link_doctype:
                    link_records = frappe.get_all(link_doctype, fields=["name"], limit=50)
                    values = [{"label": d.name, "value": d.name} for d in link_records]
            else:
                options = field_options_map.get(fieldname, "")
                values = [{"label": opt.strip(), "value": opt.strip()} for opt in options.split("\n") if opt.strip()]

            component["data"] = {"values": values}

        if formio_type == "file":
            component.update({
                "storage": "base64",
                "filePattern": "*",
                "fileMaxSize": "1GB"
            })

        components.append(component)

    # Group into tabs with 5 fields each
    tabs = []
    for i in range(0, len(components), 5):
        tab = {
            "label": f"Tab {len(tabs)+1}",
            "key": f"tab{len(tabs)+1}",
            "components": components[i:i+5]
        }
        tabs.append(tab)

    # Final panel
    formio_json = {
        "components": [
            {
                "type": "columns",
                "columns": [
                    {
                        "components": [
                            {
                                "label": "Tabs",
                                "key": "tabs",
                                "type": "tabs",
                                "components": tabs,
                                "input": False
                            }
                        ],
                        "width": 12
                    }
                ]
            },
            {
                "type": "button",
                "label": "Submit",
                "key": "submit",
                "action": "submit",
                "theme": "primary",
                "input": True
            }
        ]
    }

    variables["formio_json"] = json.dumps(formio_json)



def save_uploaded_file(doc, fieldname, file_data):
    if isinstance(file_data, str):
        file_data = json.loads(file_data)
    if isinstance(file_data, list) and len(file_data) > 0:
        file_data = file_data[0]
        file_content = base64.b64decode(file_data["url"].split(",")[1])
        filename = file_data["name"]

        saved_file = save_file(
            filename,
            file_content,
            dt=doc.doctype,
            dn=doc.name,
            df=fieldname,
            is_private=0
        )
        return saved_file.file_url
    return None

@frappe.whitelist()
def update_job_applicant_from_formio(variables):
    doc_data = variables.get("doc_data")
    submitted_data = variables.get("documents")

    if not doc_data or not submitted_data:
        return

    job_applicant = frappe.get_doc(doc_data["doctype"], doc_data["name"])
    job_applicant.flags.ignore_validate_update_after_submit = True
    job_applicant.flags.ignore_permissions = True

    meta = frappe.get_meta(job_applicant.doctype)
    file_fields = [df.fieldname for df in meta.fields if df.fieldtype in ["Attach", "Attach Image"]]

    for fieldname, value in submitted_data.items():
        if fieldname in file_fields:
            file_url = save_uploaded_file(job_applicant, fieldname, value)
            if file_url:
                job_applicant.set(fieldname, file_url)
        else:
            job_applicant.set(fieldname, value)

    job_applicant.save(ignore_permissions=True, ignore_version=True)
