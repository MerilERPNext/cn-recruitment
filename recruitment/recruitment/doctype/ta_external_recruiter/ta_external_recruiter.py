import frappe
from frappe import _
from frappe.model.document import Document

EXTERNAL_RECRUITER_ROLE = "External Recruiter"

# The only Desk module an external recruiter may see — it holds the External
# Recruiter workspace. Every other module is blocked on their User so their Desk
# shows ONLY that workspace. Job Opening / Job Applicant (HR module) stay
# accessible via role permissions, which are module-independent.
EXTERNAL_RECRUITER_ALLOWED_MODULES = ("Recruitment",)

# Configurable email used for the "set your password" link. Edit it in
# Desk → Email Template → this name. Available Jinja vars: recruiter_name,
# link, login_url, email. If the template is missing, a built-in fallback is used.
SET_PASSWORD_EMAIL_TEMPLATE = "External Recruiter Set Password"

# Single source of truth for the set-password email body (Jinja). Used to seed
# the editable Email Template AND as the in-code fallback when that template is
# missing. Vars: recruiter_name, link, login_url, email.
SET_PASSWORD_EMAIL_HTML = """
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;margin:0;padding:28px 12px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e8eb;">
      <tr><td style="background:#111827;padding:30px 36px;">
        <div style="color:#ffffff;font-size:19px;font-weight:700;letter-spacing:.2px;">Recruitment Portal</div>
        <div style="color:#9ca3af;font-size:12px;margin-top:5px;text-transform:uppercase;letter-spacing:.08em;">External Recruiter Access</div>
      </td></tr>
      <tr><td style="padding:34px 36px 8px;">
        <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#111827;">Hi {{ recruiter_name }},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.75;">
          Welcome aboard! An <strong style="color:#111827;">External Recruiter</strong> account has been created for you.
          To start working on the job openings assigned to you, please set your password using the secure link below.
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
    <p style="margin:16px 0 0;font-size:11px;color:#b0b6bd;">&copy; Recruitment Team &middot; Please do not reply to this automated message.</p>
  </td></tr>
</table>
"""


def ensure_external_recruiter_role():
	"""Create the 'External Recruiter' role once (idempotent). Desk role — these
	users log into Desk, not the candidate/ESS portal, so it has desk access and
	is restricted to a couple of doctypes via permissions."""
	if not frappe.db.exists("Role", EXTERNAL_RECRUITER_ROLE):
		role = frappe.new_doc("Role")
		role.role_name = EXTERNAL_RECRUITER_ROLE
		role.desk_access = 1
		role.is_custom = 1
		role.insert(ignore_permissions=True)


class TAExternalRecruiter(Document):
	def validate(self):
		self.validate_contract_period()

	def validate_contract_period(self):
		if (
			self.contract_period_from
			and self.contract_period_to
			and self.contract_period_to < self.contract_period_from
		):
			frappe.throw(_("Contract Period To cannot be earlier than Contract Period From."))

	def after_insert(self):
		self.sync_login_user()

	def on_update(self):
		self.sync_login_user()

	def on_trash(self):
		# Don't delete the User (preserves audit trail / ownership); just disable.
		if self.user and frappe.db.exists("User", self.user):
			frappe.db.set_value("User", self.user, "enabled", 0)

	# ------------------------------------------------------------------
	# Desk login provisioning
	# ------------------------------------------------------------------

	def sync_login_user(self):
		"""Create/sync the Frappe Desk user for this external recruiter.

		- One User per `external_recruiter_email`, user_type = System User.
		- Carries the External Recruiter role only.
		- `status` drives User.enabled.
		- The typed password (if any) sets/resets the Desk password.
		Runs with ignore_permissions so HR can provision without User-admin rights.
		"""
		email = (self.external_recruiter_email or "").strip().lower()
		if not email:
			return

		ensure_external_recruiter_role()

		enabled = 1 if (self.status or "Active") == "Active" else 0
		is_new_user = not frappe.db.exists("User", email)

		if is_new_user:
			user = frappe.new_doc("User")
			user.email = email
			user.first_name = self.external_recruiter_name or email
			user.user_type = "System User"
			# We control the credential email ourselves (below) so failures
			# can't roll back the recruiter save.
			user.send_welcome_email = 0
			user.append("roles", {"role": EXTERNAL_RECRUITER_ROLE})
			user.enabled = enabled
			_restrict_user_modules(user)
			user.insert(ignore_permissions=True)
		else:
			user = frappe.get_doc("User", email)
			if self.external_recruiter_name and user.first_name != self.external_recruiter_name:
				user.first_name = self.external_recruiter_name
			if user.user_type != "System User":
				user.user_type = "System User"
			if not any(r.role == EXTERNAL_RECRUITER_ROLE for r in user.roles):
				user.append("roles", {"role": EXTERNAL_RECRUITER_ROLE})
			user.enabled = enabled
			_restrict_user_modules(user)
			user.save(ignore_permissions=True)

		# Credential handling:
		#   - HR typed a password  → set/reset it directly (no email).
		#   - blank, new + active   → email a secure "set your password" link.
		raw_password = (
			self.get_password("external_recruiter_password")
			if self.external_recruiter_password
			else None
		)
		if raw_password:
			from frappe.utils.password import update_password

			update_password(email, raw_password)
		elif is_new_user and enabled:
			_send_set_password_email(user, self.external_recruiter_name)

		# Link the User back without re-triggering hooks.
		if self.user != email:
			self.db_set("user", email, update_modified=False)


def _restrict_user_modules(user):
	"""Block every Desk module except those in EXTERNAL_RECRUITER_ALLOWED_MODULES,
	so the recruiter's Desk shows only the External Recruiter workspace and the
	Job Opening / Job Applicant doctypes. Resets the block list on every sync, so
	it stays restricted even if modules were toggled manually."""
	allowed = set(EXTERNAL_RECRUITER_ALLOWED_MODULES)
	user.set("block_modules", [])
	for module in frappe.get_all("Module Def", pluck="name"):
		if module not in allowed:
			user.append("block_modules", {"module": module})


def _send_set_password_email(user, display_name=None):
	"""Email the external recruiter a 'set your password' link, rendered from the
	configurable `External Recruiter Set Password` Email Template when present
	(edit it in Desk), with a built-in fallback. Best effort: a missing/broken
	SMTP must never roll back the recruiter save — it's logged, and HR can
	re-send or set a password manually."""
	try:
		from frappe.utils import get_url

		# Generates a one-time reset key and returns the set-password URL.
		link = user._reset_password(send_email=False)
		context = {
			"recruiter_name": display_name or user.first_name or user.email,
			"link": link,
			"login_url": get_url("/login"),
			"email": user.email,
		}

		subject = _("Set your password — Recruiter access")
		message = None
		if frappe.db.exists("Email Template", SET_PASSWORD_EMAIL_TEMPLATE):
			from frappe.email.doctype.email_template.email_template import get_email_template

			rendered = get_email_template(SET_PASSWORD_EMAIL_TEMPLATE, context)
			subject = rendered.get("subject") or subject
			message = rendered.get("message")
		if not message:
			message = _default_set_password_html(context)

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
			"TA External Recruiter: set-password email failed (check Email Account / SMTP)",
		)


def _default_set_password_html(context):
	"""Built-in fallback body (same design as the seeded Email Template), used
	only when that template doesn't exist. Rendered via Jinja with `context`."""
	return frappe.render_template(SET_PASSWORD_EMAIL_HTML, context)
