import frappe
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
