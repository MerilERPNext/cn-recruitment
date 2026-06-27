"""
Referral Reward engine.

Clean, self-contained add-on that turns a "Referral Policy Configuration" into an
actual reward for the referrer when a referred candidate is hired.

Flow (reuses existing recruitment chain, creates nothing it does not own):

    Employee Referral --> Job Applicant (employee_referral) --> ... --> Employee (job_applicant + DOJ)
        on Employee after_insert  -> generate_referral_reward_on_employee()
            -> resolve_referral_reward()  (match active policy + role-limit row + eligibility)
            -> creates a "Referral Reward" doc with dated "Referral Reward Schedule" rows
        daily scheduler -> process_due_referral_payouts()
            -> for each due, eligible installment: create + submit an Additional Salary
            -> mark the installment Paid, roll up status, sync Employee Referral.referral_payment_status

Every public hook is defensively wrapped: a failure here must never block Employee
creation, payroll, or any existing recruitment flow.
"""

import frappe
from frappe import _
from frappe.utils import add_days, flt, getdate, nowdate

REWARD_DOCTYPE = "Referral Reward"
SALARY_COMPONENT = "Referral Bonus"


# ---------------------------------------------------------------------------
# Dynamic User Assignment matching (reuse nextai, no re-implementation)
# ---------------------------------------------------------------------------

def _match_dua(dua_name, employee):
	"""True if `employee` (Employee name) satisfies the given Dynamic User Assignment."""
	if not dua_name or not employee:
		return False
	try:
		from nextai.nextai.doctype.dynamic_user_assignment.dynamic_user_assignment import (
			check_employee_matches_conditions,
		)

		return bool(check_employee_matches_conditions(dua_name, employee))
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Referral Reward: DUA match failed")
		return False


# ---------------------------------------------------------------------------
# Context: stitch the referral -> applicant -> employee chain together
# ---------------------------------------------------------------------------

def _build_context(employee_referral, employee=None):
	"""Collect every fact the resolver needs. Tolerant of an un-hired referee."""
	er = frappe.get_doc("Employee Referral", employee_referral)

	# Locate the linked Job Applicant (referral -> applicant).
	job_applicant = frappe.db.get_value(
		"Job Applicant", {"employee_referral": er.name}, "name"
	)
	job_opening = None
	application_date = None
	if job_applicant:
		job_opening, ja_creation = frappe.db.get_value(
			"Job Applicant", job_applicant, ["job_title", "creation"]
		)
		application_date = getdate(ja_creation) if ja_creation else None

	# Locate the referee Employee (applicant -> employee), if hired.
	if not employee and job_applicant:
		employee = frappe.db.get_value("Employee", {"job_applicant": job_applicant}, "name")

	referee_gender = None
	date_of_joining = None
	if employee:
		referee_gender, date_of_joining = frappe.db.get_value(
			"Employee", employee, ["gender", "date_of_joining"]
		)

	return frappe._dict(
		employee_referral=er.name,
		referrer=er.referrer,
		referral_date=getdate(er.date) if er.date else None,
		job_applicant=job_applicant,
		job_opening=job_opening,
		application_date=application_date,
		referee_employee=employee,
		referee_gender=referee_gender,
		date_of_joining=getdate(date_of_joining) if date_of_joining else None,
	)


def _policy_reference_date(policy, ctx):
	if policy.date_of_reference == "Date of Referral":
		return ctx.referral_date
	if policy.date_of_reference == "Date of Joining":
		return ctx.date_of_joining
	# Default / "Date of Application"
	return ctx.application_date


def _in_effective_window(policy, ref_date):
	"""A policy with no resolvable reference date is treated as in-window (preview-friendly)."""
	if not ref_date:
		return True
	if policy.effective_from and getdate(ref_date) < getdate(policy.effective_from):
		return False
	if policy.effective_to and getdate(ref_date) > getdate(policy.effective_to):
		return False
	return True


def _policy_in_scope(policy, ctx):
	if policy.assign_referral_policy_by == "Job Opening":
		openings = [r.job_opening for r in policy.applicable_to_job_openings]
		return bool(ctx.job_opening) and ctx.job_opening in openings

	# User Assignment scope -> referrer must fall into one of the listed DUAs.
	for row in policy.applicable_to_user_assignments:
		if _match_dua(row.user_assignment, ctx.referrer):
			return True
	return False


