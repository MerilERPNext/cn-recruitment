"""TEMPORARY attribute-filtering flow seeder (safe to delete).

Builds three complete hiring chains so the two attribute-driven features can be
tested end to end by hand:

    Job Requisition -> Job Opening (all posting channels) -> Job Applicants
    -> Job Offer

  Chain A "Freelancer"   Employment Type Freelancer. Interview strategy and offer
                         letter are each scoped by ONE attribute
                         (employment_type), so it shows the simple match.
  Chain B "Member"       A normal employee. Both are scoped by TWO attributes
                         (employment type AND company/department), so it shows
                         fields AND-ing, and it outranks a one-field template on
                         specificity when both admit an opening.
  Chain C "Intern"       Has an interview strategy template but deliberately NO
                         offer letter template. This is the negative case: the
                         Offer Letter tab must refuse to preview and the submit
                         must be blocked with "please contact the HR department".

Each chain posts its opening to EVERY channel — Careers Page, Refer, IJP, Campus,
External Recruiter, External Recruiter Group — and carries one Job Applicant per
channel, so the posting-type axis is covered alongside the attribute axis.

What is being tested
--------------------
1. **TA Interview Strategy Template** — which workflow a Job Opening is prefilled
   with, chosen by the attributes on the Dynamic User Assignments in
   ``applicable_to``.
2. **Job Offer Document Template** — which offer letter an offer is rendered
   from, chosen by the attributes on the DUAs in the template's
   ``user_assignment``, and the "no template available" refusal when none match.

Both read the same attribute engine, so a chain that matches for one and not the
other is a configuration difference, never a code difference.

NO REAL EMAIL IS EVER SENT: this site has a live outgoing account, so
frappe.sendmail is a no-op for the whole run and every address is on a reserved
.test domain that cannot resolve.

Everything is marked so cleanup() can remove it:
    Requisitions  description contains   [TA-ATTR-SEED]
    Openings      job_title starts       TA Seed
    Applicants    email like             taseed.*@ta-attr-seed.test
    Offers        against those applicants
    Strategy      template_name starts   TA Seed Strategy
    Doc templates letter_name starts     TA Seed Offer Letter
    Assignments   assignment_name starts TA Seed -

Masters it may create and does NOT remove (real configuration, not seed data):
    Job Applicant Source "Employee Referral" / "External Recruiter"
    TA External Recruiter Group "TA Seed Recruiter Group"

Run:
    bench --site recruitment execute recruitment.ta_attribute_flow_seed.run
Report what exists and what each chain should resolve to:
    bench --site recruitment execute recruitment.ta_attribute_flow_seed.report
Cleanup:
    bench --site recruitment execute recruitment.ta_attribute_flow_seed.cleanup
"""

import frappe
from frappe.utils import add_days, today

MARKER = "[TA-ATTR-SEED]"
OPENING_PREFIX = "TA Seed"
STRATEGY_PREFIX = "TA Seed Strategy"
LETTER_PREFIX = "TA Seed Offer Letter"
ASSIGNMENT_PREFIX = "TA Seed -"
CAND_PREFIX = "taseed."
CAND_DOMAIN = "@ta-attr-seed.test"

OPENING_DOCTYPE = "Job Opening"
OFFER_DOCTYPE = "Job Offer"
PURPOSE_ATTRIBUTES = "Attributes"

# Every channel a Job Opening can be posted to, paired with the Job Applicant
# Source a candidate arriving through it carries. One applicant per row, so each
# posting type has a candidate sitting behind it rather than being configuration
# nobody ever exercised.
POSTING_CHANNELS = [
	{"post_to": "Careers Page", "source": "Careers Page", "first": "Aarav", "last": "Sharma"},
	{"post_to": "Refer", "source": "Employee Referral", "first": "Diya", "last": "Verma"},
	{"post_to": "IJP", "source": "IJP", "first": "Rohan", "last": "Iyer"},
	{"post_to": "Campus", "source": "Campus Hiring", "first": "Ananya", "last": "Reddy"},
	{"post_to": "External Recruiter", "source": "External Recruiter", "first": "Karan", "last": "Nair"},
	{"post_to": "External Recruiter Group", "source": "External Recruiter", "first": "Meera", "last": "Joshi"},
]

RECRUITER_GROUP = "TA Seed Recruiter Group"

