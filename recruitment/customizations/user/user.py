import frappe

@frappe.whitelist()
def create_recruiter(user):
    roles = frappe.get_roles(user)
    if "Job Recruiter" in roles:
        if not frappe.db.exists("Recruiter", user):
            new_doc = frappe.get_doc({
                "doctype": "Recruiter",
                "email_id": user,
                "recruiter_name":frappe.db.get_value("User",user,"full_name"),
                "contact_no":frappe.db.get_value("User",user,"mobile_no")
            })
            new_doc.insert()
            frappe.db.commit() 
        