def _match_role_row(policy, ctx):
	"""Return the first Role Limit row matching referrer/referee/gender, else None.

	Referee-side matching is only enforced once the referee is an Employee; before
	hire we match on referrer + gender so a preview can still be shown.
	"""
	for row in policy.role_specific_limits:
		if not _match_dua(row.referrer_user_assignment, ctx.referrer):
			continue

		if ctx.referee_employee:
			if not _match_dua(row.referee_user_assignment, ctx.referee_employee):
				continue
			if row.referee_gender and ctx.referee_gender and row.referee_gender != ctx.referee_gender:
				continue
		# Pre-hire preview: skip referee DUA, but still respect gender if known.
		elif row.referee_gender and ctx.referee_gender and row.referee_gender != ctx.referee_gender:
			continue

		return row
	return None


# ---------------------------------------------------------------------------
# Eligibility restrictions
# ---------------------------------------------------------------------------

def _is_on_notice(employee):
	if not employee:
		return False
	status, relieving = frappe.db.get_value("Employee", employee, ["status", "relieving_date"])
	if status and status != "Active":
		return True
	return bool(relieving)


def _is_alumni(employee):
	"""Referee already exists as a former (Left) employee -> boomerang re-hire."""
	if not employee:
		return False
	personal, prefered = frappe.db.get_value(
		"Employee", employee, ["personal_email", "prefered_email"]
	)
	for email in (personal, prefered):
		if email and frappe.db.exists(
			"Employee", {"name": ["!=", employee], "status": "Left", "personal_email": email}
		):
			return True
	return False


def _has_direct_reports(employee):
	return bool(frappe.db.exists("Employee", {"reports_to": employee, "status": "Active"}))


def _is_l2_or_above(employee):
	reports = frappe.get_all(
		"Employee", {"reports_to": employee, "status": "Active"}, pluck="name"
	)
	return any(_has_direct_reports(r) for r in reports)


def _is_interviewer(referrer, job_applicant):
	if not referrer or not job_applicant:
		return False
	user = frappe.db.get_value("Employee", referrer, "user_id")
	if not user:
		return False
	interviews = frappe.get_all("Interview", {"job_applicant": job_applicant}, pluck="name")
	if not interviews:
		return False
	return bool(
		frappe.db.exists(
			"Interview Detail", {"parent": ["in", interviews], "interviewer": user}
		)
	)


def _eligibility(policy, ctx):
	"""Return (is_eligible, [reasons]). Each 'allow_*' check blocks when unchecked."""
	reasons = []

	if not policy.allow_reward_payout_if_referrer_is_on_notice and _is_on_notice(ctx.referrer):
		reasons.append(_("Referrer is on notice / not active."))

	if not policy.allow_reward_payout_if_referee_is_on_notice and _is_on_notice(ctx.referee_employee):
		reasons.append(_("Referee is on notice / not active."))

	if not policy.allow_reward_payout_if_referee_is_alumni and _is_alumni(ctx.referee_employee):
		reasons.append(_("Referee is an alumni (re-hire)."))

	if not policy.allow_reward_payout_if_referrer_is_l1_manager and _has_direct_reports(ctx.referrer):
		reasons.append(_("Referrer is an L1 manager."))

	if (
		not policy.allow_reward_payout_if_referrer_is_l2_l3_or_above_manager
		and _is_l2_or_above(ctx.referrer)
	):
		reasons.append(_("Referrer is an L2/L3 (or above) manager."))

	if (
		not policy.allow_reward_payout_if_referrer_is_interviewer
		and _is_interviewer(ctx.referrer, ctx.job_applicant)
	):
		reasons.append(_("Referrer was an interviewer for this candidate."))

	return (len(reasons) == 0), reasons


# ---------------------------------------------------------------------------
# Schedule building
# ---------------------------------------------------------------------------

