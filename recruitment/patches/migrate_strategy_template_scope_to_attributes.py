"""Move TA Interview Strategy Template selection off assignment *conditions*.

Which hiring workflow a Job Opening gets used to be decided by walking the
``assignment_conditions`` of the Dynamic User Assignments in the template's
``applicable_to`` — the *population* axis of a DUA, re-implemented against an
in-memory Job Opening. Selection now runs on **attributes** instead, the same
primitive the Job Requisition scope and the Job Offer letter already use. See
:mod:`recruitment.recruitment.doctype.ta_interview_strategy_template`.

This patch carries existing configuration across so a site keeps prefilling the
same workflows it did before the change. For every non-Attributes assignment a
template points at, it creates **one** Attributes assignment holding the same
restriction and repoints the template's row at it:

* One new assignment per *source* assignment, not per template — several
  templates naming the same DUA keep sharing one rule, and assignments on a
  template still OR exactly as they did.
* The source assignment is never touched. It answers "who does this resolve to"
  for whatever else uses it, and flipping its purpose would break that.

What cannot be carried is **left alone and logged**, never half-converted:

* An operator attributes cannot express (``like``, ``between``, ``>`` …), or a
  field that is not a Link on Job Opening. Converting the rest of the assignment
  would drop a restriction and silently widen which openings it covers.
* Conditions that mix AND and OR joins across different fields — attributes have
  one match mode for the whole assignment.
* An assignment with no conditions at all. That matched every opening, which is
  what ``is_default`` on the template is for now; an administrator has to say
  which template is the default rather than have this patch pick one.

Idempotent: the created assignments are named deterministically, and a row that
already points at an Attributes assignment is skipped.
"""

import json

import frappe

from nextai.nextai.doctype.dynamic_user_assignment.attributes import (
	PURPOSE_ATTRIBUTES,
	PURPOSE_PEOPLE,
	resolve_value_doctype,
)

TEMPLATE_DOCTYPE = "TA Interview Strategy Template"
ASSIGNMENT_DOCTYPE = "Dynamic User Assignment"
ASSIGNMENT_CHILD = "Dynamic User Assignment Table"
ASSIGNMENT_FIELD = "applicable_to"
OPENING_DOCTYPE = "Job Opening"

MATCH_ALL = "All fields must match (AND)"
MATCH_ANY = "Any field may match (OR)"

# Operators whose meaning survives the move: attributes are set membership, so
# only equality and "one of" have an exact equivalent.
EQ_OPERATORS = {"=", "=="}
IN_OPERATORS = {"in"}

def _log():
	"""Lazily, so importing this module never touches request-local state."""
	return frappe.logger("recruitment")


def execute():
	if not frappe.db.table_exists(ASSIGNMENT_CHILD) or not frappe.db.table_exists(TEMPLATE_DOCTYPE):
		return

	rows = frappe.db.sql(
		f"""
		SELECT name, parent, dynamic_user_assignment
		FROM `tab{ASSIGNMENT_CHILD}`
		WHERE parenttype = %(parenttype)s
		  AND parentfield = %(parentfield)s
		  AND IFNULL(dynamic_user_assignment, '') != ''
		""",
		{"parenttype": TEMPLATE_DOCTYPE, "parentfield": ASSIGNMENT_FIELD},
		as_dict=True,
	)
	if not rows:
		return

	converted = {}
	for row in rows:
		source = row["dynamic_user_assignment"]
		if _purpose(source) == PURPOSE_ATTRIBUTES:
			continue  # already on the new axis

		if source not in converted:
			converted[source] = _convert(source)
		target = converted[source]
		if not target:
			continue

		frappe.db.set_value(
			ASSIGNMENT_CHILD, row["name"], "dynamic_user_assignment", target, update_modified=False
		)
		_log().info(
			f"Hiring workflow template '{row['parent']}': repointed assignment "
			f"'{source}' at attributes assignment '{target}'."
		)

	frappe.db.commit()


def _purpose(name):
	return frappe.db.get_value(ASSIGNMENT_DOCTYPE, name, "assignment_purpose") or PURPOSE_PEOPLE


# ── Conversion ────────────────────────────────────────────────────────────────


