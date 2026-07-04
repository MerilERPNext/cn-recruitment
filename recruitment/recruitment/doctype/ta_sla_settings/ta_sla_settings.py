import frappe
from frappe import _
from frappe.model.document import Document


SLA_TASKS = [
	# (task_key, task_name)
	("interview_feedback", "Interview Feedback"),
	("requisition_activation", "Requisition Activation"),
	("candidate_review", "Candidate Review"),
	("requisition_approval", "Requisition Approval"),
	("assessment_evaluation", "Assessment Evaluation"),
	("employee_movement_approval", "Employee Movement Approval"),
	("shortlisting_stage", "Shortlisting Stage"),
	("screening_stage", "Screening Stage"),
	("interview_scheduling", "Interview Scheduling"),
	("interview_completion", "Interview Completion"),
	("assessment_scheduling", "Assessment Scheduling"),
	("assessment_completion", "Assessment Completion"),
	("pre_bgv_initiation", "Pre-BGV Initiation"),
	("pre_bgv_completion", "Pre-BGV Completion"),
	("pre_offer_stage", "Pre-Offer Stage"),
	("offer_proposal_stage", "Offer Proposal Stage"),
	("offer_letter_stage", "Offer Letter Stage"),
	("add_to_pending_list", "Add to Pending List"),
	("employee_movement_initiation", "Employee Movement Initiation"),
]


class TASLASettings(Document):
	def onload(self):
		self.ensure_sla_task_rows()

	def validate(self):
		self.ensure_sla_task_rows()
		self.validate_tat_points()
		self.validate_target_assignments()

	def validate_tat_points(self):
		"""A TAT's Start and End points must differ (a zero-length window is a
		misconfiguration). Only checked when both points are chosen."""
		checks = [
			(_("Time To Fill"), self.tat_fill_start_point, self.tat_fill_end_point),
			(_("Time To Hire"), self.tat_hire_start_point, self.tat_hire_end_point),
			(
				_("Time To First Action"),
				self.tat_first_action_start_point,
				self.tat_first_action_end_point,
			),
		]
		for label, start, end in checks:
			if start and end and start == end:
				frappe.throw(
					_("{0}: Start Point and End Point cannot be the same.").format(label)
				)

	def validate_target_assignments(self):
		"""Prevent duplicate Target TAT rows for the same Designation / User."""
		seen = set()
		for row in self.target_tat_assignments or []:
			if not (row.target_type and row.target_value):
				continue
			key = (row.target_type, row.target_value)
			if key in seen:
				frappe.throw(
					_("Duplicate Target TAT assignment for {0} '{1}'.").format(
						row.target_type, row.target_value
					)
				)
			seen.add(key)

	def ensure_sla_task_rows(self):
		existing_keys = {row.task_key for row in (self.sla_tasks or [])}
		for key, name in SLA_TASKS:
			if key not in existing_keys:
				self.append(
					"sla_tasks",
					{
						"task_key": key,
						"task_name": name,
					},
				)
