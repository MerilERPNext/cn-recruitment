"""Leaving the Pre Offer stage closes the candidate's pre-offer round on the portal.

HR can complete (or skip) the Pre Offer stage straight from the hiring workflow.
Before, the candidate's Action Center card stayed on "Action Required" and the
form stayed open for a round that was already over. What is pinned here: moving
on from Pre Offer — by any route that goes through `_enter_stage` — completes the
card and marks the row Reviewed, and nothing else is touched.

The stage list is stubbed, so no Job Opening is needed; `frappe.sendmail` is
replaced so no test reaches an SMTP server.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_pre_offer_stage_close.run
"""

from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import now_datetime

from recruitment.api import hiring_stage as hs
from recruitment.api.action_center import ACTION_DOCTYPE

EMAIL = "preofferclose.{}@test.local"
ROW_DOCTYPE = "Job Applicant Pre Offer Form"

STAGES = [
	{"stage_name": "HR Round", "stage_type": "Interview"},
	{"stage_name": "Pre Job Offer", "stage_type": "Pre Offer"},
	{"stage_name": "Job Offer", "stage_type": "Offer"},
]


class TestPreOfferStageClose(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		emails = frappe.get_all(
			"Job Applicant", filters={"email_id": ("like", EMAIL.format("%"))}, pluck="email_id"
		)
		for name in frappe.get_all(
			"Job Applicant", filters={"email_id": ("like", EMAIL.format("%"))}, pluck="name"
		):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		if emails:
			frappe.db.delete(ACTION_DOCTYPE, {"candidate_email": ("in", emails)})
		frappe.db.commit()

	def setUp(self):
		frappe.set_user("Administrator")
		self._real_sendmail = frappe.sendmail
		frappe.sendmail = lambda **kw: None
		self._stages = patch.object(hs, "get_applicant_stages", lambda doc: STAGES)
		self._stages.start()

	def tearDown(self):
		self._stages.stop()
		frappe.sendmail = self._real_sendmail
		frappe.db.rollback()

	# ── fixtures ──

	def _applicant(self, key, stage, row_status="Sent"):
		email = EMAIL.format(key)
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": key, "email_id": email,
			"status": "Approvals", "source": "Walk In", hs.STAGE_FIELD: stage,
		})
		doc.append("custom_pre_offer_forms", {"status": row_status, "sent_at": now_datetime()})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		row = doc.custom_pre_offer_forms[0]
		item = frappe.get_doc({
			"doctype": ACTION_DOCTYPE, "candidate_email": email,
			"reference_doctype": ROW_DOCTYPE, "reference_docname": row.name,
			"status": "Action Required",
		}).insert(ignore_permissions=True)
		return doc.name, row.name, item.name

	def _state(self, row, item):
		return (
			frappe.db.get_value(ROW_DOCTYPE, row, "status"),
			frappe.db.get_value(ACTION_DOCTYPE, item, "status"),
		)

	# ── leaving Pre Offer ──

	def test_completing_the_stage_completes_the_portal_card(self):
		applicant, row, item = self._applicant("complete", "Pre Job Offer")
		hs.move_to_next_stage(applicant)
		self.assertEqual(self._state(row, item), ("Reviewed", "Completed"))

	def test_a_filled_form_is_closed_too(self):
		applicant, row, item = self._applicant("filled", "Pre Job Offer", row_status="Filled")
		hs.move_to_next_stage(applicant)
		self.assertEqual(self._state(row, item), ("Reviewed", "Completed"))

	def test_jumping_forward_from_pre_offer_closes_it(self):
		applicant, row, item = self._applicant("jump", "Pre Job Offer")
		hs.set_stage(applicant, "Job Offer")
		self.assertEqual(self._state(row, item), ("Reviewed", "Completed"))

	def test_marking_the_stage_not_required_closes_it(self):
		applicant, row, item = self._applicant("skip", "Pre Job Offer")
		hs.mark_stage_not_required(applicant, "Pre Job Offer", comment="Offer already agreed")
		self.assertEqual(self._state(row, item), ("Reviewed", "Completed"))

	# ── what stays open ──

	def test_leaving_another_stage_leaves_the_round_open(self):
		"""A pre-offer sent early (candidate still in the HR round) is still live
		when they move onto the Pre Offer stage itself."""
		applicant, row, item = self._applicant("early", "HR Round")
		hs.move_to_next_stage(applicant)
		self.assertEqual(self._state(row, item), ("Sent", "Action Required"))

	def test_another_application_by_the_same_candidate_is_untouched(self):
		applicant, _row, _item = self._applicant("mine", "Pre Job Offer")
		_other, other_row, other_item = self._applicant("other", "Pre Job Offer")
		# Same candidate on both: only the rows are what scopes the close.
		frappe.db.set_value(ACTION_DOCTYPE, other_item, "candidate_email", EMAIL.format("mine"))
		hs.move_to_next_stage(applicant)
		self.assertEqual(self._state(other_row, other_item), ("Sent", "Action Required"))


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_pre_offer_stage_close.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestPreOfferStageClose)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
