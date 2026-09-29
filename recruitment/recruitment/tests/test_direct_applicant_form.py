"""Tests for Direct Applicant Onboarding — Phase 2 (the form a direct applicant fills).

What these pin down:

  * a form template takes only fields a candidate may fill;
  * sending stores only the token's hash, emails the link, and gives the
    candidate an Action Center card that carries no link;
  * the link works without login, and stops working once revoked, replaced by a
    re-send or a resubmission request, or expired;
  * a submission is validated (mandatory, types, only this applicant's own
    uploads), lands on the Job Applicant (incl. tables and the virtual field),
    masks Aadhaar and closes the request;
  * a resubmission opens only the fields HR picked;
  * a duplicity match on the full check keeps the data, flags the applicant for
    HR, and never shows the candidate HR's match details;
  * the CTC-proposal gate follows submission, mandatory fields and the flag.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_direct_applicant_form.run
"""

from __future__ import annotations

import io
import json
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment.tests import _settings_guard
from frappe.utils import add_days, now_datetime
from werkzeug.test import EnvironBuilder

from recruitment.api import direct_applicant as da
from recruitment.api import direct_applicant_form as dform
from recruitment.api import direct_applicant_portal as portal

PREFIX = "datestform"
FORM_NAME = "_Test DA Form"


def _valid_aadhaar(stem="23456789012"):
	for digit in "0123456789":
		if da.is_valid_aadhaar(stem + digit):
			return stem + digit
	raise AssertionError("no Verhoeff digit found")


