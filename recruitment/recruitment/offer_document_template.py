"""Which Document Template a Job Offer is rendered from — decided by attributes.

The offer letter used to be chosen in Recruitment Settings: one default
``job_offer_document_template`` plus a per-Employment-Type override table
(``Job Offer Document Template Mapping``). That could only ever discriminate on
one field, so "Interns in Pune get a different letter" or "the Sales letter"
meant a code change or a second settings table.

Selection now lives on the **Document Template** itself, on the fields it
already carries:

``assignment_type = "Company"``
    The template belongs to one Company. It matches an offer for that company.

``assignment_type = "User Assignment"``
    ``user_assignment`` names Dynamic User Assignments. A DUA of purpose
    *Attributes* carries rows of ``(scope_doctype, scope_field, value)`` — "on a
    Job Offer, ``custom_employment_type`` may be Intern". The offer must satisfy
    them to be offered that letter. Scoping by a new field is a configuration
    change on the DUA; nothing ships. Assignments of purpose *People* in that
    same table are **skipped**, not treated as an unrestricted match — they say
    who a document is generated for, never which offers a letter covers, and
    since assignments OR, admitting one would cancel every attribute rule beside
    it. That table has held People assignments since long before attributes
    existed, so this is the common shape rather than a corner case.

``assignment_type`` empty
    Unrestricted — the catch-all letter.

Matching semantics come from :mod:`nextai...dynamic_user_assignment.attributes`
and are not reinvented here: values within one field OR, fields combine per the
DUA's ``attribute_match`` (AND by default), a field the DUA does not mention
imposes nothing, and an empty value on the offer *defers* (``None``) rather than
failing. Several DUAs on one template OR together — any one admitting is enough,
which is how a Table MultiSelect of assignments reads.

Deferral is the reason for the two modes. :func:`resolve_offer_document_templates`
is strict — only a definite match counts — because it decides what is actually
rendered and what is validated at submit. The link picker is permissive: a
half-filled form should still show the letters it could still qualify for
instead of an empty list.

**No match is a real outcome.** With the Document Template path switched on and
nothing admitting this offer, there is no letter to preview, attach or send, and
every surface says so in the same words (:func:`no_template_message`) rather than
silently falling back to some other document.

Attributes may be scoped to the Job Applicant or the Job Opening as well as the
Job Offer; :class:`_OfferContext` resolves whichever doctypes the configuration
actually names, and reads none of them when it names none.
"""

import json

import frappe
from frappe import _

from nextai.nextai.doctype.dynamic_user_assignment.attributes import (
	AttributeIndex,
	load_attributes,
)

TEMPLATE_DOCTYPE = "Document Template"
OFFER_DOCTYPE = "Job Offer"
ASSIGNMENT_CHILD = "Assignment Group"
ASSIGNMENT_FIELD = "user_assignment"

ASSIGNMENT_BY_COMPANY = "Company"
ASSIGNMENT_BY_USER = "User Assignment"

# One wording, used by the desk preview, the candidate portal, the offer-letter
# tab and the submit-time check. HR should never have to work out that four
# different messages mean the same missing configuration.
#
# A function, not a module constant: ``_()`` resolves against the *current*
# session's language, and a constant would freeze whichever language happened to
# be active when the worker first imported this module.
def no_template_message():
	"""The one sentence every surface says when no letter admits this offer."""
	return _(
		"No offer letter document template is available for this Job Offer. "
		"Please contact the HR department."
	)


def _template_meta_field(fieldname):
	"""Whether Document Template really has ``fieldname``.

	nextai owns that doctype, and a site can be on a version that predates
	``assignment_type``. Reading through meta keeps this app working there
	instead of erroring on a column that is not present yet.
	"""
	try:
		return bool(frappe.get_meta(TEMPLATE_DOCTYPE).get_field(fieldname))
	except Exception:
		return False


# ── Offer context ─────────────────────────────────────────────────────────────


