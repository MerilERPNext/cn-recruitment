"""Shared helpers for the four posting channels (careers, ijp, refer, pre-offer).

Every channel module imports from here so the rules for
  - "which openings appear on this channel"
  - "which Job Applicant fields appear on this channel"
  - "what source goes on the resulting Job Applicant"
live in exactly one place.

Configuration sources
---------------------
1. Job Opening → `custom_posting_options` (Table → Job Opening Posting Channel)
   columns: post_to (Careers Page / Refer / IJP), display_from, display_to, status (Active/Inactive)
   → drives which channels list a given opening.

2. Job Opening → `custom_application_fields` (Table → Job Opening Application Field)
   columns: section, reference_name, display_name,
            view_<channel>, mandatory_<channel> for each of careers/ijp/refer/preoffer,
            visibility, editability, ctq_flag
   → drives which Job Applicant fields appear on each channel's form.

3. Job Applicant Profile Settings (Single) → `default_application_fields`
   → fallback when an opening hasn't explicitly configured a field row.
"""

import frappe
from frappe.utils import cint, getdate, nowdate


# Keys we use in code → labels stored in the Posting Channel `post_to` Select.
PORTAL_LABEL = {
	"careers": "Careers Page",
	"refer":   "Refer",
	"ijp":     "IJP",
}

# Job Applicant Source master record to stamp on the applicant after submit.
SOURCE_NAME = {
	"careers": "Careers Page",
	"refer":   "Employee Referral",
	"ijp":     "IJP",
}


# ---------------------------------------------------------------------------
# Posting-channel lookup
# ---------------------------------------------------------------------------

def get_openings_active_on_channel(channel, opening_filters=None):
	"""Return the names of Job Openings whose custom_posting_options has an Active
	row for the given channel, with display_from/display_to date window honoured.

	channel: one of "careers" / "refer" / "ijp"
	opening_filters: optional extra dict of Job Opening filters
	                 (e.g. {"company": "PW", "status": "Open"})
	"""
	if channel not in PORTAL_LABEL:
		return []

	label = PORTAL_LABEL[channel]
	today = nowdate()
	filters = {"status": "Open"}
	if opening_filters:
		filters.update(opening_filters)

	# Pull Open openings then filter by their Posting Options. Doing this in
	# Python (rather than a raw join) keeps respect of frappe.get_list
	# permission filtering on Job Opening.
	openings = frappe.get_list(
		"Job Opening",
		filters=filters,
		fields=["name"],
		limit_page_length=0,
	) or []

	if not openings:
		return []

	active_names = []
	opening_names = [o.name for o in openings]
	rows = frappe.get_all(
		"Job Opening Posting Channel",
		filters={
			"parenttype": "Job Opening",
			"parent": ["in", opening_names],
			"post_to": label,
			"status": "Active",
		},
		fields=["parent", "display_from", "display_to"],
	)
	for r in rows:
		if r.display_from and getdate(r.display_from) > getdate(today):
			continue
		if r.display_to and getdate(r.display_to) < getdate(today):
			continue
		active_names.append(r.parent)

	# preserve original order, drop dupes
	seen = set()
	result = []
	for n in opening_names:
		if n in active_names and n not in seen:
			seen.add(n)
			result.append(n)
	return result


# Link fields on the opening card. Each value is rendered as its target
# doctype's configured Title Field (e.g. Company → company_name "PenPencil"),
# falling back to the raw id when the doctype has no title field. We keep the
# raw link id under "<field>_id" for callers that still need the document name.
_CARD_LINK_FIELDS = ("designation", "department", "location", "company")


def _link_label(doctype, name):
	"""Human-readable label for a link value: the target's Title Field value if it
	has one, otherwise the id itself. Fully dynamic — no per-doctype hardcoding."""
	if not name:
		return None
	title_field = frappe.get_meta(doctype).get_title_field()
	if not title_field or title_field == "name":
		return name
	# get_cached_value avoids re-querying the same master across many cards.
	return frappe.get_cached_value(doctype, name, title_field) or name


def card_matches_search(card, search):
	"""Case-insensitive match of an opening card against a search term (job code /
	title / id / designation / location / department labels)."""
	if not search:
		return True
	needle = str(search).strip().lower()
	if not needle:
		return True
	haystack = " ".join(
		str(card.get(k) or "")
		for k in ("name", "job_title", "opening_code", "designation", "location", "department")
	).lower()
	return needle in haystack


