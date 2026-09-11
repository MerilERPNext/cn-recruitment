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


def _jd_context_with_titles(doc):
	"""`doc.as_dict()` with Link fields — top-level and inside child tables —
	replaced by their target doctype's title, so JD templates render readable
	names (e.g. 'Academics Defence Offline' rather than 'DEP_1097', 'Professor'
	rather than 'PRF_ACD_DEF_OFF_TEACHING'). Falls back to the id when the target
	has no distinct title field. Never raises."""
	d = doc.as_dict()
	try:
		meta = frappe.get_meta(doc.doctype)
	except Exception:
		return d

	# Collect every (target doctype, id) first, then resolve titles in ONE query
	# per doctype. Resolving inline cost a query per value, and a JD carries ten
	# link-bearing child tables — that alone was ~140 queries per fetch.
	targets = {}          # link doctype -> set of ids
	slots = []            # (container, key, link doctype)

	def _collect(container, key, link_doctype):
		value = container.get(key)
		if value and isinstance(value, str):
			targets.setdefault(link_doctype, set()).add(value)
			slots.append((container, key, link_doctype))

	for df in meta.fields:
		if df.fieldtype == "Link" and df.options:
			_collect(d, df.fieldname, df.options)
		elif df.fieldtype in ("Table", "Table MultiSelect") and df.options:
			try:
				cmeta = frappe.get_meta(df.options)
			except Exception:
				continue
			link_fields = [(f.fieldname, f.options) for f in cmeta.fields
						   if f.fieldtype == "Link" and f.options]
			for row in (d.get(df.fieldname) or []):
				for fn, opt in link_fields:
					_collect(row, fn, opt)

	titles = {}
	for link_doctype, ids in targets.items():
		try:
			tf = frappe.get_meta(link_doctype).get("title_field")
			if not tf or tf == "name":
				continue
			for row in frappe.get_all(
				link_doctype, filters={"name": ["in", list(ids)]}, fields=["name", tf]
			):
				if row.get(tf):
					titles[(link_doctype, row["name"])] = row[tf]
		except Exception:
			continue

	for container, key, link_doctype in slots:
		container[key] = titles.get((link_doctype, container[key]), container[key])
	return d


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

	template = detokenize_pills(template)

	# Reject server-script-style attribute access the same way
	# frappe.render_template does, without using its throw path.
	if ".__" in template:
		doc.preview = _err_html("Illegal template")
		return

	try:
		from frappe.utils.jinja import get_jenv
		jenv = get_jenv()  # SandboxedEnvironment with Frappe's safe filters
		compiled = jenv.from_string(template)
		# `data` is the requisition-values namespace used by the Preview-JD flow
		# (see job_requisition._build_preview_payload). It doesn't exist when the
		# JD is previewed standalone here, so expose an empty dict — `{{ data.x }}`
		# then renders blank instead of raising "'data' is undefined".
		context = _jd_context_with_titles(doc)
		context.setdefault("data", {})
		doc.preview = _blank_undefined(compiled.render(context))
	except Exception as exc:
		doc.preview = _err_html(str(exc))


import re as _re
import html as _stdhtml

# A "pill" the JD builder drops into the body: a non-editable span carrying the
# Jinja token in `data-token`, displaying a friendly label. Before rendering we
# strip the pill back to its raw token so Jinja/loops resolve normally.
_PILL_RE = _re.compile(r'<span\b[^>]*\bdata-token="([^"]*)"[^>]*>.*?</span>', _re.IGNORECASE | _re.DOTALL)


_UNDEFINED_RE = _re.compile(r"{{.*?}}", _re.DOTALL)


def _blank_undefined(text):
	"""Frappe's Jinja env uses DebugUndefined, which leaves unresolved
	`{{ token }}` as a literal. Blank those out so a field with no value renders
	empty — the preview contract ("if the value isn't there we consider it
	empty"). Runs only after rendering, so resolved tokens are already values."""
	if not text:
		return text or ""
	return _UNDEFINED_RE.sub("", text)


def detokenize_pills(text):
	"""Replace builder pills `<span data-token="{{ x }}" …>Label</span>` with
	their raw token (`{{ x }}`), HTML-unescaped, so the downstream Jinja render
	sees real template syntax. No-op when there are no pills."""
	if not text or "data-token" not in text:
		return text or ""
	return _PILL_RE.sub(lambda m: _stdhtml.unescape(m.group(1) or ""), text)