# The client sends the form's current values, so this is untrusted input on the
# way into a matcher that does set membership. Only plain scalars survive: a
# Frappe filter operand arrives as a list (``["in", [...]]``), which would blow up
# on ``value in values`` against a set, and ``job_offer`` is stripped because the
# picker uses that key for the offer's *own* name while Job Offer has a field of
# the same name holding the Job Applicant.
_OVERLAY_DROP = {"job_offer", "doctype", "doctype_name", "name"}


def _clean_overlay(overlay):
	"""``{fieldname: value}`` — the scalar form values safe to match on."""
	if isinstance(overlay, str):
		try:
			overlay = json.loads(overlay)
		except ValueError:
			return {}
	if not isinstance(overlay, dict):
		return {}
	return {
		k: v
		for k, v in overlay.items()
		if k not in _OVERLAY_DROP and isinstance(v, (str, int, float)) and v not in (None, "")
	}


class _OfferContext:
	"""The documents an attribute row may be matched against, resolved lazily.

	A DUA names the doctype it scopes, so the caller cannot know up front whether
	the Job Applicant or the Job Opening will be needed. Each is fetched on first
	request and never twice; a configuration that only scopes Job Offer fields
	costs exactly one read.

	``overlay`` is what the *form* currently holds. The picker has to filter on
	values the user has typed but not yet saved, so those win over what is stored.
	"""

	def __init__(self, job_offer=None, overlay=None):
		self._name = job_offer if isinstance(job_offer, str) else (job_offer or {}).get("name")
		self._doc = None if isinstance(job_offer, str) else job_offer
		self._overlay = _clean_overlay(overlay)
		self._cache = {}

	def get(self, doctype):
		"""The document of ``doctype`` this offer sits in, as a dict, or None."""
		if doctype not in self._cache:
			self._cache[doctype] = self._resolve(doctype)
		return self._cache[doctype]

	def _resolve(self, doctype):
		if doctype == OFFER_DOCTYPE:
			return self._offer()
		if doctype == "Job Applicant":
			return self._linked("Job Applicant", (self._offer() or {}).get("job_applicant"))
		if doctype == "Job Opening":
			applicant = (self._offer() or {}).get("job_applicant")
			opening = frappe.db.get_value("Job Applicant", applicant, "job_title") if applicant else None
			return self._linked("Job Opening", opening)
		# Any other doctype an assignment scopes has no path from a Job Offer, so
		# there is nothing to match it against. _assignment_verdict reads that as
		# deferred, never as an admit.
		return None

	def _linked(self, doctype, name):
		if not name:
			return None
		try:
			values = frappe.db.get_value(doctype, name, "*", as_dict=True)
		except Exception:
			return None
		if not values:
			return None
		values["doctype"] = doctype
		return values

	def _offer(self):
		"""The Job Offer's values, with the form overlay and a derived Employee Type.

		Employee Type is stamped onto the offer by ``set_employment_type`` at
		*submit*, so a draft being previewed usually carries none of its own — and
		an Employee-Type attribute would then defer for every offer HR is still
		working on, which is exactly when the preview matters. Deriving it here
		through the same resolution order the stamp uses means a draft is matched
		on the type it will be sent with.
		"""
		if isinstance(self._doc, dict) and self._doc.get("_offer_context_ready"):
			return self._doc

		doc = self._doc
		if isinstance(doc, dict):
			# Mappings first, and ``frappe._dict`` is why. Its ``__getattr__``
			# answers *any* attribute with the matching key's value, so
			# ``hasattr(doc, "as_dict")`` is True on one that has no such method
			# and ``doc.as_dict()`` then fails on None. Probing for the method
			# before the type silently emptied every dict-shaped offer — and an
			# offer with no values reads as "nothing filled in yet", which defers
			# instead of matching. Check the type, not the attribute.
			values = dict(doc)
		elif doc is not None and callable(getattr(doc, "as_dict", None)):
			values = dict(doc.as_dict())
		elif self._name:
			values = frappe.db.get_value(OFFER_DOCTYPE, self._name, "*", as_dict=True) or {}
		else:
			values = {}

		values.update(self._overlay)
		values["doctype"] = OFFER_DOCTYPE

		if not values.get("custom_employment_type"):
			from recruitment.job_offer_utils import _resolve_offer_employment_type

			derived = _resolve_offer_employment_type(values)
			if derived:
				values["custom_employment_type"] = derived

		values["_offer_context_ready"] = True
		self._doc = values
		return values


