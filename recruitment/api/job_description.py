"""
Job Description API
===================

find_matching_job_description(designation, department)
    Returns the most recently modified Job Description whose
    `designation` table contains the given designation AND whose
    `department` table contains the given department. Used by the
    Job Requisition form to auto-populate the JD link, description,
    and skills when the user picks designation + department.

get_job_description_payload(name)
    Returns the description and skills of a Job Description as a
    flat payload, used by Job Requisition to hydrate its
    `description` and `custom_skills` fields once a JD is linked.
"""

import frappe
from frappe import _

JOB_DESCRIPTION = "Job Description"


@frappe.whitelist()
def find_matching_job_description(designation=None, department=None):
    """Return the best-matching Job Description for the given
    (designation, department) pair, or None.

    - Both fields are required; if either is missing, returns None.
    - A JD matches when its `designation` child table contains the
      designation AND its `department` child table contains the
      department.
    - When several JDs qualify, the most recently modified one wins.
    """
    if not designation or not department:
        return {"name": None, "description": None, "skills": []}

    rows = frappe.db.sql(
        """
        SELECT jd.name
        FROM `tabJob Description` jd
        JOIN `tabJD Designations` jdg
          ON jdg.parent = jd.name
         AND jdg.parenttype = 'Job Description'
         AND jdg.parentfield = 'designation'
        JOIN `tabJD Department` jdp
          ON jdp.parent = jd.name
         AND jdp.parenttype = 'Job Description'
         AND jdp.parentfield = 'department'
        WHERE jdg.designation = %s
          AND jdp.department = %s
        ORDER BY jd.modified DESC
        LIMIT 1
        """,
        (designation, department),
    )
    if not rows:
        return {"name": None, "description": None, "skills": []}

    return _serialise(rows[0][0])


@frappe.whitelist()
def get_job_description_payload(name):
    """Return description + skills for a given Job Description name."""
    if not name:
        return {"name": None, "description": None, "skills": []}
    if not frappe.db.exists(JOB_DESCRIPTION, name):
        frappe.throw(_("Job Description not found: {0}").format(name))
    return _serialise(name)


def _serialise(name):
    doc = frappe.get_doc(JOB_DESCRIPTION, name)
    doc.check_permission("read")
    return {
        "name": doc.name,
        "description": doc.get("description"),
        "skills": [row.get("skill") for row in doc.get("skills") or [] if row.get("skill")],
    }