# The three chains. `opening_scope` / `offer_scope` are the attribute rows that go
# on that chain's Dynamic User Assignments — (fieldname, context key) pairs
# resolved against the masters picked at run time.
#
# Chain B deliberately pins two fields where chain A pins one: that is what makes
# it *more specific*, which is the tie-break the resolvers use when several
# templates admit the same document.
CHAINS = [
	{
		"key": "freelancer",
		"label": "Freelancer",
		"employment_type": "Freelancer",
		"title": "Content Designer (Freelance)",
		"positions": 3,
		"opening_scope": [("employment_type", "employment_type")],
		"offer_scope": [("custom_employment_type", "employment_type")],
		"rounds": [
			("Portfolio Screening", "Screening"),
			("Craft Interview", "Interview"),
			("Commercials Discussion", "Interview"),
		],
		"offer_letter": True,
	},
	{
		"key": "member",
		"label": "Member",
		"employment_type": "Member",
		"title": "Business Analyst (Permanent)",
		"positions": 2,
		"opening_scope": [("employment_type", "employment_type"), ("company", "company")],
		"offer_scope": [("custom_employment_type", "employment_type"), ("company", "company")],
		"rounds": [
			("Resume Screening", "Screening"),
			("Technical Round 1", "Interview"),
			("Technical Round 2", "Interview"),
			("HR Round", "Interview"),
		],
		"offer_letter": True,
	},
	{
		"key": "intern",
		"label": "Intern",
		"employment_type": "Intern",
		"title": "Summer Intern",
		"positions": 4,
		"opening_scope": [("employment_type", "employment_type")],
		"offer_scope": None,
		"rounds": [
			("Aptitude Test", "Screening"),
			("Mentor Interview", "Interview"),
		],
		# No offer letter on purpose — this chain IS the "contact HR" test.
		"offer_letter": False,
	},
]

OFFER_LETTER_HTML = """
<div style="font-family:Georgia,serif;line-height:1.7;color:#222;">
  <h2 style="text-align:center;margin-bottom:4px;">{label} Offer Letter</h2>
  <p style="text-align:center;color:#777;font-size:12px;margin-top:0;">
    Seeded by ta_attribute_flow_seed — not a real letter
  </p>
  <p>Dear <b>{{{{applicant_name}}}}</b>,</p>
  <p>
    We are pleased to offer you the position of <b>{{{{designation}}}}</b> at
    <b>{{{{company}}}}</b> as a <b>{label}</b>.
  </p>
  <p>
    Offer date: <b>{{{{offer_date}}}}</b><br>
    Expected date of joining: <b>{{{{custom_expected_doj}}}}</b><br>
    Offer reference: <b>{{{{name}}}}</b>
  </p>
  <p>
    This letter was selected by the <b>{label}</b> user assignment attributes. If
    you are reading it on any other kind of offer, the attribute filtering is
    wrong.
  </p>
  <p>Warm regards,<br>Talent Acquisition</p>
</div>
"""


def _log(msg):
	print(f"  {msg}")


def _first(doctype, filters=None, order_by="name asc"):
	rows = frappe.get_all(doctype, filters=filters or {}, pluck="name",
	                      limit_page_length=1, order_by=order_by)
	return rows[0] if rows else None


# --------------------------------------------------------------------------- #
# Masters
# --------------------------------------------------------------------------- #

def _masters():
	"""The company / department / designation the seed data hangs off.

	Reuses what the site already has rather than inventing masters — seeded
	records should sit where real ones do, or the screens they appear on look
	nothing like the real thing.

	Every lookup is ordered by name so a second run builds under the same company
	as the first, instead of two half-sets referencing each other across a
	boundary they should never cross.
	"""
	company = _first("Company")
	if not company:
		frappe.throw("No Company on this site — cannot seed.")

	employee = (
		_first("Employee", {"status": "Active", "company": company})
		or _first("Employee", {"status": "Active"})
	)
	if not employee:
		frappe.throw("No Active Employee on this site — a requisition must be raised by one.")

	return frappe._dict(
		company=company,
		department=_first("Department", {"company": company}) or _first("Department"),
		designation=_first("Designation"),
		branch=_first("Branch"),
		employee=employee,
		recruiter=_first("User", {"enabled": 1, "name": ["not in", ("Guest", "Administrator")]}),
	)


def _employment_type(readable):
	"""Employment Type *id* for a readable name, created if the site lacks it.

	Employment Type is autonamed (``EMPTYPE_.#``) on this site, so the id differs
	per site and the seed has to look it up by ``employee_type_name`` rather than
	assume it. Never removed by cleanup — it is real configuration.
	"""
	existing = frappe.db.get_value("Employment Type", {"employee_type_name": readable}, "name")
	if existing:
		return existing
	doc = frappe.get_doc({"doctype": "Employment Type", "employee_type_name": readable})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	_log(f"employment type {readable} created ({doc.name})")
	return doc.name


def _ensure_sources():
	"""Job Applicant Sources for the channels the site has no source for."""
	for source in {c["source"] for c in POSTING_CHANNELS}:
		if not frappe.db.exists("Job Applicant Source", source):
			frappe.get_doc({"doctype": "Job Applicant Source", "source_name": source}).insert(
				ignore_permissions=True
			)
			_log(f"job applicant source '{source}' created")


