# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import json
import frappe
from frappe.model.document import Document


# ---------------------------------------------------------------------------
# Default Job Description template (Jinja)
# ---------------------------------------------------------------------------
# Seeded into `description` for brand-new JDs. Manager edits freely.
# Uses standard Frappe Jinja: {{ field }} for parent fields and
# {% for row in child_table %}...{% endfor %} for child-table rows.
# ---------------------------------------------------------------------------
DEFAULT_JD_TEMPLATE = """Group Company: {{ company or "" }}
Designation: {% for d in designation %}{{ d.designation }}{% if not loop.last %}, {% endif %}{% endfor %}
Department: {% for d in department %}{{ d.department }}{% if not loop.last %}, {% endif %}{% endfor %}
Business Unit: {% for b in business_unit %}{{ b.business_unit }}{% if not loop.last %}, {% endif %}{% endfor %}
Office Location:

Position Description:
Recruitment and Selection: Managing the entire recruitment and selection process, including sourcing, screening, interviewing, and onboarding new employees. This may involve developing job descriptions, advertising job openings, conducting interviews, checking references, and negotiating job offers.

Primary Responsibilities:
Recruitment and Selection: Managing the entire recruitment and selection process, including sourcing, screening, interviewing, and onboarding new employees. This may involve developing job description.

Additional Responsibilities:

Reporting Team
Reporting Designation:
Reporting Department:

Educational Qualifications Preferred
Category: {% for c in category %}{{ c.category }}{% if not loop.last %}, {% endif %}{% endfor %}
Field Specialization: {% for s in specialization %}{{ s.specialization }}{% if not loop.last %}, {% endif %}{% endfor %}
Degree: {% for d in degree %}{{ d.degree }}{% if not loop.last %}, {% endif %}{% endfor %}
Academic Score:
Institution Tier:
Required Certifications:
Required Trainings:

Required Work Experience
Industry: {% for s in preferred_sector %}{{ s.sector }}{% if not loop.last %}, {% endif %}{% endfor %}
Role: {{ preferred_role or "" }}
Preferred Company: {{ preferred_company or "" }}
Years of Experience: {{ min_preferred_work_experience_years or "" }} - {{ max_preferred_work_experience_years or "" }} years

Key Performance Indicators:

Required Competencies:
{% for c in competencies if c.add_to_jd %}- {{ c.competencies_name }}
{% endfor %}

Required Knowledge:

Required Skills:
{% for s in skills %}- {{ s.skill }}
{% endfor %}

Required Abilities:
Physical:
Other:

Work Environment Details:

Specific Requirements
Travel:
Vehicle:
Work Permit:

Other Details
Pay Rate:
Contract Types:
Time Constraints:
Compliance Related:
Union Affiliation:
"""


def _err_html(message):
	return (
		"<div style='color:#b91c1c;border:1px solid #fecaca;"
		"background:#fef2f2;padding:8px 12px;border-radius:6px;'>"
		"<strong>Template error:</strong> {0}"
		"</div>"
	).format(frappe.utils.escape_html(str(message)))


def plain_text_to_html(text):
	"""Convert plain text with `\\n` line breaks into structural HTML
	(<p> blocks separated by blank lines, `<br>` within a block).

	Why this exists: when the rendered Jinja output (plain text by default)
	is handed to a Text Editor (Quill/TipTap on the Frappe Desk side) or
	to `dangerouslySetInnerHTML` (React preview modal), raw `\\n` gets
	collapsed to single spaces because HTML treats whitespace as
	collapsible. We pre-convert here so the structure survives the trip.

	If the input already looks like HTML (contains a `<` tag), it's
	returned as-is so manager-authored HTML templates pass through.
	"""
	import re

	if not text:
		return ""
	if "<" in text:
		# Author wrote HTML directly — trust them, no transformation.
		return text

	escaped = frappe.utils.escape_html(text)
	# Split into paragraphs on blank lines, then convert remaining
	# single line breaks within each paragraph to <br>.
	paragraphs = re.split(r"\n\s*\n", escaped)
	html_blocks = []
	for p in paragraphs:
		p = p.strip("\n")
		if not p.strip():
			continue
		html_blocks.append("<p>" + p.replace("\n", "<br>") + "</p>")
	return "".join(html_blocks)


def _render_preview(doc):
	"""Render `description` as Jinja against the doc's fields and write the
	result to `preview`. Broken templates surface as an inline error so the
	manager can fix them — save is never blocked.

	IMPORTANT: We bypass `frappe.render_template` deliberately. That helper
	calls `frappe.throw()` on Jinja errors, which adds a message to
	`frappe.local.message_log` as a side-effect. Even when our try/except
	catches the raised exception, the message has already been recorded
	and gets serialised back to the client as a popup — visible to the
	manager every time they type an incomplete `{{...`. Using the Jinja
	sandbox directly keeps the safety filters but skips the throw side-effect.
	"""
	template = doc.get("description") or ""
	if not template.strip():
		doc.preview = ""
		return

	# Reject server-script-style attribute access the same way
	# frappe.render_template does, without using its throw path.
	if ".__" in template:
		doc.preview = _err_html("Illegal template")
		return

	try:
		from frappe.utils.jinja import get_jenv
		jenv = get_jenv()  # SandboxedEnvironment with Frappe's safe filters
		compiled = jenv.from_string(template)
		doc.preview = compiled.render(doc.as_dict())
	except Exception as exc:
		doc.preview = _err_html(str(exc))


