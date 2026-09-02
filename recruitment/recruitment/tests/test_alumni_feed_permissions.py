"""Unit tests for the Alumni Portal feed permission model.

Covers the three switchable actions (comment / reaction / save), the blanket
refusal of post creation for alumni, and — most importantly — that none of it
leaks into ESS.

Run:  bench --site <site> run-tests --app recruitment \
        --module recruitment.recruitment.tests.test_alumni_feed_permissions
"""

from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from recruitment.recruitment import alumni_guard as g
from recruitment.recruitment import alumni_portal as ap

ALUMNI = "feedperm.alumni@test.local"
ESS = "feedperm.ess@test.local"

SETTINGS = "Alumni Portal Settings"
FLAGS = ("allow_alumni_comment", "allow_alumni_reaction", "allow_alumni_save")

MESSAGES = {
    "comment": "Commenting is currently disabled for alumni users.",
    "reaction": "Reactions are currently disabled for alumni users.",
    "save": "Saving posts is currently disabled for alumni users.",
}


def _make_user(email: str, is_alumni: bool) -> str:
    if frappe.db.exists("User", email):
        frappe.delete_doc("User", email, force=True, ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": "FeedPerm",
            "enabled": 1,
            "send_welcome_email": 0,
            "custom_is_alumni_employee": 1 if is_alumni else 0,
        }
    ).insert(ignore_permissions=True)
    return email


def _set(flag: str, value) -> None:
    frappe.db.set_single_value(SETTINGS, flag, value)
    frappe.clear_document_cache(SETTINGS, SETTINGS)


