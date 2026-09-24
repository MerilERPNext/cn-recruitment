"""Tests for the walk-in who registers at the drive itself.

A candidate scans the Campus Drive's QR, picks their institute and an opening, and
fills the form — no TPO pre-registration, so no Campus Invite in their URL. Three
things went wrong with that candidate and are covered here:

  1. their first name came back as the WHOLE name. The submit merged the surname
     into `applicant_name`, the field labelled "Applicant First Name", so
     "Yaswanth Kumar" + "Dasari" was stored as first name "Yaswanth Kumar Dasari"
     AND surname "Dasari". The parts now stay exactly as typed and the whole name
     is the derived `custom_full_name`;
  2. they carried no Campus Invite, so nothing on them said which campus they came
     from — and `custom_region`, which is fetched off the invite, stayed empty;
  3. they appeared NOWHERE on the drive board. Every pool matched candidates by
     invite, and this one has none, so the candidates tab, the round pools and GD
     grouping all skipped a candidate who was standing in the hall.

Run:  bench --site <site> execute \
        recruitment.recruitment.tests.test_campus_spot_registration.run
"""

from __future__ import annotations

import json

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, formatdate, nowdate

from recruitment.api.candidate_verification import verify_applicant_email
from recruitment.api.channels import _common, campus_drive_spot as spot
from recruitment.api.channels._common import (
	assert_child_table_rules,
	get_required_education_stages,
)
from recruitment.api.channels.campus_drive_spot import registration_status
from recruitment.recruitment.campus_helpers import invite_for_drive_institute
from recruitment.recruitment.doctype.campus_drive import campus_drive as cd

PREFIX = "_Test Spot"
GD_STAGE = "Group Discussion"
EMAIL = "spot.walkin@test.local"
# The education grid on Job Applicant, and its Education Stage column.
EDUCATION_FIELD = "custom_educational_qualification"
STAGE_COLUMN = "qualification"
YEAR_COLUMN = "year_of_passing"
# A history that reads forwards: 10th in 2016, 12th in 2018, Graduation in 2020.
BASE_YEAR = 2016

# The name as the candidate types it into the two boxes on the form.
FIRST = "Yaswanth Kumar"
LAST = "Dasari"
FULL = "Yaswanth Kumar Dasari"


