import frappe
# recruitment.api.custom_pipeline_block.get_pipeline_data
@frappe.whitelist()
def get_pipeline_data():
    # Was allow_guest — leaked company-wide pipeline counts to anyone. Now
    # requires login + Job Opening read (the desk block caller already has it).
    frappe.has_permission("Job Opening", "read", throw=True)
    try:
        filters = {}
        job_openings = frappe.get_all("Job Opening", filters=filters, fields=["name", "job_title", "department"])
        if not job_openings:
            return {
                "status": "success",
                "message": "No job openings found.",
                "result": []
            }

        pipeline_data = []
        for opening in job_openings:
            applicants = frappe.get_all("Job Applicant", filters={"job_title": opening.name}, fields=["status"])
            status_counts = {
                "open": 0,
                "screening": 0,
                "Replied": 0,
                "interview": 0,
                "Hold": 0,
                "Approvals": 0,
                "accepted": 0,
                "rejected": 0,
            }
            for app in applicants:
                status = (app.status or "").lower().replace(" ", "_")
                if status in status_counts:
                    status_counts[status] += 1
                else:
                    status_counts["others"] += 1

            pipeline_data.append({
                "posting_title": opening.job_title,
                "department": opening.department,
                "total_candidates": len(applicants),
                **status_counts
            })

        return {
            "status": "success",
            "message": "OK",
            "result": pipeline_data
        }

    except frappe.DoesNotExistError as e:
        return {
            "status": "error",
            "message": f"Missing document: {str(e)}",
            "result": None
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}",
            "result": None
        }

import frappe

@frappe.whitelist()
def get_applicants_for_job(job_id):
    """
    Fetch all Job Applicant records related to the specified job opening.

    Args:
        job_id (str): The name/ID of the Job Opening

    Returns:
        list: List of Job Applicant records with relevant fields
    """
    # Returns applicant name/email/phone — require Job Applicant read.
    frappe.has_permission("Job Applicant", "read", throw=True)
    return frappe.get_all(
        "Job Applicant",
        filters={"job_title": job_id},
        fields=[
            "name", "applicant_name", "email_id",
            "phone_number", "status", "custom_expected_doj",
            "creation"
        ],
        order_by="creation desc",
        limit_page_length=100
    )