def _ensure_recruiter_group():
	"""A TA External Recruiter Group, so the sixth posting channel has a target.

	Returns None when the site has no external recruiters at all — that channel is
	then skipped rather than posted with an empty reference.
	"""
	if frappe.db.exists("TA External Recruiter Group", RECRUITER_GROUP):
		return RECRUITER_GROUP

	recruiter = _first("TA External Recruiter")
	if not recruiter:
		return None

	doc = frappe.get_doc({
		"doctype": "TA External Recruiter Group",
		"external_recruiter_group_name": RECRUITER_GROUP,
	})
	doc.append("assign_external_recruiters", {"external_recruiter": recruiter})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	_log(f"external recruiter group '{RECRUITER_GROUP}' created")
	return doc.name


# --------------------------------------------------------------------------- #
# Dynamic User Assignments — the attribute rules both features read
# --------------------------------------------------------------------------- #

def _assignment(name, scope_doctype, rows, description):
	"""An Attributes assignment carrying ``[(scope_field, value), ...]``.

	Purpose *Attributes*, never *People*: an assignment resolving to employees
	answers "who", and both consumers skip it because it says nothing about which
	openings or offers a template covers.
	"""
	if frappe.db.exists("Dynamic User Assignment", name):
		return name

	doc = frappe.new_doc("Dynamic User Assignment")
	doc.assignment_name = name
	doc.assignment_code = name
	doc.assignment_purpose = PURPOSE_ATTRIBUTES
	doc.target_type = "Employee"
	doc.description = description
	doc.attribute_match = "All fields must match (AND)"
	# The seed picks masters independently; a hierarchy check could reject a
	# Department that is not under the chosen Company on this site's tree.
	doc.validate_attribute_hierarchy = 0
	doc.append("applicable_for_process", {"document_type": scope_doctype})
	for scope_field, value in rows:
		doc.append("assignment_attributes", {
			"scope_doctype": scope_doctype,
			"scope_field": scope_field,
			"attribute_value": value,
		})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	_log(f"assignment {name} -> {scope_doctype} " +
	     ", ".join(f"{f}={v}" for f, v in rows))
	return doc.name


# --------------------------------------------------------------------------- #
# TA Interview Strategy Template
# --------------------------------------------------------------------------- #

def _strategy_template(chain, assignment):
	name = f"{STRATEGY_PREFIX} - {chain['label']}"
	if frappe.db.exists("TA Interview Strategy Template", name):
		return name

	doc = frappe.new_doc("TA Interview Strategy Template")
	doc.template_name = name
	# Never the default: the default is the fallback used when nothing matches,
	# and a seed that claimed it would mask every other site's configuration.
	doc.is_default = 0
	doc.append("applicable_to", {"dynamic_user_assignment": assignment})
	for round_name, kind in chain["rounds"]:
		is_interview = kind == "Interview"
		doc.append("interview_rounds", {
			"round_name": round_name,
			# The Select offers only "" and "Interview" — a screening round is the
			# empty one, and _stage_type_for_round maps it back to "Screening" on
			# the Job Opening's stage row.
			"step_type": "Interview" if is_interview else "",
			"is_mandatory": 1 if is_interview else 0,
			"allow_skipping": "No" if is_interview else "Yes",
			"enable_panel_interview": "No",
		})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)
	_log(f"strategy template {name} ({len(chain['rounds'])} rounds)")
	return doc.name


# --------------------------------------------------------------------------- #
# Document Template — the offer letter
# --------------------------------------------------------------------------- #

def _offer_letter_template(chain, assignment):
	"""An Html offer letter scoped to this chain's assignment.

	Both content fields are written. ``html_content_storage`` is what the render
	path reads to produce the PDF the Preview tab shows; ``template_file`` is what
	the Template tab reads to show the raw placeholders. Seeding only one leaves
	half the tab dead, which reads as a broken feature rather than a half-built
	template.
	"""
	name = f"{LETTER_PREFIX} - {chain['label']}"
	if frappe.db.exists("Document Template", name):
		return name

	body = OFFER_LETTER_HTML.format(label=chain["label"])

	doc = frappe.new_doc("Document Template")
	doc.letter_name = name
	doc.letter_description = f"{MARKER} Offer letter for {chain['label']} candidates."
	doc.doctype_name = OFFER_DOCTYPE
	doc.type_of_letter = "Offer Letters"
	doc.template_type = "Html"
	doc.html_content_storage = body
	doc.assignment_type = "User Assignment"
	doc.append("user_assignment", {"dynamic_user_assignment": assignment})
	doc.flags.ignore_mandatory = True
	doc.insert(ignore_permissions=True)

	attached = frappe.get_doc({
		"doctype": "File",
		"file_name": f"{name}.html",
		"content": body,
		"attached_to_doctype": "Document Template",
		"attached_to_name": doc.name,
		"is_private": 1,
	}).insert(ignore_permissions=True)
	frappe.db.set_value("Document Template", doc.name, "template_file", attached.file_url)

	_log(f"offer letter template {name}")
	return doc.name


