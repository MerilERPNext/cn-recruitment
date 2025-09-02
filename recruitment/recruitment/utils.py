import frappe

# add check _app_permission
def check_app_permission():
    # allow if user has Employee Self Service Role
    user_roles = frappe.get_roles()
    if "Employee Self Service" in user_roles:
        return True
    return False