import frappe

def jr_query(user):
    if not user:
        user = frappe.session.user
    roles = frappe.get_roles(user)
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")

    if frappe.session.user != "Administrator":
        if "System Manager" in roles or "Recruiter Admin" in roles or "HR User" in roles or "Management" in roles:
            return "1 = 1"
        elif "Job Recruiter" in roles:
            return f"`tabJob Requisition`.custom_assign_to_recruiter = {frappe.db.escape(user, percent=False)}"
        elif employee and "Hiring Manager" in roles:
            return f"`tabJob Requisition`.requested_by = {frappe.db.escape(employee, percent=False)} OR `tabJob Requisition`.owner = {frappe.db.escape(user, percent=False)}"
    return "1 = 1"
def ja_query(user):
    if not user:
        user = frappe.session.user
    roles = frappe.get_roles(user)
    if user != "Administrator":
        if "System Manager" in roles or "Recruiter Admin" in roles or "HR User" in roles or "Management" in roles:
            return "1 = 1"
        elif "Job Recruiter" in roles:
            return f"""
                (
                    `tabJob Applicant`.owner = {frappe.db.escape(user, percent=False)}
                    OR EXISTS (
                        SELECT 1 FROM `tabJob Opening` AS job_opening
                        WHERE job_opening.name = `tabJob Applicant`.job_title
                        AND job_opening.owner = {frappe.db.escape(user, percent=False)}
                    )
                )
            """

        elif "Hiring Manager" in roles:
            employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
            if employee:
                return f"""
                    `tabJob Applicant`.job_title IN (
                        SELECT job_opening.name
                        FROM `tabJob Opening` AS job_opening
                        WHERE job_opening.job_requisition IN (
                            SELECT req.name FROM `tabJob Requisition` AS req
                            WHERE req.requested_by = {frappe.db.escape(employee, percent=False)}
                            OR req.owner = {frappe.db.escape(user, percent=False)}
                        )
                    )
                """
    return "1 = 1"

def jo_query(user):
    if not user:
        user = frappe.session.user
    roles = frappe.get_roles(user)

    conditions = [f"`tabJob Opening`.owner = {frappe.db.escape(user)}"]

    if frappe.session.user != "Administrator":
        if any(role in roles for role in ["System Manager", "Recruiter Admin", "HR User", "Management"]):
            return "1 = 1"
        if "Job Recruiter" in roles:
            conditions.append(f"`tabJob Opening`.owner = {frappe.db.escape(user)}")
        if "Hiring Manager" in roles:
            employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
            if employee:
                conditions.append(f"""
                    `tabJob Opening`.job_requisition IN (
                        SELECT name 
                        FROM `tabJob Requisition` 
                        WHERE requested_by = {frappe.db.escape(employee)}
                        OR owner = {frappe.db.escape(user)}
                    )
                """)
        return " OR ".join(conditions)

    return "1 = 1"

def interview_query(user):
    if not user:
        user = frappe.session.user
    roles = frappe.get_roles(user)

    if user == "Administrator" or any(role in roles for role in ["HR User", "Recruiter Admin", "System Manager","Management"]):
        return "1=1"

    return f"""
        `tabInterview`.owner = {frappe.db.escape(user)}
        OR EXISTS (
            SELECT 1
            FROM `tabInterview Detail` AS id
            WHERE id.parent = `tabInterview`.name
              AND id.parenttype = 'Interview'
              AND id.interviewer = {frappe.db.escape(user)}
        )
    """
