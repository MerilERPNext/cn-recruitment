"""Tests for the two TPO emails: institute welcome, and campus invite.

The welcome is also the TPO's account mail — it provisions their Desk user and
carries the set-password link — so the Campus Invite submit no longer sends a
second "set your password" mail to someone who already has an account.

Both are configuration-driven (Campus Settings toggles + Email Templates), so what
is pinned here is exactly that: who gets each mail, that nobody is mailed twice,
that a toggle or a missing template silences it, and that a mail failure never
rolls back the institute or invite that triggered it.

`frappe.sendmail` is replaced throughout — no test ever reaches an SMTP server.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_tpo_mailers.run
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment import tpo_mailers as tm

PREFIX = "_Test Mail"
PRIMARY = "primary.tpo@mailtest.local"
INVITE_SUBJECT = "Campus Recruitment Drive"
ASSISTANT = "asst.tpo@mailtest.local"


class TestTpoMailers(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		tm.ensure_default_email_templates()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Campus Invite",
		                           filters={"campus_invite_name": ("like", f"{PREFIX}%")}, pluck="name"):
			doc = frappe.get_doc("Campus Invite", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("Campus Invite", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("Institute", filters={"institute_name": ("like", f"{PREFIX}%")},
		                           pluck="name"):
			frappe.delete_doc("Institute", name, force=True, ignore_permissions=True)
		for name in frappe.get_all("User", filters={"email": ("like", "%@mailtest.local")},
		                           pluck="name"):
			frappe.delete_doc("User", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	def setUp(self):
		frappe.set_user("Administrator")
		self.sent = []
		self._real_sendmail = frappe.sendmail
		frappe.sendmail = lambda **kw: self.sent.append(kw)
		self._config(welcome=1, invite=1)

	def tearDown(self):
		frappe.sendmail = self._real_sendmail
		frappe.set_user("Administrator")
		frappe.db.rollback()

	# ── helpers ──

	def _config(self, welcome=1, invite=1, welcome_template=tm.WELCOME_TEMPLATE,
	            invite_template=tm.INVITE_TEMPLATE):
		frappe.db.set_single_value("Campus Settings", {
			tm.WELCOME_ENABLED_FIELD: welcome,
			tm.WELCOME_TEMPLATE_FIELD: welcome_template,
			tm.INVITE_ENABLED_FIELD: invite,
			tm.INVITE_TEMPLATE_FIELD: invite_template,
		})

	def _institute(self, suffix="", contacts=None):
		doc = frappe.get_doc({
			"doctype": "Institute", "institute_name": f"{PREFIX} College{suffix}",
			"tier": "Tier-1", "is_active": 1,
			"tpo_contacts": contacts if contacts is not None else [
				{"contact_name": "Primary Person", "role": "Primary TPO", "email": PRIMARY},
				{"contact_name": "Assistant Person", "role": "Asst TPO", "email": ASSISTANT},
			],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True)

	def _recipients(self, subject_contains=None):
		out = []
		for kw in self.sent:
			if subject_contains and subject_contains not in (kw.get("subject") or ""):
				continue
			out.extend(kw.get("recipients") or [])
		return out

	# ── welcome ──

	def test_the_primary_tpo_is_welcomed_when_the_institute_is_created(self):
		self._institute()
		self.assertEqual(self._recipients(), [PRIMARY])

	def test_the_other_contacts_are_not_welcomed(self):
		"""Only the Primary TPO — the other contacts are carried for reference."""
		self._institute()
		self.assertNotIn(ASSISTANT, self._recipients())

	def test_the_row_is_marked_so_nobody_is_welcomed_twice(self):
		institute = self._institute()
		row = next(r for r in institute.tpo_contacts if r.role == "Primary TPO")
		self.assertTrue(frappe.db.get_value("Institute TPO Contact", row.name, "welcome_sent"))

		self.sent.clear()
		institute.reload()
		institute.batch_size = 321
		institute.save(ignore_permissions=True)
		self.assertEqual(self.sent, [], "a re-save must not mail anyone again")

	def test_a_new_primary_tpo_is_welcomed(self):
		"""An institute has one Primary TPO; when that changes, the new one gets theirs
		— which is also what happens when an institute was created without one."""
		institute = self._institute(contacts=[
			{"contact_name": "Assistant Person", "role": "Asst TPO", "email": ASSISTANT}])
		self.assertEqual(self.sent, [])

		institute.append("tpo_contacts", {"contact_name": "Primary Person",
		                                  "role": "Primary TPO", "email": PRIMARY})
		institute.save(ignore_permissions=True)
		self.assertEqual(self._recipients(), [PRIMARY])

	def test_a_contact_with_no_email_is_skipped(self):
		self._institute(contacts=[{"contact_name": "Nameless", "role": "Primary TPO"}])
		self.assertEqual(self.sent, [])

	def test_the_toggle_silences_it(self):
		self._config(welcome=0)
		self._institute()
		self.assertEqual(self.sent, [])

	def test_a_missing_template_sends_nothing_and_marks_nobody(self):
		"""So the mail goes out for real once the template is put back."""
		self._config(welcome_template="No Such Template")
		institute = self._institute()
		self.assertEqual(self.sent, [])
		row = next(r for r in institute.tpo_contacts if r.role == "Primary TPO")
		self.assertFalse(frappe.db.get_value("Institute TPO Contact", row.name, "welcome_sent"))

	def test_a_mail_failure_never_blocks_the_institute(self):
		def boom(**kw):
			raise Exception("SMTP is down")

		frappe.sendmail = boom
		institute = self._institute()  # must not raise
		self.assertTrue(frappe.db.exists("Institute", institute.name))

	# ── campus invite ──

	def test_the_invite_goes_to_every_contact(self):
		institute = self._institute()
		self.sent.clear()
		self._invite(institute).submit()
		invited = self._recipients(INVITE_SUBJECT)
		self.assertEqual(sorted(invited), sorted([PRIMARY, ASSISTANT]))

	def test_each_contact_gets_their_own_mail_greeting_them_by_name(self):
		"""One send per contact — a shared render could only say "Dear TPO"."""
		institute = self._institute()
		self.sent.clear()
		self._invite(institute).submit()
		invite_mails = [
			kw for kw in self.sent if INVITE_SUBJECT in (kw.get("subject") or "")
		]
		self.assertEqual(len(invite_mails), 2, "one mail each, not one to both")
		by_recipient = {kw["recipients"][0]: kw.get("message") or "" for kw in invite_mails}
		self.assertIn("Dear Primary Person", by_recipient[PRIMARY])
		self.assertIn("Dear Assistant Person", by_recipient[ASSISTANT])

	def test_the_invite_carries_the_tpo_portal_link(self):
		institute = self._institute()
		self.sent.clear()
		self._invite(institute).submit()
		message = next(
			kw["message"] for kw in self.sent if INVITE_SUBJECT in (kw.get("subject") or "")
		)
		self.assertIn("/app/tpo-space", message)

	def test_the_deadline_is_stated_when_the_invite_has_one(self):
		institute = self._institute()
		self.sent.clear()
		invite = self._invite(institute)
		invite.registration_expiry_date = "2026-11-30"
		invite.submit()
		message = next(
			kw["message"] for kw in self.sent if INVITE_SUBJECT in (kw.get("subject") or "")
		)
		self.assertIn(frappe.utils.formatdate("2026-11-30"), message)

	def test_no_deadline_reads_as_a_sentence_not_as_None(self):
		"""The field is optional; "by None" in a mail to a college is not recoverable."""
		institute = self._institute()
		self.sent.clear()
		self._invite(institute).submit()
		message = next(
			kw["message"] for kw in self.sent if INVITE_SUBJECT in (kw.get("subject") or "")
		)
		self.assertNotIn("None", message)
		self.assertIn("at the earliest", message)

	def test_no_set_password_mail_when_the_tpo_already_has_an_account(self):
		"""The welcome mail provisioned them and carried the link — submitting an
		invite must not write to the same person about the same login again."""
		institute = self._institute()
		self.assertTrue(frappe.db.exists("User", PRIMARY), "welcome should provision")
		self.sent.clear()
		self._invite(institute).submit()
		self.assertEqual(self._recipients("Set your password"), [])
		self.assertTrue(self._recipients(INVITE_SUBJECT))

	def test_a_tpo_with_no_account_still_gets_a_set_password_mail(self):
		"""An institute recorded before the welcome provisioned accounts, or one
		whose welcome failed. Desk access nobody is told about is worse than a
		second email."""
		institute = self._institute()
		frappe.delete_doc("User", PRIMARY, force=True, ignore_permissions=True)
		self.sent.clear()
		self._invite(institute).submit()
		self.assertEqual(self._recipients("Set your password"), [PRIMARY])

	def test_the_invite_toggle_silences_only_the_invite_mail(self):
		institute = self._institute()
		self._config(invite=0)
		self.sent.clear()
		self._invite(institute).submit()
		self.assertEqual(self._recipients(INVITE_SUBJECT), [])

	def test_a_missing_invite_template_does_not_block_the_submit(self):
		institute = self._institute()
		self._config(invite_template="No Such Template")
		self.sent.clear()
		invite = self._invite(institute)
		invite.submit()  # must not raise
		self.assertEqual(invite.docstatus, 1)
		self.assertEqual(self._recipients(INVITE_SUBJECT), [])

	def _invite(self, institute):
		doc = frappe.get_doc({
			"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
			"institutes": [{"institute": institute.name}],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True)

	# ── the shipped templates ──

	def test_both_templates_ship_and_are_never_rewritten(self):
		for name in (tm.WELCOME_TEMPLATE, tm.INVITE_TEMPLATE):
			self.assertTrue(frappe.db.exists("Email Template", name))

		frappe.db.set_value("Email Template", tm.WELCOME_TEMPLATE, "subject", "Edited by HR")
		self.assertEqual(tm.ensure_default_email_templates(), [])
		self.assertEqual(
			frappe.db.get_value("Email Template", tm.WELCOME_TEMPLATE, "subject"), "Edited by HR")

	def test_the_templates_render_the_context(self):
		institute = self._institute()
		self.assertTrue(self.sent)
		message = self.sent[0].get("message") or ""
		self.assertIn(institute.institute_name, message)

	def test_the_welcome_mail_carries_the_set_password_link(self):
		"""It is the only mail the TPO gets, so the link has to be in it."""
		self._institute()
		self.assertTrue(self.sent)
		message = self.sent[0].get("message") or ""
		self.assertIn("/update-password?key=", message)
		self.assertIn(PRIMARY, message, "the login email is stated")

	def test_the_welcome_mail_provisions_the_tpo_desk_user(self):
		self._institute()
		self.assertTrue(frappe.db.exists("User", PRIMARY))
		roles = frappe.get_all("Has Role", filters={"parent": PRIMARY}, pluck="role")
		self.assertIn("TPO", roles)


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_tpo_mailers.run
	"""
	import unittest

	frappe.flags.in_test = True
	suite = unittest.TestLoader().loadTestsFromTestCase(TestTpoMailers)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	return {"tests": result.testsRun, "failures": len(result.failures),
	        "errors": len(result.errors)}