def get_opening_card(opening_name, extra_fields=None):
	"""Compact serialisation used in listing endpoints.

	`extra_fields` (list of Job Opening fieldnames) augments the card with any
	configured list-view columns that aren't already on it, keyed by their raw
	fieldname so a column config can reference them directly. Purely additive —
	callers that pass nothing get the original card unchanged."""
	row = frappe.db.get_value(
		"Job Opening",
		opening_name,
		[
			"name", "job_title", "designation", "department", "location",
			"company", "status", "posted_on", "closes_on", "description",
			"custom_opening_code",
		],
		as_dict=True,
	)
	if not row:
		return None
	card = {
		"name": row.name,
		"job_title": row.job_title,
		"status": row.status,
		"posted_on": row.posted_on,
		"closes_on": row.closes_on,
		"description": row.description,
		"opening_code": row.custom_opening_code,
	}
	# Render each link field as its target's title field; keep the raw id too.
	jo_meta = frappe.get_meta("Job Opening")
	for field in _CARD_LINK_FIELDS:
		link_id = row.get(field)
		df = jo_meta.get_field(field)
		if df and df.fieldtype == "Link" and df.options and link_id:
			card[field] = _link_label(df.options, link_id)
		else:
			card[field] = link_id
		card[f"{field}_id"] = link_id

	if extra_fields:
		_augment_card_with_fields(card, row.name, extra_fields, jo_meta)
	return card


def _augment_card_with_fields(card, opening_name, fieldnames, jo_meta):
	"""Add configured Job Opening fields that aren't already on the card, keyed by
	their raw fieldname. Link fields get a label value plus a `<field>_id`
	sibling, mirroring the card's existing link handling. Unknown / layout fields
	and `name` (always present) are skipped."""
	need = [
		fn for fn in fieldnames
		if fn and fn != "name" and fn not in card and jo_meta.has_field(fn)
	]
	if not need:
		return
	values = frappe.db.get_value("Job Opening", opening_name, need, as_dict=True) or {}
	for fn in need:
		df = jo_meta.get_field(fn)
		val = values.get(fn)
		if df and df.fieldtype == "Link" and df.options and val:
			card[fn] = _link_label(df.options, val)
			card[f"{fn}_id"] = val
		else:
			card[fn] = val


# ---------------------------------------------------------------------------
# List-view column configuration (Recruitment Settings → *_page_columns)
# ---------------------------------------------------------------------------

# Channel → the Recruitment Settings child table that configures its list columns.
CHANNEL_COLUMN_FIELD = {
	"ijp": "ijp_page_columns",
	"refer": "refer_page_columns",
	"careers": "career_page_filter_columns",
}

# Used when a channel has no columns configured, so the list view keeps its
# current behaviour out of the box. Job Opening fieldnames; every one already
# resolves to a key on the opening card.
_DEFAULT_LIST_COLUMNS = [
	"name", "job_title", "designation", "department",
	"company", "location", "posted_on", "status",
]

# Card key already carries a friendlier label than the raw field for these.
_COLUMN_LABEL_OVERRIDES = {"name": "Opening ID"}


def _parse_column_fieldname(stored):
	"""Extract the fieldname from a stored 'Label (fieldname)' column value
	(the Autocomplete format used by the settings table). Falls back to the
	trimmed string when it isn't in that format."""
	if not stored:
		return None
	stored = stored.strip()
	if stored.endswith(")") and "(" in stored:
		return stored[stored.rfind("(") + 1:-1].strip()
	return stored


def _column_label(jo_meta, fieldname):
	if fieldname in _COLUMN_LABEL_OVERRIDES:
		return _COLUMN_LABEL_OVERRIDES[fieldname]
	df = jo_meta.get_field(fieldname)
	if df and df.label:
		return df.label
	return fieldname.replace("_", " ").title()


