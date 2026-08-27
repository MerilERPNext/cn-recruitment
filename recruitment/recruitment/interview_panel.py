"""Who interviews — resolved from a hiring stage, not typed in twice.

A TA Interview Strategy Round names its panel two ways, and either may be left
empty:

``interviewer_pool`` (labelled "Interviewer User Assignment")
    A Dynamic User Assignment of purpose **People**. A DUA of that purpose already
    resolves to a concrete set of Employees / Job Applicants in its
    ``assigned_users`` snapshot, filtered by its own conditions — "every Employee
    in the Engineering department with designation Tech Lead". Their linked User
    accounts become the interviewers. Nothing about that resolution is
    reimplemented here; this reads the snapshot nextai maintains.

    The fieldname is ``interviewer_pool``, not the obvious
    ``interviewer_assignment``, because ``DatabaseQuery.set_optional_columns``
    tests ``"_assign" in fieldname`` — a **substring** — and drops any matching
    column that the table does not actually have. A field named
    ``interviewer_assignment`` therefore reads back as ``None`` through
    ``frappe.get_all`` with no error and no warning, while raw SQL shows the value
    sitting there. The label still says "Interviewer User Assignment"; only the
    stored name dodges the trap.

    A single Link, not a list, and deliberately so: a Table MultiSelect here
    would be a *grandchild* table (round → assignments), and Frappe's
    ``update_children`` only walks one level — it calls ``db_update()`` on each
    child row, which writes that row's columns and never its own tables. Such a
    field renders, accepts input and silently saves nothing. (The neighbouring
    ``skip_stage_for_sources`` on this doctype has exactly that shape and has
    stored zero rows.) One assignment is not a real limit anyway: the population
    it resolves to is whatever its conditions say.

``interviewer_role``
    Everybody holding the role. The blunt instrument, for a panel that really is
    "whoever is an Interviewer".

Both empty means the recruiter picks interviewers by hand on each Interview,
which is what happened before this existed — so a round that says nothing about
its panel behaves exactly as it always did.

Why the stage and not the Interview Round
-----------------------------------------
HRMS already has ``Interview Round.interviewers``, and the obvious move is to
write the panel there and let HRMS's own form logic deliver it. It is the wrong
place: ``_ensure_interview_round`` deliberately shares one round across every
opening that uses that stage name (see its docstring — rounds are kept
designation-agnostic so a single "Technical Round" serves every opening). Writing
a panel onto it would make the last opening to schedule an interview silently
rewrite the panel of every other one. The stage row carries the configuration,
so the panel resolves per stage, at the moment an interview is created.

The two sources union, then dedupe. Order is stable — assignment users first in
assignment order, then role holders — so the same stage always produces the same
panel rather than one that reshuffles per call.

Nobody resolving is a normal outcome, not an error: a role with no holders or an
assignment whose snapshot is empty leaves the panel to be filled in by hand,
exactly as if neither had been set.
"""

import frappe

ASSIGNED_USERS = "Assigned Users"
ASSIGNMENT_PARENT = "Dynamic User Assignment"

# Accounts that must never be scheduled as an interviewer, however they resolve.
_NON_INTERVIEWERS = {"Administrator", "Guest"}


def users_for_assignments(names):
	"""User ids resolved by ``names``, in the order the assignments were given.

	Reads the ``assigned_users`` snapshot that ``fetch_employees_and_users``
	maintains on each assignment — the same table the requisition scope and the
	hiring-lead configuration read. An Employee with no linked User account
	contributes nobody; there is no interviewer to schedule without one.
	"""
	names = [n for n in (names or []) if n]
	if not names:
		return []

	rows = frappe.get_all(
		ASSIGNED_USERS,
		filters={
			"parenttype": ASSIGNMENT_PARENT,
			"parentfield": "assigned_users",
			"parent": ["in", names],
		},
		fields=["parent", "user_id", "idx"],
		order_by="idx asc",
		limit_page_length=0,
	)

	by_assignment = {}
	for row in rows:
		if not row.user_id:
			continue
		by_assignment.setdefault(row.parent, []).append(row.user_id)

	# Ordered by the assignment list, not by whatever order the rows came back in,
	# so the panel is reproducible.
	out = []
	for name in names:
		for user in by_assignment.get(name, []):
			if user not in out:
				out.append(user)
	return out


def users_for_role(role):
	"""User ids holding ``role``."""
	if not role:
		return []
	return frappe.get_all(
		"Has Role",
		filters={"parenttype": "User", "parentfield": "roles", "role": role},
		pluck="parent",
		order_by="parent asc",
		limit_page_length=0,
	)


def _enabled(users):
	"""Keep only real, enabled, human accounts — in the order given."""
	users = [u for u in dict.fromkeys(users) if u and u not in _NON_INTERVIEWERS]
	if not users:
		return []

	live = set(frappe.get_all(
		"User",
		filters={"name": ["in", users], "enabled": 1, "user_type": "System User"},
		pluck="name",
		limit_page_length=0,
	))
	return [u for u in users if u in live]


def resolve_interviewers(assignments=None, role=None):
	"""``[user, ...]`` for a panel described by assignments and/or a role.

	Empty when neither is configured, when nothing resolves, or when everything
	that resolved is disabled — all of which mean the same thing to the caller:
	let the recruiter pick.
	"""
	return _enabled(users_for_assignments(assignments) + users_for_role(role))


def interviewers_for_stage(stage):
	"""The panel for one hiring stage.

	``stage`` is a Job Opening Hiring Stage row as ``get_opening_stages`` returns
	it — both fields are plain columns, so they survive that ``frappe.get_all``
	read and no second query is needed to find them.
	"""
	stage = stage or {}
	return resolve_interviewers(
		[stage.get("interviewer_pool")], stage.get("interviewer_role")
	)
