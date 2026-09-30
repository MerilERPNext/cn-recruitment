"""Tests for Direct Applicant Onboarding — Phase 3 (CTC Proposal and negotiation).

What these pin down:

  * the Job Offer "Salary Structure" calculation now follows the offer's CTC
    (it used to return the dummy assignment's stale split for every CTC);
  * a proposal can only be raised once the candidate's form is complete and not
    duplicity-flagged, and only one is in play at a time;
  * HR enters the CTC; the breakup comes from the dummy salary structure and
    scales with it;
  * a sent proposal is locked, its link is hashed and emailed, and the Action
    Center card carries no link;
  * the candidate accepts / negotiates / rejects without login; negotiation is
    capped by Max Negotiation Rounds; revising supersedes the older version and
    kills its link; withdrawing kills the link.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_ctc_proposal.run
"""

from __future__ import annotations

import json
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment.tests import _settings_guard
from frappe.utils import add_days, flt, now_datetime, nowdate

from recruitment.api import ctc_proposal as cp
from recruitment.api import ctc_proposal_portal as portal
from recruitment.api import direct_applicant as da
from recruitment.api import direct_applicant_form as dform
from recruitment.api import direct_applicant_portal as form_portal

PREFIX = "datestctc"
FORM_NAME = "_Test CTC Form"


def _as_guest(fn, *args, **kwargs):
	frappe.set_user("Guest")
	try:
		return fn(*args, **kwargs)
	finally:
		frappe.set_user("Administrator")


