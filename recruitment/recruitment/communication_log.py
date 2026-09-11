"""Sent-email logging for recruitment mailers.

`frappe.sendmail` only writes an Email Queue row — it never creates a
Communication, so a mail sent through it is invisible on the document's timeline
and in the Communication report. `sendmail_with_log` sends exactly as before and
records the Communication afterwards.
"""

import frappe


def sendmail_with_log(**kwargs):
	"""`frappe.sendmail`, plus a Communication on the referenced document.

	Every argument is passed straight through, so this is a drop-in replacement.
	The Communication is written only when the mail carries a reference document
	(there is nothing to hang it off otherwise), and only after the send has
	returned — a logging failure must never look like a failed send.
	"""
	result = frappe.sendmail(**kwargs)
	log_communication(**kwargs)
	return result


def log_communication(
	reference_doctype=None,
	reference_name=None,
	doctype=None,
	name=None,
	recipients=None,
	subject=None,
	message=None,
	content=None,
	sender=None,
	cc=None,
	bcc=None,
	timeline_links=None,
	**_sendmail_kwargs,
):
	"""Record an already-sent email as a Communication. Best effort, never raises."""
	# `doctype`/`name` are frappe.sendmail's aliases for the reference fields.
	reference_doctype = reference_doctype or doctype
	reference_name = reference_name or name
	if not (reference_doctype and reference_name):
		return

	try:
		comm = frappe.new_doc("Communication")
		comm.communication_type = "Communication"
		comm.communication_medium = "Email"
		comm.sent_or_received = "Sent"
		comm.subject = subject
		comm.content = message or content
		comm.sender = sender or _default_sender()
		comm.recipients = _addresses(recipients)
		comm.cc = _addresses(cc)
		comm.bcc = _addresses(bcc)
		comm.reference_doctype = reference_doctype
		comm.reference_name = reference_name
		for link in timeline_links or []:
			comm.append("timeline_links", link)
		comm.insert(ignore_permissions=True)
		return comm.name
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Recruitment: Communication log failed")


def _addresses(value):
	"""sendmail takes a list or a string; Communication stores a comma-joined string."""
	if not value:
		return None
	if isinstance(value, str):
		return value
	return ", ".join(str(v) for v in value if v)


def _default_sender():
	return (
		frappe.db.get_value("Email Account", {"default_outgoing": 1}, "email_id")
		or frappe.session.user
	)
