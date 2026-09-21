"""Dynamic interview feedback — the form a panel fills in is configured, not coded.

WHY THIS EXISTS
---------------
Interview Feedback ships one fixed shape: a Skill Assessment grid, a rating and a
comment. Every round of every opening got the same questions, and changing them
meant changing the doctype. Recruiters wanted to build their own evaluation forms
— different ones for a technical round, an HR round, a campus panel — and have the
answers land against the candidate like any other feedback.

The form builder for that already exists (**Microapp Form Widget**, a Formio
schema). This module is the wiring between it and Interview Feedback:

    Interview.custom_evaluation_form          ← recruiter picks the form
      → Interview Feedback.custom_evaluation_form   (fetched from the interview)
      → Interview Feedback.custom_form_response     (the answers)
      → Interview Feedback.custom_response_labels   (what the answers meant)

Nothing downstream changes. The panel still produces an ordinary submitted
Interview Feedback, so the whole ``on_submit`` chain in hooks.py — the Interview's
verdict, the work location, the region suggestion and above all
``auto_advance_stage`` — keeps working untouched. That is the entire reason the
answers live ON Interview Feedback rather than in a response doctype of their own:
a separate doctype would bypass all five hooks and the candidate would never move
to the next hiring stage.

WHAT IS DELIBERATELY *NOT* IN THE FORM
--------------------------------------
``result`` (Cleared / Rejected) stays a native field. It is ``reqd`` and every
downstream path reads it — ``check_feedback_and_update_result``,
``auto_advance_stage``, ``advance_after_extra_round``. Moving it into the builder
would mean one badly-built form silently stops candidates advancing, with no error
anywhere. The form carries the *scoring*; the verdict stays typed.

PERFORMANCE
-----------
A Formio schema is verbose — a 20-question form runs 30-60KB — so the two things
that would hurt are both avoided here:

* The schema is fetched through :func:`get_interview_feedback_form` and cached,
  revalidated against the widget's ``modified`` (a primary-key read). Forms change
  rarely, so this is a cache hit essentially always. Never ``frappe.client.get``
  on the widget — that drags its ``web_form_fields`` child table along too.
* Only a LABEL MAP is frozen per feedback (~1KB), never the schema itself
  (~40KB). At 10k feedbacks that is the difference between 10MB and 400MB, and the
  map is all the report needs to turn answer keys back into column headers.

Both stored fields are hidden, ``no_copy`` and ``report_hide`` so a JSON column
never ends up in a list query.
"""

import json

import frappe
from frappe import _


# Cache key prefix. The cached entry carries the widget's `modified` so an edited
# form invalidates itself even if the on_update hook never ran (a direct db write,
# a restored backup, a fixture sync).
CACHE_PREFIX = "interview_feedback_form"

# How long a parsed schema is kept. Purely a memory bound — every read revalidates
# against the widget's `modified`, so an expiry can only cost one re-parse, never
# correctness.
SCHEMA_CACHE_TTL = 24 * 60 * 60

# Minimum gap between two Error Log entries about the same broken form.
LOG_THROTTLE_SEC = 60 * 60

# Ceiling on how many components a schema walk will visit. An evaluation form runs
# to tens of components; this is only ever hit by a cyclic or generated schema.
MAX_COMPONENTS = 5000

# Formio component types that hold no answer — layout, decoration and buttons.
# Anything else with `input: True` is a question.
NON_INPUT_TYPES = {
	"button", "columns", "panel", "fieldset", "well", "table", "tabs",
	"htmlelement", "content", "form",
}


# --------------------------------------------------------------------------- #
# Schema access
# --------------------------------------------------------------------------- #
@frappe.whitelist()
def get_interview_feedback_form(interview):
	"""The form this interview's panel fills in: ``{widget, label, schema}``.

	One call gives the client both the widget name and its schema, so opening a
	feedback costs a single request. Returns ``{}`` when the interview has no form
	configured — the caller then leaves the standard skill grid alone.

	Permission is checked against the INTERVIEW, not the widget: a panel member can
	read the interview they are on, but has no reason to hold read on the form
	library. Without this the feedback form would simply not render for them.
	"""
	if not interview:
		return {}

	if not frappe.has_permission("Interview", "read", doc=interview):
		frappe.throw(_("Not permitted."), frappe.PermissionError)

	widget = frappe.db.get_value("Interview", interview, "custom_evaluation_form")
	if not widget:
		return {}

	# `modified` and `label` in ONE read: `modified` is what the cache is validated
	# against and `label` is wanted anyway, so fetching them together costs the same
	# query that checking the cache already needed. Never `custom_form_data` here —
	# that is the 30-60KB blob the cache exists to avoid.
	meta = frappe.db.get_value(
		"Microapp Form Widget", widget, ["modified", "label"], as_dict=True
	)
	if not meta:
		_log_once(
			widget,
			"Interview feedback form is missing",
			f"Interview {interview} points at Microapp Form Widget {widget!r}, which no "
			f"longer exists. The panel will get the standard skill grid instead.",
		)
		return {}

	schema = get_form_schema(widget, modified=meta.modified)
	if not schema:
		return {}

	return {"widget": widget, "label": meta.label or widget, "schema": schema}