class TestDirectApplicantForm(FrappeTestCase):
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
		cls.country = frappe.db.get_value("Country", {}, "name")
		from recruitment.api.channels._common import _child_table_fields
		from recruitment.api.direct_applicant_fields import _child_columns

		usable = {c["fieldname"] for c in _child_columns("custom_educational_qualification")}
		options = frappe.get_meta("Job Applicant").get_field("custom_educational_qualification").options
		# Plain text columns, so a test row can be filled with any string.
		cls.edu_columns = [
			c["fieldname"] for c in _child_table_fields(options)
			if c["fieldname"] in usable and c["fieldtype"] in ("Data", "Small Text")
		][:2]

	@classmethod
	def tearDownClass(cls):
		_settings_guard.restore(cls._settings_state)
		super().tearDownClass()

	def setUp(self):
		frappe.set_user("Administrator")
		frappe.db.set_single_value("Recruitment Settings", da.ENABLE_FIELD, 1)
		self.mails = []
		self._patches = [
			patch("frappe.sendmail", side_effect=lambda **kw: self.mails.append(kw)),
		]
		for p in self._patches:
			p.start()
		self.applicant = da.create_direct_applicant(self._payload())["name"]
		self.form = self._make_form()

	def tearDown(self):
		for p in self._patches:
			p.stop()
		frappe.set_user("Administrator")
		frappe.local.request = None
		frappe.db.rollback()

	# ---------------------------------------------------------------- helpers --
	def _payload(self):
		return {
			"first_name": "Form", "last_name": "Tester",
			"email_id": f"{PREFIX}{frappe.generate_hash(length=8)}@example.com",
			"phone_number": "9876500001", "company": self.company,
			"designation": self.designation, "department": self.department,
			"employment_type": self.employment_type, "category": "Experienced",
		}

	def _make_form(self, name=FORM_NAME, rows=None):
		if frappe.db.exists(dform.FORM, name):
			frappe.delete_doc(dform.FORM, name, force=True)
		rows = rows or [
			{"fieldname": "custom_pan_number", "mandatory": 1},
			{"fieldname": "custom_da_aadhaar_masked", "mandatory": 1},
			{"fieldname": "custom_current_ctc", "mandatory": 0},
			{"fieldname": "country", "mandatory": 0},
			{"fieldname": "basic_info", "mandatory": 0},
			{"fieldname": "resume_attachment", "mandatory": 0},
			{"fieldname": "custom_educational_qualification", "mandatory": 0,
			 "child_fields": ", ".join(self.edu_columns)},
		]
		return frappe.get_doc({"doctype": dform.FORM, "form_name": name, "fields": rows}).insert().name

	def _send(self, token="tok-first"):
		with patch("recruitment.api.direct_applicant_form.secrets.token_urlsafe", return_value=token):
			dform.send_form(self.applicant, self.form)
		return token

	def _as_guest(self, fn, *args, **kwargs):
		frappe.set_user("Guest")
		try:
			return fn(*args, **kwargs)
		finally:
			frappe.set_user("Administrator")

	def _good_data(self, **overrides):
		data = {
			"custom_pan_number": "ABCDE1234F",
			"custom_da_aadhaar_masked": _valid_aadhaar(),
			"custom_current_ctc": "10 LPA",
			"country": self.country,
			"basic_info": "hello virtual",
			"resume_attachment": "",
			"custom_educational_qualification": [],
		}
		data.update(overrides)
		return data

	# --------------------------------------------------------------- template --
	def test_template_rejects_fields_a_candidate_may_not_fill(self):
		for fieldname in ("email_id", "designation", "custom_ctc_finalized", "custom_pre_offer_forms", "status"):
			with self.assertRaises(frappe.ValidationError):
				self._make_form(name="_Test DA Bad", rows=[{"fieldname": fieldname}])

	def test_template_rejects_duplicates_and_fills_details(self):
		with self.assertRaises(frappe.ValidationError):
			self._make_form(name="_Test DA Dup", rows=[{"fieldname": "custom_pan_number"}, {"fieldname": "custom_pan_number"}])
		row = frappe.get_doc(dform.FORM, self.form).fields[0]
		self.assertEqual((row.fieldtype, row.label), ("Data", "PAN"))
		self.assertTrue(row.section)

	def test_template_rejects_unknown_table_column(self):
		with self.assertRaises(frappe.ValidationError):
			self._make_form(name="_Test DA Col", rows=[
				{"fieldname": "custom_educational_qualification", "child_fields": "no_such_column"}
			])

	# ------------------------------------------------------------ default form --
	def test_default_form_is_the_fallback(self):
		default = self._make_form(name="_Test DA Default", rows=[{"fieldname": "custom_pan_number"}])
		frappe.db.set_value(dform.FORM, default, "is_default", 1)
		# Only forms for another company exist besides the default -> default is offered.
		other_company = frappe.db.get_value("Company", {"name": ["!=", self.company]}, "name")
		frappe.db.set_value(dform.FORM, self.form, "company", other_company)
		for name in frappe.get_all(dform.FORM, filters={"name": ["not in", [default, self.form]]}, pluck="name"):
			frappe.db.set_value(dform.FORM, name, "disabled", 1)
		self.assertEqual(dform.get_forms_for_applicant(self.applicant), [default])
		# A form that applies to the applicant wins over the default.
		frappe.db.set_value(dform.FORM, self.form, "company", self.company)
		self.assertEqual(dform.get_forms_for_applicant(self.applicant), [self.form])

	def test_only_one_default_form(self):
		first = self._make_form(name="_Test DA Default A", rows=[{"fieldname": "custom_pan_number"}])
		second = self._make_form(name="_Test DA Default B", rows=[{"fieldname": "custom_pan_number"}])
		for name in (first, second):
			doc = frappe.get_doc(dform.FORM, name)
			doc.is_default = 1
			doc.save()
		self.assertEqual(frappe.get_all(dform.FORM, filters={"is_default": 1}, pluck="name"), [second])

	def test_empty_form_is_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc({"doctype": dform.FORM, "form_name": "_Test DA Empty", "fields": []}).insert()

	def test_standard_form_seeded_as_default(self):
		standard = "Standard Direct Applicant Form"
		if not frappe.db.exists(dform.FORM, standard):
			self.skipTest("standard form not seeded on this site")
		doc = frappe.get_doc(dform.FORM, standard)
		self.assertEqual(doc.is_default, 1)
		self.assertIn("custom_pan_number", [r.fieldname for r in doc.fields])

	# -------------------------------------------------------------------- send --
	def test_send_stores_only_the_token_hash(self):
		token = self._send()
		request = dform.latest_request(self.applicant)
		self.assertEqual(request.status, dform.SENT)
		self.assertEqual(request.token_hash, dform.hash_token(token))
		self.assertNotIn(token, json.dumps(request.as_dict(), default=str))
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, dform.STATUS_FIELD), dform.SENT)
		# The email carries the link; the Action Center card does not.
		self.assertIn(dform.form_link(token), self.mails[-1]["message"])
		item = frappe.get_doc(dform.ACTION_ITEM, request.action_item)
		self.assertNotIn(token, (item.redirect_url or "") + (item.description or ""))
		self.assertEqual(item.status, "Action Required")

	def test_send_logs_a_communication_without_the_link(self):
		token = self._send()
		mail = self.mails[-1]
		comm = frappe.get_doc("Communication", mail["communication"])
		self.assertEqual((comm.reference_doctype, comm.reference_name), ("Job Applicant", self.applicant))
		self.assertEqual(comm.sent_or_received, "Sent")
		self.assertNotIn(token, comm.content)
		self.assertIn(token, mail["message"])

	def test_send_uses_the_configured_email_template(self):
		template = frappe.db.get_single_value("Recruitment Settings", "da_form_email_template")
		if not template:
			self.skipTest("no form email template set")
		frappe.db.set_value("Email Template", template, "subject", "Custom subject for {{ applicant_name }}")
		self._send()
		self.assertEqual(self.mails[-1]["subject"], "Custom subject for Form Tester")

	def test_send_gives_a_new_candidate_a_portal_account(self):
		email = frappe.db.get_value("Job Applicant", self.applicant, "email_id")
		self.assertFalse(frappe.db.exists("Candidate Portal User", email))
		self._send()
		cpu = frappe.get_doc("Candidate Portal User", email)
		self.assertEqual((cpu.status, cpu.job_applicant, cpu.candidate_source),
			("Pending Verification", self.applicant, "Direct Applicant"))
		request = dform.latest_request(self.applicant)
		self.assertIn(f"{dform.PORTAL_ROUTE}?request={request.name}", self.mails[-1]["message"])

	def test_send_keeps_an_existing_portal_account(self):
		email = frappe.db.get_value("Job Applicant", self.applicant, "email_id")
		frappe.get_doc({"doctype": "Candidate Portal User", "email": email, "status": "Active"}).insert(ignore_permissions=True)
		self._send()
		self.assertEqual(frappe.db.get_value("Candidate Portal User", email, "status"), "Active")

	def test_only_hr_can_send(self):
		with self.assertRaises(frappe.PermissionError):
			self._as_guest(dform.send_form, self.applicant, self.form)

	def test_non_direct_applicant_is_refused(self):
		frappe.db.set_value("Job Applicant", self.applicant, da.DIRECT_FLAG, 0)
		with self.assertRaises(frappe.ValidationError):
			self._send()

	# -------------------------------------------------------------------- link --
	def test_guest_can_open_the_form(self):
		token = self._send()
		data = self._as_guest(portal.get_form, token)
		names = [f["fieldname"] for f in data["fields"]]
		self.assertIn("custom_pan_number", names)
		self.assertTrue(all(f["editable"] for f in data["fields"]))
		table = next(f for f in data["fields"] if f["fieldname"] == "custom_educational_qualification")
		self.assertEqual([c["fieldname"] for c in table["child"]], self.edu_columns)

	def test_unknown_token_is_refused(self):
		self._send()
		with self.assertRaises(portal.LinkUnavailable):
			self._as_guest(portal.get_form, "not-a-token")

	def test_expired_link_is_refused(self):
		token = self._send()
		frappe.db.set_value(dform.REQUEST, dform.latest_request(self.applicant).name, "expires_on", add_days(now_datetime(), -1))
		with self.assertRaises(portal.LinkUnavailable):
			self._as_guest(portal.get_form, token)

	def test_revoked_and_resent_links_stop_working(self):
		first = self._send("tok-a")
		second = self._send("tok-b")
		with self.assertRaises(portal.LinkUnavailable):
			self._as_guest(portal.get_form, first)
		self._as_guest(portal.get_form, second)
		dform.revoke_form(self.applicant)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_guest(portal.get_form, second)
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, dform.STATUS_FIELD), dform.REVOKED)

	def test_feature_off_kills_links(self):
		token = self._send()
		frappe.db.set_single_value("Recruitment Settings", da.ENABLE_FIELD, 0)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_guest(portal.get_form, token)

	# ------------------------------------------------------------------ submit --
	def test_submit_saves_onto_applicant(self):
		token = self._send()
		rows = [{self.edu_columns[0]: "X"}] if self.edu_columns else []
		self._as_guest(portal.submit_form, token, json.dumps(self._good_data(custom_educational_qualification=rows)))
		applicant = frappe.get_doc("Job Applicant", self.applicant)
		self.assertEqual(applicant.custom_pan_number, "ABCDE1234F")
		self.assertEqual(applicant.custom_da_aadhaar_masked, "XXXX-XXXX-" + _valid_aadhaar()[-4:])
		self.assertEqual(applicant.custom_current_ctc, "10 LPA")
		self.assertEqual(applicant.get("basic_info"), "hello virtual")
		self.assertEqual(len(applicant.custom_educational_qualification), len(rows))
		self.assertEqual(applicant.get(dform.STATUS_FIELD), dform.SUBMITTED)
		request = dform.latest_request(self.applicant)
		self.assertEqual(request.status, dform.SUBMITTED)
		self.assertEqual(frappe.db.get_value(dform.ACTION_ITEM, request.action_item, "status"), "Completed")
		# Submitted: the link now only shows the thank-you state and refuses a second submit.
		self.assertEqual(self._as_guest(portal.get_form, token)["status"], dform.SUBMITTED)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_guest(portal.submit_form, token, json.dumps(self._good_data()))

	def test_submit_enforces_mandatory_and_types(self):
		token = self._send()
		for bad in (
			self._good_data(custom_pan_number=""),               # mandatory
			self._good_data(custom_da_aadhaar_masked="1234"),    # invalid Aadhaar
			self._good_data(country="Atlantis-Nowhere"),         # unknown link
			dict(self._good_data(), email_id="x@example.com"),   # not on the form
			self._good_data(resume_attachment="/private/files/someone-else.pdf"),  # not our upload
		):
			with self.assertRaises(frappe.ValidationError):
				self._as_guest(portal.submit_form, token, json.dumps(bad))
		self.assertEqual(dform.latest_request(self.applicant).status, dform.SENT)

	def test_upload_is_attached_to_the_applicant(self):
		token = self._send()
		frappe.local.request = EnvironBuilder(
			method="POST", data={"file": (io.BytesIO(b"resume text"), "cv.docx")}
		).get_request()
		frappe.local.request_ip = "127.0.0.1"
		uploaded = self._as_guest(portal.upload_file, token, "resume_attachment")
		frappe.local.request = None
		file = frappe.get_doc("File", {"file_url": uploaded["file_url"]})
		self.assertEqual((file.attached_to_doctype, file.attached_to_name, file.is_private), ("Job Applicant", self.applicant, 1))
		self._as_guest(portal.submit_form, token, json.dumps(self._good_data(resume_attachment=uploaded["file_url"])))
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, "resume_attachment"), uploaded["file_url"])

	def test_damaged_pdf_gets_a_readable_error(self):
		token = self._send()
		frappe.local.request_ip = "127.0.0.1"
		frappe.local.request = EnvironBuilder(
			method="POST", data={"file": (io.BytesIO(b"%PDF-1.4 truncated"), "cv.pdf")}
		).get_request()
		with self.assertRaises(frappe.ValidationError):
			self._as_guest(portal.upload_file, token, "resume_attachment")

	def test_upload_rejects_other_fields_and_file_types(self):
		token = self._send()
		frappe.local.request_ip = "127.0.0.1"
		frappe.local.request = EnvironBuilder(
			method="POST", data={"file": (io.BytesIO(b"MZ"), "run.exe")}
		).get_request()
		with self.assertRaises(frappe.ValidationError):
			self._as_guest(portal.upload_file, token, "resume_attachment")
		with self.assertRaises(frappe.ValidationError):
			self._as_guest(portal.upload_file, token, "custom_pan_number")

	def test_link_search_is_limited_to_form_fields(self):
		token = self._send()
		results = self._as_guest(portal.search_link, token, "country", self.country[:3])
		self.assertIn(self.country, [r["value"] for r in results])
		with self.assertRaises(frappe.ValidationError):
			self._as_guest(portal.search_link, token, "custom_pan_number", "a")

	# ------------------------------------------------------- candidate portal --
	def _as_candidate(self, email, fn, *args, **kwargs):
		"""Call a portal core function as a logged-in candidate (the session cookie
		check itself is candidate_auth.candidate_required's)."""
		frappe.set_user("Guest")
		frappe.local.candidate = email
		try:
			return fn(*args, **kwargs)
		finally:
			frappe.local.candidate = None
			frappe.set_user("Administrator")

	def test_action_card_opens_the_portal_page_without_token(self):
		token = self._send()
		request = dform.latest_request(self.applicant)
		url = frappe.db.get_value(dform.ACTION_ITEM, request.action_item, "redirect_url")
		self.assertEqual(url, f"{dform.PORTAL_ROUTE}?request={request.name}")
		self.assertNotIn(token, url)

	def test_candidate_gets_own_form_and_submits(self):
		self._send()
		request = dform.latest_request(self.applicant)
		email = request.email
		data = self._as_candidate(email, lambda: portal._form_payload(portal._request_for_candidate(request.name)))
		self.assertIn("custom_pan_number", [f["fieldname"] for f in data["fields"]])
		self._as_candidate(email, lambda: portal._submit(
			portal._request_for_candidate(request.name, for_submit=True), json.dumps(self._good_data())
		))
		self.assertEqual(dform.latest_request(self.applicant).status, dform.SUBMITTED)
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, "custom_pan_number"), "ABCDE1234F")

	def test_other_candidate_is_refused(self):
		self._send()
		request = dform.latest_request(self.applicant)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_candidate("someone-else@example.com", portal._request_for_candidate, request.name)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_candidate("", portal._request_for_candidate, request.name)

	def test_replaced_request_is_refused_in_portal(self):
		self._send("tok-old")
		old = dform.latest_request(self.applicant)
		self._send("tok-new")
		with self.assertRaises(portal.LinkUnavailable):
			self._as_candidate(old.email, portal._request_for_candidate, old.name)
		new = dform.latest_request(self.applicant)
		self._as_candidate(new.email, portal._request_for_candidate, new.name)

	def test_portal_endpoint_needs_candidate_session(self):
		self._send()
		request = dform.latest_request(self.applicant)
		frappe.set_user("Guest")
		try:
			with self.assertRaises(frappe.AuthenticationError):
				portal.get_my_form(request.name)
		finally:
			frappe.set_user("Administrator")

	# ------------------------------------------------------ review fixes --
	def test_table_submit_keeps_columns_not_on_the_form(self):
		if len(self.edu_columns) < 2:
			self.skipTest("need two text columns")
		shown, hidden = self.edu_columns
		# The form shows only the first column; HR filled the second earlier.
		self._make_form(name="_Test DA One Col", rows=[
			{"fieldname": "custom_educational_qualification", "child_fields": shown},
		])
		applicant = frappe.get_doc("Job Applicant", self.applicant)
		applicant.append("custom_educational_qualification", {shown: "Old", hidden: "Kept by HR"})
		applicant.save()
		row_name = applicant.custom_educational_qualification[0].name
		with patch("recruitment.api.direct_applicant_form.secrets.token_urlsafe", return_value="tok-merge"):
			dform.send_form(self.applicant, "_Test DA One Col")
		self._as_guest(portal.submit_form, "tok-merge", json.dumps({"custom_educational_qualification": [{shown: "New"}]}))
		row = frappe.get_doc("Job Applicant", self.applicant).custom_educational_qualification[0]
		self.assertEqual((row.get(shown), row.get(hidden), row.name), ("New", "Kept by HR", row_name))

	def test_attachment_must_be_the_candidates_own_upload(self):
		token = self._send()
		hr_file = frappe.get_doc({
			"doctype": "File", "file_name": "internal.txt", "content": b"hr only", "is_private": 1,
			"attached_to_doctype": "Job Applicant", "attached_to_name": self.applicant,
		}).insert()
		with self.assertRaises(frappe.ValidationError):
			self._as_guest(portal.submit_form, token, json.dumps(self._good_data(resume_attachment=hr_file.file_url)))

	def test_submitted_link_no_longer_returns_the_data(self):
		token = self._send()
		self._as_guest(portal.submit_form, token, json.dumps(self._good_data()))
		data = self._as_guest(portal.get_form, token)
		self.assertEqual(data["status"], dform.SUBMITTED)
		self.assertTrue(all(f["value"] is None for f in data["fields"]))

	def test_numbers_are_parsed_strictly(self):
		from recruitment.api.direct_applicant_fields import _clean_value

		applicant = frappe.get_doc("Job Applicant", self.applicant)
		self.assertEqual(_clean_value(applicant, {"fieldtype": "Int", "label": "N"}, "42"), 42)
		self.assertEqual(_clean_value(applicant, {"fieldtype": "Currency", "label": "C"}, "1,200.5"), 1200.5)
		for bad in ("abc", "4.5"):
			with self.assertRaises(frappe.ValidationError):
				_clean_value(applicant, {"fieldtype": "Int", "label": "N"}, bad)

	def test_links_to_transactions_are_never_offered(self):
		from recruitment.api.direct_applicant_fields import link_denied

		for doctype in ("Job Offer", "Job Opening", "Salary Slip", "Recruitment Settings", "Employee"):
			self.assertTrue(link_denied(doctype), doctype)
		self.assertFalse(link_denied("Country"))

	# ------------------------------------------------------------ resubmission --
	def test_resubmission_opens_only_chosen_fields(self):
		first = self._send()
		self._as_guest(portal.submit_form, first, json.dumps(self._good_data()))
		with patch("recruitment.api.direct_applicant_form.secrets.token_urlsafe", return_value="tok-resubmit"):
			dform.request_resubmission(self.applicant, json.dumps(["custom_pan_number"]), "PAN is wrong")
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, dform.STATUS_FIELD), dform.RESUBMIT)
		with self.assertRaises(portal.LinkUnavailable):
			self._as_guest(portal.get_form, first)
		data = self._as_guest(portal.get_form, "tok-resubmit")
		self.assertEqual([f["fieldname"] for f in data["fields"] if f["editable"]], ["custom_pan_number"])
		self.assertEqual(data["resubmit_note"], "PAN is wrong")
		with self.assertRaises(frappe.ValidationError):
			self._as_guest(portal.submit_form, "tok-resubmit", json.dumps({"custom_current_ctc": "99"}))
		self._as_guest(portal.submit_form, "tok-resubmit", json.dumps({"custom_pan_number": "ZZZZZ9999Z"}))
		self.assertEqual(frappe.db.get_value("Job Applicant", self.applicant, "custom_pan_number"), "ZZZZZ9999Z")
		self.assertEqual(dform.latest_request(self.applicant).status, dform.SUBMITTED)

	def test_resubmission_needs_a_submitted_form(self):
		self._send()
		with self.assertRaises(frappe.ValidationError):
			dform.request_resubmission(self.applicant, json.dumps(["custom_pan_number"]))

	# --------------------------------------------------------------- duplicity --
	def test_duplicity_match_flags_but_keeps_data(self):
		token = self._send()
		frappe.local.message_log = []
		with patch(
			"recruitment.customizations.ta_duplicity_check.check_duplicity",
			side_effect=lambda doc: frappe.throw("Matches applicant HR-APP-0001 (secret)"),
		):
			self._as_guest(portal.submit_form, token, json.dumps(self._good_data()))
		applicant = frappe.get_doc("Job Applicant", self.applicant)
		self.assertEqual(applicant.custom_pan_number, "ABCDE1234F")
		self.assertEqual(applicant.get(dform.DUPLICITY_FLAG), 1)
		self.assertIn("HR-APP-0001", applicant.get(dform.DUPLICITY_NOTE))
		# The candidate's response carries none of HR's match details.
		self.assertFalse(any("HR-APP-0001" in str(m) for m in frappe.local.message_log))
		self.assertFalse(dform.form_ready_for_proposal(self.applicant)[0])
		dform.clear_duplicity_flag(self.applicant)
		self.assertTrue(dform.form_ready_for_proposal(self.applicant)[0])

	def test_full_check_runs_with_the_full_duplicity_flag(self):
		token = self._send()
		seen = {}

		def spy(doc):
			seen["full"] = bool(doc.flags.get(da.FULL_DUPLICITY_FLAG))

		with patch("recruitment.customizations.ta_duplicity_check.check_duplicity", side_effect=spy):
			self._as_guest(portal.submit_form, token, json.dumps(self._good_data()))
		self.assertTrue(seen.get("full"))

	# ------------------------------------------------------------ proposal gate --
	def test_proposal_gate(self):
		self.assertFalse(dform.form_ready_for_proposal(self.applicant)[0])
		token = self._send()
		self.assertFalse(dform.form_ready_for_proposal(self.applicant)[0])
		self._as_guest(portal.submit_form, token, json.dumps(self._good_data()))
		self.assertTrue(dform.form_ready_for_proposal(self.applicant)[0])
		# A mandatory value cleared afterwards blocks it again.
		frappe.db.set_value("Job Applicant", self.applicant, "custom_pan_number", None)
		ok, reason = dform.form_ready_for_proposal(self.applicant)
		self.assertFalse(ok)
		self.assertIn("PAN", reason)


def run():
	import unittest

	unittest.main(module=__name__, argv=["run"], exit=False, verbosity=2)