def _build_schedules(row, doj):
	stages = [
		(1, row.payout_schedule_1_days_from_doj, row.payout_schedule_1_amount),
	]
	if row.multiple_payout_dates == "Yes":
		stages.append((2, row.payout_schedule_2_days_from_doj, row.payout_schedule_2_amount))
		stages.append((3, row.payout_schedule_3_days_from_doj, row.payout_schedule_3_amount))

	schedules = []
	for no, days, amount in stages:
		has_days = days is not None and days != ""
		if not has_days or not amount:
			continue
		due = add_days(getdate(doj), int(days)) if doj else None
		schedules.append(
			{
				"schedule_no": no,
				"days_from_doj": int(days),
				"amount": flt(amount),
				"due_date": due,
				"status": "Pending",
			}
		)
	return schedules


# ---------------------------------------------------------------------------
# Resolver (single source of truth for both preview and generation)
# ---------------------------------------------------------------------------

def resolve_referral_reward(employee_referral, employee=None):
	"""Match the best policy + role row and return a serialisable result dict.

	Never raises for "no match" — returns matched=False instead.
	"""
	ctx = _build_context(employee_referral, employee)

	if not ctx.referrer:
		return {"matched": False, "message": _("Referral has no referrer set."), "context": ctx}

	matches = []  # (policy_doc, role_row, ref_date)
	for name in frappe.get_all("Referral Policy Configuration", pluck="name"):
		policy = frappe.get_doc("Referral Policy Configuration", name)
		ref_date = _policy_reference_date(policy, ctx)

		if not _in_effective_window(policy, ref_date):
			continue
		if not _policy_in_scope(policy, ctx):
			continue

		row = _match_role_row(policy, ctx)
		if not row:
			continue

		matches.append((policy, row, ref_date))

	if not matches:
		return {
			"matched": False,
			"message": _("No applicable referral policy found for this referral."),
			"context": ctx,
		}

	# Most specific tie-break: latest effective_from wins.
	matches.sort(key=lambda m: getdate(m[0].effective_from or "1900-01-01"), reverse=True)
	policy, row, ref_date = matches[0]

	is_eligible, reasons = _eligibility(policy, ctx)
	schedules = _build_schedules(row, ctx.date_of_joining)

	return {
		"matched": True,
		"context": ctx,
		"policy": policy.name,
		"reference_date": ref_date,
		"payout_currency": row.payout_currency,
		"is_eligible": is_eligible,
		"eligibility_reason": "\n".join(reasons),
		"schedules": schedules,
		"total_amount": sum(s["amount"] for s in schedules),
		"message": _("Matched policy {0}.").format(policy.name),
	}


# ---------------------------------------------------------------------------
# Reward document creation
# ---------------------------------------------------------------------------

def _create_reward_doc(result):
	ctx = result["context"]
	reward = frappe.new_doc(REWARD_DOCTYPE)
	reward.employee_referral = ctx.employee_referral
	reward.referral_policy = result["policy"]
	reward.referrer = ctx.referrer
	reward.referee_employee = ctx.referee_employee
	reward.job_applicant = ctx.job_applicant
	reward.job_opening = ctx.job_opening
	reward.referee_gender = ctx.referee_gender
	reward.date_of_joining = ctx.date_of_joining
	reward.reference_date = result["reference_date"]
	reward.payout_currency = result["payout_currency"]
	reward.is_eligible = 1 if result["is_eligible"] else 0
	reward.eligibility_reason = result["eligibility_reason"]

	for s in result["schedules"]:
		row = reward.append("schedules", s)
		if not result["is_eligible"]:
			row.status = "Blocked"
			row.remarks = _("Blocked by policy eligibility rules.")

	reward.insert(ignore_permissions=True)

	# Mark blocked AFTER insert so validate()'s roll-up does not flip it back.
	if not result["is_eligible"]:
		reward.db_set("status", "Blocked")

	return reward.name


