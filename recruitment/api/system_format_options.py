"""System-level format options for the candidate portal / UI.

The frontend currently hardcodes the date format. These endpoints expose the
options and the live default straight from **System Settings** so the UI can be
driven by whatever the system is configured to use instead of a static string.

Both endpoints are ``allow_guest`` because the candidate portal (unauthenticated
applicants) needs to render dates in the configured format.
"""

import frappe


def _select_options(doctype, fieldname):
	"""Return the newline-separated ``options`` of a Select field as a clean list."""
	df = frappe.get_meta(doctype).get_field(fieldname)
	if not df or not df.options:
		return []
	return [opt.strip() for opt in df.options.split("\n") if opt.strip()]


@frappe.whitelist(allow_guest=True)
def get_date_format_options():
	"""Return the configurable date formats and the current system default.

	Response::

	    {
	        "default": "dd-mm-yyyy",          # System Settings.date_format
	        "options": ["yyyy-mm-dd", ...]    # allowed values, in defined order
	    }
	"""
	return {
		"default": frappe.db.get_single_value("System Settings", "date_format"),
		"options": _select_options("System Settings", "date_format"),
	}


@frappe.whitelist(allow_guest=True)
def get_time_format_options():
	"""Return the configurable time formats and the current system default.

	Same shape as :func:`get_date_format_options`, sourced from
	``System Settings.time_format``.
	"""
	return {
		"default": frappe.db.get_single_value("System Settings", "time_format"),
		"options": _select_options("System Settings", "time_format"),
	}
