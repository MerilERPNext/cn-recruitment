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
	"campus":  "Campus",
}

# Job Applicant Source master record to stamp on the applicant after submit.
SOURCE_NAME = {
	"careers": "Careers Page",
	"refer":   "Employee Referral",
	"ijp":     "IJP",
	"campus":  "Campus Hiring",
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

	# Pull Open openings then filter by their Posting Options in Python (rather
	# than a raw join). Use get_all (no user-permission filtering): visibility on
	# these portal channels is governed entirely by the Posting Options window and
	# the per-channel eligibility rules, NOT by Desk read permission on Job Opening.
	# Core Job Opening grants Desk read only to HR User, so get_list here would
	# raise PermissionError for an ordinary employee (IJP/Refer) and hide every
	# opening — the reason employees saw an empty referral/IJP list.
	openings = frappe.get_all(
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


# Always-searched card keys. The configured Career Page Search Filter fields are
# added on top of these at call time, so HR can widen the search box (e.g. make
# Company searchable) just by adding rows to that settings table.
_DEFAULT_SEARCH_KEYS = ("name", "job_title", "opening_code", "designation", "location", "department")


def card_matches_search(card, search, extra_keys=None):
	"""Case-insensitive match of an opening card against a search term.

	Searches the default keys (job code / title / id / designation / location /
	department) plus any `extra_keys` (the configured search-filter fieldnames).
	For each extra key both the display value and its raw `<key>_id` are checked,
	so a Link field matches whether the user types the label or the id."""
	if not search:
		return True
	needle = str(search).strip().lower()
	if not needle:
		return True
	keys = list(_DEFAULT_SEARCH_KEYS)
	for k in extra_keys or []:
		keys.append(k)
		keys.append(f"{k}_id")
	haystack = " ".join(str(card.get(k) or "") for k in keys).lower()
	return needle in haystack


def parse_filter_values(filters):
	"""Normalise the `filters` argument from a listing endpoint into a plain dict.

	Accepts a dict or a JSON string ({fieldname: value | [values]}). Empty / blank
	selections are dropped so they don't constrain the result. Returns {} for
	anything unusable, which means "no filters applied"."""
	if not filters:
		return {}
	if isinstance(filters, str):
		try:
			filters = frappe.parse_json(filters)
		except Exception:
			return {}
	if not isinstance(filters, dict):
		return {}
	return {k: v for k, v in filters.items() if v not in (None, "", [])}


def _filter_value_matches(actual, wanted):
	"""True if the card's `actual` value satisfies the `wanted` filter selection.

	`wanted` may be a single value or a list (multi-select → OR). Matching is
	case-insensitive string equality, which covers Link ids, Select options and
	plain Data alike."""
	actual_s = str(actual if actual is not None else "").strip().lower()
	if isinstance(wanted, (list, tuple)):
		wanted_list = [str(w).strip().lower() for w in wanted if str(w or "").strip()]
		return (not wanted_list) or (actual_s in wanted_list)
	return actual_s == str(wanted or "").strip().lower()


def card_matches_filters(card, selected, filter_defs):
	"""AND-match an opening card against the user's filter `selected` dict.

	`filter_defs` is the configured search-filter descriptor list (from
	`get_configured_search_filters`); only fieldnames present there are honoured,
	so callers can't filter on arbitrary fields. Link fields are compared against
	the card's raw `<field>_id` (the UI sends the link id, not its label)."""
	if not selected:
		return True
	defmap = {f["fieldname"]: f for f in filter_defs}
	for fn, wanted in selected.items():
		df = defmap.get(fn)
		if not df:
			continue  # ignore selections for fields that aren't configured filters
		if df.get("fieldtype") == "Link":
			actual = card.get(f"{fn}_id", card.get(fn))
		else:
			actual = card.get(fn)
		if not _filter_value_matches(actual, wanted):
			return False
	return True


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
	"""Column descriptor the list UI needs to map a card to a cell:

	  fieldname  – the configured Job Opening field
	  label      – column header
	  value_key  – card key holding the display value (== fieldname; Link fields
	               carry the resolved label here)
	"""
	return {
		"fieldname": fieldname,
		"label": _column_label(jo_meta, fieldname),
		"value_key": fieldname,
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


def get_configured_search_filters():
	"""Ordered, enabled search filter fields for the Careers page, from
	Recruitment Settings → career_page_search_filters.

	Returns a list of filter descriptors the UI can use to render filter controls:
	  {"fieldname", "label", "fieldtype", "options"}
	Fields that no longer exist on Job Opening are silently dropped.
	Returns [] when nothing is configured (no filters = UI shows no filter bar)."""
	settings = frappe.get_cached_doc("Recruitment Settings")
	jo_meta = frappe.get_meta("Job Opening")

	filters, seen = [], set()
	for row in settings.get("career_page_search_filters") or []:
		if not row.get("enable"):
			continue
		fn = _parse_column_fieldname(row.get("column"))
		if not fn or fn in seen:
			continue
		seen.add(fn)
		df = jo_meta.get_field(fn)
		if not df:
			continue
		filters.append({
			"fieldname": fn,
			"label": df.label or fn.replace("_", " ").title(),
			"fieldtype": df.fieldtype,
			"options": df.options or "",
		})
	return filters


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
	if channel not in ("careers", "ijp", "refer", "preoffer", "campus"):
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

	# A managed (virtual) field keeps its choice list on Custom Doctype Field Item,
	# never on the docfield: `options` on a virtual field is the slot Frappe
	# evaluates as Python during serialisation, so storing a Select's choices
	# there raises SyntaxError on every read of the doctype. Without this the
	# candidate sees a Select with nothing in it.
	#
	# One query, and only when a field this form actually renders needs it — a
	# form with no managed Select pays nothing.
	managed_options = {}
	if any(
		(meta_lookup.get(r.get("reference_name")) or frappe._dict()).get("is_virtual")
		and not (meta_lookup.get(r.get("reference_name")) or frappe._dict()).get("options")
		for r in rows
		if cint(r.get(view_col))
	):
		managed_options = {
			row.field: (row.options or "")
			for row in frappe.get_all(
				"Custom Doctype Field Item",
				filters={
					"parent": "Job Applicant",
					"parenttype": "Custom Doctype Fields",
					"child_table": ["is", "not set"],
				},
				fields=["field", "options"],
			)
		}

	# Load the applicant once so each field can surface its current value.
	applicant_doc = None
	if job_applicant and frappe.db.exists("Job Applicant", job_applicant):
		applicant_doc = frappe.get_doc("Job Applicant", job_applicant)

	result = []
	required_stages = None  # resolved lazily, only if this opening has a child table
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
			"options": df.options or managed_options.get(ref) or "",
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
		# For child-table fields, ship the child doctype's columns filtered by
		# child_field_config (if present). When no config is set, all columns are
		# returned for backward compatibility.
		#
		# Once a config EXISTS it is authoritative: a column missing from it counts as
		# OFF, not ON. Defaulting the gap to visible leaked every column the config
		# hadn't caught up with onto candidate forms. Matches the parent table (see
		# JobApplicantProfileSettings._auto_sync — new fields land with View OFF).
		if is_table:
			all_table_fields = _child_table_fields(df.options)
			child_config_raw = r.get("child_field_config") or ""
			if child_config_raw:
				import json as _json
				try:
					child_config = _json.loads(child_config_raw)
					view_key      = f"view_{channel}"
					mandatory_key = f"mandatory_{channel}"
					entry["table_fields"] = [
						{**f, "reqd_channel": cint(child_config.get(f["fieldname"], {}).get(mandatory_key, 0))}
						for f in all_table_fields
						if cint(child_config.get(f["fieldname"], {}).get(view_key, 0))
					]
				except Exception:
					entry["table_fields"] = all_table_fields
			else:
				entry["table_fields"] = all_table_fields

			# Tell the form which Education Stages this channel demands (e.g. 10th,
			# 12th and Graduation on campus) so it can require one row per stage.
			# Attached to whichever column links to Education Stage. Resolved on the
			# first child table and reused, so a form with several tables still costs
			# one lookup.
			if required_stages is None:
				required_stages = get_required_education_stages(channel)
			stage_requirement = _stage_requirement_for(entry["table_fields"], required_stages)
			if stage_requirement:
				entry["stage_requirement"] = stage_requirement
		result.append(entry)
	return result


_STAGE_DOCTYPE = "Education Stage"


def get_required_education_stages(channel):
	"""Education Stages a candidate must supply on `channel`, in configured order.

	Configured on Job Applicant Profile Settings → Required Education Stages, one row
	per stage with a per-channel checkbox. Advertised to the candidate form so it can
	seed a row per stage and say what is missing inline, and enforced on submit by
	`assert_child_table_rules` — the form is where the candidate is told, the submit is
	what makes it true.
	"""
	try:
		rows = frappe.get_all(
			"Job Applicant Required Education Stage",
			filters={
				"parenttype": "Job Applicant Profile Settings",
				"parentfield": "required_education_stages",
				f"required_{channel}": 1,
			},
			fields=["education_stage"],
			order_by="idx asc",
		)
	except Exception:
		# Doctype/column may not exist yet if bench migrate hasn't run.
		return []
	return [r.education_stage for r in rows if r.education_stage]


# The column holding the year a stage was passed. The Required Education Stages are
# configured in the order they are sat (10th, then 12th, then Graduation), so this is
# what lets that order be checked against the years the candidate actually typed.
_STAGE_YEAR_FIELDS = ("year_of_passing", "custom_passing_year")


def _stage_requirement_for(table_fields, required_stages):
	"""Stage rule for a child table, or None when the table has no Education Stage
	column or this channel requires no particular stage.

	`year_fieldname` is the column the stages' years are read from; it is None when
	the grid does not show one, and the order check is then simply not made.
	"""
	if not required_stages:
		return None
	stage_field = next(
		(f for f in (table_fields or []) if f.get("options") == _STAGE_DOCTYPE), None
	)
	if not stage_field:
		return None
	by_name = {f["fieldname"]: f for f in (table_fields or [])}
	year_field = next((n for n in _STAGE_YEAR_FIELDS if n in by_name), None)
	return {
		"fieldname": stage_field["fieldname"],
		"doctype": _STAGE_DOCTYPE,
		"required_stages": list(required_stages),
		"year_fieldname": year_field,
		"year_label": (by_name[year_field].get("label") or year_field) if year_field else None,
	}


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

def assert_field_set_for_channel(opening_name, channel, payload, fields=None):
	"""Validate the submit `payload` against the configured field set for the
	channel. Raises frappe.ValidationError on:
	  - unknown fields not configured for this channel
	  - missing mandatory fields
	  - a child-table row missing a column mandatory on this channel, or an
	    Education Stage the channel demands with no row of its own
	    (see `assert_child_table_rules`)
	Returns the cleaned dict (only configured fields, in declared order).

	Pass `fields` when the caller already built the set for this opening/channel —
	rebuilding it here costs a full template read on every submit.
	"""
	if not isinstance(payload, dict):
		frappe.throw(frappe._("Application payload must be a dict"))

	if fields is None:
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
	cleaned = {k: payload[k] for k in allowed if k in payload}
	assert_child_table_rules(fields, cleaned)
	return cleaned


def _table_rows(value):
	"""The child rows out of a submitted value, as dicts. Anything else is ignored —
	a malformed row must not silently pass a mandatory check."""
	if not isinstance(value, (list, tuple)):
		return []
	return [r for r in value if isinstance(r, dict)]


def _is_blank(value):
	return value is None or value == "" or value == []


def _stage_year_problems(label, rows, rule):
	"""Sentences for any demanded stage whose year does not follow the one before it.

	The Required Education Stages are configured in the order they are sat — 10th,
	then 12th, then Graduation — so a candidate who types 2015 against their 10th and
	2013 against their 12th has them the wrong way round. Only the demanded stages are
	checked: a row the candidate added themselves has no place in that sequence.

	Blank years are skipped rather than reported (the column is only mandatory if HR
	made it so, which the check above already covers), and a year that isn't a number
	is left to the field's own validation.
	"""
	year_field = rule.get("year_fieldname")
	if not year_field:
		return []

	position = {stage: i for i, stage in enumerate(rule["required_stages"])}
	sat = []
	for row in rows:
		stage = row.get(rule["fieldname"])
		if stage not in position or _is_blank(row.get(year_field)):
			continue
		try:
			sat.append((position[stage], stage, int(row.get(year_field))))
		except (TypeError, ValueError):
			continue
	sat.sort()

	year_label = rule.get("year_label") or year_field
	problems = []
	for (_, earlier, earlier_year), (_, later, later_year) in zip(sat, sat[1:]):
		if later_year <= earlier_year:
			problems.append(
				frappe._(
					"{0}: {1} is sat after {2}, so its {3} ({4}) must be later than "
					"{2}'s ({5})."
				).format(label, later, earlier, year_label, later_year, earlier_year)
			)
	return problems


def assert_child_table_rules(fields, payload):
	"""Enforce, per child table on the form:

	  * every column HR marked mandatory for this channel is filled in on every row
	    the candidate submitted,
	  * every Education Stage this channel demands has a row of its own, and
	  * those stages' years run in the order the stages are sat.

	All of this was advertised to the form and enforced NOWHERE. The Required
	Education Stages grid on Job Applicant Profile Settings therefore had no effect at
	all: a campus candidate could register having supplied no education history, only
	their 10th, or a 10th passed three years after their graduation. The client is
	where the candidate is TOLD (inline, before submitting); this is what makes it
	true — the spot-registration page, the campus portal and any future caller all
	come through here.

	Raises frappe.ValidationError naming exactly what is wrong.
	"""
	missing = []
	problems = []
	for field in fields:
		if field["fieldtype"] not in ("Table", "Table MultiSelect"):
			continue
		label = field.get("display_name") or field["reference_name"]
		rows = _table_rows(payload.get(field["reference_name"]))

		# Mandatory columns, per row. Row numbers are 1-based to match the form.
		required_columns = [
			c for c in (field.get("table_fields") or []) if cint(c.get("reqd_channel"))
		]
		for index, row in enumerate(rows, start=1):
			for column in required_columns:
				if _is_blank(row.get(column["fieldname"])):
					missing.append(
						f"{label} {index} → {column.get('label') or column['fieldname']}"
					)

		rule = field.get("stage_requirement")
		if rule:
			# The stages this channel demands — one row each...
			supplied = {row.get(rule["fieldname"]) for row in rows}
			for stage in rule["required_stages"]:
				if stage not in supplied:
					missing.append(f"{label} → {stage}")
			# ...sat in the order they are configured in.
			problems.extend(_stage_year_problems(label, rows, rule))

	messages = []
	if missing:
		messages.append(frappe._("Missing required fields: {}").format(", ".join(missing)))
	messages.extend(problems)
	if messages:
		# Joined as plain sentences: the spot-registration page renders this straight
		# into a text node, so markup would show up as markup.
		frappe.throw(" ".join(messages))