def generate_referral_reward_on_employee(doc, method=None):
	"""Employee `after_insert` hook. Safe no-op for non-referral employees."""
	try:
		if not doc.get("job_applicant"):
			return

		employee_referral = frappe.db.get_value(
			"Job Applicant", doc.job_applicant, "employee_referral"
		)
		if not employee_referral:
			return

		if frappe.db.exists(REWARD_DOCTYPE, {"employee_referral": employee_referral}):
			return

		result = resolve_referral_reward(employee_referral, employee=doc.name)
		if not result.get("matched"):
			return

		name = _create_reward_doc(result)
		frappe.msgprint(
			_("Referral Reward {0} created for this hire.").format(name),
			alert=True,
			indicator="green",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Referral Reward: generation failed")


# ---------------------------------------------------------------------------
# Payout processing (scheduled + manual)
# ---------------------------------------------------------------------------

def _ensure_salary_component():
	if not frappe.db.exists("Salary Component", SALARY_COMPONENT):
		sc = frappe.new_doc("Salary Component")
		sc.salary_component = SALARY_COMPONENT
		sc.type = "Earning"
		sc.insert(ignore_permissions=True)
	return SALARY_COMPONENT


def _make_additional_salary(reward, schedule):
	company = frappe.db.get_value("Employee", reward.referrer, "company")
	currency = reward.payout_currency or frappe.get_cached_value(
		"Company", company, "default_currency"
	)

	add_sal = frappe.new_doc("Additional Salary")
	add_sal.employee = reward.referrer
	add_sal.company = company
	add_sal.currency = currency
	add_sal.salary_component = _ensure_salary_component()
	add_sal.amount = flt(schedule.amount)
	add_sal.payroll_date = schedule.due_date
	add_sal.overwrite_salary_structure_amount = 0
	add_sal.ref_doctype = REWARD_DOCTYPE
	add_sal.ref_docname = reward.name
	add_sal.insert(ignore_permissions=True)
	add_sal.submit()
	return add_sal.name


def _sync_referral_payment_status(reward):
	if reward.status == "Paid" and reward.employee_referral:
		try:
			frappe.db.set_value(
				"Employee Referral", reward.employee_referral, "referral_payment_status", "Paid"
			)
		except Exception:
			frappe.log_error(frappe.get_traceback(), "Referral Reward: payment status sync failed")


def _process_single_reward(name, today):
	reward = frappe.get_doc(REWARD_DOCTYPE, name)
	if reward.status in ("Blocked", "Cancelled", "Paid"):
		return

	changed = False
	for s in reward.schedules:
		if s.status != "Pending":
			continue
		if not s.due_date or getdate(s.due_date) > getdate(today):
			continue

		add_sal = _make_additional_salary(reward, s)
		s.additional_salary = add_sal
		s.status = "Paid"
		s.paid_on = today
		changed = True

	if changed:
		reward.save(ignore_permissions=True)
		_sync_referral_payment_status(reward)


def process_due_referral_payouts():
	"""Daily scheduler: pay every installment that is due today and still eligible."""
	today = nowdate()
	names = frappe.get_all(
		REWARD_DOCTYPE,
		filters={"status": ["in", ["Eligible", "Partially Paid"]]},
		pluck="name",
	)
	for name in names:
		savepoint = "rr_payout"
		frappe.db.savepoint(savepoint)
		try:
			_process_single_reward(name, today)
			frappe.db.release_savepoint(savepoint)
		except Exception:
			frappe.db.rollback(save_point=savepoint)
			frappe.log_error(frappe.get_traceback(), f"Referral Reward: payout failed for {name}")


# ---------------------------------------------------------------------------
# Whitelisted endpoints (for the desk buttons)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def preview_referral_reward(employee_referral):
	"""Read-only dry run shown from the Employee Referral form. Changes nothing."""
	result = resolve_referral_reward(employee_referral)
	ctx = result.get("context") or {}
	existing = frappe.db.get_value(
		REWARD_DOCTYPE, {"employee_referral": employee_referral}, "name"
	)
	return {
		"matched": result.get("matched"),
		"message": result.get("message"),
		"policy": result.get("policy"),
		"reference_date": result.get("reference_date"),
		"payout_currency": result.get("payout_currency"),
		"is_eligible": result.get("is_eligible"),
		"eligibility_reason": result.get("eligibility_reason"),
		"schedules": result.get("schedules") or [],
		"total_amount": result.get("total_amount"),
		"referrer": ctx.get("referrer"),
		"referee_employee": ctx.get("referee_employee"),
		"existing_reward": existing,
	}


@frappe.whitelist()
def process_reward_now(reward):
	"""Manual 'pay due installments now' button on a Referral Reward."""
	_process_single_reward(reward, nowdate())
	return frappe.db.get_value(REWARD_DOCTYPE, reward, "status")
