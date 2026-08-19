"""
Shared helper for the designed list views' status-tab counts.

Job Applicant / Job Opening / Job Requisition each render a status tab bar above
Frappe's native list. The tabs count PER status, so the count query must apply
every active list filter EXCEPT status — otherwise the numbers drift away from
the rows the user is actually looking at.

The filters arrive from the browser as the list view's own
`get_filters_for_args()` output, i.e. `[doctype, fieldname, operator, value]`
(or the shorter `[fieldname, operator, value]`), JSON encoded.
"""

import json


def normalize_count_filters(filters, drop_fields=("status",)):
	"""Turn the list view's active filters into a `get_list` filter list.

	Drops the conditions in `drop_fields` (status, by default: the tabs count per
	status, so status must not pre-filter) and normalizes both the
	`[doctype, field, op, value]` and `[field, op, value]` shapes.
	"""
	if isinstance(filters, str):
		try:
			filters = json.loads(filters)
		except (ValueError, TypeError):
			filters = []

	out = []
	for f in filters or []:
		if not isinstance(f, (list, tuple)):
			continue
		if len(f) >= 4:
			field, op, val = f[1], f[2], f[3]
		elif len(f) == 3:
			field, op, val = f[0], f[1], f[2]
		else:
			continue
		if not field or field in drop_fields:
			continue
		out.append([field, op, val])
	return out