# --------------------------------------------------------------------------- #
# The hiring chain
# --------------------------------------------------------------------------- #

def _requisition(m, chain, employment_type):
	existing = frappe.db.get_value(
		"Job Requisition",
		{"description": ["like", f"%{MARKER} {chain['label']}%"]},
		"name",
	)
	if existing:
		_approve(existing)
		return existing

	req = frappe.new_doc("Job Requisition")
	req.designation = m.designation
	req.company = m.company
	if m.department:
		req.department = m.department
	req.no_of_positions = chain["positions"]
	req.status = "Draft"
	req.requested_by = m.employee
	req.posting_date = today()
	req.expected_by = add_days(today(), 45)
	req.description = f"{MARKER} {chain['label']} — {chain['title']}"
	req.reason_for_requesting = (
		f"{chain['label']} chain for attribute-filtering flow testing."
	)
	if req.meta.has_field("custom_employment_type_link"):
		req.custom_employment_type_link = employment_type
	if req.meta.has_field("custom_assign_to_recruiter") and m.recruiter:
		req.custom_assign_to_recruiter = m.recruiter
	if req.meta.has_field("custom_location") and m.branch:
		req.custom_location = m.branch

	# Individually tracked positions — what an offer later claims and releases.
	if req.meta.has_field("custom_position_details") and m.branch:
		for _i in range(chain["positions"]):
			req.append("custom_position_details", {
				"location": m.branch,
				"reporting_manager": m.employee,
				"employee_type": employment_type,
			})

	req.flags.ignore_mandatory = True
	req.insert(ignore_permissions=True)
	_approve(req.name)
	_log(f"requisition {req.name} ({chain['positions']} positions)")
	return req.name


def _approve(requisition):
	"""Stand in for the approval matrix, which is configured per site.

	Approval is what materialises the trackable position rows, and only an
	approved requisition can be activated against an opening.
	"""
	from recruitment.api.requisition_status import (
		APPROVED_ACTIVE_STATUS,
		APPROVED_DRAFT_STATUS,
		ensure_position_rows,
	)

	status = frappe.db.get_value("Job Requisition", requisition, "status")
	if status not in (APPROVED_DRAFT_STATUS, APPROVED_ACTIVE_STATUS):
		frappe.db.set_value("Job Requisition", requisition, "status", APPROVED_DRAFT_STATUS)
	ensure_position_rows(requisition)


def _opening(m, chain, requisition, employment_type, recruiter_group):
	title = f"{OPENING_PREFIX} {chain['label']} — {chain['title']}"
	existing = frappe.db.get_value("Job Opening", {"job_title": title}, "name")
	if existing:
		return existing

	op = frappe.new_doc("Job Opening")
	op.job_title = title
	op.company = m.company
	op.designation = m.designation
	if m.department:
		op.department = m.department
	op.status = "Open"
	op.employment_type = employment_type
	op.job_requisition = requisition
	op.vacancies = chain["positions"]
	op.description = f"{MARKER} {chain['title']}"
	if op.meta.has_field("custom_location") and m.branch:
		op.custom_location = m.branch

	# Every posting channel, so each has a candidate behind it.
	external_recruiter = _first("TA External Recruiter")
	for channel in POSTING_CHANNELS:
		if channel["post_to"] == "External Recruiter" and not external_recruiter:
			continue
		if channel["post_to"] == "External Recruiter Group" and not recruiter_group:
			continue
		row = {
			"post_to": channel["post_to"],
			"status": "Active",
			"display_from": today(),
			"display_to": add_days(today(), 60),
		}
		if channel["post_to"] == "External Recruiter":
			row["external_recruiter"] = external_recruiter
		if channel["post_to"] == "External Recruiter Group":
			row["external_recruiter_group"] = recruiter_group
		op.append("custom_posting_options", row)

	op.flags.ignore_mandatory = True
	op.insert(ignore_permissions=True)

	_stamp_stages(op.name, chain)

	try:
		from recruitment.api.job_requisition import activate_job_requisition
		activate_job_requisition(requisition, op.name)
		_log(f"opening {op.name} created, requisition activated")
	except Exception as exc:
		_log(f"opening {op.name} created; activation skipped ({exc})")
	return op.name


def _stamp_stages(opening, chain):
	"""Fill the opening's hiring stages from whichever strategy template applies.

	Deliberately routed through the real resolver rather than copying this chain's
	rounds in directly: the point of the seed is that attribute filtering picked
	the template, so a shortcut here would prove nothing. A mismatch between what
	lands and ``chain["rounds"]`` is a real finding, and report() checks for it.
	"""
	from recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template import (
		get_hiring_stages_for_job_opening,
	)

	result = get_hiring_stages_for_job_opening(job_opening=opening) or {}
	stages = result.get("stages") or []
	if not stages:
		_log(f"  no stages resolved for {opening} "
		     f"({'hiring workflow disabled' if result.get('enabled') is False else result})")
		return

	doc = frappe.get_doc(OPENING_DOCTYPE, opening)
	if not doc.meta.has_field("custom_hiring_stages"):
		return
	doc.set("custom_hiring_stages", [])
	for idx, stage in enumerate(stages, start=1):
		doc.append("custom_hiring_stages", dict(stage, idx=idx))
	doc.flags.ignore_mandatory = True
	doc.save(ignore_permissions=True)
	_log(f"  stages from '{result.get('template_name')}': "
	     + ", ".join(s["stage_name"] for s in stages))


