"""Alumni Portal and ESS must hold independent sessions in one browser.

Frappe carries its session in a single `sid` cookie per registrable domain, and
both portals run against the same site. An alumni login used to overwrite that
cookie, and an alumni logout used to delete it — signing the ESS user out.

The fix keeps the alumni session out of the cookie jar entirely: the sid is
returned in the login body and sent back as a request parameter, which
`Session.__init__` prefers over the cookie.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment import alumni_portal as ap


class TestPortalSessionIsolation(FrappeTestCase):
    def test_session_cookies_are_never_written_by_the_portal(self):
        """The five cookies Frappe shares between portals must stay untouched."""

        class _Manager:
            def __init__(self):
                self.cookies = {
                    "sid": {"value": "alumni"},
                    "full_name": {"value": "A"},
                    "user_id": {"value": "a@b.c"},
                    "user_image": {"value": "/x.png"},
                    "system_user": {"value": "yes"},
                    "unrelated": {"value": "keep me"},
                }
                self.to_delete = ["sid", "user_id", "something_else"]

        original = getattr(frappe.local, "cookie_manager", None)
        frappe.local.cookie_manager = _Manager()
        try:
            ap._detach_portal_session_cookies()
            mgr = frappe.local.cookie_manager
            for key in ap._SESSION_COOKIES:
                self.assertNotIn(key, mgr.cookies, f"{key} must not be written")
                self.assertNotIn(key, mgr.to_delete, f"{key} must not be deleted")
            # Anything that isn't a session cookie is left alone.
            self.assertIn("unrelated", mgr.cookies)
            self.assertIn("something_else", mgr.to_delete)
        finally:
            frappe.local.cookie_manager = original

    def test_the_five_shared_cookies_are_covered(self):
        """These are exactly what Frappe's clear_cookies() wipes."""
        self.assertEqual(
            set(ap._SESSION_COOKIES),
            {"sid", "full_name", "user_id", "user_image", "system_user"},
        )

    def test_login_response_carries_the_sid(self):
        """The portal needs the sid in the body, since it gets no cookie."""
        original = getattr(frappe.local, "session", None)
        frappe.local.session = frappe._dict({"user": "x@y.z", "sid": "abc123"})
        try:
            self.assertEqual(ap._portal_session_payload(), {"sid": "abc123"})
        finally:
            frappe.local.session = original

    def test_no_sid_is_leaked_for_a_guest(self):
        original = getattr(frappe.local, "session", None)
        frappe.local.session = frappe._dict({"user": "Guest", "sid": "Guest"})
        try:
            self.assertEqual(ap._portal_session_payload(), {})
        finally:
            frappe.local.session = original

    def test_frappe_still_prefers_a_request_sid_over_the_cookie(self):
        """The whole design rests on this precedence in Session.__init__."""
        import inspect

        from frappe.sessions import Session

        src = inspect.getsource(Session.__init__)
        self.assertIn(
            'frappe.form_dict.get("sid")',
            src,
            "Frappe no longer reads sid from the request — portal isolation would break",
        )
