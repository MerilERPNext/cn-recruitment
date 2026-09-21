"""Tests for "View Candidates" on the TPO Space drive cards.

The card could only ever say how many candidates were registered, which is the
least interesting half of what a TPO wants to know. A registered candidate is
emailed and applies THEMSELVES, so between "I typed them in" and "they are in the
pipeline" there is a gap the card could not show. Each candidate now reports which
of three places they are in:

    Draft       the registration was never submitted — waiting on the TPO
    Registered  submitted and emailed, but this candidate has not applied yet
    Applied     a Job Applicant exists, with its own status and hiring stage

`frappe.sendmail` is replaced throughout — submitting a Candidate Registration
emails its candidates, and no test may reach an SMTP server.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_tpo_candidate_list.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.recruitment import tpo_portal

PREFIX = "_Test TPO List"
EMAIL_DOMAIN = "@tpolist.test.local"
STAGE = "Group Discussion"

# Three registered candidates: one has applied, one has not; plus one sitting on a
# registration that was never submitted, and one who walked in on the day.
APPLIED = f"applied{EMAIL_DOMAIN}"
WAITING = f"waiting{EMAIL_DOMAIN}"
DRAFTED = f"drafted{EMAIL_DOMAIN}"
WALK_IN = f"walkin{EMAIL_DOMAIN}"


# Every candidate in this suite, in a fixed order — their position supplies a mobile
# number that no other registration in the suite can collide with.
ALL_EMAILS = (APPLIED, WAITING, DRAFTED, WALK_IN)


def _mobile_for(email):
	return f"9{ALL_EMAILS.index(email):09d}"


class TestTPOCandidateList(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._real_sendmail = frappe.sendmail
		frappe.sendmail = lambda **kw: None
		try:
			cls._purge()
			cls.institute = cls._institute()
			cls.opening = cls._opening()
			cls.invite = cls._invite()
			cls.submitted = cls._registration([APPLIED, WAITING], submit=True)
			cls.draft = cls._registration([DRAFTED], submit=False)
			cls.applicant = cls._applicant(APPLIED, spot=False)
			cls.walk_in = cls._applicant(WALK_IN, spot=True)
			frappe.db.commit()
		finally:
			frappe.sendmail = cls._real_sendmail

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Applicant",
		                           filters={"email_id": ("like", f"%{EMAIL_DOMAIN}")},
		                           pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for doctype, field in (("Candidate Registration", "campus_invite_name"),
		                       ("Campus Invite", "campus_invite_name"),
		                       ("Job Opening", "job_title"), ("Institute", "institute_name")):
			for name in frappe.get_all(doctype, filters={field: ("like", f"{PREFIX}%")},
			                           pluck="name"):
				doc = frappe.get_doc(doctype, name)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	# ── fixtures ──

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "tier": "Tier-1", "is_active": 1,
		                      "tpo_contacts": [{"contact_name": "List TPO", "role": "Primary TPO",
		                                        "email": f"tpo{EMAIL_DOMAIN}"}]})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls):
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
			"registration_expiry_date": add_days(nowdate(), 30),
			"institutes": [{"institute": cls.institute}],
			"job_openings": [{"job_opening": cls.opening}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		return doc.name

	@classmethod
	def _registration(cls, emails, submit):
		doc = frappe.get_doc({
			"doctype": "Candidate Registration",
			"campus_invite": cls.invite,
			"campus_invite_name": f"{PREFIX} Invite",
			"institute": cls.institute,
			# The mobile number is unique across registrations (the form refuses a
			# repeat), so it is derived from the email rather than the row index.
			"candidates": [
				{"first_name": email.split("@")[0].title(), "last_name": "Candidate",
				 "email_id": email, "mobile_number": _mobile_for(email)}
				for email in emails
			],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		if submit:
			doc.submit()
		return doc.name

	@classmethod
	def _applicant(cls, email, spot):
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": email.split("@")[0].title(),
			"custom_applicant_last_name": "Candidate", "email_id": email,
			"status": "Shortlisted", "source": "Campus Hiring", "job_title": cls.opening,
			"custom_campus_invite": cls.invite, "custom_institute": cls.institute,
			"custom_spot_registered": 1 if spot else 0,
		})
		doc.flags.ignore_mandatory = True
		name = doc.insert(ignore_permissions=True).name
		frappe.db.set_value("Job Applicant", name, "custom_current_stage", STAGE,
		                    update_modified=False)
		return name

	def setUp(self):
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.db.rollback()

	# ── helpers ──

	def _list(self):
		return tpo_portal.get_drive_candidates(self.invite)

	def _by_email(self, email):
		row = next((c for c in self._list()["candidates"] if c["email_id"] == email), None)
		self.assertIsNotNone(row, f"{email} is not on the list")
		return row

	# ── how many, and in what state ──

	def test_the_summary_counts_every_state(self):
		summary = self._list()["summary"]
		# 2 registered (one of them applied) + 1 draft + 1 walk-in.
		self.assertEqual(summary["total"], 4)
		self.assertEqual(summary["applied"], 2)      # the registered one, and the walk-in
		self.assertEqual(summary["registered"], 1)
		self.assertEqual(summary["draft"], 1)

	def test_the_summary_adds_up_to_the_list(self):
		data = self._list()
		self.assertEqual(
			data["summary"]["draft"] + data["summary"]["registered"] + data["summary"]["applied"],
			len(data["candidates"]),
		)

	# ── each candidate's own state ──

	def test_a_candidate_who_applied_carries_their_application(self):
		row = self._by_email(APPLIED)
		self.assertEqual(row["state"], "Applied")
		self.assertEqual(len(row["applications"]), 1)
		application = row["applications"][0]
		self.assertEqual(application["job_applicant"], self.applicant)
		self.assertEqual(application["status"], "Shortlisted")
		self.assertEqual(application["stage"], STAGE)
		# The opening's title, not its id — a TPO cannot read Job Opening and HR-OPN-...
		# means nothing to them.
		self.assertEqual(application["job_title"], f"{PREFIX} Opening")

	def test_a_registered_candidate_who_has_not_applied_says_so(self):
		row = self._by_email(WAITING)
		self.assertEqual(row["state"], "Registered")
		self.assertEqual(row["applications"], [])
		self.assertTrue(row["submitted"])

	def test_a_draft_registration_is_waiting_on_the_tpo(self):
		"""Not submitted means nobody was emailed — the candidate is not late, the
		registration is."""
		row = self._by_email(DRAFTED)
		self.assertEqual(row["state"], "Draft")
		self.assertFalse(row["submitted"])
		self.assertEqual(row["registration"], self.draft)

	def test_a_draft_candidate_is_never_shown_as_applied(self):
		"""Even with a Job Applicant on that email: an unsubmitted registration has
		not invited anyone, so attributing an application to it would be a fiction."""
		self._applicant(DRAFTED, spot=False)
		row = self._by_email(DRAFTED)
		self.assertEqual(row["state"], "Draft")
		self.assertEqual(row["applications"], [])

	def test_a_candidate_carries_what_the_tpo_typed(self):
		row = self._by_email(WAITING)
		self.assertEqual(row["full_name"], "Waiting Candidate")
		self.assertEqual(row["registration"], self.submitted)
		self.assertTrue(row["mobile_number"])

	# ── the candidate who walked in on the day ──

	def test_a_spot_registration_is_listed_and_marked(self):
		"""They have no Candidate Registration behind them, but they are this college's
		candidate on this drive and the TPO has to be able to see them."""
		row = self._by_email(WALK_IN)
		self.assertTrue(row["spot_registered"])
		self.assertIsNone(row["registration"])
		self.assertEqual(row["state"], "Applied")
		self.assertEqual(row["applications"][0]["job_applicant"], self.walk_in)

	def test_a_walk_in_is_not_listed_twice(self):
		"""A candidate the TPO registered AND who was marked spot-registered belongs to
		their registration row, not to a second one of their own."""
		frappe.db.set_value("Job Applicant", self.applicant, "custom_spot_registered", 1,
		                    update_modified=False)
		rows = [c for c in self._list()["candidates"] if c["email_id"] == APPLIED]
		self.assertEqual(len(rows), 1)
		self.assertEqual(rows[0]["registration"], self.submitted)

	# ── several applications from one candidate ──

	def test_every_application_of_one_candidate_is_shown(self):
		"""A campus invite can carry several openings; collapsing them would hide one."""
		second = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening 2",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
		})
		second.flags.ignore_mandatory = True
		second.insert(ignore_permissions=True)
		extra = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": "Applied", "email_id": APPLIED,
			"status": "Interview", "source": "Campus Hiring", "job_title": second.name,
			"custom_campus_invite": self.invite, "custom_institute": self.institute,
		})
		extra.flags.ignore_mandatory = True
		extra.insert(ignore_permissions=True)

		row = self._by_email(APPLIED)
		self.assertEqual(len(row["applications"]), 2)
		self.assertEqual({a["job_title"] for a in row["applications"]},
		                 {f"{PREFIX} Opening", f"{PREFIX} Opening 2"})
		# Still ONE candidate who has applied, however many openings they went for.
		self.assertEqual(self._list()["summary"]["applied"], 2)

	# ── the count the card shows ──

	def test_the_card_reports_the_same_applied_count(self):
		card = next((d for d in tpo_portal.get_my_campus_drives() if d["name"] == self.invite), None)
		self.assertIsNotNone(card, "the invite is not on the drive list")
		summary = self._list()["summary"]
		# Two submitted registrations plus the walk-in: the card counts everyone the
		# dialog lists, so the two numbers can never disagree.
		self.assertEqual(card["candidate_count"], 3)
		self.assertEqual(card["draft_count"], 1)       # one draft REGISTRATION
		self.assertEqual(card["applied_count"], 2)     # one registered, one at the venue
		self.assertEqual(summary["applied"], card["applied_count"])
		# Everything the dialog lists is on the card: registered candidates and
		# walk-ins under "candidates", the untouched draft under "drafts".
		self.assertEqual(card["candidate_count"] + card["draft_count"], summary["total"])

	def test_a_drive_with_only_walk_ins_still_counts_them(self):
		"""A drive nobody registered for is not an empty drive if people turned up."""
		frappe.delete_doc("Candidate Registration", self.draft, force=True,
		                  ignore_permissions=True)
		frappe.get_doc("Candidate Registration", self.submitted).cancel()
		frappe.delete_doc("Candidate Registration", self.submitted, force=True,
		                  ignore_permissions=True)
		frappe.delete_doc("Job Applicant", self.applicant, force=True, ignore_permissions=True)

		card = next((d for d in tpo_portal.get_my_campus_drives() if d["name"] == self.invite), None)
		self.assertIsNotNone(card, "the invite is not on the drive list")
		self.assertEqual(card["candidate_count"], 1)   # the walk-in
		self.assertEqual(card["applied_count"], 1)
		self.assertEqual(self._list()["summary"]["total"], 1)

	# ── access ──

	def test_an_unknown_invite_is_refused(self):
		with self.assertRaises(frappe.PermissionError):
			tpo_portal.get_drive_candidates("CINV-NO-SUCH-INVITE")

	def test_the_invite_is_required(self):
		with self.assertRaises(frappe.ValidationError):
			tpo_portal.get_drive_candidates("")


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_tpo_candidate_list.run
	"""
	import unittest

	suite = unittest.TestLoader().loadTestsFromTestCase(TestTPOCandidateList)
	unittest.TextTestRunner(verbosity=2).run(suite)
