"""Name Institute records by the college's name instead of an INST-#### serial.

The serial said nothing. Every screen that shows an Institute link — the Job
Applicant list, campus invites, GD groups, filter URLs, the deadline message on
Campus Invite — printed `INST-1002`, and reading it meant looking the college up.
Worse, it made the list filters unusable by hand: filtering by institute meant
knowing the serial, because typing the college's name matched nothing.

`institute_name` is already `reqd` and `unique` on the doctype, which is exactly
what naming by a field requires, so the switch costs nothing in validation. The
doctype's `autoname` is now `field:institute_name`; this patch brings existing
records into line.

Renames go through `frappe.rename_doc`, so every Link pointing at an institute
(Job Applicant, Candidate Registration, Campus Invite Institute, Campus Drive
Institute, Campus Drive GD Group and its members, Employee Education) is
repointed by frappe itself rather than by hand.

Idempotent: a record already named after its college is skipped, so re-running
does nothing.
"""

import frappe

DOCTYPE = "Institute"


def execute():
	if frappe.db.get_value("DocType", DOCTYPE, "autoname") != "field:institute_name":
		# The doctype JSON has not synced yet (patch ordered before model sync on a
		# fresh bench). Renaming now would be undone by the next insert anyway.
		frappe.reload_doc("recruitment", "doctype", "institute")

	renamed, skipped, failed = 0, 0, []

	for name, institute_name in frappe.get_all(
		DOCTYPE, fields=["name", "institute_name"], as_list=True
	):
		target = (institute_name or "").strip()
		if not target or target == name:
			skipped += 1
			continue

		# frappe rejects only these two in a name; everything else a college is
		# called ("St. Xavier's", "A & B Institute, Pune") is fine as-is.
		if "<" in target or ">" in target:
			failed.append((name, "name contains < or >"))
			continue

		if frappe.db.exists(DOCTYPE, target):
			# `institute_name` is unique, so this means the record was already
			# renamed and a stale duplicate is sitting behind it — leave both alone
			# and let a human decide rather than merging records silently.
			failed.append((name, f"{target!r} already exists"))
			continue

		try:
			frappe.rename_doc(DOCTYPE, name, target, force=True, show_alert=False)
			renamed += 1
		except Exception as e:
			failed.append((name, str(e)))

	frappe.db.commit()
	frappe.clear_cache(doctype=DOCTYPE)

	frappe.logger("recruitment").info(
		"rename_institutes_by_name: renamed=%d skipped=%d failed=%d %s",
		renamed, skipped, len(failed), failed,
	)
	if failed:
		print(f"rename_institutes_by_name: {len(failed)} institute(s) left on their old id: {failed}")
