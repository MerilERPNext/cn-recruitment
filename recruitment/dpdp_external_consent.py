# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""DPDP consent collected on an EXTERNAL partner portal (HPCP).

Two ways of collecting the same consent live side by side, chosen by
``DPDP Act Settings.consent_mode``:

  Internal Form   -> ``recruitment.dpdp_consent`` renders our own page (original
                     behaviour, untouched).
  External Portal -> this module. We never show the notices; the partner portal
                     does, section by section, and verifies the candidate by OTP.

The handover, end to end:

  1. Candidate accepts the Job Offer. ``job_offer_update`` calls
     ``start_consent_session`` which POSTs to the partner's *consent start* API
     with the candidate's name / email / mobile and gets back a ``sessionId`` and
     a ``shortUrl``. Both are stored as a DPDP Consent Session and the shortUrl is
     handed to the frontend, which redirects the candidate there.
  2. The candidate ticks each section on the partner portal and verifies an OTP.
  3. The portal POSTs the outcome to ``consent_callback`` (this module). We map the
     ``sessionId`` back to the candidate through the session record, write an
     immutable Job Applicant DPDP Consent Log with one response row per section,
     and resume the onboarding bootstrap that offer-acceptance deferred.
  4. We answer the callback with the return URL, and the portal sends the candidate
     back into our portal.

Everything that varies between environments — endpoint, credentials, org id,
configuration code, channel, callback secret, return URL — is configuration on
DPDP Act Settings, so moving from UAT to production is a settings change.

