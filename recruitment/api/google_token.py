import frappe

@frappe.whitelist()
def save_user_google_token(user, access_token, refresh_token, token_expiry, google_email):
    doc = frappe.get_doc({
        "doctype": "Google Token",
        "user": user,
        "google_email": google_email,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_expiry": token_expiry,
        "is_active": 1
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"message": f"Token saved for user {user}"}