def _column_def(jo_meta, fieldname):
	"""Full column descriptor the list UI needs to map a card to a cell:

	  fieldname  – the configured Job Opening field
	  label      – column header
	  fieldtype  – so the UI can pick a renderer (Link / Date / Select / …)
	  value_key  – card key holding the DISPLAY value  (== fieldname; links carry
	               the resolved label here)
	  id_key     – card key holding the raw id for Link fields
	               (`<fieldname>_id`); null for non-link fields

	`name` (Opening ID) isn't in field meta, so it's treated as plain Data."""
	df = jo_meta.get_field(fieldname) if fieldname != "name" else None
	is_link = bool(df and df.fieldtype == "Link")
	return {
		"fieldname": fieldname,
		"label": _column_label(jo_meta, fieldname),
		"fieldtype": df.fieldtype if df else "Data",
		"value_key": fieldname,
		"id_key": f"{fieldname}_id" if is_link else None,
	}


def get_configured_columns(channel):
	"""Ordered, enabled list columns for `channel`, from Recruitment Settings
	(ijp_page_columns / refer_page_columns). Returns a list of
	{"fieldname", "label"}. Falls back to the channel's default column set when
	nothing is configured, so the list view keeps working out of the box.
	Disabled rows, blanks, duplicates and fields that don't exist on Job Opening
	(except "name") are dropped."""
	tablefield = CHANNEL_COLUMN_FIELD.get(channel)
	jo_meta = frappe.get_meta("Job Opening")

	fieldnames = []
	if tablefield:
		settings = frappe.get_cached_doc("Recruitment Settings")
		for row in settings.get(tablefield) or []:
			if not row.get("enable"):
				continue
			fn = _parse_column_fieldname(row.get("column"))
			if fn:
				fieldnames.append(fn)

	if not fieldnames:
		fieldnames = list(_DEFAULT_LIST_COLUMNS)

	columns, seen = [], set()
	for fn in fieldnames:
		if fn in seen or (fn != "name" and not jo_meta.has_field(fn)):
			continue
		seen.add(fn)
		columns.append(_column_def(jo_meta, fn))
	return columns


# ---------------------------------------------------------------------------
# Application-fields lookup
# ---------------------------------------------------------------------------

# Layout/meta fieldtypes that carry no input and shouldn't be sent as columns.
_NON_INPUT_FIELDTYPES = {
	"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Fold", "Heading",
}


def _child_table_fields(child_doctype):
	"""Column definitions for a child (Table / Table MultiSelect) doctype so the
	frontend can render the grid. Returns [] when there's no child doctype."""
	if not child_doctype:
		return []
	cmeta = frappe.get_meta(child_doctype)
	cols = []
	for d in cmeta.fields:
		if not d.fieldname or d.fieldtype in _NON_INPUT_FIELDTYPES:
			continue
		cols.append({
			"fieldname": d.fieldname,
			"label": d.label or d.fieldname,
			"fieldtype": d.fieldtype,
			"options": d.options or "",
			"reqd": cint(d.reqd),
			"read_only": cint(d.read_only),
			"in_list_view": cint(d.in_list_view),
			"default": d.default,
		})
	return cols


def _serialize_field_value(doc, fieldname, fieldtype):
	"""Current value of `fieldname` on `doc`, JSON-friendly.

	Child-table fields are returned as a list of plain dicts (framework/meta
	columns stripped); everything else is returned as-is.
	"""
	value = doc.get(fieldname)
	if fieldtype in ("Table", "Table MultiSelect"):
		if not value:
			return []
		rows = []
		for row in value:
			row_dict = row.as_dict() if hasattr(row, "as_dict") else dict(row)
			rows.append({
				k: v
				for k, v in row_dict.items()
				if not k.startswith("_") and k not in {
					"doctype", "parent", "parenttype", "parentfield",
					"docstatus", "owner", "creation", "modified", "modified_by", "idx",
				}
			})
		return rows
	return value


