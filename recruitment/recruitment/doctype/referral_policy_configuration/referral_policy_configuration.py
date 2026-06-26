import frappe
from frappe import _
from frappe.model.document import Document


class ReferralPolicyConfiguration(Document):
	def validate(self):
		self.validate_effective_dates()
		self.validate_applicability()
		self.validate_role_specific_limits()

	def validate_effective_dates(self):
		if self.effective_from and self.effective_to and self.effective_to < self.effective_from:
			frappe.throw(_("Effective To cannot be earlier than Effective From."))

	def validate_applicability(self):
		if self.assign_referral_policy_by == "User Assignment" and not self.applicable_to_user_assignments:
			frappe.throw(_("Add at least one User Assignment in Applicable To."))

		if self.assign_referral_policy_by == "Job Opening" and not self.applicable_to_job_openings:
			frappe.throw(_("Add at least one Job Opening in Applicable To."))

	def validate_role_specific_limits(self):
		if not self.role_specific_limits:
			frappe.throw(_("Add at least one row in Configure Role Specific Limits."))

		for idx, row in enumerate(self.role_specific_limits, start=1):
			self.validate_role_limit_row(idx, row)

	def validate_role_limit_row(self, idx, row):
		schedules = []

		for schedule_no in (1, 2, 3):
			days_field = f"payout_schedule_{schedule_no}_days_from_doj"
			amount_field = f"payout_schedule_{schedule_no}_amount"
			days = row.get(days_field)
			amount = row.get(amount_field)
			has_days = days is not None and days != ""
			has_amount = amount is not None and amount != ""

			if has_days != has_amount:
				frappe.throw(
					_("Row {0}: complete both Days from DOJ and Amount for Payout Schedule {1}.").format(
						idx, schedule_no
					)
				)

			if has_days:
				if int(days) < 0:
					frappe.throw(_("Row {0}: Payout Schedule {1} days cannot be negative.").format(idx, schedule_no))
				schedules.append((schedule_no, int(days)))

			if has_amount and float(amount) < 0:
				frappe.throw(_("Row {0}: Payout Schedule {1} amount cannot be negative.").format(idx, schedule_no))

		if row.multiple_payout_dates == "No":
			if (
				row.payout_schedule_2_days_from_doj is not None and row.payout_schedule_2_days_from_doj != ""
			) or row.payout_schedule_2_amount or (
				row.payout_schedule_3_days_from_doj is not None and row.payout_schedule_3_days_from_doj != ""
			) or row.payout_schedule_3_amount:
				frappe.throw(
					_("Row {0}: Payout Schedule 2 and 3 can only be used when Multiple Payout Dates is set to Yes.").format(
						idx
					)
				)
		else:
			if not (
				(
					row.payout_schedule_2_days_from_doj is not None
					and row.payout_schedule_2_days_from_doj != ""
					and row.payout_schedule_2_amount
				)
				or (
					row.payout_schedule_3_days_from_doj is not None
					and row.payout_schedule_3_days_from_doj != ""
					and row.payout_schedule_3_amount
				)
			):
				frappe.throw(
					_("Row {0}: add at least one additional payout schedule when Multiple Payout Dates is Yes.").format(
						idx
					)
				)

		for earlier, later in zip(schedules, schedules[1:]):
			if later[1] <= earlier[1]:
				frappe.throw(
					_(
						"Row {0}: Payout Schedule {1} must be after Payout Schedule {2} in Days from DOJ."
					).format(idx, later[0], earlier[0])
				)
