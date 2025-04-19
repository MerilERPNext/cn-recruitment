import frappe
import os
import json

def execute():
    path = frappe.get_app_path('recruitment', 'patches', 'json_files', 'sub_status.json')
    if not os.path.exists(path):
        return

    with open(path, 'r') as f:
        data = json.load(f)

    for entry in data:
        if not frappe.db.exists("Sub Status", entry.get("name")):
            doc = frappe.get_doc(entry)
            doc.insert(ignore_permissions=True)

    frappe.db.commit()