@frappe.whitelist()
def render_description(description=None, doc=None):
	"""Live-preview endpoint used by the form's JS. Accepts the in-progress
	description + current doc state (JSON) and returns the rendered HTML so
	the preview can update without saving the doc."""
	if isinstance(doc, str):
		try:
			doc = json.loads(doc)
		except json.JSONDecodeError:
			doc = {}
	doc = doc or {}
	doc["doctype"] = "Job Description"
	try:
		shim = frappe.get_doc(doc)
	except Exception:
		shim = frappe.new_doc("Job Description")
	shim.description = description or ""
	_render_preview(shim)
	return shim.preview or ""


class JobDescription(Document):
	def before_insert(self):
		# Seed brand-new JDs with the default template only when the manager
		# left the description empty. If they pasted something else, respect it.
		if not (self.get("description") or "").strip():
			self.description = DEFAULT_JD_TEMPLATE

	def validate(self):
		self.filter_competencies()
		self.enforce_single_default()
		_render_preview(self)

	def filter_competencies(self):
		"""Remove competencies where add_to_jd is unchecked before saving."""
		if self.competencies:
			self.competencies = [
				row for row in self.competencies
				if row.add_to_jd
			]

	def enforce_single_default(self):
		"""Only one Job Description may carry `is_default = 1`.

		When this doc is marked default, clear the flag on every other
		Job Description so the preview-fallback lookup is deterministic.
		"""
		if not self.get("is_default"):
			return

		frappe.db.sql(
			"""
			UPDATE `tabJob Description`
			SET is_default = 0
			WHERE name != %s AND is_default = 1
			""",
			(self.name,),
		)


@frappe.whitelist()
def get_competencies_for_designations(designations):
	"""
	Fetch all competencies mapped to the given designations via Competency Mapping.

	Flow:
	  1. Find all Competency Mapping docs where assign_to_unique_roles
	     contains any of the selected designations.
	  2. For each matching mapping, read its competency_mapping child table.
	  3. Enrich each competency with tier info from Competency master.
	  4. De-duplicate by competency code and return.

	Args:
	    designations: JSON string — list of designation names

	Returns:
	    List of dicts with competency details ready for the child table.
	"""
	if isinstance(designations, str):
		designations = json.loads(designations)

	if not designations:
		return []

	# Step 1: Find Competency Mapping parents that have matching designations
	# JD Designations child table is used in Competency Mapping's "assign_to_unique_roles" field
	matching_parents = frappe.db.sql("""
		SELECT DISTINCT parent
		FROM `tabJD Designations`
		WHERE parenttype = 'Competency Mapping'
		  AND parentfield = 'assign_to_unique_roles'
		  AND designation IN %(designations)s
	""", {"designations": designations}, as_dict=True)

	mapping_names = [row.parent for row in matching_parents]

	if not mapping_names:
		return []

	# Step 2: Get all competency rows from those mappings
	competency_rows = frappe.db.sql("""
		SELECT
			cmt.competency,
			cmt.proficiency,
			cmt.weightage,
			cmt.parent AS mapping_name
		FROM `tabCompetency Mapping Table` cmt
		WHERE cmt.parent IN %(mapping_names)s
	""", {"mapping_names": mapping_names}, as_dict=True)

	if not competency_rows:
		return []

	# Step 3: Get unique competency codes and enrich with master data
	competency_codes = list(set(row.competency for row in competency_rows))

	competency_details = frappe.db.sql("""
		SELECT
			c.name AS competency_code,
			c.competency_name,
			c.competency_tier
		FROM `tabCompetency` c
		WHERE c.name IN %(codes)s
	""", {"codes": competency_codes}, as_dict=True)

	# Build lookup dict
	comp_lookup = {c.competency_code: c for c in competency_details}

	# Step 4: Get designations text for each mapping
	mapping_designations = {}
	for mname in mapping_names:
		desig_rows = frappe.db.get_all(
			"JD Designations",
			filters={
				"parent": mname,
				"parenttype": "Competency Mapping",
				"parentfield": "assign_to_unique_roles"
			},
			fields=["designation"]
		)
		if desig_rows:
			mapping_designations[mname] = ", ".join(
				[d.designation for d in desig_rows]
			)
		else:
			mapping_designations[mname] = "All Roles"

	# Step 5: Build final result, de-duplicated by competency code
	seen = set()
	result = []

	for row in competency_rows:
		if row.competency in seen:
			continue
		seen.add(row.competency)

		comp_info = comp_lookup.get(row.competency, {})

		result.append({
			"competencies_name": row.competency,
			"competencies_mapping": row.mapping_name,
			"designations": mapping_designations.get(row.mapping_name, ""),
			"weightage": row.weightage or "",
			"tier": comp_info.get("competency_tier", ""),
			"add_to_jd": 1
		})

	return result