# ── Candidate templates ───────────────────────────────────────────────────────


def _candidate_templates():
	"""Every Document Template that renders a Job Offer, with its scoping fields."""
	fields = ["name"]
	for optional in ("letter_name", "assignment_type", "company"):
		if _template_meta_field(optional):
			fields.append(optional)

	try:
		return frappe.get_all(
			TEMPLATE_DOCTYPE,
			filters={"doctype_name": OFFER_DOCTYPE},
			fields=fields,
			order_by="name asc",
			# Every template, not the first page of them: get_all paginates at 20
			# by default, and a gate that silently stops looking after 20 rows would
			# tell HR "no template available" for the 21st.
			limit_page_length=0,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Offer document templates: candidate lookup failed")
		return []


def _assignments_by_template(names):
	"""``{template: [dua, ...]}`` — one query for every template's User Assignments."""
	if not names or not frappe.db.table_exists(ASSIGNMENT_CHILD):
		return {}

	child = frappe.qb.DocType(ASSIGNMENT_CHILD)
	rows = (
		frappe.qb.from_(child)
		.select(child.parent, child.dynamic_user_assignment)
		.where(
			(child.parenttype == TEMPLATE_DOCTYPE)
			& (child.parentfield == ASSIGNMENT_FIELD)
			& (child.parent.isin(list(names)))
			& child.dynamic_user_assignment.notnull()
			& (child.dynamic_user_assignment != "")
		)
	).run(as_dict=True)

	out = {}
	for row in rows:
		out.setdefault(row["parent"], []).append(row["dynamic_user_assignment"])
	return out


# ── Matching ──────────────────────────────────────────────────────────────────


def _and(verdicts):
	"""Three-valued AND — False beats None beats True, per the attribute contract."""
	if any(v is False for v in verdicts):
		return False
	if any(v is None for v in verdicts):
		return None
	return True


def _assignment_verdict(dua, scoped, index, context):
	"""``(verdict, specificity)`` for one Dynamic User Assignment.

	``specificity`` is how many fields the assignment actually pins down. It is
	what makes "Intern in Pune" win over "Intern", so an offer that qualifies for
	both is rendered with the narrower letter rather than whichever sorted first.

	Only ever called for an assignment that *has* attributes — see
	:func:`_template_verdict` for why the others are skipped rather than admitted.
	"""
	verdicts = []
	fields = 0
	for scope_doctype, by_field in scoped.items():
		fields += len(by_field)
		doc = context.get(scope_doctype)
		if doc is None:
			# The assignment scopes a document this offer has no link to (or one
			# this app does not resolve). Nothing to match against yet — defer,
			# never silently admit.
			verdicts.append(None)
			continue
		verdicts.append(index.satisfied([dua], doc, combine="all"))

	return _and(verdicts), fields


def _template_verdict(template, duas, scoped_by_dua, index, context):
	"""``(verdict, specificity)`` for one Document Template."""
	assignment_type = (template.get("assignment_type") or "").strip()

	if assignment_type == ASSIGNMENT_BY_COMPANY:
		company = template.get("company")
		if not company:
			return True, 0  # ticked but never filled in — restricts nothing
		offer = context.get(OFFER_DOCTYPE) or {}
		if not offer.get("company"):
			return None, 1
		return offer.get("company") == company, 1

	if assignment_type == ASSIGNMENT_BY_USER:
		# Assignments that carry no attributes are *skipped*, not admitted. A DUA
		# of purpose People answers "who does this resolve to" and says nothing
		# about which offers a letter covers — and since assignments OR, treating
		# one as an unrestricted match would silently cancel every attribute rule
		# beside it. ``user_assignment`` on a Document Template has held People
		# assignments since long before attributes existed, so this is the common
		# case, not a corner one.
		scoping = [dua for dua in duas if scoped_by_dua.get(dua)]
		if not scoping:
			return True, 0  # ticked but nothing restricts — the catch-all letter

		# Several assignments OR: any one admitting is enough. The specificity
		# that survives is the narrowest *admitting* assignment's, not the
		# narrowest overall — a template must not be ranked on a rule that
		# rejected this offer.
		best = None
		deferred = False
		for dua in scoping:
			verdict, fields = _assignment_verdict(dua, scoped_by_dua[dua], index, context)
			if verdict is True:
				best = fields if best is None else max(best, fields)
			elif verdict is None:
				deferred = True
		if best is not None:
			return True, best
		return (None, 0) if deferred else (False, 0)

	return True, 0  # unrestricted


def resolve_offer_document_templates(job_offer=None, overlay=None, permissive=False):
	"""Document Templates this Job Offer may be rendered from, best first.

	Each entry is ``{"name", "letter_name", "specificity"}``. The list is ordered
	most-specific first, then by name so the same offer always resolves to the
	same letter.

	``permissive`` also returns templates that merely *could* still match once the
	offer is filled in (a deferred verdict). Only the link picker wants that —
	everything that renders, attaches or validates a letter wants a definite
	answer, and an empty list is the honest one.
	"""
	context = _OfferContext(job_offer, overlay)
	templates = _candidate_templates()
	if not templates:
		return []

	has_assignment_type = _template_meta_field("assignment_type")
	names = [t["name"] for t in templates]
	assignments = _assignments_by_template(names) if has_assignment_type else {}

	referenced = {dua for duas in assignments.values() for dua in duas}
	scoped_by_dua, _modes = load_attributes(referenced) if referenced else ({}, {})
	index = AttributeIndex(referenced)

	matched = []
	for template in templates:
		if not has_assignment_type:
			verdict, specificity = True, 0
		else:
			verdict, specificity = _template_verdict(
				template, assignments.get(template["name"]) or [], scoped_by_dua, index, context
			)

		if verdict is True or (permissive and verdict is None):
			matched.append(
				{
					"name": template["name"],
					"letter_name": template.get("letter_name") or template["name"],
					# A deferred match ranks below every definite one.
					"specificity": specificity if verdict is True else -1,
				}
			)

	matched.sort(key=lambda t: (-t["specificity"], t["name"]))
	return matched


def get_offer_document_template(job_offer=None, overlay=None):
	"""The single Document Template this Job Offer renders from, or None."""
	matches = resolve_offer_document_templates(job_offer, overlay=overlay)
	return matches[0]["name"] if matches else None


# ── Feature state ─────────────────────────────────────────────────────────────


def is_document_template_offer_enabled():
	"""Whether offers are rendered from a Document Template at all.

	Never raises: a site whose Recruitment Settings predates the toggle behaves
	as if it were off, which is the pre-feature Print Format path.
	"""
	try:
		return bool(frappe.db.get_single_value("Recruitment Settings", "send_offer_via_document_template"))
	except Exception:
		return False


def template_unavailable_html():
	"""The 'contact HR' notice, for every surface that would have shown a letter."""
	return (
		"<div style='padding:44px 32px;text-align:center;color:#8d99a6;"
		"font-size:13px;line-height:1.7;'>"
		"<div style='font-size:15px;font-weight:600;color:#1f272e;margin-bottom:8px;'>"
		+ frappe.utils.escape_html(_("Offer letter not available"))
		+ "</div>"
		+ frappe.utils.escape_html(no_template_message())
		+ "</div>"
	)


# ── Hooks and endpoints ───────────────────────────────────────────────────────


def validate_offer_document_template(doc, method=None):
	"""``before_submit``: refuse to send an offer that has no letter to send.

	Only when ``send_offer_via_document_template`` is on. With it off this is a
	no-op — the offer is sent as a Print Format and there is nothing here to
	check. Checked at SEND rather
	than on every save for the same reason ``validate_offer_is_complete`` is: an
	offer is drafted over several saves, and HR may well add the matching
	template while the draft sits there. What must not happen is the candidate
	receiving an offer mail with no letter attached.

	The template must be picked by hand: a blank field used to resolve silently to
	whichever template admitted the offer first, so HR never saw which letter the
	candidate was sent. The picker still filters the list it is chosen from.
	"""
	# Toggle first: with the path off there is no letter to be missing, and an
	# offer that has always been sent as a Print Format must keep submitting.
	if not is_document_template_offer_enabled():
		return
	if doc.get("custom_offer_letter_template"):
		return

	if resolve_offer_document_templates(doc):
		frappe.throw(
			_("Select the {0} for this offer. It is no longer filled in automatically, "
			  "so the letter the candidate receives is the one you picked.").format(
				frappe.bold(_("Offer Letter Template"))
			),
			title=_("Offer letter template required"),
		)

	frappe.throw(
		_("{0}<br><br>The offer letter is built from a Document Template whose "
		  "assignment matches this offer — its Company, or the attributes on its "
		  "User Assignments (Employee Type, Designation, Department, and so on). "
		  "No template on this site admits this offer, so there is nothing to "
		  "attach to the offer mail.").format(frappe.bold(no_template_message())),
		title=_("Offer letter template not available"),
	)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def offer_document_template_query(doctype, txt, searchfield, start, page_len, filters):
	"""Link query behind the Job Offer's *Offer Letter Template* picker.

	A link query rather than a ``filters`` dict because the answer depends on
	attribute configuration only the server can evaluate — and evaluating it here
	means it costs nothing until the picker is opened.

	``filters`` carries the form's current values, so the list narrows as HR fills
	the offer in without needing a save first. Permissive: a field that is still
	empty must not hide the letters it could still qualify for.

	Filters nothing when ``send_offer_via_document_template`` is off — with the
	path disabled the field decides nothing, so narrowing it would only make an
	inert field look broken.
	"""
	# Whitelisted, and it reflects back which letters exist on this site. The
	# picker only ever opens from a Job Offer form, so gate it the same way the
	# form is gated rather than leaving template names enumerable by any session.
	if frappe.session.user == "Guest" or not frappe.has_permission(OFFER_DOCTYPE, "read"):
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	if isinstance(filters, str):
		try:
			filters = json.loads(filters)
		except ValueError:
			filters = {}
	if not isinstance(filters, dict):
		# A link field's own ``link_filters`` arrive in Frappe's list form. The
		# picker's field deliberately carries none — Frappe merges them by
		# discarding this ``query`` altogether (see job_offer.js) — but Customize
		# Form can put them back on any site, so read the shape rather than trust it.
		filters = {}

	if not is_document_template_offer_enabled():
		# The path is off site-wide, so there is no assignment to filter by and the
		# field is inert. Behave exactly as the plain link field did before the
		# feature shipped — every Job Offer template, unfiltered — rather than
		# applying attribute rules nothing will act on.
		return [
			[t["name"], t.get("letter_name") or t["name"]]
			for t in _candidate_templates()
			if not txt
			or txt.lower() in (t["name"] or "").lower()
			or txt.lower() in ((t.get("letter_name") or "")).lower()
		][start : start + page_len]

	job_offer = filters.get("job_offer") or None
	matches = resolve_offer_document_templates(job_offer, overlay=filters, permissive=True)
	if not matches:
		return []

	if txt:
		needle = txt.lower()
		matches = [
			m for m in matches
			if needle in (m["name"] or "").lower() or needle in (m["letter_name"] or "").lower()
		]

	return [[m["name"], m["letter_name"]] for m in matches[start: start + page_len]]


@frappe.whitelist()
def get_offer_template_availability(job_offer=None, overlay=None):
	"""``{available, templates, message}`` — what the form shows beside the picker.

	Read-only and permission-gated on the offer it is asked about.
	"""
	if job_offer:
		frappe.has_permission(OFFER_DOCTYPE, "read", doc=job_offer, throw=True)
	elif frappe.session.user == "Guest":
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	if not is_document_template_offer_enabled():
		return {"enabled": False, "available": True, "templates": [], "message": None}

	matches = resolve_offer_document_templates(job_offer, overlay=overlay)
	return {
		"enabled": True,
		"available": bool(matches),
		"templates": matches,
		"message": None if matches else no_template_message(),
	}
