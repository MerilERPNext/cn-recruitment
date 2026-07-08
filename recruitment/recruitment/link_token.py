# Copyright (c) 2026, Hybrowlabs Technologies and contributors
# For license information, please see license.txt

"""Signed tokens for candidate-facing guest links.

Candidates have no login, so guest pages (the offer page, action-center links)
are reached via emailed URLs. Keying those purely off the Job Applicant id let
anyone enumerate the sequential ids and read/act on other candidates' offers.

A token binds the link to a specific (scope, value) pair using an HMAC over the
site secret — unguessable without the key, deterministic so a link can be
regenerated, and verified server-side before any data/action is exposed.

Transition: links already emailed before this shipped carry no token. Set
``recruitment_allow_untokened_links: 1`` in site_config.json to let those legacy
(tokenless) links keep working while HR re-sends; a *wrong* token is always
rejected. Leave it unset (default) to enforce tokens.
"""

import hashlib
import hmac

import frappe
from frappe import _

OFFER_SCOPE = "job_offer"


def _secret():
    # Mirror the candidate-portal auth key resolution (candidate_auth.py).
    key = frappe.conf.get("encryption_key") or frappe.local.site or "recruitment-link"
    return str(key).encode()


def make_token(scope, value):
    """Deterministic HMAC token binding ``scope`` + ``value`` (e.g. the applicant id)."""
    msg = f"{scope}:{value}".encode()
    return hmac.new(_secret(), msg, hashlib.sha256).hexdigest()[:40]


def verify_token(scope, value, token):
    if not token:
        return False
    return hmac.compare_digest(make_token(scope, value), token)


def require_token(scope, value, token):
    """Throw 403 unless the token is valid for (scope, value).

    A missing token is tolerated only under the explicit, admin-set transition
    flag (and only when *no* token was supplied — a forged token never passes).
    """
    if verify_token(scope, value, token):
        return
    if not token and frappe.conf.get("recruitment_allow_untokened_links"):
        return
    frappe.local.response["http_status_code"] = 403
    frappe.throw(_("Invalid or missing access token for this link."), frappe.PermissionError)


def offer_token(job_applicant_id):
    """Token for a candidate's offer link (scope = job_offer, value = applicant id)."""
    return make_token(OFFER_SCOPE, job_applicant_id)


def job_offer_link(job_applicant_id):
    """Full signed offer-page URL — for use in email templates / notifications:

        {{ job_offer_link(doc.job_applicant) }}

    Registered as a Jinja method in hooks.py so any template can build a correct,
    token-carrying link without depending on the send context's variables.
    """
    from frappe.utils import get_url

    return f"{get_url()}/job_offer?appl={job_applicant_id}&token={offer_token(job_applicant_id)}"


# ---------------------------------------------------------------------------
# Campus registration links
# ---------------------------------------------------------------------------
#
# A campus candidate never *chooses* an invite. Each TPO registration email is
# tied to exactly one Campus Invite, so the link simply carries that invite id.
# The candidate clicks -> signup -> signin, and the frontend keeps the invite id
# from the URL and passes it to the campus APIs. No per-candidate token: access is
# gated by the TPO registration itself (is_email_registered_for_invite), so a link
# can never "fail to open" and irritate the candidate.

def campus_registration_link(email, campus_invite):
    """Apply URL for the TPO registration email — carries the invite id (and the
    candidate email) so the frontend picks up the invite from the URL. Use directly:
        {{ campus_registration_link(email_id, campus_invite) }}

    Base URL comes from Campus Settings -> candidate_portal_url when set (the separate
    candidate frontend), otherwise the Frappe site URL; the path defaults to
    /campus-apply and can be aligned with the frontend's actual route there."""
    from urllib.parse import quote
    from frappe.utils import get_url

    try:
        base = frappe.db.get_single_value("Campus Settings", "candidate_portal_url")
    except Exception:
        base = None
    base = (base or get_url()).rstrip("/")
    em = (email or "").strip().lower()
    return f"{base}/campus-apply?campus_invite={quote(campus_invite or '')}&email={quote(em)}"