Defensive by design: with the feature off, or the mode set to Internal Form, every
entry point here is inert and callers behave exactly as before.
"""

import base64
import json
import re
from datetime import datetime, timezone

import frappe
from frappe import _
from frappe.utils import (
    add_to_date,
    cint,
    convert_utc_to_system_timezone,
    cstr,
    get_url,
    now_datetime,
)

from recruitment.job_offer_utils import _authorize_offer

# The partner may word its terminal status differently across environments, so the
# accepted synonyms are shared with the consent log controller rather than being
# spelled twice.
from recruitment.recruitment.doctype.job_applicant_dpdp_consent_log.job_applicant_dpdp_consent_log import (
    COMPLETED_STATUSES,
    DECLINED_STATUSES,
)

SETTINGS_DOCTYPE = "DPDP Act Settings"
SESSION_DOCTYPE = "DPDP Consent Session"
LOG_DOCTYPE = "Job Applicant DPDP Consent Log"

EXTERNAL_MODE = "External Portal"
CALLBACK_METHOD = "recruitment.dpdp_external_consent.consent_callback"

DEFAULT_CALLBACK_HEADER = "X-Consent-Token"
DEFAULT_SESSION_MINUTES = 30
DEFAULT_TIMEOUT = 30

# Each start costs a partner API call and puts an email in the candidate's inbox, so
# a candidate replaying the (token-gated) start endpoint is capped rather than able
# to fan out messages.
MAX_SESSIONS_PER_HOUR = 5

EXPIRED_STATUSES = {"EXPIRED", "TIMEOUT", "TIMED_OUT"}

# Truthy spellings a partner may use for a per-section "accepted" flag sent as text.
TRUTHY_STRINGS = COMPLETED_STATUSES | {"TRUE", "YES", "Y", "1"}


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

def is_external_consent_mode():
    """True only when DPDP consent is enabled AND set to the external portal.

    Every caller outside this module gates on this, so a site on the internal form
    (or with the feature off entirely) never touches the partner integration."""
    try:
        settings = _settings()
        return bool(cint(settings.enabled)) and cstr(settings.consent_mode) == EXTERNAL_MODE
    except Exception:
        return False


def _settings():
    return frappe.get_cached_doc(SETTINGS_DOCTYPE)


def callback_url():
    """The URL the partner portal POSTs the completed consent to.

    Shown read-only on DPDP Act Settings so it can be handed to the partner team
    without anyone having to assemble it by hand."""
    return get_url(f"/api/method/{CALLBACK_METHOD}")


def _return_url(appl, session_id=None, status=None):
    """Where the portal sends the candidate once consent is recorded.

    Configured as a template on DPDP Act Settings; ``{applicant}``, ``{session}``,
    ``{status}`` and ``{token}`` are substituted so the landing page can identify
    the candidate the same token-gated way the rest of the guest portal does. A
    relative path is resolved against this site."""
    from recruitment.recruitment.link_token import offer_token

    template = cstr(_settings().return_url_template).strip() or "/action-center"
    try:
        url = template.format(
            applicant=appl or "",
            session=session_id or "",
            status=status or "",
            token=offer_token(appl) if appl else "",
        )
    except (KeyError, IndexError):
        # An unknown placeholder is a configuration mistake, not a reason to strand
        # the candidate on the partner's site — fall back to the raw template.
        url = template

    return url if url.startswith("http://") or url.startswith("https://") else get_url(url)


# ---------------------------------------------------------------------------
# Starting a session
# ---------------------------------------------------------------------------

def _applicant_contacts(appl):
    row = frappe.db.get_value(
        "Job Applicant", appl, ["applicant_name", "email_id", "phone_number"], as_dict=True
    ) or {}
    from recruitment.api.applicant_name import get_full_name

    return {
        "name": get_full_name(appl) or row.get("applicant_name"),
        "email": cstr(row.get("email_id")).strip(),
        "mobile": cstr(row.get("phone_number")).strip(),
    }


def _live_session(appl):
    """An unexpired, still-pending session for this candidate, if any.

    Starting a fresh session every time the candidate re-enters the flow would
    invalidate the link already sitting in their inbox, so an in-flight one is
    reused."""
    rows = frappe.get_all(
        SESSION_DOCTYPE,
        filters={"job_applicant": appl, "status": "Pending"},
        fields=["name", "session_id", "short_url", "expires_at"],
        order_by="creation desc",
        limit=1,
    )
    if not rows:
        return None

    session = rows[0]
    if session.expires_at and get_datetime(session.expires_at) <= now_datetime():
        frappe.db.set_value(SESSION_DOCTYPE, session.name, "status", "Expired")
        return None
    return session if session.short_url else None


def _auth_header(settings):
    user = cstr(settings.partner_username).strip()
    password = cstr(settings.get_password("partner_password", raise_exception=False) or "").strip()
    if not user or not password:
        frappe.throw(_("Partner credentials are not configured in DPDP Act Settings."))
    raw = f"{user}:{password}".encode()
    return "Basic " + base64.b64encode(raw).decode()


def _start_payload(settings, appl, contacts):
    payload = {
        "configurationCode": cstr(settings.configuration_code).strip() or "EMPLOYEE_ONBOARDING",
        "channel": cstr(settings.consent_channel).strip() or "EMAIL",
        "mobile": contacts["mobile"],
        "customerName": contacts["name"],
        "email": contacts["email"],
    }
    # Some partners take these per-request; others have them pre-configured against
    # the Configuration Code and reject unknown keys — hence the switch.
    if cint(settings.send_urls_in_start_payload):
        payload["callbackUrl"] = callback_url()
        payload["redirectUrl"] = _return_url(appl)
    return payload


def _throttle_session_starts(appl):
    """Refuse a candidate who is minting links faster than any real journey needs.

    The start endpoint is token-gated, so this is not an anonymous abuse path — but
    each call bills a partner request and drops another email in the candidate's
    inbox, so a stuck retry loop on the frontend should stop rather than fan out."""
    recent = frappe.db.count(
        SESSION_DOCTYPE,
        {"job_applicant": appl, "creation": (">", add_to_date(now_datetime(), hours=-1))},
    )
    if recent >= MAX_SESSIONS_PER_HOUR:
        frappe.throw(
            _("Too many consent links have been requested for this candidate in the last hour. Please try again later or contact HR.")
        )


def _partner_message(body):
    """The human-readable reason out of a partner response body, if it carries one."""
    if not isinstance(body, dict):
        return None
    return cstr(body.get("message") or body.get("error") or body.get("errorMessage")).strip() or None


def _fail_session(session, reason):
    """Persist the failed attempt, then stop with the partner's own reason.

    The commit is the point: ``frappe.throw`` rolls the request back, which would
    discard the very record — request body, response body, HTTP status — that makes
    a partner-side failure diagnosable. Committing first means a failed handover
    always leaves evidence behind in DPDP Consent Session.

    The reason is passed through rather than hidden behind a generic message: it is
    the partner's own validation text ("Mobile is required"), which tells whoever is
    looking exactly what to correct.
    """
    session.status = "Failed"
    session.error_message = cstr(reason)[:500]
    session.insert(ignore_permissions=True)
    frappe.db.commit()
    frappe.throw(
        _("Could not start the consent session with the consent portal: {0}").format(
            session.error_message
        )
    )


def _create_session(appl):
    """POST to the partner's consent-start API and record the session."""
    import requests

    _throttle_session_starts(appl)
    settings = _settings()
    endpoint = cstr(settings.consent_start_url).strip()
    if not endpoint:
        frappe.throw(_("Consent Start URL is not configured in DPDP Act Settings."))

    contacts = _applicant_contacts(appl)
    if not contacts["name"]:
        frappe.throw(_("This candidate has no name on record; consent cannot be started."))

    # The portal validates mobile on every channel, not just SMS — an EMAIL session
    # with a blank mobile comes back "Mobile is required". Checking here names the
    # candidate and the field to fix, instead of surfacing the partner's generic error.
    channel = cstr(settings.consent_channel).strip().upper() or "EMAIL"
    if not contacts["email"] and channel in ("EMAIL", "BOTH"):
        frappe.throw(
            _("{0} has no email address on their Job Applicant record, so the consent link cannot be sent.").format(contacts["name"])
        )
    if not contacts["mobile"]:
        frappe.throw(
            _("{0} has no mobile number on their Job Applicant record. The consent portal requires one for every consent session — add it to the Job Applicant and try again.").format(contacts["name"])
        )

    payload = _start_payload(settings, appl, contacts)
    headers = {
        "Content-Type": "application/json",
        "orgId": cstr(settings.org_id).strip() or "HRMS",
        "Authorization": _auth_header(settings),
    }

    session = frappe.new_doc(SESSION_DOCTYPE)
    session.job_applicant = appl
    session.email_id = contacts["email"]
    session.phone_number = contacts["mobile"]
    session.channel = payload["channel"]
    session.configuration_code = payload["configurationCode"]
    session.request_payload = frappe.as_json(payload)

    body = None
    try:
        response = requests.post(
            endpoint,
            json=payload,
            headers=headers,
            timeout=cint(settings.request_timeout) or DEFAULT_TIMEOUT,
        )
        body = _safe_json(response.text)
        session.response_payload = frappe.as_json(body if body is not None else response.text)
        session.http_status = response.status_code
        response.raise_for_status()
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "DPDP: consent session start failed")
        _fail_session(session, _partner_message(body) or cstr(exc))

    data = (body or {}).get("data") or {}
    session_id = cstr(data.get("sessionId")).strip()
    short_url = cstr(data.get("shortUrl") or data.get("url") or data.get("consentUrl")).strip()
    if not session_id or not short_url:
        _fail_session(
            session,
            _partner_message(body) or "No sessionId/shortUrl in the consent portal response",
        )

    session.session_id = session_id
    session.short_url = short_url
    session.status = "Pending"
    session.expires_at = _parse_expiry(data.get("expiresAt"), settings)
    session.insert(ignore_permissions=True)

    return {"name": session.name, "session_id": session_id, "short_url": short_url,
            "expires_at": session.expires_at}