def _applicants(m, chain, opening, recruiter_group):
	created = []
	external_recruiter = _first("TA External Recruiter")
	for channel in POSTING_CHANNELS:
		if channel["post_to"] == "External Recruiter" and not external_recruiter:
			continue
		if channel["post_to"] == "External Recruiter Group" and not recruiter_group:
			continue

		slug = channel["post_to"].lower().replace(" ", "-")
		email = f"{CAND_PREFIX}{chain['key']}.{slug}{CAND_DOMAIN}"
		existing = frappe.db.get_value("Job Applicant", {"email_id": email}, "name")
		if existing:
			created.append(existing)
			continue

		doc = frappe.new_doc("Job Applicant")
		doc.applicant_name = f"{channel['first']} {channel['last']}"
		doc.email_id = email
		doc.phone_number = f"98{abs(hash(email)) % 100000000:08d}"
		doc.job_title = opening
		doc.designation = m.designation
		doc.status = "Open"
		doc.source = channel["source"]
		if doc.meta.has_field("company_name"):
			doc.company_name = m.company
		if doc.meta.has_field("custom_employment_type"):
			doc.custom_employment_type = _employment_type(chain["employment_type"])
		doc.flags.ignore_mandatory = True
		doc.insert(ignore_permissions=True)
		created.append(doc.name)
		_log(f"  applicant {doc.name} {doc.applicant_name} via {channel['post_to']}")
	return created


def _free_position(applicant):
	"""An unclaimed position row on the requisition behind this candidate's opening.

	An offer has to say which of the requisition's positions it consumes — that is
	what gets claimed and released as the offer moves. Returns None when the
	requisition itemises no positions (a campus/fresher one budgets headcount per
	region instead), and the offer then has nothing to pick.

	``candidate is not set`` rather than an IN over ``('', None)``: an unclaimed row
	holds NULL, and in SQL a NULL never equals anything in an IN list — every row
	would be skipped and the requisition would look full.
	"""
	opening = frappe.db.get_value("Job Applicant", applicant, "job_title")
	requisition = frappe.db.get_value("Job Opening", opening, "job_requisition") if opening else None
	if not requisition:
		return None
	return frappe.db.get_value(
		"Job Requisition Position",
		{"parent": requisition, "parenttype": "Job Requisition",
		 "status": ["!=", "Filled"], "candidate": ["is", "not set"]},
		"name",
		order_by="position_no asc",
	)


def _offer(m, chain, applicant, employment_type):
	"""One draft offer per chain — the record the offer-letter test is run on.

	Left as a DRAFT (docstatus 0) on purpose. Submitting is the step under test:
	chains A and B must submit and attach their letter, chain C must be refused
	with "please contact the HR department". Submitting it here would either
	consume that test or make the seed fail on chain C.
	"""
	existing = frappe.db.get_value(OFFER_DOCTYPE, {"job_applicant": applicant}, "name")
	if existing:
		return existing

	offer = frappe.new_doc(OFFER_DOCTYPE)
	offer.job_applicant = applicant
	offer.applicant_name = frappe.db.get_value("Job Applicant", applicant, "applicant_name")
	offer.offer_date = today()
	offer.designation = m.designation
	offer.company = m.company
	offer.status = "Awaiting Response"
	if offer.meta.has_field("custom_employment_type"):
		offer.custom_employment_type = employment_type
	if offer.meta.has_field("custom_expected_doj"):
		offer.custom_expected_doj = add_days(today(), 30)
	if offer.meta.has_field("custom_requisition_position"):
		offer.custom_requisition_position = _free_position(applicant)
	offer.flags.ignore_mandatory = True
	offer.insert(ignore_permissions=True)
	_log(f"  offer {offer.name} (draft) for {offer.applicant_name}")
	return offer.name


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #

SETTINGS = "Recruitment Settings"
ALLOW_EDIT_FIELD = "allow_editing_requisition_after_approval"


def _set_single(field, value):
	frappe.db.set_single_value(SETTINGS, field, value)
	frappe.clear_cache(doctype=SETTINGS)
	frappe.db.value_cache.pop(SETTINGS, None)


