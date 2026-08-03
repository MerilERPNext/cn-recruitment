"""TPO Desk-access provisioning.

Mirrors the External Recruiter flow (see ta_external_recruiter.py): on Campus
Invite submit we create one Desk User per TPO, grant ONLY the TPO role, restrict
their Desk to the "TPO Space" workspace, and email them a secure "set your
password" link. After setting a password they log in and land on that workspace
with nothing else visible.
"""

import frappe
from frappe import _

TPO_ROLE = "TPO"

# The only Institute TPO Contact role that gets a portal user + invite email. An
# Institute may list several contacts, but exactly one is the Primary TPO (enforced
# on Institute.validate) and that is the person the Campus Invite provisions.
PRIMARY_TPO_ROLE = "Primary TPO"

# TPO lives entirely under the Recruitment module (same as External Recruiter).
# The TPO user has every other module blocked, so their Desk only surfaces
# Recruitment workspaces; the TPO workspace itself is role-restricted to TPO_ROLE
# so it is the one that shows. Doctypes the TPO needs (Campus Drive, Job Opening,
# ...) remain reachable via role permissions, which are module-independent.
TPO_ALLOWED_MODULES = ("Recruitment",)

# Email Template used for the TPO set-password mail. Configure it in
# Campus Settings -> TPO Set Password Email Template; this name is the fallback
# looked up when that setting is blank. Jinja vars: tpo_name, link, login_url, email.
SET_PASSWORD_EMAIL_TEMPLATE = "TPO Set Password"


def ensure_tpo_role():
	"""Create the 'TPO' Desk role once (idempotent)."""
	if not frappe.db.exists("Role", TPO_ROLE):
		role = frappe.new_doc("Role")
		role.role_name = TPO_ROLE
		role.desk_access = 1
		role.is_custom = 1
		role.insert(ignore_permissions=True)


# The single doctype a TPO may access from their workspace. The TPO role is
# granted create/read/write on this doctype ONLY - nothing else.
TPO_DOCTYPE = "Candidate Registration"
TPO_PTYPES = ("read", "write", "create")


def ensure_tpo_permissions():
	"""Grant the TPO role create/read/write on Candidate Registration only (idempotent)."""
	from frappe.permissions import add_permission, update_permission_property

	if not frappe.db.exists("DocType", TPO_DOCTYPE):
		return

	if not frappe.db.exists("Custom DocPerm", {"parent": TPO_DOCTYPE, "role": TPO_ROLE, "permlevel": 0}):
		add_permission(TPO_DOCTYPE, TPO_ROLE, 0)
	for ptype in TPO_PTYPES:
		update_permission_property(TPO_DOCTYPE, TPO_ROLE, 0, ptype, 1, validate=False)


# Doctypes a TPO must be able to *reference* (e.g. pick a Campus Invite on a
# Candidate Registration) but never create or modify. Row visibility is further
# scoped by permission_query_conditions -> campus_invite_query.
#
# Institute is here because Candidate Registration carries an Institute link that
# is filled in for the TPO, plus an `institute_name` field that fetches from it.
# Without read the form greets every TPO with "You do not have Read or Select
# Permissions for Institute", then "Cannot Fetch Values". `select` alone is not
# enough — a fetch_from lookup needs read.
TPO_READONLY_DOCTYPES = ("Campus Invite", "Institute")


def ensure_tpo_readonly_permissions():
	"""Grant the TPO role READ-ONLY on referenced doctypes (Campus Invite) and
	explicitly strip create/write/delete/submit so a TPO can never author or change
	those records. Idempotent."""
	from frappe.permissions import add_permission, update_permission_property

	for doctype in TPO_READONLY_DOCTYPES:
		if not frappe.db.exists("DocType", doctype):
			continue
		if not frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": TPO_ROLE, "permlevel": 0}):
			add_permission(doctype, TPO_ROLE, 0)
		update_permission_property(doctype, TPO_ROLE, 0, "read", 1, validate=False)
		# Hard-off everything that would let a TPO create or alter an invite.
		for ptype in ("create", "write", "delete", "submit", "cancel", "amend", "import", "export"):
			update_permission_property(doctype, TPO_ROLE, 0, ptype, 0, validate=False)