# ---------------------------------------------------------------------------
# JD render beautifier
# ---------------------------------------------------------------------------
# A rendered Job Description arrives either as PLAIN TEXT ("Label: value" lines,
# "- item" bullets, bare section titles) or as already-rendered HTML (when the
# template was authored in the contenteditable builder). Dropped straight into
# an innerHTML box, either shape reads as one flat, cramped blob.
#
# `beautify_jd_html` turns that content into a styled document so every field
# type reads well:
#   - section titles             -> headings with a coloured accent bar
#   - "Label: value" rows         -> aligned label / value pairs
#   - "- item" lines              -> bullet lists
#   - comma-joined multi-values   -> chips (Table / Table MultiSelect fields)
#   - long "Label: prose" lines   -> a lead-in paragraph, not a cramped row
#
# HTML input is first flattened back to newline-delimited text (block tags
# become newlines) so a single parser handles both shapes. Consumed by the desk
# builder's live preview (`render_description`) and the React "Preview JD" modal
# (`job_requisition._build_preview_payload`). Never raises — on any error it
# falls back to `plain_text_to_html`.
# ---------------------------------------------------------------------------

# Colour palette — one indigo/violet system shared by every render surface.
# Keys are referenced by the small HTML-builder helpers below.
_JD_COLORS = {
	"accent": "#4f46e5",       # indigo-600  — section titles, chips, lead labels
	"accent2": "#7c3aed",      # violet-600  — gradient companion
	"accent_dk": "#3730a3",    # indigo-800  — heading text
	"accent_soft": "#eef2ff",  # indigo-50   — chip / soft backgrounds
	"chip_bd": "#c7d2fe",      # indigo-200  — chip border
	"label": "#64748b",        # slate-500   — field labels
	"value": "#1e293b",        # slate-800   — field values
	"muted": "#94a3b8",        # slate-400   — empty placeholders
	"para": "#334155",         # slate-700   — paragraph text
	"row_line": "#eef1f6",     # hairline between rows
	"card_bd": "#e6e9f2",      # card border
}

_JD_BULLET_RE = _re.compile(r"^\s*[-*•]\s+(.*)$")
_JD_LABEL_RE = _re.compile(r"^(.{1,60}?):\s*(.*)$", _re.DOTALL)
_JD_SEP_RE = _re.compile(r"^[\-_=–—]{4,}$")  # a divider row of dashes/underscores


def _jd_esc(s):
	return frappe.utils.escape_html(str(s if s is not None else ""))


def _jd_html_to_text(s):
	"""Flatten already-rendered HTML back to newline-delimited text so the
	structured parser can re-lay-it-out. A contenteditable builder stores each
	logical line as a <div>/<p> (or separates them with <br>); we turn those
	block boundaries into newlines and list items into '- ' bullets, then drop
	the remaining tags. No-op when there are no tags."""
	if "<" not in s:
		return s
	s = _re.sub(r"(?is)<\s*(script|style)\b[^>]*>.*?</\s*\1\s*>", "", s)
	s = _re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", s)
	s = _re.sub(r"(?i)<\s*li\b[^>]*>", "\n- ", s)
	s = _re.sub(r"(?i)<\s*(div|p|tr|h[1-6]|section|header)\b[^>]*>", "\n", s)
	s = _re.sub(r"(?i)</\s*(div|p|li|tr|h[1-6]|ul|ol|table|section|header)\s*>", "\n", s)
	s = _re.sub(r"<[^>]+>", "", s)
	s = _stdhtml.unescape(s)
	s = _re.sub(r"[ \t]+\n", "\n", s)
	s = _re.sub(r"\n{3,}", "\n\n", s)
	return s


def _jd_chip(text):
	c = _JD_COLORS
	return (
		'<span style="display:inline-block;padding:2px 11px;margin:2px 5px 2px 0;'
		'border-radius:999px;background:{bg};border:1px solid {bd};color:{ac};'
		'font-size:.82em;font-weight:600;line-height:1.55;">{t}</span>'
	).format(bg=c["accent_soft"], bd=c["chip_bd"], ac=c["accent"], t=_jd_esc(text))