def run():
	"""Build all three chains. Idempotent — re-running adds nothing twice."""
	orig_sendmail = frappe.sendmail
	frappe.sendmail = lambda *a, **k: None  # no real mail, for the whole run

	# Position rows are written by a nested save inside the approval hook, and
	# that nested save re-reads its "before" snapshot after the status is already
	# Approved — the edit-after-approval guard then blocks it. Enabling the
	# setting for the duration is the remedy the guard's own message prescribes.
	prev_allow_edit = frappe.db.get_single_value(SETTINGS, ALLOW_EDIT_FIELD)
	_set_single(ALLOW_EDIT_FIELD, 1)

	built = []
	try:
		m = _masters()
		print(f"\nmasters: company={m.company} department={m.department} "
		      f"designation={m.designation} branch={m.branch} raised_by={m.employee}\n")

		_ensure_sources()
		recruiter_group = _ensure_recruiter_group()

		for chain in CHAINS:
			print(f"--- Chain {chain['label']} ---")
			employment_type = _employment_type(chain["employment_type"])
			context = {"employment_type": employment_type, "company": m.company,
			           "department": m.department, "designation": m.designation}

			opening_dua = _assignment(
				f"{ASSIGNMENT_PREFIX} {chain['label']} Openings",
				OPENING_DOCTYPE,
				[(field, context[key]) for field, key in chain["opening_scope"]],
				f"{MARKER} Which Job Openings the {chain['label']} interview "
				"strategy template applies to.",
			)
			strategy = _strategy_template(chain, opening_dua)

			letter = None
			if chain["offer_letter"]:
				offer_dua = _assignment(
					f"{ASSIGNMENT_PREFIX} {chain['label']} Offers",
					OFFER_DOCTYPE,
					[(field, context[key]) for field, key in chain["offer_scope"]],
					f"{MARKER} Which Job Offers the {chain['label']} offer letter "
					"template applies to.",
				)
				letter = _offer_letter_template(chain, offer_dua)
			else:
				_log("no offer letter template — this chain is the "
				     "'no template available' test")

			requisition = _requisition(m, chain, employment_type)
			opening = _opening(m, chain, requisition, employment_type, recruiter_group)
			applicants = _applicants(m, chain, opening, recruiter_group)
			offer = _offer(m, chain, applicants[0], employment_type) if applicants else None

			built.append({
				"chain": chain["label"], "requisition": requisition, "opening": opening,
				"strategy": strategy, "letter": letter, "applicants": applicants,
				"offer": offer,
			})
			print()

		frappe.db.commit()
	finally:
		_set_single(ALLOW_EDIT_FIELD, prev_allow_edit)
		frappe.sendmail = orig_sendmail
		frappe.db.commit()

	report()
	return built


def _catch_all_templates():
	"""Job Offer Document Templates that admit every offer.

	The "no template available" test only means anything when nothing is
	unrestricted — one catch-all letter admits chain C too and the refusal never
	fires. A template counts as unrestricted when it has no Assignment Type, or
	names only *People* assignments (which carry no attributes and are skipped).
	"""
	from recruitment.recruitment.offer_document_template import (
		_assignments_by_template,
		_candidate_templates,
	)
	from nextai.nextai.doctype.dynamic_user_assignment.attributes import load_attributes

	templates = _candidate_templates()
	assignments = _assignments_by_template([t["name"] for t in templates])
	referenced = {d for duas in assignments.values() for d in duas}
	scoped, _modes = load_attributes(referenced) if referenced else ({}, {})

	out = []
	for template in templates:
		kind = (template.get("assignment_type") or "").strip()
		if not kind:
			out.append((template["name"], "no Assignment Type"))
		elif kind == "Company" and not template.get("company"):
			out.append((template["name"], "Company assignment with no company"))
		elif kind == "User Assignment":
			duas = assignments.get(template["name"]) or []
			if not [d for d in duas if scoped.get(d)]:
				out.append((template["name"], "only People assignments — no attributes"))
	return out


CATCHALL_PREFIX = f"{ASSIGNMENT_PREFIX} Catchall"
# The seed DUA carries the template's previous Assignment Type in its description
# so unscope_catchalls() can put it back exactly, instead of guessing that every
# template it touched started out unrestricted-by-blank.
PRIOR_TAG = "[prior_assignment_type="


