"""Offer letter placeholders — what nextai's Document Template gets wrong for a Job Offer.

nextai builds one ``{"{{placeholder}}": "value"}`` map per render
(``DocumentTemplate.get_enhanced_document_data``) and every path — DOCX via
docxtpl, HTML via string replacement, the form preview, the offer email's PDF —
reads that map. For a Job Offer it had four gaps, all fixed here by topping the
map up after nextai has built it:

1. A Link placeholder printed the record's ID. ``{{designation}}`` came out as
   ``_ACD_R&D_NB_MANAGEMENT`` and ``{{custom_employment_type}}`` as
   ``EMPTYPE_0012``. Where the linked DocType shows its title in links (the same
   rule Desk uses), the letter now gets that title.
2. ``{{link.field}}`` only worked for six hard-wired links (job_applicant,
   company, designation, …). ``{{custom_employment_type.employee_type_name}}``,
   ``{{custom_work_location.branch}}`` and every other Job Offer link rendered
   as the raw placeholder. Every Link field on the offer now expands, loaded
   only when the template actually uses it.
3. Currency printed as Python's float repr (``1200000.0``). It now uses the
   site's number format (``12,00,000.00``), without a symbol so the template
   decides between "INR" and "₹".
4. HTML templates are filled by exact string replacement, so ``{{ applicant_name }}``
   (with spaces, as Jinja is usually written) was never replaced. The spaced
   spellings the template uses now resolve too. DOCX already renders through
   Jinja, where spacing never mattered.

Scoped to ``doctype_name == "Job Offer"``; every other letter renders exactly as
nextai builds it.
"""

import re

import frappe
from frappe.utils import flt, fmt_money

from nextai.nextai.doctype.document_template.document_template import DocumentTemplate

JOB_OFFER = "Job Offer"
JOB_APPLICANT = "Job Applicant"

# Links nextai already expands into `{{prefix.field}}` itself
# (DocumentTemplate._populate_job_offer_linked_data).
_NEXTAI_EXPANDED_LINKS = frozenset({"job_applicant", "company", "designation", "select_terms", "letter_head"})

# Links that mean nothing in a letter: the offer's own amendment chain and the
# template that is rendering it.
_SKIPPED_LINKS = frozenset({"amended_from", "custom_offer_letter_template"})

# Nothing to print — and Password never goes into a letter a candidate receives.
_NO_VALUE_FIELDTYPES = frozenset({
	"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Table", "Table MultiSelect",
	"Password",
})

# nextai swaps these for an <img> by exact key, so a spaced alias would get the
# raw file URL instead.
_IMAGE_PLACEHOLDERS = frozenset({"{{LETTERHEAD_IMAGE}}", "{{letter_head}}"})

_PLACEHOLDER_RE = re.compile(r"\{\{(\s*)([^{}]+?)(\s*)\}\}")


class RecruitmentDocumentTemplate(DocumentTemplate):
	def get_enhanced_document_data(self, doctype_name, doc_name):
		data = super().get_enhanced_document_data(doctype_name, doc_name)
		if data and doctype_name == JOB_OFFER:
			try:
				complete_job_offer_placeholders(self, doc_name, data)
			except Exception:
				# A letter with a raw ID in it beats no letter at all.
				frappe.log_error(frappe.get_traceback(), "Offer letter placeholders failed")
		return data

	def _get_job_offer_linked_fields(self):
		"""The template editor's field picker: offer every link the renderer
		now resolves, not only the six nextai lists."""
		fields = super()._get_job_offer_linked_fields()
		for df in _extra_links(frappe.get_meta(JOB_OFFER)):
			try:
				target = frappe.get_meta(df.options)
			except Exception:
				continue
			for f in target.fields:
				if f.fieldtype in _NO_VALUE_FIELDTYPES:
					continue
				fields.append({
					"fieldname": f"{df.fieldname}.{f.fieldname}",
					"label": f"{df.label or df.fieldname} - {f.label or f.fieldname}",
					"fieldtype": f.fieldtype,
					"is_linked_field": True,
					"link_doctype": df.options,
					"link_field": df.fieldname,
				})
		return fields


