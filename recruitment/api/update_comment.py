import frappe
from frappe import _
import json


@frappe.whitelist()
def update_comment(doctype=None, docname=None, docnames=None, fieldname=None, comment=None):
	if not all([doctype, fieldname, comment]):
		frappe.throw(_("'doctype', 'fieldname', and 'comment' are required."))

	if docnames:
		if isinstance(docnames, str):
			docnames = json.loads(docnames)
	elif docname:
		docnames = [docname]
	else:
		frappe.throw(_("Either 'docname' or 'docnames' is required."))

	results = []
	for dn in docnames:
		if not frappe.db.exists(doctype, dn):
			results.append({"docname": dn, "success": False, "error": f"{doctype} {dn} not found"})
			continue

		doc = frappe.get_doc(doctype, dn)
		meta_field = doc.meta.get_field(fieldname)
		if not meta_field:
			results.append({"docname": dn, "success": False, "error": f"Field '{fieldname}' not found in {doctype}"})
			continue

		existing = doc.get(fieldname) or ""
		if existing:
			doc.set(fieldname, existing + "\n" + comment)
		else:
			doc.set(fieldname, comment)

		doc.save(ignore_permissions=True)
		results.append({"docname": dn, "success": True})

	frappe.db.commit()
	return results
