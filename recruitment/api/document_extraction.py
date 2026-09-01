import frappe
from frappe import _


def _extraction_api():
	"""Return chatnext_expense_trips' document-extraction API, or throw.

	This used to be a module-level ``from chatnext_expense_trips.document_extraction.api
	import ...``. ``chatnext_expense_trips`` is not installed on every bench (it is not
	in apps/ here, and nothing declares it as a dependency), so that import raised
	ModuleNotFoundError at import time -- which is far worse than it sounds: frappe
	imports app modules when resolving hooks and whitelisted methods, so one absent
	optional dependency made this whole module unimportable and showed up as a hard
	blocker in the v16 migration audit.

	Importing lazily keeps the module importable everywhere and moves the failure to
	the only place it matters: someone actually calling one of these endpoints.
	"""
	try:
		from chatnext_expense_trips.document_extraction import api
	except ImportError:
		frappe.throw(
			_("Document extraction is unavailable: the chatnext_expense_trips app is not installed on this site."),
			title=_("App Not Installed"),
		)

	return api


@frappe.whitelist()
def extract_recruitment_document_fields(file_url=None, text=None, profile="recruitment_device"):
	return _extraction_api().extract_document_fields(file_url=file_url, text=text, profile=profile)


@frappe.whitelist()
def extract_recruitment_document_fields_from_base64(
	file_name=None,
	content=None,
	profile="recruitment_device",
):
	return _extraction_api().extract_document_fields_from_base64(
		file_name=file_name,
		content=content,
		profile=profile,
	)