def get_form_schema(widget, modified=None):
	"""The widget's Formio schema as a dict, cached against its ``modified``.

	The cache is validated against ``modified`` rather than trusted blindly.
	Invalidation hooks get missed — a fixture sync, a patch or a restored backup all
	write the row without firing ``on_update`` — and a stale schema here means an
	interviewer filling in questions that no longer exist.

	``modified`` is accepted from the caller so the one read it already did can be
	reused instead of repeated.
	"""
	if not widget:
		return None

	if modified is None:
		modified = frappe.db.get_value("Microapp Form Widget", widget, "modified")
		if not modified:
			return None

	key = f"{CACHE_PREFIX}::{widget}"
	cached = frappe.cache().get_value(key, expires=True)
	if cached and cached.get("modified") == str(modified):
		return cached.get("schema")

	raw = frappe.db.get_value("Microapp Form Widget", widget, "custom_form_data")
	schema = _parse(raw)
	if schema is None:
		# A form that cannot be parsed is a configuration fault, not a user error:
		# the panel silently falls back to the skill grid, so without this nobody
		# would ever find out the form was broken.
		_log_once(
			widget,
			"Interview feedback form could not be read",
			f"Microapp Form Widget {widget!r} has no usable custom_form_data "
			f"({'empty' if not raw else 'not valid JSON object'}). Interviews pointing "
			f"at it fall back to the standard skill grid.",
		)
		return None

	# TTL bounds what these entries can occupy in redis; correctness does not depend
	# on it, because every read revalidates against `modified` anyway.
	frappe.cache().set_value(
		key, {"modified": str(modified), "schema": schema}, expires_in_sec=SCHEMA_CACHE_TTL
	)
	return schema


def clear_form_cache(doc, method=None):
	"""Drop a widget's cached schema when the form is edited (hooked on_update)."""
	frappe.cache().delete_value(f"{CACHE_PREFIX}::{doc.name}")


def _log_once(widget, title, message):
	"""Record a configuration fault, at most once an hour per form.

	These are raised from ``validate``, which runs on every save of every feedback
	on that form — logging each time would bury the Error Log under thousands of
	copies of one problem and make the real failure harder to find, not easier.
	"""
	flag = f"{CACHE_PREFIX}::logged::{widget}"
	if frappe.cache().get_value(flag, expires=True):
		return
	frappe.cache().set_value(flag, 1, expires_in_sec=LOG_THROTTLE_SEC)
	frappe.log_error(title=title, message=message)


def _parse(value):
	"""A JSON field can come back as str or dict depending on how it was written."""
	if not value:
		return None
	if isinstance(value, dict):
		return value
	try:
		parsed = json.loads(value)
	except (ValueError, TypeError):
		return None
	return parsed if isinstance(parsed, dict) else None


# --------------------------------------------------------------------------- #
# Validation (hooked on Interview Feedback.validate)
# --------------------------------------------------------------------------- #
def validate_form_response(doc, method=None):
	"""Stamp the form, enforce its answers, and freeze what the answers meant.

	Hooked on ``validate`` rather than ``on_submit``. That submit chain is already
	five hooks deep and ``check_feedback_and_update_result`` re-saves the Interview
	inside it, re-running the Interview's own validation and on_update hooks —
	nothing else belongs in there.

	The completeness CHECKS still only bite on submit (``docstatus == 1``, which
	Frappe sets before validate runs). A panel is meant to be able to park a
	half-filled form and come back to it — ``openFeedbackForm`` in
	public/js/interview_feedback_route.js deliberately reopens an existing draft
	rather than starting a second one — so refusing to save an incomplete draft
	would break the one workflow this form already promised.
	"""
	# Fetched from the interview so it is right even when the doc was built in code
	# rather than by a user editing the link — fetch_from only resolves on an
	# interactive change, which is why the feedback route has to set its fields
	# explicitly too (see public/js/interview_feedback_route.js).
	if doc.interview and not doc.get("custom_evaluation_form"):
		doc.custom_evaluation_form = frappe.db.get_value(
			"Interview", doc.interview, "custom_evaluation_form"
		)

	if not doc.get("custom_evaluation_form"):
		# No dynamic form on this interview — nothing about this feedback changes.
		_require_skill_assessment(doc)
		return

	schema = get_form_schema(doc.custom_evaluation_form)
	if not schema:
		# The form was deleted or emptied after the interview was scheduled. Don't
		# trap the panel on a form that cannot be rendered — fall back to the grid.
		_require_skill_assessment(doc)
		return

	data = _parse(doc.get("custom_form_response")) or {}

	if doc.docstatus == 1:
		missing = _missing_required(schema, data)
		if missing:
			frappe.throw(
				_("Please answer: {0}").format(", ".join(frappe.bold(m) for m in missing)),
				title=_("Feedback form incomplete"),
			)

		if not data:
			frappe.throw(_("Fill in the feedback form before submitting."))

	# Updated on every save, including drafts, so a form edited between a draft and
	# its submission is still recorded as the questions the interviewer actually
	# answered rather than whatever the widget says today.
	doc.custom_response_labels = json.dumps(_labels(schema, data), separators=(",", ":"))