def _jd_value_html(value):
	"""Field value -> HTML. A comma-joined multi-value of short tokens (how
	Table / Table MultiSelect fields render) becomes chips; a lone value stays
	text; an empty value shows a muted placeholder."""
	c = _JD_COLORS
	value = (value or "").strip()
	if not value:
		return '<span style="color:{m};">&mdash;</span>'.format(m=c["muted"])
	parts = [p.strip() for p in value.split(",") if p.strip()]
	if len(parts) > 1 and all(len(p) <= 40 for p in parts):
		return "".join(_jd_chip(p) for p in parts)
	return _jd_esc(value)


def beautify_jd_html(text):
	"""Structured, colourful HTML for a rendered Job Description — section
	headings, aligned label/value rows, chips for multi-values, bullet lists.
	Handles plain-text renders AND already-HTML renders (flattened first). See
	the module comment above for the full mapping. Never raises."""
	if not text or not str(text).strip():
		return ""
	text = _jd_html_to_text(str(text))
	c = _JD_COLORS

	def heading(t):
		return (
			'<div style="display:flex;align-items:center;gap:9px;margin:22px 0 10px;">'
			'<span style="flex:0 0 auto;width:4px;height:17px;border-radius:3px;'
			'background:linear-gradient(180deg,{ac},{a2});"></span>'
			'<span style="font-size:12px;font-weight:800;letter-spacing:.07em;'
			'text-transform:uppercase;color:{dk};">{t}</span></div>'
		).format(ac=c["accent"], a2=c["accent2"], dk=c["accent_dk"], t=_jd_esc(t))

	def field_row(label, value):
		return (
			'<div style="display:flex;flex-wrap:wrap;gap:2px 14px;padding:7px 2px;'
			'border-bottom:1px solid {ln};">'
			'<div style="flex:0 0 185px;min-width:135px;color:{lb};font-weight:600;'
			'font-size:.9em;">{l}</div>'
			'<div style="flex:1 1 220px;color:{v};">{val}</div>'
			"</div>"
		).format(ln=c["row_line"], lb=c["label"], v=c["value"], l=_jd_esc(label), val=_jd_value_html(value))

	def lead_paragraph(label, value):
		return (
			'<p style="margin:9px 0;color:{p};">'
			'<strong style="color:{ac};">{l}:</strong> {val}</p>'
		).format(p=c["para"], ac=c["accent"], l=_jd_esc(label), val=_jd_esc(value))

	def paragraph(t):
		return '<p style="margin:7px 0;color:{p};">{t}</p>'.format(p=c["para"], t=_jd_esc(t))

	try:
		lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
		n = len(lines)
		out = []
		bullets = []

		def flush_bullets():
			if bullets:
				items = "".join(
					'<div style="display:flex;gap:9px;align-items:flex-start;margin:5px 0;color:{p};">'
					'<span style="flex:0 0 auto;margin-top:.5em;width:6px;height:6px;border-radius:50%;'
					'background:{ac};"></span><span>{0}</span></div>'.format(_jd_esc(b), p=c["para"], ac=c["accent"])
					for b in bullets
				)
				out.append('<div style="margin:6px 0 12px;padding-left:2px;">{0}</div>'.format(items))
				bullets.clear()

		def next_content(i):
			j = i + 1
			while j < n and not lines[j].strip():
				j += 1
			return lines[j] if j < n else ""

		for i, raw in enumerate(lines):
			stripped = raw.strip()
			if not stripped:
				flush_bullets()
				continue
			if _JD_SEP_RE.match(stripped):
				flush_bullets()
				continue

			m = _JD_BULLET_RE.match(raw)
			if m:
				bullets.append(m.group(1).strip())
				continue
			flush_bullets()

			cm = _JD_LABEL_RE.match(stripped)
			if cm:
				label, value = cm.group(1).strip(), cm.group(2).strip()
				if value:
					# A long value is prose ("Role: Managing the entire …"), not a
					# field — render it as a readable lead-in paragraph.
					out.append(lead_paragraph(label, value) if len(value) > 80 else field_row(label, value))
				else:
					# Empty value: a heading when a body (prose / bullets) follows,
					# otherwise a field row awaiting a value.
					nxt = next_content(i)
					if _JD_BULLET_RE.match(nxt) or len(nxt.strip()) > 60:
						out.append(heading(label))
					else:
						out.append(field_row(label, ""))
				continue

			# No colon: a short line is a section title; a long one is prose.
			if len(stripped) <= 48 and len(stripped.split()) <= 7:
				out.append(heading(stripped))
			else:
				out.append(paragraph(stripped))

		flush_bullets()
		body = "".join(out)
		if not body.strip():
			return ""
		# Colourful document card: gradient top accent, soft border, roomy padding.
		return (
			'<div class="jd-render" style="font-family:-apple-system,BlinkMacSystemFont,'
			"'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{v};font-size:14px;"
			'line-height:1.6;background:#fff;border:1px solid {bd};border-radius:12px;'
			'overflow:hidden;box-shadow:0 1px 3px rgba(30,41,89,.06);">'
			'<div style="height:4px;background:linear-gradient(90deg,{ac},{a2});"></div>'
			'<div style="padding:6px 22px 20px;">{body}</div></div>'
		).format(v=c["value"], bd=c["card_bd"], ac=c["accent"], a2=c["accent2"], body=body)
	except Exception:
		# A preview must never break — fall back to the basic converter.
		return plain_text_to_html(text)