def _convert(source):
	"""The Attributes assignment mirroring ``source``'s conditions, or None."""
	name = f"Hiring Workflow - {source}"[:140]
	if frappe.db.exists(ASSIGNMENT_DOCTYPE, name):
		return name

	if not frappe.db.exists(ASSIGNMENT_DOCTYPE, source):
		_log().warning(f"Hiring workflow: assignment '{source}' no longer exists; left as is.")
		return None

	values, match = _as_attributes(source)
	if values is None:
		return None

	doc = frappe.new_doc(ASSIGNMENT_DOCTYPE)
	doc.assignment_name = name
	doc.assignment_code = name
	doc.assignment_purpose = PURPOSE_ATTRIBUTES
	doc.target_type = "Employee"
	doc.description = (
		"Created automatically from the assignment conditions that used to decide "
		f"which Job Openings the hiring workflow templates using '{source}' covered."
	)
	doc.append("applicable_for_process", {"document_type": OPENING_DOCTYPE})
	doc.attribute_match = match
	# The old conditions never cross-checked their values, so re-running the
	# hierarchy check now could reject configuration that is already live. Carry
	# it across as-is and let the administrator switch the check on.
	doc.validate_attribute_hierarchy = 0

	for fieldname, entries in values.items():
		for value in entries:
			doc.append(
				"assignment_attributes",
				{
					"scope_doctype": OPENING_DOCTYPE,
					"scope_field": fieldname,
					"attribute_value": value,
				},
			)

	doc.flags.ignore_permissions = True
	doc.insert(ignore_permissions=True)
	return doc.name


def _as_attributes(source):
	"""``({fieldname: [value, ...]}, match_mode)``, or ``(None, None)``.

	``None`` means the conditions have no faithful attribute equivalent — the
	caller leaves the assignment alone rather than carrying part of it.
	"""
	if not frappe.db.table_exists("Assignment Conditions"):
		return None, None

	conditions = frappe.db.sql(
		"""
		SELECT field_name, operator, value, join_type
		FROM `tabAssignment Conditions`
		WHERE parent = %(parent)s AND parenttype = %(parenttype)s
		  AND parentfield = 'assignment_conditions'
		ORDER BY idx ASC
		""",
		{"parent": source, "parenttype": ASSIGNMENT_DOCTYPE},
		as_dict=True,
	)
	conditions = [frappe._dict(c) for c in conditions if (c.get("field_name") or "").strip()]

	if not conditions:
		_log().warning(
			f"Hiring workflow: assignment '{source}' has no conditions, so it matched every "
			"Job Opening. Attributes have no equivalent — tick 'Default' on the template that "
			"should be the catch-all instead."
		)
		return None, None

	values = {}
	for cond in conditions:
		field = cond.field_name.strip()
		operator = (cond.operator or "").strip().lower()

		if not resolve_value_doctype(OPENING_DOCTYPE, field):
			_log().warning(
				f"Hiring workflow: assignment '{source}' restricts '{field}', which is not a Link "
				f"field on {OPENING_DOCTYPE}. Left as is — rebuild it as attributes by hand."
			)
			return None, None

		if operator in EQ_OPERATORS:
			entries = [str(cond.value or "").strip()]
		elif operator in IN_OPERATORS:
			entries = _to_list(cond.value)
		else:
			_log().warning(
				f"Hiring workflow: assignment '{source}' uses operator '{cond.operator}' on "
				f"'{field}', which attributes cannot express. Left as is — rebuild it by hand."
			)
			return None, None

		entries = [e for e in entries if e]
		if not entries:
			_log().warning(
				f"Hiring workflow: assignment '{source}' has an empty value for '{field}'. "
				"Left as is."
			)
			return None, None

		bucket = values.setdefault(field, [])
		for entry in entries:
			if entry not in bucket:
				bucket.append(entry)

	match = _match_mode(source, conditions, len(values))
	if match is None:
		return None, None
	return values, match


def _match_mode(source, conditions, field_count):
	"""AND / OR for the whole assignment, or None when the joins can't map.

	``join_type`` sits on each row and joins it to the *next* one, so the last
	row's value is meaningless. Attributes have a single mode per assignment:
	uniform joins map, a mix does not — unless every condition names the same
	field, where values OR natively and the joins never had anything to combine.
	"""
	joins = {(c.join_type or "AND").strip().upper() for c in conditions[:-1]}
	if field_count <= 1 or not joins or joins == {"AND"}:
		return MATCH_ALL
	if joins == {"OR"}:
		return MATCH_ANY

	_log().warning(
		f"Hiring workflow: assignment '{source}' mixes AND and OR across fields, which an "
		"attributes assignment cannot express. Left as is — rebuild it by hand."
	)
	return None


def _to_list(value):
	"""Parse an ``in`` condition's value the way the old matcher did."""
	v = value or ""
	if isinstance(v, str):
		v = v.strip()
		if v.startswith("["):
			try:
				return [str(x).strip() for x in json.loads(v)]
			except (ValueError, TypeError):
				pass
		return [x.strip() for x in v.split(",") if x.strip()]
	if isinstance(v, (list, tuple)):
		return [str(x).strip() for x in v]
	return [str(v).strip()]