def _require_skill_assessment(doc):
	"""With no dynamic form attached, the skill grid is mandatory — exactly as before.

	``skill_assessment`` ships ``reqd = 1``. A Property Setter drops that, because a
	feedback given on a dynamic form has no skill rows and would otherwise be
	unsavable. But dropping it is a GLOBAL change, and it would quietly relax the
	standard feedback form for everyone — a feedback that used to be refused empty
	would start saving. This puts the rule back for any feedback with no form on it.

	Enforced on every save, draft included, because that is what ``reqd`` did. The
	dynamic-form path above is the lenient one (drafts may be parked half-filled);
	the standard path is deliberately NOT given that new latitude, so nothing about
	an ordinary interview changes.

	The companion ``mandatory_depends_on`` Property Setter
	(``eval:!doc.custom_evaluation_form``) puts the red mandatory indicator back on
	the grid in the browser, but it is evaluated CLIENT-SIDE ONLY — it appears
	nowhere in Frappe's document validation — so this is what actually enforces it.
	"""
	if doc.get("skill_assessment"):
		return
	frappe.throw(
		_("Skill Assessment is mandatory"),
		frappe.MandatoryError,
		title=_("Missing Feedback"),
	)


# --------------------------------------------------------------------------- #
# Schema walking
# --------------------------------------------------------------------------- #
def _walk(schema):
	"""Yield every component in a Formio schema, including nested ones.

	Formio nests three different ways and a question hidden inside any of them is
	still a question: ``components`` (panels, fieldsets, the form root),
	``columns[].components`` (column layouts) and ``rows[][].components`` (tables).
	Walking only the top level would silently skip every required field in a
	multi-column form — which is most of them.

	Yields in the order the form asks the questions. That order is what an
	interviewer reads down the screen, so it is the order "Please answer: ..." has
	to name them in and the order the report lays its columns out in; a plain stack
	walk returns them backwards.
	"""
	stack = [schema]
	seen = 0
	while stack:
		node = stack.pop()
		if not isinstance(node, dict):
			continue

		# Guard against a cyclic or pathological schema pinning the request. Logged,
		# because stopping early means required answers further down go unchecked —
		# a silent hole in validation is worse than the slow walk it prevents.
		seen += 1
		if seen > MAX_COMPONENTS:
			frappe.log_error(
				title="Interview feedback form is too large to validate",
				message=(
					f"Stopped walking the Formio schema after {MAX_COMPONENTS} components. "
					"Required answers beyond that point were NOT enforced. The form is "
					"either cyclic or far larger than an evaluation form should be."
				),
			)
			return

		if node is not schema:
			yield node

		children = []
		children.extend(node.get("components") or [])
		for column in node.get("columns") or []:
			if isinstance(column, dict):
				children.append(column)
		for row in node.get("rows") or []:
			for cell in row or []:
				if isinstance(cell, dict):
					children.append(cell)

		# Reversed, because the next iteration pops from the end.
		stack.extend(reversed(children))


def _is_question(component):
	"""Whether this component holds an answer."""
	if not component.get("input"):
		return False
	if component.get("type") in NON_INPUT_TYPES:
		return False
	return bool(component.get("key"))


def _missing_required(schema, data):
	"""Labels of required questions the interviewer left blank.

	Enforced server-side because Formio's own validation runs in the browser and a
	direct API call bypasses it entirely.

	CONDITIONAL questions are deliberately skipped. Formio decides those in the
	browser from the current answers — re-implementing ``conditional`` /
	``customConditional`` / ``logic`` here would mean running the user's JavaScript
	on the server, and getting it even slightly wrong blocks a panel on a question
	their form never showed them. The browser still enforces those.
	"""
	missing = []
	for component in _walk(schema):
		if not _is_question(component):
			continue
		if not (component.get("validate") or {}).get("required"):
			continue
		if _is_conditional(component):
			continue

		value = data.get(component["key"])
		if value in (None, "", [], {}) or value is False:
			missing.append(_label_of(component))
	return missing


def _is_conditional(component):
	conditional = component.get("conditional") or {}
	return bool(
		conditional.get("when")
		or conditional.get("json")
		or component.get("customConditional")
		or component.get("logic")
	)


def _label_of(component):
	return component.get("label") or component.get("key")


def _labels(schema, data):
	"""``{key: {label, type}}`` for the questions this response actually answered.

	Scoped to the keys present in ``data`` rather than to the whole schema: on a
	form with conditional branches, the questions the interviewer never saw are not
	part of what they said, and leaving them out keeps the snapshot small.
	"""
	labels = {}
	for component in _walk(schema):
		if not _is_question(component):
			continue
		key = component["key"]
		if key not in data:
			continue
		labels[key] = {"label": _label_of(component), "type": component.get("type") or "textfield"}
	return labels