# Placeholder format the JD builder writes into the description, e.g.
# `#*Office Location*#`, `#*Required Skills*#`. The token inside is the field's
# display label (or fieldname) the user dragged in.
_FIELD_TOKEN_RE = _re.compile(r"#\*(.+?)\*#")


def _normalize_token_key(s):
    """Loose key for matching a token against supplied values — case- and
    separator-insensitive, so "Office Location", "office_location" and
    "office location" all collide."""
    return _re.sub(r"[^a-z0-9]+", "_", (s or "").strip().lower()).strip("_")


def substitute_field_tokens(html, values):
    """Replace JD-builder placeholders `#*Field*#` with the matching value from
    `values`.

    Matching is forgiving: a token is looked up by its exact text first, then by
    a normalized key (lowercase, non-alphanumerics → underscore) so the frontend
    can key the payload by either the label ("Office Location") or the fieldname
    ("office_location"). Any token with no supplied (non-empty) value resolves to
    an empty string — per the preview contract "if the value is not there we
    consider it empty". Inserted values are HTML-escaped (the surrounding
    description is HTML)."""
    if not html or "#*" not in html:
        return html or ""

    values = values or {}
    norm = {}
    for k, v in values.items():
        norm.setdefault(_normalize_token_key(k), v)

    def _repl(match):
        token = match.group(1).strip()
        val = values.get(token)
        if val in (None, ""):
            val = norm.get(_normalize_token_key(token))
        return frappe.utils.escape_html(str(val)) if val not in (None, "") else ""

    return _FIELD_TOKEN_RE.sub(_repl, html)


def render_with_context(template, context):
	"""Render a JD `description` Jinja template against an arbitrary context
	dict, instead of a Job Description doc's own fields.

	Used by the Requisition "Preview JD" flow: the matched JD template is the
	skeleton, but the placeholder values come from the in-progress requisition
	the frontend sends. Any token missing from `context` resolves to empty
	(Jinja's default Undefined renders as ""); broken templates surface inline
	the same way `_render_preview` handles them. Never raises.
	"""
	if not (template or "").strip():
		return ""
	template = detokenize_pills(template)
	if ".__" in template:
		return _err_html("Illegal template")
	try:
		from frappe.utils.jinja import get_jenv
		jenv = get_jenv()  # SandboxedEnvironment with Frappe's safe filters
		compiled = jenv.from_string(template)
		return _blank_undefined(compiled.render(context or {}))
	except Exception as exc:
		return _err_html(str(exc))


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
	return beautify_jd_html(shim.preview or "")


# Fieldtypes that carry no insertable value (layout / system).
_NON_INSERTABLE_FIELDTYPES = frozenset({
	"Section Break", "Column Break", "Tab Break", "HTML", "HTML Editor",
	"Button", "Fold", "Heading", "Image", "Geolocation", "Signature",
})
# JD fields that are builder mechanics, not content.
_JD_SKIP_FIELDS = frozenset({"description", "preview", "is_default"})


