import frappe
import json
from os import path

def execute():
    json_file_path = path.join(
        path.dirname(__file__), "json_files", "interview_feedback_funnel.json"
    )

    with open(json_file_path, "r") as f:
        funnel_data_list = json.load(f)

    for data in funnel_data_list:
        name = data.get("name")
        definition_jsons = data.pop("funnel_definition", [])

        if not frappe.db.exists("Funnel", name):
            funnel_doc = frappe.new_doc("Funnel")
            funnel_doc.update(data)
        else:
            funnel_doc = frappe.get_doc("Funnel", name)
            funnel_doc.update(data)
            funnel_doc.funnel_definition = []

        for defn in definition_jsons:
            defn.pop("name", None)
            def_doc = frappe.new_doc("Funnel Definition")
            def_doc.update(defn)
            funnel_doc.funnel_definition.append(def_doc)

        funnel_doc.flags.ignore_version = True
        funnel_doc.save()