def _parse_partner_datetime(value):
    """Read an ISO-8601 timestamp from the partner into site-local time.

    Their timestamps are UTC with a trailing ``Z``; the site runs in its own timezone
    (Asia/Kolkata here). Dropping the ``Z`` and storing the wall clock made every
    session look 5.5 hours stale the moment it was created, so no session was ever
    reusable and each request minted a fresh link — the offset has to be converted,
    not discarded. Returns None when the value is absent or unreadable."""
    if not value:
        return None

    raw = cstr(value).strip()
    if not raw:
        return None

    try:
        # fromisoformat rejects both a trailing Z and sub-microsecond precision,
        # and the partner sends nanoseconds.
        cleaned = re.sub(r"(\.\d{6})\d+", r"\1", raw.replace("Z", "+00:00"))
        parsed = datetime.fromisoformat(cleaned)
    except (ValueError, TypeError):
        return None

    if parsed.tzinfo is None:
        # No offset given — take it at face value as site-local time.
        return parsed
    return convert_utc_to_system_timezone(parsed.astimezone(timezone.utc)).replace(tzinfo=None)


def _parse_expiry(value, settings):
    """Session expiry from the portal, falling back to the configured window."""
    parsed = _parse_partner_datetime(value)
    if parsed:
        return parsed
    minutes = cint(settings.session_validity_minutes) or DEFAULT_SESSION_MINUTES
    return add_to_date(now_datetime(), minutes=minutes)