def _primary_child_fieldname(child_doctype):
	"""The main display field of a child doctype (first in-list-view field, else
	first data/link field) — used to build a `{% for %}` loop token."""
	if not child_doctype or not frappe.db.exists("DocType", child_doctype):
		return "name"
	cmeta = frappe.get_meta(child_doctype)
	listed = [f for f in cmeta.fields if f.in_list_view and f.fieldtype not in _NON_INSERTABLE_FIELDTYPES]
	if listed:
		return listed[0].fieldname
	for f in cmeta.fields:
		if f.fieldtype in ("Data", "Link", "Select", "Small Text"):
			return f.fieldname
	return "name"


def _fields_as_tokens(doctype, namespace=None):
	"""Insertable fields of `doctype` as {label, token} — scalars become
	`{{ fieldname }}`, child tables become a comma-joined `{% for %}` loop.

	When `namespace` is given (e.g. "data"), tokens reference that namespace
	(`{{ data.fieldname }}`) instead of the bare fieldname. This is how Job
	Requisition fields are inserted: they resolve from the in-progress
	requisition the Preview-JD flow posts under `data`, and never collide with
	the JD doc's own fields (designation/department/…). Loops over a namespaced
	list are guarded with `or []` so a standalone JD preview (no `data`) renders
	empty instead of erroring."""
	prefix = (namespace + ".") if namespace else ""
	out = []
	for df in frappe.get_meta(doctype).fields:
		if not df.fieldname or df.fieldtype in _NON_INSERTABLE_FIELDTYPES:
			continue
		if doctype == "Job Description" and df.fieldname in _JD_SKIP_FIELDS:
			continue
		if df.fieldtype in ("Table", "Table MultiSelect"):
			child_fn = _primary_child_fieldname(df.options)
			loop_src = (f"({prefix}{df.fieldname} or [])" if namespace else df.fieldname)
			token = (
				"{% for row in " + loop_src + " %}{{ row." + child_fn + " }}"
				"{% if not loop.last %}, {% endif %}{% endfor %}"
			)
		else:
			token = "{{ " + prefix + df.fieldname + " }}"
		out.append({
			"label": (df.label or df.fieldname).strip(),
			"fieldname": df.fieldname,
			"fieldtype": df.fieldtype,
			"token": token,
		})
	return out


@frappe.whitelist()
def get_jd_template_fields():
	"""Insertable fields for the JD template builder, grouped.

	Each item: {label, fieldname, fieldtype, token}. `token` is the Jinja
	snippet to drop into the JD body (Frappe Email Template style):
	  - Job Description fields  → resolved from the JD doc itself.
	  - Job Requisition fields  → resolved from the in-progress requisition the
	    frontend posts to `preview_job_description` (missing ⇒ empty).
	"""
	frappe.has_permission("Job Description", "read", throw=True)
	return {
		"groups": [
			{"group": "Job Description Fields", "fields": _fields_as_tokens("Job Description")},
			{"group": "Job Requisition Fields", "fields": _fields_as_tokens("Job Requisition", namespace="data")},
		]
	}