def _extra_links(meta):
	return [
		df for df in meta.fields
		if df.fieldtype == "Link" and df.options
		and df.fieldname not in _NEXTAI_EXPANDED_LINKS and df.fieldname not in _SKIPPED_LINKS
	]


def complete_job_offer_placeholders(template, job_offer, data):
	offer = frappe.get_doc(JOB_OFFER, job_offer)
	meta = frappe.get_meta(JOB_OFFER)
	used = template._get_referenced_placeholder_prefixes()

	_fill_doc(template, data, "", offer, meta, used)

	# nextai loads the applicant only when the template uses `job_applicant.*`.
	applicant_keys = any(k.startswith("{{job_applicant.") for k in data)
	if applicant_keys and offer.get("job_applicant"):
		applicant = frappe.get_doc(JOB_APPLICANT, offer.job_applicant)
		_fill_doc(template, data, "job_applicant.", applicant, frappe.get_meta(JOB_APPLICANT), used)

	for df in _extra_links(meta):
		value = offer.get(df.fieldname)
		if not value or (used is not None and df.fieldname not in used):
			continue
		try:
			linked = frappe.get_doc(df.options, value)
		except frappe.DoesNotExistError:
			continue
		_fill_doc(template, data, f"{df.fieldname}.", linked, frappe.get_meta(df.options), used,
		          add_missing=True)

	_blank_unset_links(meta, used, data)

	if template.template_type == "Html":
		_alias_spaced_placeholders(template.html_content_storage or "", data)


def _fill_doc(template, data, prefix, doc, meta, used, add_missing=False):
	"""Correct (or, with ``add_missing``, add) ``{{<prefix><field>}}`` for one doc.

	Without ``add_missing`` only keys nextai already produced are touched, so a
	placeholder nextai deliberately left out stays out. Only placeholders the
	template uses are worked on (``used``; None when nextai could not read the
	template, in which case everything is) — a link title is a query, and a
	Job Applicant alone has dozens of links no letter prints.
	"""
	for df in meta.fields:
		if df.fieldtype in _NO_VALUE_FIELDTYPES:
			continue
		name = prefix + df.fieldname
		if used is not None and name not in used:
			continue
		key = "{{%s}}" % name
		if key not in data and not add_missing:
			continue
		value = doc.get(df.fieldname)
		if df.fieldtype == "Link":
			data[key] = _link_title(df.options, value) or str(value or "")
		elif df.fieldtype == "Currency":
			data[key] = _money(value)
		elif df.fieldtype in ("Date", "Datetime"):
			data[key] = template.format_date_field(value, df.fieldtype)
		elif add_missing:
			data[key] = str(value or "")
	if add_missing:
		data.setdefault("{{%sname}}" % prefix, str(doc.name))


def _blank_unset_links(meta, used, data):
	"""``{{custom_work_location.branch}}`` on an offer with no Work Location is
	blank, not the placeholder printed as-is in the candidate's letter."""
	links = {df.fieldname for df in meta.fields if df.fieldtype == "Link"}
	for name in used or ():
		if "." in name and name.split(".", 1)[0] in links:
			data.setdefault("{{%s}}" % name, "")


def _link_title(doctype, name):
	"""The title Desk shows for a link, or None where Desk shows the ID."""
	if not (doctype and name):
		return None
	try:
		meta = frappe.get_meta(doctype)
	except Exception:
		return None
	title_field = meta.title_field
	if not (meta.show_title_field_in_link and title_field and title_field != "name"):
		return None
	# Masters (Designation, Employment Type, …) — the cache is cleared on save.
	title = frappe.get_cached_value(doctype, name, title_field)
	return str(title) if title else None


def _money(value):
	# Zero stays blank, as nextai renders every other empty value.
	return fmt_money(flt(value)) if flt(value) else ""


def _alias_spaced_placeholders(html, data):
	for match in _PLACEHOLDER_RE.finditer(html):
		spelled = match.group(0)
		if not (match.group(1) or match.group(3)):
			continue
		canonical = "{{%s}}" % match.group(2).strip()
		if canonical in data and canonical not in _IMAGE_PLACEHOLDERS:
			data.setdefault(spelled, data[canonical])
