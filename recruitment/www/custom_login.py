
import frappe
from frappe.model.document import Document


STANDARD_ROLES = ("")

class Role(Document):
     def disable_role(self):
         if self.name in STANDARD_ROLES:
             frappe.throw(frappe._("Standard roles cannot be disabled"))
         else:
             self.remove_roles()



def role_based_home_page():
     frappe.clear_cache()

     user = frappe.session.user
     roles = frappe.get_roles(user)

     role_home_pages = {
         "System User": "/app/recruitment",
     }

     for role in roles:
         if role in role_home_pages:
             print("\n\n\n homepageee",role_home_pages[role])
             return role_home_pages[role]

     return "/app"