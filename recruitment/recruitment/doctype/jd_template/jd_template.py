# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class JDTemplate(Document):
	pass

@frappe.whitelist()
def get_matching_template(designation, department=None):
    """
    Find best matching JD Template for the given Designation and Department.
    Returns the Template Name and HTML Content.
    """
    filters = {"designation": designation}
    if department:
        filters["department"] = department
    
    # Try exact match first
    template = frappe.db.get_value("JD Template", filters, ["name", "template_html"], as_dict=True)
    
    # If no exact match, try matching just designation (if department was specific)
    if not template and department:
        del filters["department"]
        template = frappe.db.get_value("JD Template", filters, ["name", "template_html"], as_dict=True)
    
    if not template:
        return None

    return template

@frappe.whitelist()
def render_template(template_name, doc_data):
    """
    Render a JD Template using Jinja2 with the provided document data.
    """
    if isinstance(doc_data, str):
        import json
        doc_data = json.loads(doc_data)

    template = frappe.get_doc("JD Template", template_name)
    if not template:
        return ""
    
    template_html = template.template_html or ""
    
    # Use Frappe's standard rendering
    # We pass 'doc' as the context to match {{ doc.field }} usage
    try:
        rendered_html = frappe.render_template(template_html, {"doc": doc_data})
    except Exception as e:
        frappe.log_error(f"Error rendering JD Template: {str(e)}")
        # Fallback to returning raw template if render fails (e.g. invalid syntax)
        # Or maybe return a friendly message in the editor
        rendered_html = template_html
        
    return rendered_html
