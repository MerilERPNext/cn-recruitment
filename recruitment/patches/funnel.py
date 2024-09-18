import frappe
import datetime
from os import path
from recruitment.patches.create_or_update import create_or_update


def set_email_account():
    default_email_account = frappe.db.get_value(
        "Email Account", {"default_outgoing": 1}
    )
    for funnel_dict in data:
        funnel_definition = funnel_dict["funnel_definition"]
        for f_dict in funnel_definition:
            if "type" in f_dict:
                if f_dict["type"] == "send_mail":
                    node_data = frappe.parse_json(f_dict["data"])
                    node_data["email_account"] = default_email_account
                    f_dict["data"] = frappe.json.dumps(node_data)


def execute():
    funnel_json_files = [
        "job_opening.json",
        "interview.json",
        "job_offer.json",
        "employee_onboarding.json",
        "job_applicant.json",
        "job_applicant_public.json",
    ]
    for json_file in funnel_json_files:
        json_file_path = path.join(path.dirname(__file__), "json_files", json_file)
        create_or_update(json_file_path)
