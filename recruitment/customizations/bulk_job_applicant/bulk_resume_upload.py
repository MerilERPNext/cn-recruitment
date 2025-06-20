import frappe
import json
import re
import os
import zipfile
import tempfile
from frappe.utils.background_jobs import enqueue
from recruitment.customizations.bulk_job_applicant.resume_parser import parse_resume

@frappe.whitelist()
def enqueue_bulk_resume_upload(files):
    if isinstance(files, str):
        files = json.loads(files)

    enqueue("recruitment.customizations.bulk_job_applicant.bulk_resume_upload.process_bulk_resume_upload", queue='long', files=files)
    return "Enqueued"

def process_bulk_resume_upload(files):
    created = []

    for f_url in files:
        try:
            file_doc = frappe.get_doc("File", {"file_url": f_url})
            file_url = file_doc.file_url.lstrip('/')
            if file_url.startswith("private/files/"):
                file_path = frappe.get_site_path(file_url)
            else:
                file_path = frappe.get_site_path("public", file_url.replace("files/", ""))

            if file_path.lower().endswith(".zip"):
                created += process_zip_file(file_path)
            else:
                result = process_single_file(file_path, file_doc.file_url)
                if result:
                    created.append(result)

        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Resume Processing Failed: {f_url}")
            continue

    return created

def process_zip_file(zip_path):
    created = []
    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(tmpdir)

        for root, dirs, files in os.walk(tmpdir):
            for filename in files:
                full_path = os.path.join(root, filename)
                if not filename.lower().endswith(('.pdf', '.docx', '.txt', '.doc')):
                    continue
                try:
                    result = process_single_file(full_path, None)
                    if result:
                        created.append(result)
                except Exception:
                    frappe.log_error(frappe.get_traceback(), f"ZIP file parse failed: {filename}")
                    continue
    return created

def process_single_file(file_path, file_url=None):
    parsed = parse_resume(file_path)

    for key, value in parsed.items():
        if isinstance(value, str):
            parsed[key] = re.sub(r'^\s*(name|email|mobile|phone|contact)?\s*[:\-–=]\s*', '', value, flags=re.IGNORECASE).strip()

    email = parsed.get("email", "").strip().lower()
    # if not email or frappe.db.exists("Job Applicant", {"email_id": email}):
    #     return None

    applicant = frappe.get_doc({
        "doctype": "Job Applicant",
        "applicant_name": parsed.get("name") or email,
        "email_id": email,
        "phone_number": parsed.get("mobile"),
        "resume_attachment": file_url or ""
    })
    applicant.flags.ignore_mandatory = True
    applicant.insert(ignore_permissions=True)

    return applicant.name


@frappe.whitelist()
def process_bulk_resume_upload_immediate(files):
    frappe.log_error("Start: process_bulk_resume_upload_immediate", str(files))

    if isinstance(files, str):
        files = json.loads(files)
        frappe.log_error("Parsed JSON files", str(files))

    created = []

    for f_url in files:
        try:
            frappe.log_error("Processing file URL", f_url)

            file_doc = frappe.get_doc("File", {"file_url": f_url})
            frappe.log_error("Fetched file_doc", str(file_doc.name))

            file_url = file_doc.file_url.lstrip('/')
            frappe.log_error("Stripped file_url", file_url)

            if file_url.startswith("private/files/"):
                file_path = frappe.get_site_path(file_url)
            else:
                file_path = frappe.get_site_path("public", file_url.replace("files/", ""))
            frappe.log_error("Resolved file_path", file_path)

            if file_path.lower().endswith(".zip"):
                frappe.log_error("ZIP file detected", file_path)
                zip_created = process_zip_file(file_path)
                frappe.log_error("ZIP processing result", str(zip_created))
                created += zip_created
            else:
                frappe.log_error("Single file detected", file_path)
                result = process_single_file(file_path, file_doc.file_url)
                frappe.log_error("Single file result", str(result))
                if result:
                    created.append(result)

        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Resume Processing Failed: {f_url}")
            continue

    frappe.log_error("Final Created List", str(created))
    return created
