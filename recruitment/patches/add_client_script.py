import frappe
import json
from os import path

def execute():
    json_file_path = path.join(
        path.dirname(__file__), "json_files", "client_script.json"
    )

    with open(json_file_path, "r") as f:
        client_script_list = json.load(f)

    for data in client_script_list:
        name = data.get("name")
        if not frappe.db.exists("Client Script", name):
            doc = frappe.new_doc("Client Script")
            doc.update(data)
            doc.flags.ignore_version = True
            doc.insert(ignore_permissions=True)
        else:
            doc = frappe.get_doc("Client Script", name)
            doc.update(data)
            doc.flags.ignore_version = True
            doc.save(ignore_permissions=True)
