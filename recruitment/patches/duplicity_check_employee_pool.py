"""Move the employee-pool decision onto TA Duplicity Check Settings.

The specification puts every duplicity rule on one settings record and decides
the employee-pool ones at the Job Offer. That leaves three migrations, all
idempotent:

1. **Job Offer trigger fields.** ``custom_duplicity_exception_required`` is what
   an "Exceptional Approval" outcome stamps, and what a Flow Config document
   event keys on to run the Approval Policy Matrix. Without the field the offer
   module can only warn, so it is created here rather than left to a fixture.

2. **Carry the retired rehire configuration across.** A site that had ticked
   "Block applications from current employees" meant it, and must keep blocking
   after the switchover — silently dropping to Allow would let through exactly
   the offers it had configured against. Months become days (x30, the same
   conversion the old rule used internally).

3. **Preserve the override behaviour.** Overriding used to be hardcoded to
   Administrator / System Manager / HR Manager. The roles are now a list, so
   HR Manager is seeded onto every record that has overriding switched on;
   Administrator and System Manager remain implicit. Without this, an HR Manager
   who could override yesterday would silently stop being able to.

Also copies the rehire match fields onto the duplicity record when it has none —
the duplicity check fields are now the identity keys for both, so a site that had
configured only the rehire side would otherwise lose its match keys.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

MODULE = "Recruitment"
DUPLICITY = "TA Duplicity Check Settings"
REHIRE = "TA Rehire Check Settings"

BLOCK = "Block Job Offer"
ALLOW = "Allow Job Offer"

OVERRIDE_ROLE = "HR Manager"

CUSTOM_FIELDS = {
	"Job Offer": [
		{
			"fieldname": "custom_duplicity_exception_required",
			"fieldtype": "Check",
			"label": "Duplicity Exception Required",
			"insert_after": "status",
			"read_only": 1,
			"no_copy": 1,
			"allow_on_submit": 1,
			"description": (
				"Set by the duplicity check when this offer matches the employee pool "
				"and the configured outcome is Exceptional Approval. Point a Flow Config "
				"(Module Transaction = Job Offer, Trigger Type = Document Event, Doc Event "
				"Field = this field, Value = 1) at the Approval Policy Matrix that should "
				"approve it."
			),
			"module": MODULE,
		},
		{
			"fieldname": "custom_duplicity_exception_reason",
			"fieldtype": "Small Text",
			"label": "Duplicity Exception Reason",
			"insert_after": "custom_duplicity_exception_required",
			"read_only": 1,
			"no_copy": 1,
			"allow_on_submit": 1,
			"depends_on": "custom_duplicity_exception_required",
			"description": "Why this offer needs exceptional approval — shown to the approver.",
			"module": MODULE,
		},
	],
}


def execute():
	create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)

	if frappe.db.exists("DocType", DUPLICITY):
		_default_scope()
		_seed_override_roles()
		_carry_rehire_config()

	frappe.db.commit()
	for doctype in ("Job Offer", DUPLICITY, REHIRE):
		frappe.clear_cache(doctype=doctype)


def _default_scope():
	"""Existing records are company-scoped; the new field starts blank on them."""
	if not frappe.db.has_column("TA Duplicity Check Settings", "applicable_to_scope"):
		return
	frappe.db.sql(
		"""
		update `tabTA Duplicity Check Settings`
		set applicable_to_scope = 'Specific Companies'
		where coalesce(applicable_to_scope, '') = ''
		"""
	)


def _seed_override_roles():
	"""HR Manager was implicit before; make it explicit where overriding is on."""
	if not frappe.db.exists("Role", OVERRIDE_ROLE):
		return

	names = frappe.get_all(
		DUPLICITY,
		filters={"allow_override_by_admins_and_roles": 1},
		pluck="name",
	)
	for name in names:
		exists = frappe.db.exists(
			"Role Table",
			{
				"parent": name,
				"parenttype": DUPLICITY,
				"parentfield": "override_roles",
				"role": OVERRIDE_ROLE,
			},
		)
		if exists:
			continue
		doc = frappe.get_doc(DUPLICITY, name)
		doc.append("override_roles", {"role": OVERRIDE_ROLE})
		doc.save(ignore_permissions=True)


def _duplicity_for_company(company):
	"""The duplicity settings record covering *company* — company first, group next."""
	name = frappe.db.get_value(
		"TA Duplicity Check Company",
		{"company": company, "parenttype": DUPLICITY},
		"parent",
	)
	if name:
		return name
	return frappe.db.get_value(
		DUPLICITY, {"applicable_to_scope": "All Group Companies"}, "name"
	)


def _carry_rehire_config():
	"""Rehire enforcement -> the equivalent employee-pool outcome, per company."""
	if not frappe.db.exists("DocType", REHIRE):
		return

	meta = frappe.get_meta(REHIRE)
	legacy = ("block_active_employee", "block_do_not_rehire", "min_months_before_rehire")
	if not all(meta.has_field(f) for f in legacy):
		return

	rows = frappe.get_all(
		REHIRE,
		fields=["name"] + list(legacy),
	)

	for row in rows:
		# Nothing was enforced on this record — nothing to carry.
		if not (
			row.block_active_employee
			or row.block_do_not_rehire
			or (row.min_months_before_rehire or 0)
		):
			continue

		for company in frappe.get_all(
			"TA Rehire Check Company",
			filters={"parent": row.name, "parenttype": REHIRE},
			pluck="company",
		):
			target = _duplicity_for_company(company)
			if not target:
				continue
			_apply(target, row)


def _apply(target, legacy_row):
	"""Write the carried outcome, without overwriting a deliberate choice.

	Only a field still sitting at its Allow default is filled: if someone has
	already configured the new setting, that decision wins over the old one.
	"""
	doc = frappe.get_doc(DUPLICITY, target)
	changed = False

	if legacy_row.block_active_employee and doc.get("active_employee_non_ijp_action") in (
		None, "", ALLOW
	):
		doc.active_employee_non_ijp_action = BLOCK
		changed = True

	if legacy_row.block_do_not_rehire and doc.get("do_not_rehire_action") in (None, "", ALLOW):
		doc.do_not_rehire_action = BLOCK
		changed = True

	months = legacy_row.min_months_before_rehire or 0
	if months and not (doc.get("days_before_reapplication_post_exit") or 0):
		# x30 — the same month length the retired rule used to compare against.
		doc.days_before_reapplication_post_exit = int(months) * 30
		changed = True

	if not doc.get("select_duplicity_check_fields"):
		for field in frappe.get_all(
			"TA Rehire Check Field",
			filters={"parent": legacy_row.name, "parenttype": REHIRE},
			pluck="applicant_field",
		):
			if field:
				doc.append("select_duplicity_check_fields", {"applicant_field": field})
				changed = True

	if changed:
		doc.save(ignore_permissions=True)