class JobDescription(Document):
	def before_insert(self):
		# Seed brand-new JDs with the default template only when the manager
		# left the description empty. If they pasted something else, respect it.
		if not (self.get("description") or "").strip():
			self.description = DEFAULT_JD_TEMPLATE

	def validate(self):
		self.filter_competencies()
		self.enforce_single_default()
		self.set_version_defaults()
		self.prevent_duplicate_applicability()
		_render_preview(self)

	def set_version_defaults(self):
		"""Fill version / status on any JD that predates versioning.

		Self-healing on save rather than a bulk patch: a record created before
		these fields existed has them NULL, and gets stamped the first time
		anyone touches it. Everything else reads the pair null-safely, so an
		untouched legacy record still behaves as version 1 / Active.
		"""
		if not self.get("version"):
			self.version = 1
		if not self.get("status"):
			self.status = "Active"

	def prevent_duplicate_applicability(self):
		"""No two *Active* JDs may cover the same department + designation.

		Applicability is a cross-product: a JD listing 2 designations and 3
		departments covers 6 pairs. A clash on any single pair is a duplicate,
		because `_match_jd_name` looks a JD up by exactly one (designation,
		department) and could otherwise get either record.

		Superseded versions are ignored — that is the whole point of versioning,
		and it lets the old record stay readable without blocking its successor.
		"""
		if (self.get("status") or "Active") != "Active":
			return

		pairs = _applicability_pairs(self)
		if not pairs:
			return

		clash = _find_conflicting_jd(pairs, company=self.get("company"), exclude=self.name)
		if not clash:
			return

		frappe.throw(
			frappe._(
				"A Job Description already covers {0} / {1}: {2}. Open it and use "
				"<b>Create New Version</b> instead of adding another one."
			).format(
				frappe.bold(clash["designation"]),
				frappe.bold(clash["department"]),
				frappe.utils.get_link_to_form("Job Description", clash["name"]),
			),
			title=frappe._("Duplicate Job Description"),
		)

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


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def functional_area_query(doctype, txt, searchfield, start, page_len, filters):
	"""Link query for Job Description -> Functional Area, scoped to the chosen designations.

	A Designation already names the Functional Area it belongs to
	(`Designation.custom_functional_area`, from cn_hrms_core), so the JD's
	functional areas are derivable rather than free choice. This completes the
	form's existing Company -> Department -> Designation cascade.

	With no designation picked yet the full list is returned instead of an empty
	one — the field is optional and blocking it would only strand the user.
	"""
	designations = (filters or {}).get("designations") or []
	if isinstance(designations, str):
		designations = json.loads(designations)
	designations = [d for d in designations if d]

	area_filters = {"disabled": 0} if frappe.get_meta("Functional Area").has_field("disabled") else {}
	if txt:
		area_filters["name"] = ["like", f"%{txt}%"]

	if designations:
		areas = frappe.get_all(
			"Designation",
			filters={"name": ["in", designations], "custom_functional_area": ["is", "set"]},
			pluck="custom_functional_area",
		)
		if not areas:
			return []
		area_filters["name"] = (
			["in", [a for a in set(areas) if txt.lower() in a.lower()]] if txt
			else ["in", list(set(areas))]
		)

	return frappe.get_all(
		"Functional Area",
		filters=area_filters,
		fields=["name", "functional_area_name"],
		order_by="name asc",
		start=start,
		page_length=page_len,
		as_list=True,
	)


@frappe.whitelist()
def get_designation_mapping(designations):
	"""``[{"name", "department", "functional_area"}]`` for the given designations.

	The client uses it to keep the Department → Designation → Functional Area
	cascade consistent when a value is removed. Unknown names are left out.
	"""
	if not frappe.has_permission("Job Description", "read"):
		frappe.throw(frappe._("Not permitted"), frappe.PermissionError)

	designations = frappe.parse_json(designations) if isinstance(designations, str) else designations
	if not isinstance(designations, (list, tuple)):
		return []
	designations = [d for d in designations if d and isinstance(d, str)]
	if not designations:
		return []

	return frappe.get_all(
		"Designation",
		filters={"name": ["in", designations]},
		fields=[
			"name",
			"custom_department as department",
			"custom_functional_area as functional_area",
		],
	)


# ---------------------------------------------------------------------------
# Applicability / versioning
# ---------------------------------------------------------------------------

def _applicability_pairs(doc):
	"""Every (designation, department) this JD claims, as a list of tuples.

	A JD's applicability is the cross-product of its two multi-select tables, so
	2 designations x 3 departments is 6 pairs. A JD with no department rows is
	treated as covering (designation, None) — still worth guarding, since
	`_match_jd_name` can reach it.
	"""
	designations = [r.designation for r in (doc.get("designation") or []) if r.designation]
	departments = [r.department for r in (doc.get("department") or []) if r.department]
	if not designations:
		return []
	if not departments:
		return [(d, None) for d in designations]
	return [(d, p) for d in designations for p in departments]


