"""PAN on the Job Applicant — normalised on the way in, so it can be matched on.

PAN is the one identifier that survives a person changing their phone number,
their email and their surname, which is exactly what makes it the reliable key
for asking "have we employed this person before?". It is only reliable if every
record stores it the same way, so this normalises before anything is written:
a PAN typed as "abcde1234f", " ABCDE1234F " and "abcde 1234 f" must all end up
as the same ten characters, or the match silently misses.

Format is validated rather than trusted. A malformed PAN would not match
anything, and a candidate who mistyped theirs would sail through a rehire check
that should have stopped them — a silent false pass is worse than an error at
the point of typing.
"""

import re

import frappe
from frappe import _

PAN_FIELD = "custom_pan_number"

# Five letters, four digits, one letter. The fourth letter encodes holder type
# and the fifth is the surname initial, but neither is worth enforcing here —
# they change with the issuing rules and would reject valid cards.
PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def normalize_pan(doc, method=None):
	"""Job Applicant ``validate`` — uppercase, strip, then check the shape.

	Blank is left blank: PAN is not mandatory to apply, and a candidate who has
	not supplied one yet must still be able to save their application.
	"""
	if not doc.meta.has_field(PAN_FIELD):
		return

	raw = doc.get(PAN_FIELD)
	if not raw:
		return

	cleaned = re.sub(r"\s+", "", str(raw)).upper()
	doc.set(PAN_FIELD, cleaned)

	if not PAN_PATTERN.match(cleaned):
		frappe.throw(
			_("{0} is not a valid PAN. A PAN is ten characters — five letters, four digits, then one letter (for example ABCDE1234F).").format(
				frappe.bold(cleaned)
			),
			title=_("Check the PAN"),
		)