def scope_catchalls():
	"""Opt-in: scope every unrestricted Job Offer letter to its own Company.

	The Intern chain exists to prove the "please contact the HR department"
	refusal, and that only happens when NOTHING admits the offer. One unrestricted
	letter on the site admits it too and the refusal never fires — so this narrows
	each catch-all to the company it already names (or the site's first company if
	it names none), which is configuration the site most likely wanted anyway.

	Deliberately NOT part of run(): it edits templates the seed does not own, so it
	is a decision, not a side effect. Fully reversed by unscope_catchalls(), which
	cleanup() calls for you.
	"""
	changed = []
	for template, why in _catch_all_templates():
		doc = frappe.get_doc("Document Template", template)
		company = doc.get("company") or _first("Company")
		if not company:
			print(f"  {template}: no company to scope by — skipped")
			continue

		name = f"{CATCHALL_PREFIX} {template}"[:140]
		prior = (doc.get("assignment_type") or "").strip()
		if not frappe.db.exists("Dynamic User Assignment", name):
			_assignment(
				name, OFFER_DOCTYPE, [("company", company)],
				f"{MARKER} Narrows '{template}' to {company} so the "
				f"no-template-available case is reachable. {PRIOR_TAG}{prior}]",
			)

		if not any(r.get("dynamic_user_assignment") == name
		           for r in (doc.get("user_assignment") or [])):
			doc.append("user_assignment", {"dynamic_user_assignment": name})
		doc.assignment_type = "User Assignment"
		doc.flags.ignore_mandatory = True
		doc.save(ignore_permissions=True)
		changed.append((template, company, why))
		print(f"  '{template}' scoped to company {company} (was: {why})")

	frappe.db.commit()
	if not changed:
		print("  nothing to scope — no unrestricted Job Offer template")
	return changed


def unscope_catchalls():
	"""Undo scope_catchalls(): drop the seed's row and restore Assignment Type."""
	for name in frappe.get_all(
		"Dynamic User Assignment",
		filters={"assignment_name": ["like", f"{CATCHALL_PREFIX}%"]},
		pluck="name",
	):
		description = frappe.db.get_value("Dynamic User Assignment", name, "description") or ""
		prior = ""
		if PRIOR_TAG in description:
			prior = description.split(PRIOR_TAG, 1)[1].split("]", 1)[0]

		# Raw SQL, not get_all: reading a child doctype through DatabaseQuery is
		# increasingly restricted without a parent_doctype, and a read that quietly
		# returns nothing here would report a clean restore while leaving the seed's
		# row on someone else's template.
		templates = [
			r[0] for r in frappe.db.sql(
				"""SELECT DISTINCT parent FROM `tabAssignment Group`
				   WHERE parenttype = 'Document Template'
				     AND parentfield = 'user_assignment'
				     AND dynamic_user_assignment = %s""",
				name,
			)
		]
		for template in templates:
			doc = frappe.get_doc("Document Template", template)
			doc.set("user_assignment", [
				r for r in (doc.user_assignment or []) if r.dynamic_user_assignment != name
			])
			doc.assignment_type = prior
			doc.flags.ignore_mandatory = True
			doc.save(ignore_permissions=True)
			print(f"  '{template}' restored to Assignment Type '{prior or '(blank)'}'")
	frappe.db.commit()


def report():
	"""Print what exists and what each chain resolves to right now."""
	from recruitment.job_offer_utils import get_job_offer_document_template
	from recruitment.recruitment.offer_document_template import (
		is_document_template_offer_enabled,
		resolve_offer_document_templates,
	)
	from recruitment.recruitment.doctype.ta_interview_strategy_template.ta_interview_strategy_template import (
		get_hiring_stages_for_job_opening,
	)
	from recruitment.api.hiring_stage import is_hiring_workflow_enabled

	print("\n" + "=" * 78)
	print("TA ATTRIBUTE FLOW SEED — current state")
	print("=" * 78)

	workflow_on = is_hiring_workflow_enabled()
	letters_on = is_document_template_offer_enabled()
	print(f"\nRecruitment Settings")
	print(f"  Enable Hiring Workflow ............... {'ON' if workflow_on else 'OFF'}"
	      + ("" if workflow_on else "   <- interview strategy templates will NOT auto-fill"))
	print(f"  Send Job Offer via Document Template . {'ON' if letters_on else 'OFF'}"
	      + ("" if letters_on else "   <- offer letters fall back to Print Format"))

	for chain in CHAINS:
		title = f"{OPENING_PREFIX} {chain['label']} — {chain['title']}"
		opening = frappe.db.get_value("Job Opening", {"job_title": title}, "name")
		print(f"\n--- Chain {chain['label']} " + "-" * (60 - len(chain["label"])))
		if not opening:
			print("  not seeded")
			continue

		requisition = frappe.db.get_value("Job Opening", opening, "job_requisition")
		print(f"  requisition : {requisition}")
		print(f"  opening     : {opening}")

		resolved = get_hiring_stages_for_job_opening(job_opening=opening) or {}
		expected = [name for name, _t in chain["rounds"]]
		got = [s["stage_name"] for s in (resolved.get("stages") or [])]
		verdict = "OK" if got == expected else ("MISMATCH" if got else "none")
		print(f"  strategy    : {resolved.get('template_name') or '-'}  [{verdict}]")
		print(f"    expected  : {', '.join(expected)}")
		print(f"    resolved  : {', '.join(got) or '-'}")

		applicants = frappe.get_all(
			"Job Applicant",
			filters={"email_id": ["like", f"{CAND_PREFIX}{chain['key']}.%{CAND_DOMAIN}"]},
			fields=["name", "applicant_name", "source"],
			order_by="creation asc",
		)
		print(f"  applicants  : {len(applicants)}")
		for a in applicants:
			print(f"    {a['name']:<22} {a['applicant_name']:<18} source={a['source']}")

		offer = frappe.db.get_value(
			"Job Offer", {"job_applicant": ["in", [a["name"] for a in applicants] or [""]]}, "name"
		)
		if offer:
			matches = resolve_offer_document_templates(offer)
			chosen = get_job_offer_document_template(offer)
			print(f"  offer       : {offer} (draft)")
			print(f"    letter    : {chosen or 'NONE -> submit must be refused'}")
			if matches:
				print("    admitted  : " + ", ".join(
					f"{mt['name']} (specificity {mt['specificity']})" for mt in matches))

	catch_alls = _catch_all_templates()
	print("\n" + "-" * 78)
	if catch_alls:
		print("BLOCKER for the Intern (no-template) test:")
		for name, why in catch_alls:
			print(f"  '{name}' admits every offer — {why}")
		print("  While one exists, chain C resolves to it and the 'contact the HR")
		print("  department' refusal cannot fire. Scope it by hand (Document Template")
		print("  -> Assignment Type), or run:")
		print("    bench --site <site> execute "
		      "recruitment.ta_attribute_flow_seed.scope_catchalls")
		print("  which narrows each to its own Company and is undone by cleanup().")
		print("  Every other offer-letter test holds either way.")
	else:
		print("No unrestricted Job Offer template — the Intern chain will correctly")
		print("resolve to no letter, which is what chain C is for.")
	print("-" * 78 + "\n")