def _safe_json(text):
    try:
        return json.loads(text)
    except (ValueError, TypeError):
        return None


def _submitted_log(appl):
    return frappe.db.get_value(
        LOG_DOCTYPE, {"job_applicant": appl, "docstatus": 1, "consent_given": 1}, "name"
    )


def get_or_start_session(appl):
    """Live session for the candidate, starting one only if there isn't one.

    Internal helper — the caller has already authorized the applicant."""
    live = _live_session(appl)
    if live:
        return {"name": live.name, "session_id": live.session_id, "short_url": live.short_url,
                "expires_at": live.expires_at, "reused": True}
    return dict(_create_session(appl), reused=False)


@frappe.whitelist(allow_guest=True)
def start_consent_session(appl, token=None):
    """Guest endpoint: hand the candidate a consent-portal link.

    Gated with the same signed offer token the candidate already holds, exactly
    like the offer page and the internal consent form. Idempotent — an already
    consented candidate gets their return URL back, and an in-flight session is
    reused rather than replaced."""
    if not appl:
        frappe.throw(_("Missing applicant parameter"))
    _authorize_offer(appl, token, "write")

    if not is_external_consent_mode():
        frappe.throw(_("External DPDP consent is not enabled."))

    existing = _submitted_log(appl)
    if existing:
        return {
            "already_consented": True,
            "consent_log": existing,
            "redirect_url": _return_url(appl, status="COMPLETED"),
        }

    session = get_or_start_session(appl)
    return {
        "already_consented": False,
        "session_id": session["session_id"],
        "consent_url": session["short_url"],
        "expires_at": cstr(session.get("expires_at")),
        "reused": session.get("reused", False),
    }


@frappe.whitelist(allow_guest=True)
def get_consent_session_status(appl, token=None):
    """Guest endpoint the portal page polls after sending the candidate away.

    The callback is what actually records consent; this only reports whether it
    has landed yet, so the UI knows when it is safe to move on."""
    if not appl:
        frappe.throw(_("Missing applicant parameter"))
    _authorize_offer(appl, token, "read")

    if not is_external_consent_mode():
        return {"enabled": False}

    log = _submitted_log(appl)
    row = frappe.get_all(
        SESSION_DOCTYPE,
        filters={"job_applicant": appl},
        fields=["name", "session_id", "status", "short_url", "expires_at", "consent_log"],
        order_by="creation desc",
        limit=1,
    )
    session = row[0] if row else {}
    # Only hand back a link the candidate can still use — a spent or expired session's
    # short URL leads to a dead page on the partner's side.
    usable_url = session.get("short_url") if session.get("status") == "Pending" else None
    return {
        "enabled": True,
        "consent_given": bool(log),
        "consent_log": log or session.get("consent_log"),
        "session_id": session.get("session_id"),
        "session_status": session.get("status"),
        "consent_url": usable_url,
        "expires_at": cstr(session.get("expires_at") or ""),
        "redirect_url": _return_url(appl, session.get("session_id"), session.get("status")),
    }


# ---------------------------------------------------------------------------
# Callback from the partner portal
# ---------------------------------------------------------------------------

def _callback_body():
    """The partner POSTs a JSON body; fall back to form-encoded fields."""
    try:
        raw = frappe.request.get_data(as_text=True) if frappe.request else ""
    except Exception:
        raw = ""

    body = _safe_json(raw) if raw else None
    if isinstance(body, dict):
        return body

    form = dict(frappe.local.form_dict or {})
    for key in ("cmd", "csrf_token"):
        form.pop(key, None)
    return form


