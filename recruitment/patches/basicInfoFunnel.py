import frappe
import json
from os import path

def execute():
    insert_funnel()
    insert_email_template()

def insert_funnel():
    funnel_path = path.join(
        path.dirname(__file__), "json_files", "basicInfoFunnel.json"
    )

    with open(funnel_path, "r") as f:
        funnel_data_list = json.load(f)

    for data in funnel_data_list:
        name = data.get("name")
        definition_jsons = data.pop("funnel_definition", [])

        if not frappe.db.exists("Funnel", name):
            funnel_doc = frappe.new_doc("Funnel")
        else:
            funnel_doc = frappe.get_doc("Funnel", name)
            funnel_doc.funnel_definition = []

        funnel_doc.update(data)

        for defn in definition_jsons:
            defn.pop("name", None)
            def_doc = frappe.new_doc("Funnel Definition")
            def_doc.update(defn)
            funnel_doc.funnel_definition.append(def_doc)

        funnel_doc.flags.ignore_version = True
        funnel_doc.save()


def insert_email_template():
    email_path = path.join(
        path.dirname(__file__), "json_files", "basicinfoemail.json"
    )

    with open(email_path, "r") as f:
        email_template_data = json.load(f)

    for data in email_template_data:
        name = data.get("name")

        if not frappe.db.exists("Email Template", name):
            doc = frappe.new_doc("Email Template")
        else:
            doc = frappe.get_doc("Email Template", name)

        doc.update(data)
        doc.flags.ignore_version = True
        doc.save()
