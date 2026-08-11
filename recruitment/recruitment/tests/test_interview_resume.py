"""Tests for mirroring a candidate's resume onto their Interview.

Covers recruitment.api.interview_resume: that the interview gets the resume whichever
order the two arrive in, and — the part that was actually broken — that a panel
member with no Job Applicant permission can open it.

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_interview_resume
"""

from __future__ import annotations

import frappe
from frappe.core.doctype.file.file import has_permission as file_has_permission
from frappe.core.doctype.file.utils import find_file_by_url
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, nowdate

from recruitment.api.interview_resume import RESUME_FIELD

PREFIX = "_Test Resume"
PANELIST = "resume.panelist@test.local"


class TestInterviewResume(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()

		cls.interview_type = cls._interview_type()
		cls.panelist = cls._panelist()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── fixtures ──

	@classmethod
	def _purge(cls):
		applicants = frappe.get_all("Job Applicant",
		                            filters={"email_id": ("like", "resume.cand%@test.local")},
		                            pluck="name")
		for name in frappe.get_all("Interview",
		                           filters={"job_applicant": ("in", applicants or [""])},
		                           pluck="name"):
			for f in frappe.get_all("File", filters={"attached_to_doctype": "Interview",
			                                         "attached_to_name": name}, pluck="name"):
				frappe.delete_doc("File", f, force=True, ignore_permissions=True)
			frappe.delete_doc("Interview", name, force=True, ignore_permissions=True,
			                  delete_permanently=True)
		for name in applicants:
			for f in frappe.get_all("File", filters={"attached_to_doctype": "Job Applicant",
			                                         "attached_to_name": name}, pluck="name"):
				frappe.delete_doc("File", f, force=True, ignore_permissions=True)
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def _interview_type(cls):
		name = f"{PREFIX} Type"
		if not frappe.db.exists("Interview Type", name):
			skill = f"{PREFIX} Skill"
			if not frappe.db.exists("Skill", skill):
				frappe.get_doc({"doctype": "Skill", "skill_name": skill}
				               ).insert(ignore_permissions=True)
			frappe.get_doc({"doctype": "Interview Type", "interview_type_name": name,
			                "expected_skill_set": [{"skill": skill}]}
			               ).insert(ignore_permissions=True)
		return name

	@classmethod
	def _panelist(cls):
		"""A panel member as they actually exist: can read Interview, cannot read the
		candidate. That gap is what made the resume link fail."""
		if not frappe.db.exists("User", PANELIST):
			frappe.get_doc({"doctype": "User", "email": PANELIST, "first_name": "Panel",
			                "enabled": 1, "send_welcome_email": 0,
			                "roles": [{"role": "Interviewer"}]}).insert(ignore_permissions=True)
		return PANELIST

	def _applicant(self, suffix="1"):
		email = f"resume.cand{suffix}@test.local"
		doc = frappe.get_doc({
			"doctype": "Job Applicant", "applicant_name": f"Resume Cand {suffix}",
			"email_id": email, "status": "Open", "source": "Walk In",
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		return doc

	def _upload_resume(self, applicant, suffix="1", stamp=True):
		"""A private resume attached to the candidate — how they really arrive.

		``stamp=False`` leaves ``resume_attachment`` unset so a test can set it through
		a normal save and exercise the push hook.
		"""
		f = frappe.get_doc({
			"doctype": "File",
			"file_name": f"{PREFIX}-{suffix}.txt",
			"content": "resume content",
			"is_private": 1,
			"attached_to_doctype": "Job Applicant",
			"attached_to_name": applicant.name,
			"attached_to_field": "resume_attachment",
		}).insert(ignore_permissions=True)
		if stamp:
			# Straight on the row, so the push hook does not fire and each test
			# exercises only the path it is about.
			frappe.db.set_value("Job Applicant", applicant.name, "resume_attachment",
			                    f.file_url, update_modified=False)
			applicant.reload()
		return f.file_url

	def _interview(self, applicant, docstatus=0):
		doc = frappe.get_doc({
			"doctype": "Interview", "job_applicant": applicant.name,
			"interview_type": self.interview_type, "status": "Pending",
			"scheduled_on": add_days(nowdate(), -1),
			"from_time": "10:00:00", "to_time": "11:00:00",
			"interview_details": [{"interviewer": PANELIST}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		if docstatus == 2:
			# Only a decided interview may be submitted, and only a submitted one
			# cancelled.
			doc.db_set("status", "Rejected", update_modified=False)
			doc.reload()
			doc.submit()
			doc.cancel()
		return doc

	def _interview_file(self, interview, file_url):
		return frappe.db.exists("File", {"file_url": file_url,
		                                 "attached_to_doctype": "Interview",
		                                 "attached_to_name": interview})

	# ── the resume reaches the interview, in either order ──

	def test_scheduling_pulls_the_candidates_resume(self):
		applicant = self._applicant()
		url = self._upload_resume(applicant)
		interview = self._interview(applicant)

		self.assertEqual(frappe.db.get_value("Interview", interview.name, RESUME_FIELD), url)
		self.assertTrue(self._interview_file(interview.name, url))

	def test_a_resume_uploaded_later_reaches_scheduled_interviews(self):
		"""The common case: interviews are set up before the CV lands."""
		applicant = self._applicant()
		interview = self._interview(applicant)
		self.assertFalse(frappe.db.get_value("Interview", interview.name, RESUME_FIELD))

		url = self._upload_resume(applicant, stamp=False)
		applicant.reload()
		applicant.resume_attachment = url
		applicant.save(ignore_permissions=True)

		self.assertEqual(frappe.db.get_value("Interview", interview.name, RESUME_FIELD), url)
		self.assertTrue(self._interview_file(interview.name, url))

	def test_a_cancelled_interview_is_left_alone(self):
		applicant = self._applicant()
		interview = self._interview(applicant, docstatus=2)

		url = self._upload_resume(applicant, stamp=False)
		applicant.reload()
		applicant.resume_attachment = url
		applicant.save(ignore_permissions=True)

		self.assertFalse(frappe.db.get_value("Interview", interview.name, RESUME_FIELD))

	def test_a_replaced_resume_reaches_interviews_already_set_up(self):
		"""The interview mirrors the candidate's *current* CV — the field is declared
		fetch_if_empty: 0, so a replacement supersedes what the panel had."""
		applicant = self._applicant()
		first = self._upload_resume(applicant, "first")
		interview = self._interview(applicant)
		self.assertEqual(frappe.db.get_value("Interview", interview.name, RESUME_FIELD),
		                 first)

		second = self._upload_resume(applicant, "second", stamp=False)
		applicant.reload()
		applicant.resume_attachment = second
		applicant.save(ignore_permissions=True)

		self.assertEqual(frappe.db.get_value("Interview", interview.name, RESUME_FIELD),
		                 second)
		self.assertTrue(self._interview_file(interview.name, second))

	def test_no_resume_is_not_an_error(self):
		applicant = self._applicant()
		interview = self._interview(applicant)
		self.assertFalse(frappe.db.get_value("Interview", interview.name, RESUME_FIELD))
		self.assertFalse(frappe.get_all("File", filters={"attached_to_doctype": "Interview",
		                                                 "attached_to_name": interview.name}))

	# ── and the panel can actually open it ──

	def test_the_panel_could_not_open_the_candidates_copy(self):
		"""The bug: a resume is a private file on the Job Applicant, and the panel has
		no permission there — so the link refused to open."""
		applicant = self._applicant()
		url = self._upload_resume(applicant)
		self._interview(applicant)

		candidate_row = frappe.get_doc("File", frappe.db.get_value(
			"File", {"file_url": url, "attached_to_doctype": "Job Applicant"}))

		frappe.set_user(PANELIST)
		self.assertFalse(frappe.has_permission("Job Applicant", "read", doc=applicant.name))
		self.assertFalse(file_has_permission(candidate_row, "read"))

	def test_the_panel_can_open_the_interviews_copy(self):
		"""The fix: a second File row on the Interview, which they can read. Frappe
		allows the download if any document the file hangs off is readable."""
		applicant = self._applicant()
		url = self._upload_resume(applicant)
		interview = self._interview(applicant)

		frappe.set_user(PANELIST)
		self.assertTrue(frappe.has_permission("Interview", "read", doc=interview.name))
		resolved = find_file_by_url(url)
		self.assertIsNotNone(resolved)
		self.assertEqual(resolved.attached_to_doctype, "Interview")
		self.assertEqual(resolved.attached_to_name, interview.name)

	def test_the_file_is_shared_not_duplicated_on_disk(self):
		applicant = self._applicant()
		url = self._upload_resume(applicant)
		interview = self._interview(applicant)

		rows = frappe.get_all("File", filters={"file_url": url},
		                      fields=["attached_to_doctype"])
		self.assertEqual(len(rows), 2)
		self.assertEqual({r.attached_to_doctype for r in rows},
		                 {"Job Applicant", "Interview"})
		self.assertEqual(frappe.db.get_value("Interview", interview.name, RESUME_FIELD), url)