def _authenticate_callback(settings):
    """Reject anything that does not carry the shared secret.

    The endpoint has to be guest-reachable (the partner has no login here), so the
    secret is the only thing standing between an anonymous POST and a recorded
    consent. An unconfigured secret is a hard failure, never an open door."""
    secret = cstr(settings.get_password("callback_secret", raise_exception=False) or "").strip()
    if not secret:
        frappe.throw(_("Consent callback is not configured."), frappe.ValidationError)

    # A custom header, deliberately not Authorization: Frappe's own OAuth layer
    # intercepts `Authorization: Bearer ...` and rejects the request before this
    # method ever runs, so a bearer-shaped secret could never be honoured here.
    header = cstr(settings.callback_header_name).strip() or DEFAULT_CALLBACK_HEADER
    sent = cstr(frappe.get_request_header(header) or "").strip()

    import hmac

    if not sent or not hmac.compare_digest(sent, secret):
        # PermissionError surfaces as 403; Frappe overrides any code set here.
        frappe.throw(_("Invalid consent callback credentials."), frappe.PermissionError)


def _normalize_sections(body):
    """Flatten the portal's per-section consent list into response rows.

    The key names differ between partner builds, so each field is read through a
    small list of aliases rather than one hard-coded spelling. Anything unmapped is
    still recorded — an audit row with the raw label is better than a dropped one."""
    sections = (
        body.get("consents")
        or body.get("sections")
        or body.get("consentDetails")
        or body.get("purposes")
        or []
    )
    if isinstance(sections, dict):
        sections = [{"code": k, "accepted": v} for k, v in sections.items()]
    if not isinstance(sections, (list, tuple)):
        return []

    rows = []
    for item in sections:
        if not isinstance(item, dict):
            # A bare list of codes means "these were accepted".
            rows.append({"consent_key": cstr(item), "statement": cstr(item),
                         "is_mandatory": 0, "accepted": 1})
            continue

        key = cstr(item.get("code") or item.get("consentKey") or item.get("key")
                   or item.get("purposeCode") or item.get("id")).strip()
        label = cstr(item.get("label") or item.get("title") or item.get("name")
                     or item.get("statement") or item.get("description") or key).strip()
        accepted = item.get("accepted")
        if accepted is None:
            accepted = item.get("consentGiven", item.get("status"))
        if isinstance(accepted, str):
            accepted = accepted.strip().upper() in TRUTHY_STRINGS

        mandatory = item.get("mandatory")
        if mandatory is None:
            mandatory = item.get("required", item.get("isMandatory", 0))

        rows.append({
            "consent_key": key or frappe.scrub(label)[:60] or f"section_{len(rows) + 1}",
            "statement": label or key,
            "is_mandatory": 1 if cint(mandatory) else 0,
            "accepted": 1 if cint(accepted) else 0,
        })
    return rows


def _session_from_callback(body):
    session_id = cstr(
        body.get("sessionId") or body.get("session_id") or body.get("consentSessionId")
        or (body.get("data") or {}).get("sessionId")
    ).strip()
    if not session_id:
        frappe.throw(_("Missing sessionId in consent callback."), frappe.ValidationError)

    name = frappe.db.get_value(SESSION_DOCTYPE, {"session_id": session_id}, "name")
    if not name:
        # DoesNotExistError is what makes this a 404; Frappe derives the status from
        # the exception type, so setting it by hand here would be ignored.
        frappe.throw(_("Unknown consent session."), frappe.DoesNotExistError)
    return frappe.get_doc(SESSION_DOCTYPE, name)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def consent_callback():
    """Record a consent completed on the partner portal.

    Called by the portal, not by a browser — authenticated by the shared secret in
    the configured header. Idempotent: a retried callback for a session that has
    already produced a log returns the same result instead of a second log."""
    settings = _settings()
    if not is_external_consent_mode():
        frappe.throw(_("External DPDP consent is not enabled."), frappe.ValidationError)

    _authenticate_callback(settings)

    body = _callback_body()
    session = _session_from_callback(body)
    appl = session.job_applicant

    status = cstr(
        body.get("status") or body.get("consentStatus") or (body.get("data") or {}).get("status")
    ).strip().upper()

    original_ignore = frappe.flags.ignore_permissions
    frappe.flags.ignore_permissions = True
    try:
        session.db_set("callback_payload", frappe.as_json(body), update_modified=False)

        # Idempotent: a retry (or a candidate who already consented through another
        # session) must not create a second log. The answer is read back off the log
        # rather than assumed — a session whose log was refused (COMPLETED, but a
        # mandatory section not accepted) must keep reporting consentGiven false on
        # every retry, or the portal would wave the candidate through on the retry.
        existing = session.consent_log or _submitted_log(appl)
        if existing:
            given = frappe.db.get_value(LOG_DOCTYPE, existing, "consent_given")
            return _callback_response(appl, session, existing, bool(cint(given)))

        if status in DECLINED_STATUSES:
            session.db_set({"status": "Declined", "completed_at": now_datetime()},
                           update_modified=False)
            return _callback_response(appl, session, None, False)
        if status in EXPIRED_STATUSES:
            session.db_set({"status": "Expired", "completed_at": now_datetime()},
                           update_modified=False)
            return _callback_response(appl, session, None, False)
        if status not in COMPLETED_STATUSES:
            # Not a decision yet (PENDING / IN_PROGRESS) — acknowledge and wait.
            return _callback_response(appl, session, None, False)

        log = _record_consent(appl, session, body, status)
        session.db_set(
            {"status": "Completed", "completed_at": now_datetime(), "consent_log": log.name},
            update_modified=False,
        )

        if log.consent_given:
            _resume_onboarding(appl)

        return _callback_response(appl, session, log.name, bool(log.consent_given))
    finally:
        frappe.flags.ignore_permissions = original_ignore


