"""Server side of the configurable columns on the designed Recruitment lists.

The layout a user sees is resolved in the browser as
``user settings -> site default -> code default`` (see
``recruitment/public/js/list_column_engine.js``). This module owns the middle
layer: the site default, stored one document per list doctype in
``Recruitment List Column Setting`` and pushed into boot info so the first paint
of a list needs no extra request.

The personal layer needs nothing here — it rides on Frappe's own user settings.
"""

import json

import frappe
from frappe import _

from recruitment.recruitment.doctype.recruitment_list_column_setting.recruitment_list_column_setting import (
	normalized_columns,
)

SETTING_DOCTYPE = "Recruitment List Column Setting"


def extend_bootinfo(bootinfo):
	"""Ship every site-wide column layout, and whether this user may change them.

	Runs on every desk boot, so it stays cheap (one small table) and never raises:
	a broken row must not take the whole desk down with it.
	"""
	if frappe.session.user == "Guest":
		return

	bootinfo.recruitment_list_columns = {}
	bootinfo.can_manage_recruitment_list_columns = 0

	try:
		if not frappe.db.table_exists(SETTING_DOCTYPE):
			return
		# get_all, not get_list: the site default has to reach every recruiter,
		# including roles with no read access to the setting doctype itself.
		rows = frappe.get_all(
			SETTING_DOCTYPE, fields=["list_doctype", "columns"], limit_page_length=0
		)
		bootinfo.can_manage_recruitment_list_columns = int(
			bool(frappe.has_permission(SETTING_DOCTYPE, "write"))
		)
	except Exception:
		frappe.clear_last_message()
		return

	for row in rows:
		try:
			parsed = json.loads(row.columns or "[]")
		except ValueError:
			continue
		if isinstance(parsed, list) and parsed:
			bootinfo.recruitment_list_columns[row.list_doctype] = parsed


@frappe.whitelist()
def get_column_config(list_doctype: str):
	"""The site-wide layout for one list, as a plain list of column entries."""
	frappe.has_permission(list_doctype, "read", throw=True)
	raw = frappe.db.get_value(SETTING_DOCTYPE, list_doctype, "columns")
	if not raw:
		return []
	try:
		parsed = json.loads(raw)
	except ValueError:
		return []
	return parsed if isinstance(parsed, list) else []


@frappe.whitelist()
def save_column_config(list_doctype: str, columns):
	"""Write the site-wide layout for ``list_doctype``.

	Requires write access on the setting doctype — this changes what every user
	sees, so it is not something an ordinary recruiter can do from the dialog.
	"""
	frappe.has_permission(SETTING_DOCTYPE, "write", throw=True)
	if not frappe.db.exists("DocType", list_doctype):
		frappe.throw(_("Unknown DocType {0}").format(list_doctype))

	payload = normalized_columns(columns)

	if frappe.db.exists(SETTING_DOCTYPE, list_doctype):
		doc = frappe.get_doc(SETTING_DOCTYPE, list_doctype)
		doc.columns = payload
	else:
		doc = frappe.get_doc(
			{"doctype": SETTING_DOCTYPE, "list_doctype": list_doctype, "columns": payload}
		)
	doc.save(ignore_permissions=False)
	return json.loads(doc.columns)


@frappe.whitelist()
def reset_column_config(list_doctype: str):
	"""Drop the site-wide layout so the list falls back to its designed columns."""
	frappe.has_permission(SETTING_DOCTYPE, "delete", throw=True)
	if frappe.db.exists(SETTING_DOCTYPE, list_doctype):
		frappe.delete_doc(SETTING_DOCTYPE, list_doctype, ignore_missing=True)
	return []
