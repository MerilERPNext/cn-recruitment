import frappe
import json
from os import path

funnel_json_files = [
            "job_opening.json",
            "interview.json",
            "job_offer.json",
            "employee_onboarding.json",
            "job_applicant.json",
            "job_applicant_public.json",
        ]
data=[]
for json_file in funnel_json_files:
    json_file_path = path.join(
        path.dirname(__file__), "json_files", json_file
    )
    json_file = open(json_file_path, "r")
    json_data = json.load(json_file)
    json_file.close()
    data.append(json_data)

def execute():
    for d in data:
        if not frappe.db.exists("Funnel", d.get("name")):
            frappe.get_doc(d).insert(ignore_permissions=True)
        else:
            funnel_doc = frappe.get_doc("Funnel", d.get("name"))
            defination_jsons=d.get("funnel_definition")
            d.pop("funnel_definition")
            funnel_doc.update(d)
            funnel_doc.funnel_definition=[]
            for defination_json in defination_jsons:
                defination_json.pop("name")
                def_doc = frappe.new_doc("Funnel Definition")
                def_doc.update(defination_json)
                funnel_doc.funnel_definition.append(def_doc)
            funnel_doc.flags.ignore_version = True
            funnel_doc.save()
