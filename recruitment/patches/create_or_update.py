import json
from os import path

import frappe


def create_or_update(json_file_path):
    json_file = open(json_file_path, "r")
    json_data = json.load(json_file)
    json_file.close()

    doc_name = json_data["name"]
    doc_doctype = json_data["doctype"]
    del json_data["modified"]

    # check if already exists in database
    exists = frappe.db.exists(doc_doctype, doc_name)

    doc = (
        frappe.get_doc(doc_doctype, doc_name) if exists else frappe.new_doc(doc_doctype)
    )
    doc.update(json_data)
    doc.save()