def provision_tpo_user(email, full_name=None, enabled=True, send_email=True, override_template=None):
	"""Create/sync a Desk User for a TPO and (optionally) email a set-password link.

	- One User per email, user_type = System User, carrying ONLY the TPO role.
	- Every Desk module except 'TPO' is blocked, so the user sees a single workspace.
	- Returns the User name (email).
	"""
	email = (email or "").strip().lower()
	if not email:
		return None

	ensure_tpo_role()
	ensure_tpo_permissions()
	ensure_tpo_readonly_permissions()

	is_new_user = not frappe.db.exists("User", email)

	if is_new_user:
		user = frappe.new_doc("User")
		user.email = email
		user.first_name = full_name or email
		user.user_type = "System User"
		# We send our own credential email, so failures can't roll back the invite.
		user.send_welcome_email = 0
		user.append("roles", {"role": TPO_ROLE})
		user.enabled = 1 if enabled else 0
		_restrict_user_modules(user)
		user.insert(ignore_permissions=True)
	else:
		user = frappe.get_doc("User", email)
		if full_name and user.first_name != full_name:
			user.first_name = full_name
		if user.user_type != "System User":
			user.user_type = "System User"
		if not any(r.role == TPO_ROLE for r in user.roles):
			user.append("roles", {"role": TPO_ROLE})
		user.enabled = 1 if enabled else 0
		_restrict_user_modules(user)
		user.save(ignore_permissions=True)

	if send_email and enabled:
		_send_set_password_email(user, full_name, override_template)

	return user.name


def _restrict_user_modules(user):
	"""Block every Desk module except 'TPO' so the user's Desk shows only the TPO
	workspace. Rebuilt on every sync so it stays restricted."""
	allowed = set(TPO_ALLOWED_MODULES)
	user.set("block_modules", [])
	for module in frappe.get_all("Module Def", pluck="name"):
		if module not in allowed:
			user.append("block_modules", {"module": module})


def _send_set_password_email(user, display_name=None, override_template=None):
	"""Email the TPO a 'set your password' link. Best effort: SMTP problems are
	logged and never roll back the invite. The link is always inside an <a href>
	(both button and copy-paste), so mail clients never truncate the reset key."""
	try:
		from frappe.utils import get_url

		# Generates a one-time reset key and returns the fully-qualified set-password
		# URL. Method name differs by Frappe version (v16: reset_password,
		# v15: _reset_password), so pick whichever this build exposes.
		reset_password = getattr(user, "reset_password", None) or getattr(user, "_reset_password", None)
		link = reset_password(send_email=False)
		context = {
			"tpo_name": display_name or user.first_name or user.email,
			"link": link,
			"login_url": get_url("/login"),
			"email": user.email,
		}

		# Template is configured in Campus Settings; falls back to an Email Template
		# named "TPO Set Password". No in-code body - it's fully configurable.
		template_name = (
			override_template
			or frappe.db.get_single_value("Campus Settings", "tpo_set_password_email_template")
			or SET_PASSWORD_EMAIL_TEMPLATE
		)
		if not (template_name and frappe.db.exists("Email Template", template_name)):
			frappe.log_error(
				f"No TPO set-password Email Template configured (Campus Settings -> "
				f"TPO Set Password Email Template). User {user.name} was created but "
				f"no email was sent.",
				"TPO: set-password template missing",
			)
			return

		from frappe.email.doctype.email_template.email_template import get_email_template

		rendered = get_email_template(template_name, context)
		frappe.sendmail(
			recipients=[user.email],
			subject=rendered.get("subject") or _("Set your password - TPO access"),
			message=rendered.get("message"),
			reference_doctype="User",
			reference_name=user.name,
		)
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			"TPO: set-password email failed (check Email Account / SMTP)",
		)