def _find_conflicting_jd(pairs, company=None, exclude=None):
	"""First Active JD already covering one of `pairs`, or None.

	One query for all pairs rather than one per pair — a JD with 4 designations
	across 5 departments would otherwise cost 20 round trips on every save.
	"""
	designations = list({d for d, _ in pairs})
	departments = list({p for _, p in pairs if p})
	if not designations:
		return None

	conditions = [
		"COALESCE(NULLIF(jd.status, ''), 'Active') = 'Active'",
		"jdg.designation IN %(designations)s",
	]
	values = {"designations": designations}
	if exclude:
		conditions.append("jd.name != %(exclude)s")
		values["exclude"] = exclude
	if company:
		conditions.append("(jd.company IS NULL OR jd.company = %(company)s)")
		values["company"] = company

	join = ""
	if departments:
		join = """
			JOIN `tabJD Department` jdp
			  ON jdp.parent = jd.name AND jdp.parenttype = 'Job Description'
			 AND jdp.parentfield = 'department'
		"""
		conditions.append("jdp.department IN %(departments)s")
		values["departments"] = departments

	rows = frappe.db.sql(
		"""
		SELECT jd.name, jdg.designation{dept_col}
		FROM `tabJob Description` jd
		JOIN `tabJD Designations` jdg
		  ON jdg.parent = jd.name AND jdg.parenttype = 'Job Description'
		 AND jdg.parentfield = 'designation'
		{join}
		WHERE {where}
		LIMIT 50
		""".format(
			dept_col=", jdp.department" if departments else ", NULL AS department",
			join=join,
			where=" AND ".join(conditions),
		),
		values,
		as_dict=True,
	)

	# The SQL narrows to candidates; the exact pair match is confirmed here so a
	# JD that merely shares a designation with a different department is allowed.
	wanted = set(pairs)
	for row in rows:
		if (row.designation, row.department) in wanted:
			return row
	return None


@frappe.whitelist()
def create_new_version(job_description):
	"""Copy an Active JD as the next version and supersede the original.

	The predecessor is marked Superseded *before* the copy is inserted, so the
	duplicate guard sees no clash. Both writes share the request's transaction —
	if the insert fails, the supersede is rolled back with it.
	"""
	if not job_description:
		frappe.throw(frappe._("Job Description is required."))
	frappe.has_permission("Job Description", "create", throw=True)
	frappe.has_permission("Job Description", "write", doc=job_description, throw=True)

	source = frappe.get_doc("Job Description", job_description)
	if (source.status or "Active") != "Active":
		frappe.throw(
			frappe._("{0} is already superseded. Create the new version from the Active one.").format(
				frappe.bold(job_description)
			)
		)

	frappe.db.savepoint("jd_new_version")
	try:
		frappe.db.set_value("Job Description", source.name, "status", "Superseded")

		copy = frappe.copy_doc(source)
		copy.version = (source.version or 1) + 1
		copy.status = "Active"
		copy.supersedes = source.name
		# `name` is the title (autoname field:job_description_title), so the title
		# has to change or the insert collides with the record being replaced.
		copy.job_description_title = _next_version_title(source.job_description_title, copy.version)
		copy.insert()
	except Exception:
		frappe.db.rollback(save_point="jd_new_version")
		raise

	copy.add_comment(
		"Comment",
		frappe._("Version {0}, superseding {1}.").format(copy.version, source.name),
	)
	return {"job_description": copy.name, "version": copy.version, "supersedes": source.name}


def _next_version_title(title, version):
	"""'Sr SWE JD' -> 'Sr SWE JD (v2)'; an existing '(vN)' suffix is replaced."""
	base = _re.sub(r"\s*\(v\d+\)\s*$", "", title or "").strip()
	return "{0} (v{1})".format(base, version)


@frappe.whitelist()
def get_version_history(job_description):
	"""Every version in this JD's chain, newest first — drives the form's
	version panel. Walks `supersedes` backwards from the given record and
	forwards from whatever points at it."""
	if not job_description:
		return []
	frappe.has_permission("Job Description", "read", doc=job_description, throw=True)

	chain, seen = [], set()
	current = job_description
	while current and current not in seen:
		seen.add(current)
		row = frappe.db.get_value(
			"Job Description", current,
			["name", "version", "status", "supersedes", "modified"], as_dict=True,
		)
		if not row:
			break
		chain.append(row)
		current = row.supersedes

	successor = frappe.db.get_value("Job Description", {"supersedes": job_description}, "name")
	while successor and successor not in seen:
		seen.add(successor)
		row = frappe.db.get_value(
			"Job Description", successor,
			["name", "version", "status", "supersedes", "modified"], as_dict=True,
		)
		if not row:
			break
		chain.insert(0, row)
		successor = frappe.db.get_value("Job Description", {"supersedes": successor}, "name")

	return sorted(chain, key=lambda r: r.get("version") or 0, reverse=True)