class TestAlumniFeedPermissions(FrappeTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        _make_user(ALUMNI, True)
        _make_user(ESS, False)
        frappe.db.commit()

    def setUp(self):
        for flag in FLAGS:
            _set(flag, 1)
        frappe.local._alumni_user_cache = {}

    def tearDown(self):
        frappe.set_user("Administrator")
        for flag in FLAGS:
            _set(flag, 1)
        frappe.local._alumni_user_cache = {}

    def _as(self, user: str):
        frappe.set_user(user)
        frappe.local._alumni_user_cache = {}

    # ── the gate, for alumni ──
    def test_actions_allowed_when_switched_on(self):
        self._as(ALUMNI)
        for action in ("comment", "reaction", "save"):
            allowed, message = ap.alumni_action_allowed(action)
            self.assertTrue(allowed, f"{action} should be allowed when its flag is 1")
            self.assertEqual(message, "")

    def test_each_action_denied_with_its_exact_message(self):
        """Each flag gates only its own action, and the copy is verbatim."""
        for action, flag in zip(("comment", "reaction", "save"), FLAGS):
            with self.subTest(action=action):
                _set(flag, 0)
                self._as(ALUMNI)

                allowed, message = ap.alumni_action_allowed(action)
                self.assertFalse(allowed)
                self.assertEqual(message, MESSAGES[action])

                # The other two stay open — no collateral denial.
                for other in set(MESSAGES) - {action}:
                    self.assertTrue(
                        ap.alumni_action_allowed(other)[0],
                        f"{other} must be unaffected by {flag}",
                    )
                _set(flag, 1)

    def test_unset_setting_is_permissive(self):
        """A Single that was never saved reads None, which must NOT deny.

        Guards the regression where cint(None) == 0 switched the whole feed off
        on a fresh install, despite every flag defaulting to 1.
        """
        frappe.db.sql(
            "delete from tabSingles where doctype=%s and field in %s",
            (SETTINGS, FLAGS),
        )
        frappe.clear_document_cache(SETTINGS, SETTINGS)
        self._as(ALUMNI)

        for action in ("comment", "reaction", "save"):
            self.assertTrue(
                ap.alumni_action_allowed(action)[0],
                f"{action} must stay allowed when the setting was never configured",
            )

    def test_unknown_action_is_refused(self):
        self._as(ALUMNI)
        self.assertFalse(ap.alumni_action_allowed("teleport")[0])

    # ── ESS must never be touched ──
    def test_non_alumni_allowed_regardless_of_settings(self):
        """The gate is alumni-only: ESS passes even with every flag off."""
        for flag in FLAGS:
            _set(flag, 0)
        self._as(ESS)

        for action in ("comment", "reaction", "save"):
            allowed, message = ap.alumni_action_allowed(action)
            self.assertTrue(allowed, f"ESS must keep {action} with the flag off")
            self.assertEqual(message, "")

    def test_guard_still_ignores_ess_entirely(self):
        self._as(ESS)
        self.assertFalse(g.is_alumni_user())

    # ── post creation ──
    def test_direct_create_post_not_reachable_by_alumni(self):
        """The Work Connect method must stay off the allowlist.

        If it were listed, the wrapper's refusal could be sidestepped in one
        call, so this is the load-bearing half of "alumni cannot post".
        """
        self.assertFalse(
            g._is_allowed_for_alumni(
                "method", "chatnext_work_connect.chatnext_work_connect.api.post.create_post"
            )
        )

    def test_wrapper_refuses_post_creation(self):
        self._as(ALUMNI)
        with self.assertRaises(frappe.PermissionError) as caught:
            ap.create_alumni_post(data={"post_type": "Text", "content": "hello"})
        self.assertIn("You do not have permission to create posts.", str(caught.exception))

    # ── allowlist shape ──
    def test_gated_methods_removed_from_allowlist(self):
        """The direct methods must be gone, or the wrappers are pointless."""
        wc = "chatnext_work_connect.chatnext_work_connect.api."
        for method in (
            "comment.add_comment",
            "comment.update_comment",
            "comment.delete_comment",
            "reaction.add_reaction",
            "reaction.remove_reaction",
            "saved_post.save_post",
            "saved_post.unsave_post",
            "follow.get_follow_suggestions",
        ):
            self.assertFalse(
                g._is_allowed_for_alumni("method", wc + method),
                f"{method} must not be directly reachable",
            )

    def test_award_winner_apis_removed(self):
        wc = "chatnext_work_connect.chatnext_work_connect.api.recognition_points."
        for method in ("get_top_winners", "get_award_winners", "get_award_winner_list"):
            self.assertFalse(g._is_allowed_for_alumni("method", wc + method))

    def test_reads_stay_reachable(self):
        """Gating the writes must not take the reads with them."""
        wc = "chatnext_work_connect.chatnext_work_connect.api."
        for method in (
            "comment.get_comments",
            "reaction.get_reactions",
            "saved_post.get_saved_posts",
            "saved_post.is_post_saved",
            "post.get_feed",
        ):
            self.assertTrue(
                g._is_allowed_for_alumni("method", wc + method),
                f"{method} must remain readable",
            )

    def test_wrappers_reachable_via_namespace(self):
        """The wrappers need no allowlist entry — the namespace covers them."""
        for method in (
            "add_alumni_comment",
            "update_alumni_comment",
            "delete_alumni_comment",
            "add_alumni_reaction",
            "remove_alumni_reaction",
            "save_alumni_post",
            "unsave_alumni_post",
            "get_alumni_follow_suggestions",
            "get_alumni_feed_permissions",
        ):
            self.assertTrue(
                g._is_allowed_for_alumni(
                    "method", f"recruitment.recruitment.alumni_portal.{method}"
                ),
                f"{method} must be reachable",
            )

    # ── permissions endpoint ──
    def test_permissions_endpoint_shape(self):
        self._as(ALUMNI)
        result = ap.get_alumni_feed_permissions()

        self.assertTrue(result["success"])
        self.assertEqual(
            set(result["permissions"]),
            {"can_create_post", "can_comment", "can_react", "can_save"},
        )
        self.assertFalse(result["permissions"]["can_create_post"])
        self.assertTrue(result["permissions"]["can_comment"])

    def test_permissions_endpoint_reflects_settings(self):
        _set("allow_alumni_reaction", 0)
        self._as(ALUMNI)

        perms = ap.get_alumni_feed_permissions()["permissions"]
        self.assertFalse(perms["can_react"])
        self.assertTrue(perms["can_comment"])
        self.assertTrue(perms["can_save"])
        self.assertFalse(perms["can_create_post"])
