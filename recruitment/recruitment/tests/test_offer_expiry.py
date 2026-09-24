"""Tests for Job Offer expiry and resending the letter.

What is pinned here:

  * the daily sweep expires a sent offer whose Expiry Date has passed, and
    leaves alone one that expires today, one with no expiry date, one still in
    Draft and one the candidate has already answered;
  * an expired offer stops counting against the requisition's headcount, the
    way a withdrawn one does;
  * the candidate can no longer accept or decline it — including in the window
    between midnight and the sweep, when it still reads "Awaiting Response";
  * "Resend Offer Letter" puts it back to Awaiting Response on a new date and
    mails the same letter, while "Resend Job Offer" (the versioned route) is
    open too and rolls the validity window forward instead of copying a date
    that has already passed.

`frappe.sendmail` is replaced throughout — no test ever reaches an SMTP server.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_offer_expiry.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, getdate, today

from recruitment.api import offer_expiry
from recruitment.api.offer_lifecycle import offer_actions, resend_job_offer

PREFIX = "_Test Offer Expiry"
EMAIL = "candidate@offerexpirytest.local"
EXPIRY_FIELD = offer_expiry.EXPIRY_FIELD


class TestOfferExpiry(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		# Resending an offer re-runs the same gates a fresh one clears (a live
		# offer, a requisition behind the opening, headcount left), so the
		# candidate needs a real opening to be offered against.
		cls.requisition = cls._make_requisition()
		cls.opening = cls._make_opening(cls.requisition)
		cls.applicant = cls._make_applicant(cls.opening)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all(
			"Job Offer", filters={"applicant_name": ("like", f"{PREFIX}%")}, pluck="name"
		):
			doc = frappe.get_doc("Job Offer", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("Job Offer", name, force=True, ignore_permissions=True)
		for name in frappe.get_all(
			"Job Applicant", filters={"applicant_name": ("like", f"{PREFIX}%")}, pluck="name"
		):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		# The requisition is only reachable through the opening — it is named by a
		# series and carries nothing of this suite's own.
		requisitions = set()
		for opening in frappe.get_all(
			"Job Opening", filters={"job_title": ("like", f"{PREFIX}%")},
			fields=["name", "job_requisition"],
		):
			if opening.job_requisition:
				requisitions.add(opening.job_requisition)
			frappe.delete_doc("Job Opening", opening.name, force=True, ignore_permissions=True)
		for name in requisitions:
			if frappe.db.exists("Job Requisition", name):
				frappe.delete_doc("Job Requisition", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _make_requisition(cls):
		"""Headcount without a position list: `no_of_positions` is what
		offer_validation falls back to, and nothing here has to claim a seat."""
		doc = frappe.get_doc({
			"doctype": "Job Requisition",
			"designation": frappe.get_all("Designation", pluck="name")[0],
			"company": frappe.get_all("Company", pluck="name")[0],
			"no_of_positions": 3,
			"status": "Approved Active",
		})
		doc.flags.ignore_mandatory = True
		doc.flags.ignore_validate = True
		doc.insert(ignore_permissions=True)
		return doc.name

	@classmethod
	def _make_opening(cls, requisition):
		doc = frappe.get_doc({
			"doctype": "Job Opening",
			"job_title": f"{PREFIX} Opening",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0],
			"status": "Open",
			"job_requisition": requisition,
		})
		doc.flags.ignore_mandatory = True
		doc.flags.ignore_validate = True
		doc.insert(ignore_permissions=True)
		return doc.name

	@classmethod
	def _make_applicant(cls, opening):
		applicant = frappe.get_doc({
			"doctype": "Job Applicant",
			"applicant_name": f"{PREFIX} Candidate",
			"email_id": EMAIL,
			"status": "Open",
			"job_title": opening,
		})
		applicant.flags.ignore_mandatory = True
		applicant.insert(ignore_permissions=True)
		return applicant.name

	def setUp(self):
		frappe.set_user("Administrator")
		self.sent = []
		self._real_sendmail = frappe.sendmail
		frappe.sendmail = lambda **kw: self.sent.append(kw)

	def tearDown(self):
		frappe.sendmail = self._real_sendmail
		frappe.db.rollback()

	def _make_offer(self, expiry=None, status="Awaiting Response", submit=True, sent=True):
		"""A saved offer in whatever state the test needs.

		The offer-creation gates (headcount, duplicate offers) belong to
		offer_validation's own tests; this suite only needs a letter to expire.
		"""
		offer = frappe.get_doc({
			"doctype": "Job Offer",
			"job_applicant": self.applicant,
			"applicant_name": f"{PREFIX} Candidate",
			"applicant_email": EMAIL,
			"status": status,
			"offer_date": add_days(today(), -10),
		})
		if expiry:
			offer.set(EXPIRY_FIELD, expiry)
		offer.flags.ignore_mandatory = True
		offer.flags.ignore_permissions = True
		offer.flags.ignore_validate = True
		offer.insert(ignore_permissions=True)
		if submit:
			offer.flags.ignore_validate_update_after_submit = True
			offer.submit()
		if sent:
			offer.db_set({"email_status": "Sent", "email_sent_on": frappe.utils.now()})
		offer.reload()
		return offer

	def _status(self, offer):
		return frappe.db.get_value("Job Offer", offer.name, "status")

	# --- the daily sweep ---------------------------------------------------------

	def test_offer_past_its_expiry_date_expires(self):
		offer = self._make_offer(expiry=add_days(today(), -1))
		offer_expiry.expire_overdue_offers()
		self.assertEqual(self._status(offer), "Expired")

	def test_offer_expiring_today_is_still_live(self):
		"""The validity period is inclusive — the last day still counts."""
		offer = self._make_offer(expiry=today())
		offer_expiry.expire_overdue_offers()
		self.assertEqual(self._status(offer), "Awaiting Response")

	def test_offer_without_an_expiry_date_never_expires(self):
		offer = self._make_offer(expiry=None)
		offer_expiry.expire_overdue_offers()
		self.assertEqual(self._status(offer), "Awaiting Response")

	def test_draft_offer_is_not_expired(self):
		"""Nothing was put in front of the candidate, so nothing lapsed."""
		offer = self._make_offer(expiry=add_days(today(), -1), status="Draft", submit=False, sent=False)
		offer_expiry.expire_overdue_offers()
		self.assertEqual(self._status(offer), "Draft")

	def test_answered_offer_is_left_alone(self):
		offer = self._make_offer(expiry=add_days(today(), -1), status="Accepted")
		offer_expiry.expire_overdue_offers()
		self.assertEqual(self._status(offer), "Accepted")

	def test_expiry_is_recorded_on_the_offer(self):
		offer = self._make_offer(expiry=add_days(today(), -3))
		offer_expiry.expire_overdue_offers()
		comments = frappe.get_all(
			"Comment",
			filters={"reference_doctype": "Job Offer", "reference_name": offer.name,
			         "comment_type": "Comment"},
			pluck="content",
		)
		self.assertTrue(any("expired" in (c or "").lower() for c in comments))

	# --- what an expired offer stops doing ---------------------------------------

	def test_expired_offer_no_longer_holds_headcount(self):
		from recruitment.api.offer_validation import INACTIVE_STATUSES, _active_offer_for_applicant

		self.assertIn("Expired", INACTIVE_STATUSES)
		offer = self._make_offer(expiry=add_days(today(), -1))
		self.assertIsNotNone(_active_offer_for_applicant(self.applicant))
		offer_expiry.expire_overdue_offers()
		self.assertIsNone(_active_offer_for_applicant(self.applicant))
		self.assertEqual(self._status(offer), "Expired")

	def test_candidate_cannot_answer_an_expired_offer(self):
		from recruitment.job_offer_utils import _refuse_lapsed_offer

		offer = self._make_offer(expiry=add_days(today(), -1))
		offer_expiry.expire_overdue_offers()
		with self.assertRaises(frappe.ValidationError):
			_refuse_lapsed_offer(offer.name)

	def test_candidate_cannot_answer_before_the_sweep_has_run(self):
		"""Lapsed at midnight, still labelled "Awaiting Response" until 01:00."""
		from recruitment.job_offer_utils import _refuse_lapsed_offer

		offer = self._make_offer(expiry=add_days(today(), -1))
		self.assertEqual(self._status(offer), "Awaiting Response")
		self.assertTrue(offer_expiry.offer_has_lapsed(offer))
		with self.assertRaises(frappe.ValidationError):
			_refuse_lapsed_offer(offer.name)

	def test_a_live_offer_can_still_be_answered(self):
		from recruitment.job_offer_utils import _refuse_lapsed_offer

		offer = self._make_offer(expiry=add_days(today(), 5))
		_refuse_lapsed_offer(offer.name)  # does not raise

	# --- resending the same letter ------------------------------------------------

	def test_resend_letter_is_offered_only_on_an_expired_offer(self):
		offer = self._make_offer(expiry=add_days(today(), 5))
		self.assertFalse(offer_actions(offer)["resend_letter"]["allowed"])

		offer.db_set("status", "Expired")
		offer.reload()
		self.assertTrue(offer_actions(offer)["resend_letter"]["allowed"])

	def test_resend_letter_needs_a_letter_that_went_out(self):
		offer = self._make_offer(expiry=add_days(today(), -1), sent=False)
		offer.db_set("status", "Expired")
		offer.reload()
		rule = offer_actions(offer)["resend_letter"]
		self.assertFalse(rule["allowed"])
		self.assertIn("never emailed", rule["reason"])

	def test_resend_letter_revives_the_offer(self):
		offer = self._make_offer(expiry=add_days(today(), -1))
		offer_expiry.expire_overdue_offers()

		new_expiry = add_days(today(), 7)
		result = offer_expiry.resend_offer_letter(offer.name, new_expiry)

		self.assertEqual(result["status"], "Awaiting Response")
		self.assertEqual(self._status(offer), "Awaiting Response")
		self.assertEqual(
			getdate(frappe.db.get_value("Job Offer", offer.name, EXPIRY_FIELD)), getdate(new_expiry)
		)
		# Same offer, same version — a new letter would be a new document.
		self.assertEqual(result["job_offer"], offer.name)
		self.assertTrue(self.sent, "the offer letter should have been emailed again")

	def test_resend_letter_refuses_a_date_in_the_past(self):
		offer = self._make_offer(expiry=add_days(today(), -5))
		offer_expiry.expire_overdue_offers()
		with self.assertRaises(frappe.ValidationError):
			offer_expiry.resend_offer_letter(offer.name, add_days(today(), -1))
		self.assertEqual(self._status(offer), "Expired")

	def test_resend_letter_refuses_a_live_offer(self):
		offer = self._make_offer(expiry=add_days(today(), 5))
		with self.assertRaises(frappe.ValidationError):
			offer_expiry.resend_offer_letter(offer.name, add_days(today(), 10))

	# --- resending as a new version ------------------------------------------------

	def test_expired_offer_can_be_raised_as_a_new_version(self):
		offer = self._make_offer(expiry=add_days(today(), -1))
		offer_expiry.expire_overdue_offers()
		offer.reload()
		self.assertTrue(offer_actions(offer)["resend"]["allowed"])

	def test_new_version_does_not_inherit_a_date_that_has_passed(self):
		"""The window HR chose carries over, counted from the new offer date."""
		offer = self._make_offer(expiry=add_days(today(), -3))  # offer_date is today-10
		offer_expiry.expire_overdue_offers()
		offer.reload()

		new_name = resend_job_offer(offer.name)["job_offer"]
		new_expiry = frappe.db.get_value("Job Offer", new_name, EXPIRY_FIELD)
		self.assertEqual(getdate(new_expiry), getdate(add_days(today(), 7)))
		self.assertGreaterEqual(getdate(new_expiry), getdate(today()))


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_offer_expiry.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestOfferExpiry)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
