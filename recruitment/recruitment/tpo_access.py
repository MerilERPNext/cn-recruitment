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

# TPO lives entirely under the Recruitment module (same as External Recruiter).
# The TPO user has every other module blocked, so their Desk only surfaces
# Recruitment workspaces; the TPO workspace itself is role-restricted to TPO_ROLE
# so it is the one that shows. Doctypes the TPO needs (Campus Drive, Job Opening,
# ...) remain reachable via role permissions, which are module-independent.
TPO_ALLOWED_MODULES = ("Recruitment",)

# Editable in Desk -> Email Template. Jinja vars: tpo_name, link, login_url, email.
# Falls back to the in-code HTML below when the template is missing.
SET_PASSWORD_EMAIL_TEMPLATE = "TPO Set Password"

SET_PASSWORD_EMAIL_HTML = """
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;margin:0;padding:28px 12px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e8eb;">
      <tr><td style="background:#111827;padding:30px 36px;">
        <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:.2px;">Campus Recruitment Portal</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:5px;text-transform:uppercase;letter-spacing:.08em;">TPO Access</div>
      </td></tr>
      <tr><td style="padding:34px 36px 8px;">
        <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#111827;">Hi {{ tpo_name }},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.75;">
          A <strong style="color:#111827;">TPO</strong> account has been created for you on the Campus Recruitment Portal.
          To view the campus drives and job openings shared with your institute, please set your password using the secure link below.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 26px;">
          <tr><td align="center" bgcolor="#2490ef" style="border-radius:9px;">
            <a href="{{ link }}" target="_blank" style="display:inline-block;padding:14px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px;">Set Your Password &rarr;</a>
          </td></tr>
        </table>
        <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">Button not working? Copy and paste this link into your browser:</p>
        <p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="{{ link }}" style="color:#2490ef;text-decoration:none;">{{ link }}</a></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #eef0f2;">
          <tr><td style="padding:16px 18px;font-size:13px;color:#4b5563;line-height:1.7;">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;">Your login details</span><br>
            Email:&nbsp; <span style="color:#111827;font-weight:600;">{{ email }}</span><br>
            Sign in at:&nbsp; <a href="{{ login_url }}" style="color:#2490ef;text-decoration:none;">{{ login_url }}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:22px 36px 28px;">
        <hr style="border:none;border-top:1px solid #eef0f2;margin:0 0 16px;">
        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
          This link is unique to you and expires after it is used or after a short period. If you weren't expecting this email, you can safely ignore it.
        </p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:11px;color:#b0b6bd;">&copy; Campus Recruitment Team &middot; Please do not reply to this automated message.</p>
  </td></tr>
</table>
"""


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

		# Generates a one-time reset key and returns the fully-qualified set-password URL.
		link = user.reset_password(send_email=False)
		context = {
			"tpo_name": display_name or user.first_name or user.email,
			"link": link,
			"login_url": get_url("/login"),
			"email": user.email,
		}

		subject = _("Set your password - TPO access")
		message = None
		template_name = override_template or SET_PASSWORD_EMAIL_TEMPLATE
		if template_name and frappe.db.exists("Email Template", template_name):
			from frappe.email.doctype.email_template.email_template import get_email_template

			rendered = get_email_template(template_name, context)
			subject = rendered.get("subject") or subject
			message = rendered.get("message")
		if not message:
			message = frappe.render_template(SET_PASSWORD_EMAIL_HTML, context)

		frappe.sendmail(
			recipients=[user.email],
			subject=subject,
			message=message,
			reference_doctype="User",
			reference_name=user.name,
		)
	except Exception:
		frappe.log_error(
			frappe.get_traceback(),
			"TPO: set-password email failed (check Email Account / SMTP)",
		)
