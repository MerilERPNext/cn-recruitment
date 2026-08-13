"""Recruitment List Column Setting — the site-wide column layout for one of the
designed Recruitment list views.

One document per list doctype (``autoname: field:list_doctype``). The payload is
the JSON the "Configure Columns" dialog produces; it is shipped to the browser in
boot info (see ``recruitment.api.list_columns.extend_bootinfo``) so the list can
lay itself out on the first paint without an extra round trip.
"""

import json

import frappe
from frappe import _
from frappe.model.document import Document


class RecruitmentListColumnSetting(Document):
	def validate(self):
		self.columns = normalized_columns(self.columns)


def normalized_columns(raw) -> str:
	"""Validate the column payload and return it as canonical JSON text.

	Rejects anything that is not a list of ``{"key": ...}`` objects so a bad write
	can never break every recruiter's list view at boot.
	"""
	if not raw:
		return "[]"

	value = raw
	if isinstance(value, str):
		try:
			value = json.loads(value)
		except ValueError:
			frappe.throw(_("Columns must be valid JSON."))

	if not isinstance(value, list):
		frappe.throw(_("Columns must be a JSON array."))

	cleaned = []
	for entry in value:
		if not isinstance(entry, dict) or not entry.get("key"):
			frappe.throw(_("Every column needs a <code>key</code>."))
		cleaned.append(
			{
				"key": entry["key"],
				"hidden": 1 if entry.get("hidden") else 0,
				**({"align": entry["align"]} if entry.get("align") in ("center", "right") else {}),
				**({"width": entry["width"]} if entry.get("width") else {}),
				**({"label": entry["label"]} if entry.get("label") else {}),
			}
		)

	return json.dumps(cleaned)