def cleanup():
	"""Remove everything this seeder built. Masters it created are left alone."""
	orig_sendmail = frappe.sendmail
	frappe.sendmail = lambda *a, **k: None
	prev_allow_edit = frappe.db.get_single_value(SETTINGS, ALLOW_EDIT_FIELD)
	_set_single(ALLOW_EDIT_FIELD, 1)

	def _drop(doctype, filters, label):
		names = frappe.get_all(doctype, filters=filters, pluck="name")
		for name in names:
			try:
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True,
				                  delete_permanently=True)
			except Exception as exc:
				print(f"  could not delete {doctype} {name}: {exc}")
		if names:
			print(f"  {label}: {len(names)} removed")

	try:
		# Templates the seed does not own are put back first — deleting the
		# assignment out from under one would leave a dangling child row.
		unscope_catchalls()

		applicants = frappe.get_all(
			"Job Applicant", filters={"email_id": ["like", f"{CAND_PREFIX}%{CAND_DOMAIN}"]},
			pluck="name",
		)
		# Offers first: they reference the applicants, and a submitted one has to
		# be cancelled before it will delete.
		#
		# Raising an offer also creates a Candidate Action Center Item pointing at
		# it, and Frappe refuses to delete a document something still links to — so
		# that item goes first or every offer survives cleanup and is left orphaned
		# against a deleted applicant.
		offers = frappe.get_all(
			"Job Offer", filters={"job_applicant": ["in", applicants or [""]]}, pluck="name"
		)
		_drop(
			"Candidate Action Center Item",
			{"reference_doctype": "Job Offer", "reference_docname": ["in", offers or [""]]},
			"action centre items",
		)
		for offer in offers:
			try:
				doc = frappe.get_doc("Job Offer", offer)
				if doc.docstatus == 1:
					doc.cancel()
				doc.delete(ignore_permissions=True)
			except Exception as exc:
				print(f"  could not delete Job Offer {offer}: {exc}")
		print(f"  offers: {len(offers)} cleared")

		_drop(
			"Candidate Action Center Item",
			{"candidate_email": ["like", f"{CAND_PREFIX}%{CAND_DOMAIN}"]},
			"candidate action centre items",
		)
		_drop("Job Applicant", {"email_id": ["like", f"{CAND_PREFIX}%{CAND_DOMAIN}"]}, "applicants")
		_drop("Job Opening", {"job_title": ["like", f"{OPENING_PREFIX} %"]}, "openings")
		_drop("Job Requisition", {"description": ["like", f"%{MARKER}%"]}, "requisitions")
		_drop("TA Interview Strategy Template",
		      {"template_name": ["like", f"{STRATEGY_PREFIX}%"]}, "strategy templates")
		_drop("Document Template", {"letter_name": ["like", f"{LETTER_PREFIX}%"]}, "offer letters")
		_drop("Dynamic User Assignment",
		      {"assignment_name": ["like", f"{ASSIGNMENT_PREFIX}%"]}, "assignments")
		frappe.db.commit()
	finally:
		_set_single(ALLOW_EDIT_FIELD, prev_allow_edit)
		frappe.sendmail = orig_sendmail
		frappe.db.commit()
	print("cleanup done")
