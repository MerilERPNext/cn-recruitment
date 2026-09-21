"""Tests for the HR Ops verification step on a Job Offer.

What is pinned here is mostly what the feature does NOT do: with Recruitment
Settings -> "Require HR Ops Verification Before Sending Offer" off — the default —
nothing is gated and nothing is mailed, so an existing site keeps the offer flow
it already had. With it on, the offer cannot be sent until "Notify HR Ops" has
gone out, the stamp is written only on a successful send, and a second notify is
a no-op rather than a second mail.

`frappe.sendmail` is replaced throughout — no test ever reaches an SMTP server.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_hr_ops_offer_review.run
"""

from __future__ import annotations

import json

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.api import hr_ops_notify
from recruitment.recruitment import hr_ops_offer_review as rules

PREFIX = "_Test HR Ops"
HR_OPS_USER = "hr.ops@hropstest.local"
OTHER_USER = "not.hr.ops@hropstest.local"
SETTING = "enable_hr_ops_offer_verification"


class TestHrOpsOfferReview(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		rules.ensure_default_email_template()
		cls._make_users()
		cls.applicant = cls._make_applicant()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		frappe.db.set_single_value("Recruitment Settings", SETTING, 0)
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Offer",
		                           filters={"applicant_name": ("like", f"{PREFIX}%")}, pluck="name"):
			doc = frappe.get_doc("Job Offer", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("Job Offer", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Job Applicant",
		                           filters={"applicant_name": ("like", f"{PREFIX}%")}, pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("User", filters={"email": ("like", "%@hropstest.local")},
		                           pluck="name"):
			frappe.delete_doc("User", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _make_users(cls):
		for email, roles in ((HR_OPS_USER, [rules.HR_OPS_ROLE]), (OTHER_USER, ["HR User"])):
			user = frappe.get_doc({
				"doctype": "User", "email": email, "first_name": email.split("@")[0],
				"send_welcome_email": 0, "user_type": "System User",
			})
			user.flags.ignore_permissions = True
			user.insert()
			for role in roles:
				if frappe.db.exists("Role", role):
					user.append("roles", {"role": role})
			user.save(ignore_permissions=True)

	@classmethod
	def _make_applicant(cls):
		applicant = frappe.get_doc({
			"doctype": "Job Applicant",
			"applicant_name": f"{PREFIX} Candidate",
			"email_id": "candidate@hropstest.local",
			"status": "Open",
		})
		applicant.flags.ignore_mandatory = True
		applicant.insert(ignore_permissions=True)
		return applicant.name

	def setUp(self):
		frappe.set_user("Administrator")
		self.sent = []
		self._real_sendmail = frappe.sendmail
		frappe.sendmail = lambda **kw: self.sent.append(kw)
		self.offer = self._make_offer()

	def tearDown(self):
		frappe.sendmail = self._real_sendmail
		frappe.db.set_single_value("Recruitment Settings", SETTING, 0)
		frappe.db.rollback()

	def _make_offer(self):
		offer = frappe.get_doc({
			"doctype": "Job Offer",
			"job_applicant": self.applicant,
			"applicant_name": f"{PREFIX} Candidate",
			"status": "Awaiting Response",
			"offer_date": frappe.utils.nowdate(),
		})
		offer.flags.ignore_mandatory = True
		offer.flags.ignore_permissions = True
		# The offer-creation gates (headcount on the requisition, duplicate offers)
		# are another feature's tests; this suite only needs a saved offer to hand
		# to HR Ops.
		offer.flags.ignore_validate = True
		offer.insert(ignore_permissions=True)
		return offer

	def _enable(self, on=True):
		frappe.db.set_single_value("Recruitment Settings", SETTING, 1 if on else 0)

	# --- setting off: the feature does not exist --------------------------------

	def test_off_by_default_nothing_is_gated(self):
		self._enable(False)
		self.assertFalse(rules.verification_enabled())
		self.assertFalse(rules.send_blocked(self.offer))

	def test_off_refuses_to_notify(self):
		self._enable(False)
		with self.assertRaises(frappe.ValidationError):
			hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		self.assertEqual(self.sent, [])

	# --- setting on: the gate ---------------------------------------------------

	def test_on_blocks_send_until_notified(self):
		self._enable()
		self.assertTrue(rules.send_blocked(self.offer))

		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		self.offer.reload()
		self.assertFalse(rules.send_blocked(self.offer))

	def test_notify_mails_only_the_hr_ops_role(self):
		self._enable()
		result = hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))

		self.assertEqual(result["notified"], 1)
		self.assertEqual(len(self.sent), 1)
		recipients = self.sent[0]["recipients"]
		self.assertIn(HR_OPS_USER, recipients)
		self.assertNotIn(OTHER_USER, recipients)
		self.assertEqual(self.sent[0]["reference_name"], self.offer.name)
		self.assertIn(f"/app/job-offer/{self.offer.name}", self.sent[0]["message"])

	def test_notify_stamps_the_offer(self):
		self._enable()
		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		self.offer.reload()

		self.assertTrue(self.offer.custom_hr_ops_notified)
		self.assertTrue(self.offer.custom_hr_ops_notified_on)
		self.assertEqual(self.offer.custom_hr_ops_notified_by, "Administrator")

	def test_second_notify_does_not_mail_again(self):
		self._enable()
		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		result = hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))

		self.assertEqual(result["notified"], 0)
		self.assertEqual(result["already_notified"], 1)
		self.assertEqual(len(self.sent), 1)

	def test_failed_mail_leaves_the_gate_closed(self):
		self._enable()

		def boom(**kwargs):
			raise Exception("smtp down")

		frappe.sendmail = boom
		result = hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))

		self.assertEqual(result["failed"], 1)
		self.offer.reload()
		self.assertFalse(self.offer.custom_hr_ops_notified)
		self.assertTrue(rules.send_blocked(self.offer))

	# --- the ToDos ----------------------------------------------------------------

	def _open_todos(self):
		return frappe.get_all("ToDo", filters={
			"reference_type": "Job Offer",
			"reference_name": self.offer.name,
			"status": "Open",
			"description": ["like", f"{rules.TODO_PREFIX}%"],
		}, pluck="allocated_to")

	def test_notify_gives_the_same_hr_ops_users_a_todo(self):
		self._enable()
		result = hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))

		self.assertEqual(result["todos"], 1)
		self.assertEqual(self._open_todos(), [HR_OPS_USER])

	def test_second_notify_does_not_add_a_second_todo(self):
		self._enable()
		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		self.assertEqual(rules.raise_hr_ops_todos(self.offer, [HR_OPS_USER]), 0)
		self.assertEqual(self._open_todos(), [HR_OPS_USER])

	def test_failed_mail_raises_no_todo(self):
		self._enable()

		def boom(**kwargs):
			raise Exception("smtp down")

		frappe.sendmail = boom
		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		self.assertEqual(self._open_todos(), [])

	def test_todos_close_once_the_offer_is_sent(self):
		self._enable()
		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		self.offer.reload()

		# The same write "Send Job Offer" makes.
		self.offer.db_set({"email_status": "Sent"})
		self.assertEqual(self._open_todos(), [])

	def test_todos_stay_open_while_the_offer_is_unsent(self):
		self._enable()
		hr_ops_notify.notify_hr_ops(json.dumps([self.offer.name]))
		self.offer.reload()

		self.offer.db_set({"email_status": "Pending"})
		self.assertEqual(self._open_todos(), [HR_OPS_USER])

	# --- the send path -----------------------------------------------------------

	def test_bulk_send_skips_an_unnotified_offer(self):
		from recruitment.api.bulk_job_offer import send_bulk_job_offer

		self._enable()
		self.offer.submit()

		result = send_bulk_job_offer(json.dumps([self.offer.name]))
		self.assertEqual(result["sent"], 0)
		self.assertEqual(result["pending_hr_ops"], 1)
		self.assertEqual(self.sent, [])

	def test_bulk_send_reports_no_pending_when_setting_is_off(self):
		from recruitment.api.bulk_job_offer import send_bulk_job_offer

		self._enable(False)
		self.offer.submit()

		result = send_bulk_job_offer(json.dumps([self.offer.name]))
		self.assertEqual(result["pending_hr_ops"], 0)

	# --- the template ------------------------------------------------------------

	def test_template_is_not_rewritten(self):
		self.assertIsNone(rules.ensure_default_email_template())

	def test_render_carries_the_offer_details(self):
		subject, message = rules.render_email(self.offer)
		self.assertIn(f"{PREFIX} Candidate", subject)
		self.assertIn(self.offer.name, message)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_hr_ops_offer_review.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestHrOpsOfferReview)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
