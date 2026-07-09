import frappe
from frappe import _
from frappe.utils import get_link_to_form, getdate


def create_leave_policy_assignment(doc, method=None):
	"""GAP-34: auto-create + submit a Leave Policy Assignment on hire.

	On Employee creation, give the new hire their leave entitlement automatically
	instead of HR hand-assigning it. The Leave Policy is resolved from the
	employee's Grade (e.g. ``School`` / ``HO`` -> the grade's Default Leave
	Policy); the assignment runs from the joining date to the end of the covering
	leave period so it lines up with the yearly leave cycle.

	walnut runs a custom accrual engine (``cn_leave_shift_managment``), which
	overrides the Leave Policy Assignment grant: submitting the assignment creates
	an earned-leave Leave Allocation that then accrues monthly/quarterly. That
	grant does not ``db.commit`` mid-flow, so submitting here is transaction-safe
	and we submit inline (Design: DOJ-anchored, inline submit).

	Best-effort and non-blocking: a savepoint + try/except guarantees a failure
	can never block the employee's creation. Idempotent -- skips if the employee
	is already covered by an overlapping assignment, if the grade has no mapped
	policy, or if the joining date falls outside any usable leave window.
	"""
	grade = doc.get("grade")
	joining = doc.get("date_of_joining")
	if not grade or not joining:
		# Grade maps the policy; date_of_joining anchors the dates. Need both.
		return

	policy = _resolve_leave_policy(grade)
	if not policy:
		# Grade not yet mapped to a Leave Policy -> leave it to the manual flow.
		return

	doj = getdate(joining)
	leave_period, effective_to = _resolve_leave_window(doc.company, doj)
	if not effective_to or effective_to <= doj:
		# Leave year already ended / degenerate window -> nothing sensible to assign.
		return

	if _already_covered(doc.name, doj, effective_to):
		return

	savepoint = "gap34_auto_lpa"
	frappe.db.savepoint(savepoint)
	try:
		lpa_name = _create_and_submit_lpa(doc, policy, doj, effective_to)
	except Exception:
		frappe.db.rollback(save_point=savepoint)
		frappe.log_error(
			title="Auto Leave Policy Assignment Failed",
			message=frappe.get_traceback(),
		)
		return

	frappe.msgprint(
		_(
			"Leave Policy Assignment {0} was created and submitted from the "
			"employee's grade ({1}). Leaves accrue automatically over the year."
		).format(get_link_to_form("Leave Policy Assignment", lpa_name), grade),
		title=_("Leave Policy Assignment - done"),
		indicator="green",
	)


def _resolve_leave_policy(grade):
	"""The Leave Policy configured as the grade's default, if any."""
	return frappe.db.get_value("Employee Grade", grade, "custom_default_leave_policy") or None


def _resolve_leave_window(company, doj):
	"""``(leave_period, effective_to)`` for the assignment.

	Prefer the company's Leave Period that covers the joining date -- the
	assignment then ends exactly when that leave year ends (typically 31-May),
	lining up with the annual roll and avoiding an overlap with next year's
	assignment. If no period covers the DOJ (the D4 fallback), end at the close
	of the June->May leave year that contains it.
	"""
	covering = frappe.get_all(
		"Leave Period",
		filters={
			"company": company,
			"from_date": ["<=", doj],
			"to_date": [">=", doj],
		},
		fields=["name", "to_date"],
		order_by="to_date desc",
		limit=1,
	)
	if covering:
		return covering[0].name, getdate(covering[0].to_date)
	return None, _leave_year_end(doj)


def _leave_year_end(doj):
	"""End (31-May) of the June->May leave year containing ``doj``."""
	end_year = doj.year + 1 if doj.month >= 6 else doj.year
	return getdate(f"{end_year}-05-31")


def _already_covered(employee, doj, effective_to):
	"""True if a non-cancelled assignment already overlaps this window."""
	rows = frappe.get_all(
		"Leave Policy Assignment",
		filters={
			"employee": employee,
			"docstatus": ["<", 2],
			"effective_from": ["<=", effective_to],
			"effective_to": [">=", doj],
		},
		limit=1,
	)
	return bool(rows)


def _create_and_submit_lpa(doc, policy, doj, effective_to):
	"""Build, insert and submit the assignment; return its name.

	Uses explicit (blank-basis) dates so ``effective_from`` stays the joining
	date. The walnut policy allocates on ``No Conditions`` (no join-date
	proration), so anchoring to the DOJ -- rather than the leave-period start --
	avoids granting leave for months before the hire started. Submitting triggers
	cn's overridden grant, which creates the accruing Leave Allocation.
	"""
	lpa = frappe.new_doc("Leave Policy Assignment")
	lpa.employee = doc.name
	lpa.company = doc.company
	lpa.leave_policy = policy
	lpa.assignment_based_on = ""
	lpa.effective_from = doj
	lpa.effective_to = effective_to
	lpa.insert(ignore_permissions=True)
	lpa.submit()
	return lpa.name