class TestCTCProposal(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls._settings_state = _settings_guard.snapshot()
		desig = frappe.db.sql(
			"""select d.name, d.custom_department, dep.company from `tabDesignation` d
			join `tabDepartment` dep on dep.name = d.custom_department and dep.company = d.custom_company
			where d.custom_status = 'Active' and dep.disabled = 0 limit 1""",
			as_dict=True,
		)[0]
		cls.company, cls.department, cls.designation = desig.company, desig.custom_department, desig.name
		cls.employment_type = frappe.db.get_value("Employment Type", {}, "name")
		cls.structure, cls.tax_slab = frappe.db.get_value(
			"Salary Structure Assignment",
			frappe.db.get_single_value("Recruitment Settings", "dummy_salary_structure_assignment"),
			["salary_structure", "income_tax_slab"],
		)

	@classmethod
	def tearDownClass(cls):
		_settings_guard.restore(cls._settings_state)
		super().tearDownClass()

	def setUp(self):
		frappe.set_user("Administrator")
		frappe.db.set_single_value("Recruitment Settings", da.ENABLE_FIELD, 1)
		frappe.db.set_single_value("Recruitment Settings", "da_max_negotiation_rounds", 2)
		# Letter-template rules are covered by their own tests below.
		frappe.db.set_single_value("Recruitment Settings", "send_offer_via_document_template", 0)
		frappe.db.set_single_value("Recruitment Settings", "enable_hr_ops_offer_verification", 0)
		self.mails = []
		self._patches = [
			patch("frappe.sendmail", side_effect=lambda **kw: self.mails.append(kw)),
			# The duplicity rules are covered in test_direct_applicant_form.
			patch("recruitment.customizations.ta_duplicity_check.check_duplicity"),
			# on_accepted commits the offer before emailing it; a test must not commit.
			patch("recruitment.api.ctc_proposal._commit"),
		]
		for p in self._patches:
			p.start()
		self.applicant = da.create_direct_applicant({
			"first_name": "Ctc", "last_name": "Tester",
			"email_id": f"{PREFIX}{frappe.generate_hash(length=8)}@example.com",
			"phone_number": "9876500002", "company": self.company, "designation": self.designation,
			"department": self.department, "employment_type": self.employment_type, "category": "Management",
		})["name"]

	def tearDown(self):
		for p in self._patches:
			p.stop()
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ---------------------------------------------------------------- helpers --
	def _complete_form(self):
		if frappe.db.exists(dform.FORM, FORM_NAME):
			frappe.delete_doc(dform.FORM, FORM_NAME, force=True)
		frappe.get_doc({
			"doctype": dform.FORM, "form_name": FORM_NAME,
			"fields": [{"fieldname": "custom_pan_number", "mandatory": 1}],
		}).insert()
		with patch("recruitment.api.direct_applicant_form.secrets.token_urlsafe", return_value="form-tok"):
			dform.send_form(self.applicant, FORM_NAME)
		_as_guest(form_portal.submit_form, "form-tok", json.dumps({"custom_pan_number": "ABCDE1234F"}))

	def _proposal(self, ctc=1200000):
		values = cp.get_proposal_defaults(self.applicant)
		values.update({"doctype": cp.DOCTYPE, "ctc": ctc, "expected_doj": add_days(nowdate(), 30)})
		return frappe.get_doc(values).insert()

	def _send(self, doc, token="prop-tok"):
		with patch("recruitment.api.ctc_proposal.secrets.token_urlsafe", return_value=token):
			cp.send_proposal(doc.name)
		return token

	# ------------------------------------------------ Job Offer calc (bug fix) --
	def test_job_offer_salary_structure_follows_ctc(self):
		from recruitment.customizations.job_offer import calculate_salary_structure

		totals = []
		for ctc in (600000, 2400000):
			offer = frappe.new_doc("Job Offer")
			offer.update({
				"custom_employee_salary_structure": self.structure, "custom_base_salary": ctc,
				"custom_income_tax_slab": self.tax_slab,
			})
			calculate_salary_structure(offer)
			totals.append(12 * sum(flt(r.amount) for r in offer.custom_earnings))
		self.assertNotEqual(round(totals[0]), round(totals[1]))
		self.assertAlmostEqual(totals[1] / totals[0], 4, delta=0.05)

	# ------------------------------------------------------------------ raise --
	def test_cannot_raise_before_form_is_complete(self):
		self.assertFalse(cp.can_raise(self.applicant)[0])
		with self.assertRaises(frappe.ValidationError):
			cp.get_proposal_defaults(self.applicant)

	def test_cannot_raise_while_duplicity_flagged(self):
		self._complete_form()
		frappe.db.set_value("Job Applicant", self.applicant, dform.DUPLICITY_FLAG, 1)
		self.assertFalse(cp.can_raise(self.applicant)[0])

	def test_breakup_comes_from_the_structure_and_scales(self):
		self._complete_form()
		doc = self._proposal(ctc=1200000)
		self.assertEqual(doc.salary_structure, self.structure)
		self.assertTrue(doc.earnings)
		self.assertAlmostEqual(doc.monthly_gross * 12, 1200000, delta=12)
		doc.ctc = 2400000
		doc.save()
		self.assertAlmostEqual(doc.monthly_gross * 12, 2400000, delta=12)
		self.assertGreater(doc.annual_ctc, 0)

	def test_only_one_proposal_in_play(self):
		self._complete_form()
		self._proposal()
		self.assertFalse(cp.can_raise(self.applicant)[0])
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc({
				"doctype": cp.DOCTYPE, "job_applicant": self.applicant, "company": self.company,
				"designation": self.designation, "employment_type": self.employment_type,
				"expected_doj": nowdate(), "ctc": 100000, "salary_structure": self.structure,
			}).insert()

	# ------------------------------------------------------------------- send --
	def test_send_locks_hashes_and_emails(self):
		self._complete_form()
		doc = self._proposal()
		token = self._send(doc)
		doc.reload()
		self.assertEqual(doc.status, cp.SENT)
		self.assertEqual(doc.token_hash, dform.hash_token(token))
		self.assertIn(cp.proposal_link(token), self.mails[-1]["message"])
		item = frappe.get_doc(dform.ACTION_ITEM, doc.action_item)
		self.assertNotIn(token, (item.redirect_url or "") + (item.description or ""))
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, cp.APPLICANT_STATUS_FIELD), cp.SENT)
		doc.ctc = 1
		with self.assertRaises(frappe.ValidationError):
			doc.save()

	# ---------------------------------------------------------------- respond --
	def test_guest_sees_and_accepts(self):
		self._complete_form()
		token = self._send(self._proposal())
		data = _as_guest(portal.get_proposal, token)
		self.assertTrue(data["can_respond"])
		self.assertTrue(data["earnings"])
		_as_guest(portal.respond, token, "Accept")
		doc = frappe.get_doc(cp.DOCTYPE, {"job_applicant": self.applicant})
		# Accepted, then the Job Offer is made from it straight away (Phase 4).
		self.assertEqual((doc.status, doc.candidate_response), (cp.OFFER_CREATED, "Accepted"))
		self.assertEqual(frappe.db.get_value(dform.ACTION_ITEM, doc.action_item, "status"), "Completed")
		# Already answered: the link shows the outcome but takes no second answer.
		self.assertFalse(_as_guest(portal.get_proposal, token)["can_respond"])
		with self.assertRaises(portal.LinkUnavailable):
			_as_guest(portal.respond, token, "Reject")

	def test_negotiate_needs_an_amount(self):
		self._complete_form()
		token = self._send(self._proposal())
		with self.assertRaises(frappe.ValidationError):
			_as_guest(portal.respond, token, "Negotiate", 0, "more please")
		_as_guest(portal.respond, token, "Negotiate", 1500000, "more please")
		doc = frappe.get_doc(cp.DOCTYPE, {"job_applicant": self.applicant})
		self.assertEqual((doc.status, doc.expected_ctc), (cp.NEGOTIATE, 1500000))

	def test_revise_supersedes_and_caps_negotiation(self):
		frappe.db.set_single_value("Recruitment Settings", "da_max_negotiation_rounds", 1)
		self._complete_form()
		v1 = self._proposal()
		t1 = self._send(v1, "tok-v1")
		_as_guest(portal.respond, t1, "Negotiate", 1500000, "")
		v2 = frappe.get_doc(cp.DOCTYPE, cp.revise_proposal(v1.name)["name"])
		self.assertEqual((v2.version, v2.previous_proposal, v2.negotiation_round, v2.ctc), (2, v1.name, 1, 1500000))
		t2 = self._send(v2, "tok-v2")
		self.assertEqual(frappe.db.get_value(cp.DOCTYPE, v1.name, "status"), cp.SUPERSEDED)
		with self.assertRaises(portal.LinkUnavailable):
			_as_guest(portal.get_proposal, t1)
		# One round used: the candidate may now only accept or reject.
		self.assertFalse(_as_guest(portal.get_proposal, t2)["can_negotiate"])
		with self.assertRaises(frappe.ValidationError):
			_as_guest(portal.respond, t2, "Negotiate", 1600000, "")
		_as_guest(portal.respond, t2, "Accept")
		self.assertEqual(frappe.db.get_value(cp.DOCTYPE, v2.name, "status"), cp.OFFER_CREATED)

	def test_rejected_can_be_revised_sent_cannot(self):
		self._complete_form()
		v1 = self._proposal()
		token = self._send(v1)
		with self.assertRaises(frappe.ValidationError):
			cp.revise_proposal(v1.name)
		_as_guest(portal.respond, token, "Reject", None, "not interested")
		v2 = cp.revise_proposal(v1.name)["name"]
		self.assertEqual(frappe.db.get_value(cp.DOCTYPE, v2, "negotiation_round"), 0)

	def test_withdraw_and_expiry_kill_the_link(self):
		self._complete_form()
		v1 = self._proposal()
		token = self._send(v1)
		frappe.db.set_value(cp.DOCTYPE, v1.name, "expires_on", add_days(now_datetime(), -1))
		self.assertFalse(_as_guest(portal.get_proposal, token)["can_respond"])
		with self.assertRaises(portal.LinkUnavailable):
			_as_guest(portal.respond, token, "Accept")
		cp.withdraw_proposal(v1.name)
		with self.assertRaises(portal.LinkUnavailable):
			_as_guest(portal.get_proposal, token)

	# ------------------------------------------------------- candidate portal --
	def _as_candidate(self, email, fn, *args, **kwargs):
		frappe.set_user("Guest")
		frappe.local.candidate = email
		try:
			return fn(*args, **kwargs)
		finally:
			frappe.local.candidate = None
			frappe.set_user("Administrator")

	def test_portal_card_and_candidate_response(self):
		self._complete_form()
		doc = self._proposal()
		token = self._send(doc)
		doc.reload()
		url = frappe.db.get_value(dform.ACTION_ITEM, doc.action_item, "redirect_url")
		self.assertEqual(url, f"{cp.PORTAL_ROUTE}?proposal={doc.name}")
		self.assertNotIn(token, url)
		data = self._as_candidate(doc.email, lambda: portal._payload(portal._proposal_for_candidate(doc.name)))
		self.assertTrue(data["can_respond"])
		self.assertEqual(data["negotiations_left"], 2)
		self._as_candidate(doc.email, lambda: portal._respond(
			portal._proposal_for_candidate(doc.name, for_response=True), "Negotiate", 1500000, "please"))
		self.assertEqual(frappe.db.get_value(cp.DOCTYPE, doc.name, "status"), cp.NEGOTIATE)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_candidate(doc.email, portal._proposal_for_candidate, doc.name, True)

	def test_superseded_version_keeps_no_card_pointer(self):
		self._complete_form()
		v1 = self._proposal()
		token = self._send(v1, "tok-p1")
		_as_guest(portal.respond, token, "Negotiate", 1500000, "")
		v2 = frappe.get_doc(cp.DOCTYPE, cp.revise_proposal(v1.name)["name"])
		self._send(v2, "tok-p2")
		v2.reload()
		self.assertFalse(frappe.db.get_value(cp.DOCTYPE, v1.name, "action_item"))
		self.assertTrue(frappe.db.exists(dform.ACTION_ITEM, v2.action_item))

	def test_portal_refuses_other_candidates_and_drafts(self):
		self._complete_form()
		doc = self._proposal()
		# Not sent yet: invisible even to its own candidate.
		with self.assertRaises(portal.LinkUnavailable):
			self._as_candidate(doc.email, portal._proposal_for_candidate, doc.name)
		self._send(doc)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_candidate("someone-else@example.com", portal._proposal_for_candidate, doc.name)
		frappe.set_user("Guest")
		try:
			with self.assertRaises(frappe.AuthenticationError):
				portal.get_my_proposal(doc.name)
		finally:
			frappe.set_user("Administrator")

	# ------------------------------------------------------ Phase 4: the offer --
	def _accepted(self, ctc=1200000):
		self._complete_form()
		doc = self._proposal(ctc=ctc)
		token = self._send(doc, "tok-offer")
		_as_guest(portal.respond, token, "Accept")
		return frappe.get_doc(cp.DOCTYPE, doc.name)

	def test_accept_creates_submits_and_sends_the_offer(self):
		doc = self._accepted(ctc=1800000)
		self.assertEqual(doc.status, cp.OFFER_CREATED, doc.offer_error)
		self.assertFalse(doc.offer_error)
		offer = frappe.get_doc("Job Offer", doc.job_offer)
		self.assertEqual((offer.docstatus, offer.job_applicant, offer.company, offer.designation),
			(1, self.applicant, self.company, self.designation))
		self.assertEqual(offer.custom_base_salary, 1800000)
		self.assertEqual(str(offer.custom_expected_doj), str(doc.expected_doj))
		self.assertEqual(offer.email_status, "Sent")
		# Same inputs as the proposal -> the same monthly breakup.
		self.assertAlmostEqual(sum(r.amount for r in offer.custom_earnings), doc.monthly_gross, delta=1)
		# The existing offer flow takes over: the candidate gets the offer card.
		self.assertTrue(frappe.db.exists(dform.ACTION_ITEM, {"reference_doctype": "Job Offer", "reference_docname": offer.name}))
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, cp.APPLICANT_STATUS_FIELD), cp.OFFER_CREATED)
		# The candidate's proposal page now says the offer was sent.
		self.assertEqual(_as_guest(portal.get_proposal, "tok-offer")["status"], cp.OFFER_CREATED)

	def test_offer_gate_needs_an_accepted_proposal(self):
		from recruitment.api.offer_validation import check_offer_allowed

		self._complete_form()
		# No accepted proposal yet: no headcount to offer against.
		self.assertEqual(check_offer_allowed(self.applicant)["code"], "no_opening")
		doc = self._proposal()
		doc.db_set("status", cp.ACCEPTED)
		self.assertTrue(check_offer_allowed(self.applicant)["allowed"])
		# Feature off, or not a direct applicant: the normal rule applies again.
		frappe.db.set_single_value("Recruitment Settings", da.ENABLE_FIELD, 0)
		self.assertEqual(check_offer_allowed(self.applicant)["code"], "no_opening")
		frappe.db.set_single_value("Recruitment Settings", da.ENABLE_FIELD, 1)
		frappe.db.set_value("Job Applicant", self.applicant, da.DIRECT_FLAG, 0)
		self.assertEqual(check_offer_allowed(self.applicant)["code"], "no_opening")

	def test_offer_that_cannot_be_created_is_rolled_back_and_can_be_retried(self):
		real_create = cp._create_offer

		def create_then_fail(doc):
			real_create(doc)  # inserted and submitted ...
			raise frappe.ValidationError("letter template missing")  # ... then something fails

		with patch("recruitment.api.ctc_proposal._create_offer", side_effect=create_then_fail):
			doc = self._accepted()
		self.assertEqual(doc.status, cp.OFFER_FAILED)
		self.assertIn("letter template missing", doc.offer_error)
		# Nothing half-made is left behind; the candidate's acceptance stands.
		self.assertFalse(frappe.db.exists("Job Offer", {"job_applicant": self.applicant}))
		self.assertEqual(doc.candidate_response, "Accepted")
		result = cp.retry_offer(doc.name)
		self.assertEqual(frappe.db.get_value("Job Offer", result["job_offer"], "docstatus"), 1)
		self.assertEqual(frappe.db.get_value(cp.DOCTYPE, doc.name, "status"), cp.OFFER_CREATED)

	def test_offer_that_cannot_be_sent_is_kept_with_a_note(self):
		with patch("recruitment.api.ctc_proposal._release_offer", side_effect=frappe.ValidationError("mail server down")):
			doc = self._accepted()
		self.assertEqual(doc.status, cp.OFFER_CREATED)
		self.assertIn("mail server down", doc.offer_error)
		self.assertEqual(frappe.db.get_value("Job Offer", doc.job_offer, "docstatus"), 1)

	def test_retry_covers_an_accepted_proposal_with_no_offer(self):
		self._complete_form()
		doc = self._proposal()
		doc.db_set("status", cp.ACCEPTED)
		result = cp.retry_offer(doc.name)
		self.assertTrue(frappe.db.exists("Job Offer", result["job_offer"]))

	def test_one_live_offer_rule_still_applies(self):
		from recruitment.api.offer_validation import check_offer_allowed

		doc = self._accepted()
		self.assertEqual(doc.status, cp.OFFER_CREATED, doc.offer_error)
		# The candidate now holds a live offer: a second one is refused.
		self.assertEqual(check_offer_allowed(self.applicant)["code"], "active_offer")
		with self.assertRaises(frappe.ValidationError):
			cp.retry_offer(doc.name)  # neither Offer Failed nor Accepted-without-offer

	def test_hr_ops_verification_hands_the_offer_over(self):
		frappe.db.set_single_value("Recruitment Settings", "enable_hr_ops_offer_verification", 1)
		with patch("recruitment.api.hr_ops_notify.notify_hr_ops") as notify:
			doc = self._accepted()
		self.assertEqual(doc.status, cp.OFFER_CREATED)
		self.assertIn("HR Ops", doc.offer_error)
		notify.assert_called_once_with([doc.job_offer])
		self.assertNotEqual(frappe.db.get_value("Job Offer", doc.job_offer, "email_status"), "Sent")

	def test_document_template_offers_need_a_letter_on_the_proposal(self):
		frappe.db.set_single_value("Recruitment Settings", "send_offer_via_document_template", 1)
		self._complete_form()
		doc = self._proposal()
		doc.db_set("offer_letter_template", None)
		with self.assertRaises(frappe.ValidationError):
			cp.send_proposal(doc.name)
		self.assertEqual(frappe.db.get_value(cp.DOCTYPE, doc.name, "status"), cp.DRAFT)

	# ------------------------------------------------------ review fixes --
	def test_flow_fields_cannot_be_edited_by_a_save(self):
		self._complete_form()
		doc = self._proposal()
		doc.status = cp.ACCEPTED
		with self.assertRaises(frappe.ValidationError):
			doc.save()
		doc.reload()
		doc.ctc = 1300000  # an ordinary Draft edit still works
		doc.save()

	def test_withdraw_and_restart_keeps_the_negotiation_count(self):
		frappe.db.set_single_value("Recruitment Settings", "da_max_negotiation_rounds", 1)
		self._complete_form()
		v1 = self._proposal()
		_as_guest(portal.respond, self._send(v1, "tok-n1"), "Negotiate", 1500000, "")
		cp.withdraw_proposal(v1.name)
		fresh = self._proposal()
		self.assertEqual((fresh.version, fresh.negotiation_round), (2, 1))
		self.assertFalse(_as_guest(portal.get_proposal, self._send(fresh, "tok-n2"))["can_negotiate"])

	def test_an_expired_proposal_can_be_revised(self):
		self._complete_form()
		v1 = self._proposal()
		self._send(v1, "tok-exp")
		with self.assertRaises(frappe.ValidationError):
			cp.revise_proposal(v1.name)  # still open
		frappe.db.set_value(cp.DOCTYPE, v1.name, "expires_on", add_days(now_datetime(), -1))
		v2 = frappe.get_doc(cp.DOCTYPE, cp.revise_proposal(v1.name)["name"])
		self._send(v2, "tok-exp2")
		self.assertEqual(frappe.db.get_value(cp.DOCTYPE, v1.name, "status"), cp.SUPERSEDED)

	def test_form_cannot_change_under_a_live_proposal(self):
		self._complete_form()
		self._proposal()
		for action in (
			lambda: dform.send_form(self.applicant, FORM_NAME),
			lambda: dform.revoke_form(self.applicant),
			lambda: dform.request_resubmission(self.applicant, '["custom_pan_number"]'),
		):
			with self.assertRaises(frappe.ValidationError):
				action()

	def test_send_rechecks_the_form(self):
		self._complete_form()
		doc = self._proposal()
		frappe.db.set_value("Job Applicant", self.applicant, dform.DUPLICITY_FLAG, 1)
		with self.assertRaises(frappe.ValidationError):
			cp.send_proposal(doc.name)

	def test_names_in_hr_emails_are_escaped(self):
		self._complete_form()
		frappe.db.set_value("Job Applicant", self.applicant, "custom_full_name", '<a href="https://evil">Review</a>')
		doc = self._proposal()
		doc.db_set("sent_by", "hr@example.com")
		doc.reload()
		self.mails.clear()
		cp.email_hr(doc, "accepted")
		self.assertNotIn('<a href="https://evil">', self.mails[-1]["message"])
		self.assertIn("&lt;a href", self.mails[-1]["message"])

	def test_unknown_token_and_guest_hr_calls_are_refused(self):
		with self.assertRaises(portal.LinkUnavailable):
			_as_guest(portal.get_proposal, "nope")
		self._complete_form()
		doc = self._proposal()
		with self.assertRaises(frappe.PermissionError):
			_as_guest(cp.send_proposal, doc.name)


def run():
	import unittest

	unittest.main(module=__name__, argv=["run"], exit=False, verbosity=2)