def _record_consent(appl, session, body, status):
    """Write the immutable consent log from the callback payload."""
    log = frappe.new_doc(LOG_DOCTYPE)
    log.job_applicant = appl
    log.consent_source = EXTERNAL_MODE
    log.consent_session = session.name
    log.external_session_id = session.session_id
    log.external_status = status

    # The partner portal owns the wording, so the snapshot fields record where the
    # consent was collected rather than a copy of our own (unused) form content.
    settings = _settings()
    log.form_title = settings.form_title
    log.form_subtitle = settings.form_subtitle

    for row in _normalize_sections(body):
        log.append("consent_responses", row)

    verified = body.get("otpVerified")
    if verified is None:
        verified = body.get("verified", 1 if status in COMPLETED_STATUSES else 0)
    log.otp_verified = 1 if cint(verified) else 0

    log.verified_at = _parse_partner_datetime(
        body.get("verifiedAt") or body.get("completedAt") or body.get("timestamp")
    ) or now_datetime()

    if cint(settings.capture_employee_name):
        log.employee_name = cstr(body.get("customerName") or session.applicant_name)
    if cint(settings.capture_date):
        log.acceptance_date = (log.verified_at or now_datetime()).date()

    log.ip_address = getattr(frappe.local, "request_ip", None)
    try:
        log.user_agent = frappe.get_request_header("User-Agent")
    except Exception:
        pass

    log.insert(ignore_permissions=True)
    if log.consent_given:
        log.submit()
    return log


def _resume_onboarding(appl):
    """Resume the onboarding bootstrap that offer-acceptance deferred.

    Mirrors ``dpdp_consent.submit_dpdp_consent`` exactly — best-effort, so a failure
    here never turns a recorded consent into a failed callback."""
    try:
        from recruitment.api.action_center import _sync_onboarding_action_for_applicant

        candidate_email = frappe.db.get_value("Job Applicant", appl, "email_id")
        if candidate_email:
            _sync_onboarding_action_for_applicant(appl, candidate_email)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "DPDP: resume onboarding after external consent failed"
        )
    finally:
        # Unconditionally, not just on exception: the helper catches its own failures
        # and returns normally, leaving the msgprint it raised ("Job Offer is required
        # ...") queued. The recipient here is a partner server, not a browser, so any
        # queued message would ship as an alarming _server_messages block alongside a
        # success body. The consent is recorded either way; onboarding can be raised by
        # hand from the action center.
        frappe.clear_messages()


def _callback_response(appl, session, consent_log, consent_given):
    frappe.db.commit()
    return {
        "success": True,
        "sessionId": session.session_id,
        "status": session.status,
        "consentGiven": bool(consent_given),
        "consentLog": consent_log,
        "redirectUrl": _return_url(appl, session.session_id, session.status),
    }
