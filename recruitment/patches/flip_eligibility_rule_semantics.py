"""Flip eligibility rules from "requirement" to "trigger" semantics.

A rule used to describe what the candidate had to SATISFY, and its action fired
when they did NOT ("Aggregate ≥ 60 → Knock out" meant "reject anyone below 60").
That reads backwards from the row on screen: an admin writing
"Driving licence = No → Hold" got exactly the opposite of what the row says —
the candidates who answered *Yes* were the ones put on hold.

The engine now fires a rule when it MATCHES, so the row means what it says. Rules
already stored were written under the old reading, so their operator is inverted
once here and they keep doing what their author intended:

    ≥ → <    ≤ → >    > → ≤    < → ≥
    = → ≠    ≠ → =    one of → not one of    contains → does not contain

Idempotent by construction: it runs once (patches.txt), and only over rows that
existed before it.
"""

import frappe

RULE_DOCTYPE = "Job Opening Eligibility Rule"

INVERSE = {
	"≥": "<",
	">=": "<",
	"≤": ">",
	"<=": ">",
	">": "≤",
	"<": "≥",
	"=": "≠",
	"==": "≠",
	"≠": "=",
	"!=": "=",
	"one of": "not one of",
	"not one of": "one of",
	"contains": "does not contain",
	"does not contain": "contains",
}


def execute():
	if not frappe.db.exists("DocType", RULE_DOCTYPE):
		return

	rows = frappe.get_all(RULE_DOCTYPE, fields=["name", "operator"])
	flipped = 0
	for row in rows:
		new_op = INVERSE.get((row.operator or "").strip())
		if not new_op:
			continue
		# update_modified=False: the rule's own meaning is unchanged, only the way
		# the engine reads it — no reason to touch the parent's timestamp.
		frappe.db.set_value(RULE_DOCTYPE, row.name, "operator", new_op, update_modified=False)
		flipped += 1

	frappe.db.commit()
	print(f"flip_eligibility_rule_semantics: inverted {flipped} of {len(rows)} rule(s)")