def get_application_fields_for_channel(opening_name, channel, job_applicant=None):
	"""Return the list of Job Applicant fields to render for `opening_name` on
	`channel` ("careers" / "ijp" / "refer" / "preoffer").

	The list is the merged template:
	  - rows present on the opening's `custom_application_fields` win
	  - fall back to Job Applicant Profile Settings → default_application_fields
	  - keep only rows where view_<channel> = 1
	Each row is enriched with the Job Applicant field's fieldtype + options
	pulled from the doctype meta, so the frontend can render the right input.

	When `job_applicant` is given (the channels where an applicant already
	exists, e.g. pre-offer), each field also carries the applicant's current
	`value` so the form can pre-fill. Without it, `value` is the empty default
	([] for tables, otherwise None).

	Output shape:
	    [{
	      "section": "Basic Details",
	      "reference_name": "applicant_name",
	      "display_name": "Applicant First Name",
	      "fieldtype": "Data",
	      "options": "",
	      "reqd": 1,            # 1 if mandatory_<channel> set
	      "ctq": 0,
	      "visibility": "All",
	      "editability": "Editable",
	      "value": <current value>,
	    }, ...]
	"""
	if channel not in ("careers", "ijp", "refer", "preoffer"):
		return []

	view_col = f"view_{channel}"
	mandatory_col = f"mandatory_{channel}"

	# Pull merged template (opening overrides + settings defaults)
	from recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings import (
		get_job_applicant_profile_template,
	)
	template = get_job_applicant_profile_template(opening=opening_name)
	rows = template.get("rows") or []

	# Enrich each row with the Job Applicant doctype meta (fieldtype / options)
	meta = frappe.get_meta("Job Applicant")
	meta_lookup = {df.fieldname: df for df in meta.fields if df.fieldname}

	# Load the applicant once so each field can surface its current value.
	applicant_doc = None
	if job_applicant and frappe.db.exists("Job Applicant", job_applicant):
		applicant_doc = frappe.get_doc("Job Applicant", job_applicant)

	result = []
	for r in rows:
		if not cint(r.get(view_col)):
			continue
		ref = r.get("reference_name")
		df = meta_lookup.get(ref)
		if not df:
			continue
		is_table = df.fieldtype in ("Table", "Table MultiSelect")
		entry = {
			"section": r.get("section") or "General",
			"reference_name": ref,
			"display_name": r.get("display_name") or df.label or ref,
			"fieldtype": df.fieldtype,
			"options": df.options or "",
			"reqd": cint(r.get(mandatory_col)),
			"ctq": cint(r.get("ctq_flag")),
			"visibility": r.get("visibility") or "All",
			"editability": r.get("editability") or "Editable",
			"value": (
				_serialize_field_value(applicant_doc, ref, df.fieldtype)
				if applicant_doc is not None
				else ([] if is_table else None)
			),
		}
		# For child-table fields, ship the child doctype's columns so the
		# frontend can render the grid (options alone is just the doctype name).
		if is_table:
			entry["table_fields"] = _child_table_fields(df.options)
		result.append(entry)
	return result


# ---------------------------------------------------------------------------
# Source bookkeeping
# ---------------------------------------------------------------------------

def ensure_source_master(name):
	"""Idempotent — create a Job Applicant Source row if missing."""
	if not name:
		return
	if frappe.db.exists("Job Applicant Source", name):
		return
	doc = frappe.get_doc({
		"doctype": "Job Applicant Source",
		"source_name": name,
	})
	doc.insert(ignore_permissions=True, ignore_if_duplicate=True)


def source_value_for(channel):
	"""Return (and ensure) the Job Applicant Source master name for a channel."""
	name = SOURCE_NAME.get(channel)
	if name:
		ensure_source_master(name)
	return name


# ---------------------------------------------------------------------------
# Validation helpers used by submit endpoints
# ---------------------------------------------------------------------------

def assert_field_set_for_channel(opening_name, channel, payload):
	"""Validate the submit `payload` against the configured field set for the
	channel. Raises frappe.ValidationError on:
	  - unknown fields not configured for this channel
	  - missing mandatory fields
	Returns the cleaned dict (only configured fields, in declared order).
	"""
	if not isinstance(payload, dict):
		frappe.throw(frappe._("Application payload must be a dict"))

	fields = get_application_fields_for_channel(opening_name, channel)
	allowed = {f["reference_name"]: f for f in fields}

	unknown = [k for k in payload if k not in allowed]
	if unknown:
		frappe.throw(
			frappe._("These fields aren't configured for this channel: {}").format(", ".join(unknown))
		)

	missing = [
		f["reference_name"] for f in fields
		if f["reqd"] and (payload.get(f["reference_name"]) in (None, "", []))
	]
	if missing:
		frappe.throw(frappe._("Missing required fields: {}").format(", ".join(missing)))

	# Keep only configured fields, preserving template order
	return {k: payload[k] for k in allowed if k in payload}