class TestCampusSpotRegistration(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls._purge()
		cls.region = cls._region()
		cls.institute = cls._institute()
		cls.opening = cls._opening()
		cls.invite = cls._invite()
		cls.drive, cls.gd_code = cls._drive()
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._purge()
		super().tearDownClass()

	@classmethod
	def _purge(cls):
		for name in frappe.get_all("Job Applicant", filters={"email_id": EMAIL}, pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		for doctype, field in (("Campus Drive", "drive_name"), ("Campus Invite", "campus_invite_name"),
		                       ("Job Opening", "job_title"), ("Institute", "institute_name"),
		                       ("Region", "location_region")):
			for name in frappe.get_all(doctype, filters={field: ("like", f"{PREFIX}%")}, pluck="name"):
				doc = frappe.get_doc(doctype, name)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		frappe.db.commit()

	# ── fixtures ──

	@classmethod
	def _region(cls):
		doc = frappe.get_doc({"doctype": "Region", "location_region": f"{PREFIX} Region"})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _institute(cls):
		doc = frappe.get_doc({"doctype": "Institute", "institute_name": f"{PREFIX} College",
		                      "tier": "Tier-1", "is_active": 1,
		                      "tpo_contacts": [{"contact_name": "S TPO", "role": "Primary TPO",
		                                        "email": "spot.tpo@test.local"}]})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _opening(cls):
		"""An opening whose campus form asks for exactly the two name boxes."""
		doc = frappe.get_doc({
			"doctype": "Job Opening", "job_title": f"{PREFIX} Opening",
			"company": frappe.get_all("Company", pluck="name")[0],
			"designation": frappe.get_all("Designation", pluck="name")[0], "status": "Open",
			"custom_hiring_stages": [{"stage_name": GD_STAGE, "stage_type": "Interview",
			                          "owner_role": "System", "notify": 0, "auto": 1}],
			"custom_application_fields": [
				{"section": "Basic Details", "reference_name": "applicant_name",
				 "display_name": "Applicant First Name", "fieldtype": "Data",
				 "view_campus": 1, "mandatory_campus": 1},
				{"section": "Basic Details", "reference_name": "custom_applicant_last_name",
				 "display_name": "Applicant Last Name", "fieldtype": "Data",
				 "view_campus": 1, "mandatory_campus": 1},
				# The education grid, showing the Education Stage column — that column
				# is what the Required Education Stages rule attaches to.
				{"section": "Education", "reference_name": EDUCATION_FIELD,
				 "display_name": "Educational Qualification", "fieldtype": "Table",
				 "view_campus": 1, "mandatory_campus": 0,
				 "child_field_config": json.dumps({
					 STAGE_COLUMN: {"view_campus": 1, "mandatory_campus": 0},
					 "year_of_passing": {"view_campus": 1, "mandatory_campus": 1},
				 })},
			],
		})
		doc.flags.ignore_mandatory = True
		return doc.insert(ignore_permissions=True).name

	@classmethod
	def _invite(cls):
		doc = frappe.get_doc({"doctype": "Campus Invite", "campus_invite_name": f"{PREFIX} Invite",
		                      "region": cls.region,
		                      "institutes": [{"institute": cls.institute}],
		                      "job_openings": [{"job_opening": cls.opening}]})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		doc.submit()
		return doc.name

	@classmethod
	def _drive(cls):
		doc = frappe.get_doc({
			"doctype": "Campus Drive", "drive_name": f"{PREFIX} Drive",
			"drive_owner": "Administrator", "drive_start_date": nowdate(),
			"drive_end_date": add_days(nowdate(), 7),
			"drive_status": "Live", "registration_form_enabled": 1,
			"campus_invites": [{"campus_invite": cls.invite}],
			"participating_institutes": [{"institute": cls.institute}],
			"linked_job_openings": [{"job_opening": cls.opening}],
			"rounds": [{"round_name": GD_STAGE, "round_type": "Group Discussion",
			            "hiring_stage": GD_STAGE}],
		})
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		# The lifecycle recomputes the status from the dates on save; force it Live so
		# the registration form is open however the fixture's window is read.
		frappe.db.set_value("Campus Drive", doc.name, "drive_status", "Live",
		                    update_modified=False)
		return doc.name, doc.rounds[0].round_code

	# ── helpers ──

	def _register(self, first=FIRST, last=LAST, email=EMAIL, education=None, years=None):
		"""Walk the guest endpoints exactly as the QR page does, and return the reply."""
		fields = spot.get_drive_application_fields(self.drive, self.opening)
		self.assertTrue(fields["success"], fields["message"])
		form = {"applicant_name": first, "custom_applicant_last_name": last}
		# Anything else the site made mandatory on this channel gets a placeholder, so
		# the test is about the name and the linking, not about however this site has
		# configured its campus form.
		for f in fields["data"]["fields"]:
			if f["reference_name"] in form:
				continue
			if f.get("stage_requirement"):
				# `education` overrides which stages are supplied — [] for none.
				form[f["reference_name"]] = self._education_rows(f, education, years)
			elif f["reqd"]:
				form[f["reference_name"]] = self._placeholder(f)
		return spot.submit_drive_application(
			drive=self.drive, institute=self.institute, job_opening=self.opening,
			email=email, form_data=form,
		)

	@classmethod
	def _education_rows(cls, field, stages=None, years=None):
		"""One row per Education Stage the channel demands, each with its mandatory
		columns filled — what the form seeds for the candidate.

		The years ascend with the stages, as a real history does; pass `years` to hand
		in a different sequence (a backwards one, to exercise the order check).
		"""
		rule = field["stage_requirement"]
		required_columns = [c for c in (field.get("table_fields") or []) if c.get("reqd_channel")]
		wanted = rule["required_stages"] if stages is None else stages
		rows = []
		for i, stage in enumerate(wanted):
			row = {rule["fieldname"]: stage}
			for column in required_columns:
				if column["fieldname"] == rule["fieldname"]:
					continue
				row[column["fieldname"]] = cls._placeholder(column)
			if rule.get("year_fieldname"):
				row[rule["year_fieldname"]] = (
					years[i] if years is not None else BASE_YEAR + i * 2
				)
			rows.append(row)
		return rows

	@staticmethod
	def _placeholder(field):
		"""A value this control will accept, whatever HR made mandatory."""
		fieldtype, options = field["fieldtype"], (field.get("options") or "")
		if fieldtype in ("Table", "Table MultiSelect"):
			return []
		if fieldtype == "Select":
			return next((o for o in options.split("\n") if o.strip()), "-")
		if fieldtype == "Link":
			return frappe.get_all(options, pluck="name", limit=1)[0] if options else "-"
		if fieldtype in ("Check",):
			return 1
		if fieldtype in ("Int", "Float", "Currency", "Percent"):
			return 1
		if fieldtype in ("Date", "Datetime"):
			return nowdate()
		if fieldtype in ("Attach", "Attach Image"):
			return "/files/_test_spot.pdf"
		return "-"

	def setUp(self):
		frappe.set_user("Administrator")
		for name in frappe.get_all("Job Applicant", filters={"email_id": EMAIL}, pluck="name"):
			frappe.delete_doc("Job Applicant", name, force=True, ignore_permissions=True)
		frappe.db.commit()

	def tearDown(self):
		frappe.db.rollback()

	# ── the QR code the candidate actually scans ──

	def _qr_bytes(self, drive=None):
		qr = frappe.db.get_value("Campus Drive", drive or self.drive,
		                         "registration_form_qr_code")
		self.assertTrue(qr, "the drive has no QR code")
		content = frappe.get_doc("File", {"file_url": qr}).get_content()
		return content.encode("latin-1") if isinstance(content, str) else content

	def test_the_qr_encodes_the_registration_link(self):
		"""The image and the link field must be the same string — the link is what HR
		copies, the QR is what the candidate scans, and a QR built from an older site
		URL sends every scan nowhere with nothing on the drive to say so."""
		from recruitment.recruitment.doctype.campus_drive.campus_drive import _qr_png_bytes

		link = frappe.db.get_value("Campus Drive", self.drive, "registration_form_link")
		self.assertIn(f"drive={self.drive}", link)
		self.assertEqual(self._qr_bytes(), _qr_png_bytes(link))

	def test_the_qr_is_rebuilt_when_the_site_url_moves(self):
		"""A drive saved after the site address changes must not keep pointing scans at
		the old one."""
		from recruitment.recruitment.doctype.campus_drive.campus_drive import _qr_png_bytes

		before = self._qr_bytes()
		doc = frappe.get_doc("Campus Drive", self.drive)
		# _registration_url() resolves frappe.utils.get_url at call time, so patching
		# the attribute is the site having moved as far as the drive knows.
		from frappe import utils as frappe_utils

		original = frappe_utils.get_url
		frappe_utils.get_url = lambda path="", *a, **kw: f"https://careers.example.test{path}"
		try:
			doc.save(ignore_permissions=True)
		finally:
			frappe_utils.get_url = original

		link = frappe.db.get_value("Campus Drive", self.drive, "registration_form_link")
		self.assertEqual(link, f"https://careers.example.test/verify_email?drive={self.drive}")
		self.assertNotEqual(self._qr_bytes(), before)
		self.assertEqual(self._qr_bytes(), _qr_png_bytes(link))

	def test_an_ordinary_save_leaves_the_qr_alone(self):
		"""Same URL, same image — a save must not churn the file (and invalidate a
		printed poster) for nothing."""
		before = self._qr_bytes()
		doc = frappe.get_doc("Campus Drive", self.drive)
		doc.registration_form_title = "Walk-in desk"
		doc.save(ignore_permissions=True)
		self.assertEqual(self._qr_bytes(), before)

	# ── whether the drive can take a walk-in at all ──

	def _set_drive(self, **values):
		"""Change the fixture drive for one test. No commit, so tearDown's rollback
		puts it back."""
		frappe.db.set_value("Campus Drive", self.drive, values, update_modified=False)

	def _gate(self, drive=None):
		return registration_status(self.drive if drive is None else drive)

	def test_a_live_drive_is_open(self):
		row, reason = self._gate()
		self.assertEqual(row.name, self.drive)
		self.assertEqual(reason, "")

	def test_a_link_with_no_drive_says_so(self):
		"""/verify_email opened without ?drive= — the commonest way to land on this
		message, and the one that used to read as "registration is not open"."""
		row, reason = self._gate("")
		self.assertIsNone(row)
		self.assertIn("missing its campus drive", reason)

	def test_a_drive_that_does_not_exist_says_so(self):
		row, reason = self._gate("DRV-NO-SUCH-DRIVE")
		self.assertIsNone(row)
		self.assertIn("not valid", reason)

	def test_a_draft_drive_has_not_started(self):
		self._set_drive(drive_status="Draft")
		row, reason = self._gate()
		self.assertIsNone(row)
		self.assertIn("not started yet", reason)

	def test_a_finished_drive_says_it_has_finished(self):
		for status in ("Completed", "Closed"):
			with self.subTest(drive_status=status):
				self._set_drive(drive_status=status)
				row, reason = self._gate()
				self.assertIsNone(row)
				self.assertIn("has finished", reason)

	def test_a_drive_past_its_end_date_names_the_date(self):
		closed_on = add_days(nowdate(), -3)
		self._set_drive(drive_end_date=closed_on)
		row, reason = self._gate()
		self.assertIsNone(row)
		self.assertIn(formatdate(closed_on), reason)

	def test_a_drive_whose_window_has_not_opened_names_the_date(self):
		if not frappe.get_meta("Campus Drive").has_field("registration_open_from"):
			self.skipTest("Campus Drive no longer has registration_open_from")
		opens_on = add_days(nowdate(), 5)
		self._set_drive(registration_open_from=opens_on)
		row, reason = self._gate()
		self.assertIsNone(row)
		self.assertIn(formatdate(opens_on), reason)

	def test_the_registration_form_switch_closes_it(self):
		self._set_drive(registration_form_enabled=0)
		row, reason = self._gate()
		self.assertIsNone(row)
		self.assertIn("switched off", reason)

	def test_the_endpoints_hand_back_the_same_reason(self):
		"""Whatever the candidate touches first says the same thing."""
		self._set_drive(drive_status="Draft")
		reason = self._gate()[1]
		for reply in (
			spot.get_drive_registration_options(self.drive),
			spot.get_drive_application_fields(self.drive, self.opening),
			spot.submit_drive_application(self.drive, self.institute, self.opening, EMAIL, {}),
		):
			self.assertFalse(reply["success"])
			self.assertEqual(reply["message"], reason)

	def test_the_verify_page_offers_registration_only_when_it_is_open(self):
		reply = verify_applicant_email("nobody.walkin@test.local", drive=self.drive)
		self.assertTrue(reply["can_register"])
		self.assertEqual(reply["drive"], self.drive)

		self._set_drive(drive_status="Completed")
		reply = verify_applicant_email("nobody.walkin@test.local", drive=self.drive)
		self.assertFalse(reply["can_register"])
		self.assertIsNone(reply["drive"])
		self.assertIn("has finished", reply["message"])

	# ── the education rules on the form ──

	def _stage_rule(self):
		"""The stage rule this site puts on the fixture opening's education grid, or
		None when no Education Stage is required on the campus channel."""
		if not get_required_education_stages("campus"):
			return None
		fields = _common.get_application_fields_for_channel(self.opening, "campus")
		grid = next((f for f in fields if f["reference_name"] == EDUCATION_FIELD), None)
		return (grid or {}).get("stage_requirement")

	def test_the_form_advertises_the_stages_the_channel_demands(self):
		"""What the registration page needs in order to seed a row per stage and name
		the ones still missing."""
		rule = self._stage_rule()
		if not rule:
			self.skipTest("no Education Stages are required on the campus channel")
		self.assertEqual(rule["required_stages"], get_required_education_stages("campus"))
		self.assertEqual(rule["fieldname"], STAGE_COLUMN)

	def test_a_registration_without_the_demanded_education_is_refused(self):
		"""The whole point: HR marks 10th / 12th / Graduation required and a walk-in
		can no longer register without them. This went through before."""
		rule = self._stage_rule()
		if not rule:
			self.skipTest("no Education Stages are required on the campus channel")
		reply = self._register(education=[])
		self.assertFalse(reply["success"])
		for stage in rule["required_stages"]:
			self.assertIn(stage, reply["message"])

	def test_a_partial_education_history_is_refused_too(self):
		rule = self._stage_rule()
		if not rule or len(rule["required_stages"]) < 2:
			self.skipTest("fewer than two Education Stages are required on this channel")
		first, *rest = rule["required_stages"]
		reply = self._register(education=[first])
		self.assertFalse(reply["success"])
		for stage in rest:
			self.assertIn(stage, reply["message"])

	def test_a_backwards_education_history_is_refused(self):
		"""The screenshot case: 10th in 2015, 12th in 2013, Graduation in 2012 — a
		history that runs backwards. The stages are configured in the order they are
		sat, so the years have to follow them."""
		rule = self._stage_rule()
		if not rule or not rule.get("year_fieldname"):
			self.skipTest("this site's education grid has no Year of Passing column")
		count = len(rule["required_stages"])
		backwards = [BASE_YEAR + (count - 1 - i) * 2 for i in range(count)]
		reply = self._register(years=backwards)
		self.assertFalse(reply["success"])
		self.assertIn(rule["required_stages"][1], reply["message"])

	def test_two_stages_in_the_same_year_are_refused(self):
		rule = self._stage_rule()
		if not rule or not rule.get("year_fieldname"):
			self.skipTest("this site's education grid has no Year of Passing column")
		same = [BASE_YEAR] * len(rule["required_stages"])
		reply = self._register(years=same)
		self.assertFalse(reply["success"])

	def test_a_complete_education_history_registers(self):
		rule = self._stage_rule()
		if not rule:
			self.skipTest("no Education Stages are required on the campus channel")
		reply = self._register()
		self.assertTrue(reply["success"], reply["message"])
		rows = frappe.get_all(
			"Employee Education",
			filters={"parenttype": "Job Applicant", "parent": reply["data"]["name"]},
			pluck=STAGE_COLUMN)
		self.assertEqual(set(rows), set(rule["required_stages"]))

	# ── 1. the name ──

	def test_the_name_parts_are_stored_exactly_as_typed(self):
		"""First name box -> first name. Surname box -> surname. Neither swallows the
		other, which is what put "Yaswanth Kumar Dasari" in the first-name field."""
		reply = self._register()
		self.assertTrue(reply["success"], reply["message"])
		doc = frappe.get_doc("Job Applicant", reply["data"]["name"])
		self.assertEqual(doc.applicant_name, FIRST)
		self.assertEqual(doc.custom_applicant_last_name, LAST)

	def test_the_full_name_is_derived_for_display(self):
		"""The whole name lives in custom_full_name — the doctype's title, so it is
		what the applicant banner and every list show."""
		reply = self._register()
		doc = frappe.get_doc("Job Applicant", reply["data"]["name"])
		self.assertEqual(doc.custom_full_name, FULL)

	def test_the_surname_is_never_printed_twice(self):
		"""The drive board's candidate cards read the derived name, so a surname
		cannot come back joined on a second time ("Dasari Dasari")."""
		self._register()
		frappe.db.commit()
		pool = cd.get_round_pool(self.drive, self.gd_code)
		names = [c["applicant_name"] for c in pool["pool"]]
		self.assertIn(FULL, names)
		self.assertNotIn(f"{FULL} {LAST}", names)

	# ── 2. the campus invite ──

	def test_the_invite_is_resolved_from_the_institute_picked(self):
		reply = self._register()
		doc = frappe.get_doc("Job Applicant", reply["data"]["name"])
		self.assertEqual(doc.custom_campus_invite, self.invite)
		self.assertEqual(doc.custom_campus_drive, self.drive)

	def test_the_region_comes_with_the_invite(self):
		"""Without an invite a walk-in reached the round board with no region at all,
		and no panel could be found for them."""
		reply = self._register()
		doc = frappe.get_doc("Job Applicant", reply["data"]["name"])
		self.assertEqual(doc.custom_region, self.region)

	def test_the_resolver_answers_none_for_an_institute_no_invite_covers(self):
		self.assertIsNone(invite_for_drive_institute(self.drive, "_Test Spot Nonexistent"))
		self.assertEqual(invite_for_drive_institute(self.drive, self.institute), self.invite)

	def test_the_walk_in_is_flagged_as_one(self):
		reply = self._register()
		self.assertEqual(
			frappe.db.get_value("Job Applicant", reply["data"]["name"], "custom_spot_registered"), 1)

	# ── 3. visible on the drive ──

	def test_the_candidate_shows_in_the_drive_breakdown(self):
		before = cd.get_drive_breakdown(self.drive)["summary"]["total"]
		self._register()
		frappe.db.commit()
		after = cd.get_drive_breakdown(self.drive)
		self.assertEqual(after["summary"]["total"], before + 1)
		listed = next(o for o in after["openings"] if o["job_opening"] == self.opening)
		self.assertGreaterEqual(listed["total"], 1)

	def test_the_candidate_shows_in_the_round_pool(self):
		reply = self._register()
		frappe.db.commit()
		name = reply["data"]["name"]
		frappe.db.set_value("Job Applicant", name,
		                    {"custom_current_stage": GD_STAGE, "status": "Shortlisted"},
		                    update_modified=False)
		pool = cd.get_round_pool(self.drive, self.gd_code)["pool"]
		self.assertIn(name, [c["name"] for c in pool])

	def test_the_candidate_is_counted_as_waiting_on_the_round_card(self):
		reply = self._register()
		frappe.db.commit()
		frappe.db.set_value("Job Applicant", reply["data"]["name"],
		                    {"custom_current_stage": GD_STAGE, "status": "Shortlisted"},
		                    update_modified=False)
		card = {r["round_code"]: r for r in cd.get_rounds_overview(self.drive)["rounds"]}
		self.assertGreaterEqual(card[self.gd_code]["waiting"], 1)

	def test_a_drive_link_alone_is_enough_to_be_on_the_drive(self):
		"""The invite is provenance; the DRIVE is the membership. A candidate stamped
		with the drive and no invite at all — a drive that runs purely on spot
		registrations — still has to appear."""
		reply = self._register()
		frappe.db.commit()
		name = reply["data"]["name"]
		frappe.db.set_value("Job Applicant", name,
		                    {"custom_campus_invite": None, "custom_current_stage": GD_STAGE,
		                     "status": "Shortlisted"}, update_modified=False)
		pool = cd.get_round_pool(self.drive, self.gd_code)["pool"]
		self.assertIn(name, [c["name"] for c in pool])
		self.assertGreaterEqual(cd.get_drive_breakdown(self.drive)["summary"]["total"], 1)

	def test_one_registration_per_candidate_per_drive(self):
		self._register()
		frappe.db.commit()
		again = self._register()
		self.assertFalse(again["success"])
		self.assertIn("already registered", again["message"])


class TestCampusApplicationValidation(FrappeTestCase):
	"""The rules a campus application has to clear, beyond the top-level mandatories.

	Both of these were sent to the form and enforced NOWHERE, so the Required
	Education Stages grid on Job Applicant Profile Settings had no effect: a spot
	registration went through with no education history at all.

	Driven straight through `assert_child_table_rules` with a hand-built field set, so
	the rule is pinned whatever this site happens to have configured.
	"""

	FIELDS = [
		{"reference_name": EDUCATION_FIELD, "display_name": "Educational Qualification",
		 "fieldtype": "Table", "reqd": 0,
		 "table_fields": [
			 {"fieldname": STAGE_COLUMN, "label": "Education Stage", "reqd_channel": 0},
			 {"fieldname": YEAR_COLUMN, "label": "Year of Passing", "reqd_channel": 1},
		 ],
		 "stage_requirement": {"fieldname": STAGE_COLUMN, "doctype": "Education Stage",
		                       "required_stages": ["10th", "12th", "Graduation"],
		                       "year_fieldname": YEAR_COLUMN,
		                       "year_label": "Year of Passing"}},
	]

	def _assert_missing(self, rows, *expected):
		with self.assertRaises(frappe.ValidationError) as caught:
			assert_child_table_rules(self.FIELDS, {EDUCATION_FIELD: rows})
		frappe.clear_messages()
		for fragment in expected:
			self.assertIn(fragment, str(caught.exception))

	def _row(self, stage, year=None):
		"""One education row. Without a year the stage's own position supplies one, so
		a history built row-by-row reads forwards unless a test says otherwise."""
		if year is None:
			position = self.FIELDS[0]["stage_requirement"]["required_stages"]
			year = BASE_YEAR + (position.index(stage) if stage in position else 0) * 2
		return {STAGE_COLUMN: stage, YEAR_COLUMN: year}

	def test_every_demanded_stage_needs_a_row(self):
		self._assert_missing([], "10th", "12th", "Graduation")

	def test_a_partial_education_history_is_refused(self):
		self._assert_missing([self._row("10th")], "12th", "Graduation")
		self._assert_missing([self._row("10th"), self._row("12th")], "Graduation")

	def test_a_complete_education_history_passes(self):
		assert_child_table_rules(self.FIELDS, {EDUCATION_FIELD: [
			self._row("10th"), self._row("12th"), self._row("Graduation")]})

	def test_extra_stages_beyond_the_demanded_ones_are_fine(self):
		assert_child_table_rules(self.FIELDS, {EDUCATION_FIELD: [
			self._row("10th"), self._row("12th"), self._row("Graduation"),
			self._row("Post Graduation")]})

	def test_a_mandatory_column_must_be_filled_on_every_row(self):
		"""Year of Passing is mandatory on this channel, so a row without one is
		named — by its row number, as the candidate sees it."""
		self._assert_missing(
			[self._row("10th"), {STAGE_COLUMN: "12th"}, self._row("Graduation")],
			"Educational Qualification 2 → Year of Passing")

	def test_a_missing_table_is_the_same_as_an_empty_one(self):
		"""The form drops empty values before submitting, so "no rows" arrives as the
		key not being there at all — it must not slip through as "nothing to check"."""
		self._assert_missing(None, "10th", "12th", "Graduation")

	# ── the stages run in the order they are sat ──

	def test_a_backwards_history_is_refused(self):
		"""10th in 2015, 12th in 2013, Graduation in 2012 — the reported case."""
		self._assert_missing(
			[self._row("10th", 2015), self._row("12th", 2013), self._row("Graduation", 2012)],
			"12th is sat after 10th", "Graduation is sat after 12th")

	def test_one_stage_out_of_order_is_named(self):
		self._assert_missing(
			[self._row("10th", 2016), self._row("12th", 2018), self._row("Graduation", 2017)],
			"Graduation is sat after 12th")

	def test_two_stages_in_the_same_year_are_refused(self):
		"""Nobody sits their 10th and 12th in the same year — "later" means later."""
		self._assert_missing(
			[self._row("10th", 2018), self._row("12th", 2018), self._row("Graduation", 2020)],
			"12th is sat after 10th")

	def test_a_history_that_reads_forwards_passes(self):
		assert_child_table_rules(self.FIELDS, {EDUCATION_FIELD: [
			self._row("10th", 2016), self._row("12th", 2018), self._row("Graduation", 2022)]})

	def test_rows_the_candidate_added_take_no_part_in_the_order(self):
		"""A stage outside the demanded list has no configured position, so it cannot
		be judged early or late — only the demanded ones form the sequence."""
		assert_child_table_rules(self.FIELDS, {EDUCATION_FIELD: [
			self._row("10th", 2016), self._row("12th", 2018), self._row("Graduation", 2022),
			self._row("Post Graduation", 2017)]})

	def test_the_order_is_checked_however_the_rows_are_arranged(self):
		"""The candidate can add their rows in any order; it is the STAGES that carry
		the sequence, not the row positions."""
		self._assert_missing(
			[self._row("Graduation", 2012), self._row("10th", 2015), self._row("12th", 2013)],
			"12th is sat after 10th")

	def test_a_blank_year_is_not_an_order_problem(self):
		"""Year of Passing is only mandatory if HR made it so — that is the missing-
		field check's business, not this one's."""
		fields = [{**self.FIELDS[0], "table_fields": [
			{"fieldname": STAGE_COLUMN, "label": "Education Stage", "reqd_channel": 0},
			{"fieldname": YEAR_COLUMN, "label": "Year of Passing", "reqd_channel": 0},
		]}]
		assert_child_table_rules(fields, {EDUCATION_FIELD: [
			{STAGE_COLUMN: "10th"}, {STAGE_COLUMN: "12th", YEAR_COLUMN: 2018},
			{STAGE_COLUMN: "Graduation", YEAR_COLUMN: 2022}]})

	def test_no_year_column_means_no_order_check(self):
		"""A grid that doesn't show Year of Passing has nothing to order by."""
		fields = [{**self.FIELDS[0],
		           "stage_requirement": {**self.FIELDS[0]["stage_requirement"],
		                                 "year_fieldname": None, "year_label": None}}]
		assert_child_table_rules(fields, {EDUCATION_FIELD: [
			self._row("10th", 2020), self._row("12th", 2015), self._row("Graduation", 2012)]})

	def test_no_demanded_stages_means_no_stage_rule(self):
		fields = [{**self.FIELDS[0], "stage_requirement": None}]
		assert_child_table_rules(fields, {EDUCATION_FIELD: []})


def run():
	"""Run this suite directly, without `bench run-tests`.

	    bench --site <site> execute \
	        recruitment.recruitment.tests.test_campus_spot_registration.run
	"""
	import unittest

	load = unittest.TestLoader().loadTestsFromTestCase
	suite = unittest.TestSuite([
		load(TestCampusSpotRegistration),
		load(TestCampusApplicationValidation),
	])
	unittest.TextTestRunner(verbosity=2).run(suite)
