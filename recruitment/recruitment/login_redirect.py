"""Land signed-in employees on the Employee Self Service portal (``/webapp``)
instead of the Desk.

Who this applies to
-------------------
A signed-in desk user holding the ``Employee`` role -- the portal is Employee
Self Service, so someone with no employee identity has no reason to land there.
Everyone else (Website Users, external recruiters, admin-only accounts) keeps
frappe's own choice. See :func:`landing_route` for the full order of checks.

Why this needs patches rather than a hook
-----------------------------------------
``hooks.py`` already declares::

    role_home_page = {"System User": "/webapp"}

That hook is live, but only for the website root: ``/`` resolves through
``frappe.website.path_resolver.resolve_path`` -> ``get_home_page()`` ->
``get_home_page_via_hooks()``, which is the only reader of ``role_home_page``.

The post-login redirect never reaches it. ``LoginManager.set_user_info``
(frappe/auth.py) calls ``get_home_page()`` on the *Website User* branch alone;
for everyone else it hardcodes the Desk::

    default_workspace = self.info.default_workspace
    if default_workspace:
        frappe.local.response["home_page"] = "/app/" + slug(default_workspace)
    else:
        frappe.local.response["home_page"] = get_default_path() or "/app"

So no hook can move a System User's landing page after login, and the places
that decide where a fresh session goes have to be wrapped instead. There are
three:

* ``LoginManager.set_user_info`` -- the username/password and
  ``/api/method/login`` flow; ``login.js`` navigates to the ``home_page`` key of
  the response. Wrapping here rather than ``frappe.apps.get_default_path``
  (which it calls) is what also covers the ``default_workspace`` short-circuit
  above -- a user with a default workspace never reaches ``get_default_path``.
* ``frappe.utils.oauth.redirect_post_login`` -- social / SSO logins, which
  issue their own HTTP redirect and ignore ``response["home_page"]`` entirely.
* ``/login`` opened by a session that is *already* signed in -- handled by the
  ``before_request`` hook :func:`redirect_signed_in_login_page`, because
  frappe's own ``www/login.py`` sends those to ``get_default_path() or "/app"``.

Why this installs at import time
--------------------------------
``frappe.app.init_request`` builds ``HTTPRequest()`` -- which runs the entire
login, ``set_user_info`` included -- *before* it runs the ``before_request``
hooks. Installing the ``set_user_info`` wrapper from a ``before_request`` entry
(the way this app installs its other patches) would therefore miss the very
login it exists to redirect, once per freshly started worker. :func:`install`
is called from ``recruitment/__init__.py`` so the wrapper is in place before
any request is served.

Turning it off
--------------
Website Settings -> Landing Page -> "Redirect employees to Employee Self Service
after login". The field is created, and ticked, by
``recruitment.recruitment.install.ensure_webapp_login_redirect_field`` on
migrate; until it exists every entry point here is a no-op, so merely
installing this app never changes login behaviour.

Deliberately left alone
-----------------------
* Desk users without the ``Employee`` role -- see :data:`LANDING_ROLE`.
* Website Users -- not desk users, and frappe already routes them through
  ``get_home_page()``.
* A ``?redirect-to=`` deep link -- ``login.js`` already gives that precedence
  over ``home_page``, and :func:`redirect_signed_in_login_page` stands down for
  it too, so a link into a specific page still works.
* Roles named in ``role_home_page`` other than ``System User`` -- see
  :func:`_role_home_page_route`.
* Users nextai's App Launcher Visibility would bounce off ``/webapp`` -- see
  :func:`_launcher_bans_portal`.
"""

import functools
import sys

import frappe
from werkzeug.routing import RequestRedirect

#: Where a signed-in employee lands. Served by ``recruitment/www/webapp.py``.
LANDING_ROUTE = "/webapp"

#: The role that earns the redirect. ``/webapp`` is Employee Self Service, so
#: only a user who is an employee is sent there; a desk user without it (a pure
#: admin, a vendor account) keeps the Desk. Set to ``None`` to redirect every
#: System User instead.
LANDING_ROLE = "Employee"

#: Installed app name, as ``add_to_apps_screen`` and App Launcher Visibility
#: both know it.
APP_NAME = "recruitment"

#: The Website Settings checkbox that gates everything in this module.
SETTING_FIELD = "custom_redirect_to_webapp_after_login"

#: Modules that bind ``redirect_post_login`` with ``from ... import`` and so
#: hold their own reference to the unwrapped function.
_OAUTH_IMPORTERS = ("frappe.utils.oauth", "frappe.www.login")

_WRAPPED_FLAG = "_webapp_login_redirect_wrapped"


def install():
    """Wrap the login redirect sites.

    Idempotent: a second call is a no-op, so it is safe to run from
    ``recruitment/__init__.py`` on every worker import.
    """
    _wrap_set_user_info()
    _wrap_redirect_post_login()


# --- where should this session land? ---------------------------------------


def landing_route(user_type=None):
    """The route the current session should land on, or ``None`` to leave
    frappe's own choice alone.

    ``user_type`` lets a caller that already has it (``set_user_info`` holds
    ``self.info``) skip the lookup in :func:`_is_website_user`.
    """
    user = getattr(frappe.session, "user", None)
    if not user or user == "Guest":
        return None

    if not frappe.get_website_settings(SETTING_FIELD):
        return None

    if _is_website_user(user, user_type):
        return None

    if not _has_landing_role(user):
        return None

    if _role_home_page_route():
        return None

    if _launcher_bans_portal(user):
        return None

    return LANDING_ROUTE


def _is_website_user(user, user_type=None):
    """Website Users keep frappe's own portal routing.

    Falls back to the session and then the User record, because the OAuth flow
    reaches ``redirect_post_login`` without a ``user_type`` in hand.
    """
    if not user_type:
        user_type = (getattr(frappe.session, "data", None) or {}).get("user_type")
    if not user_type:
        user_type = frappe.db.get_value("User", user, "user_type")

    return user_type == "Website User"


def _has_landing_role(user):
    """Whether this session holds :data:`LANDING_ROLE`.

    ``/webapp`` is *Employee* Self Service -- it opens on the signed-in user's
    own employee record -- so a desk user who is not an employee is left on the
    Desk rather than sent to a portal with nothing in it for them.

    Administrator is excluded outright: ``frappe.permissions.get_roles`` hands it
    every role on the site, so asking by role would always say yes. It is the
    account used to fix a broken site, and it should land on the Desk.
    """
    if not LANDING_ROLE:
        return True

    if user == "Administrator":
        return False

    return LANDING_ROLE in frappe.get_roles()


def _role_home_page_route():
    """A ``role_home_page`` entry for a role more specific than "System User".

    ``hooks.py`` deliberately sends External Recruiters to their scoped Job
    Opening list, and that outranks the blanket portal redirect: an external
    recruiter has no business landing in an internal Employee Self Service
    portal. Read the same way ``frappe.website.utils.get_home_page_via_hooks``
    reads it, so the login redirect and the website root stay in step.

    Delete this check, and its call in :func:`landing_route`, to make the
    redirect unconditional for every System User.
    """
    hook = frappe.get_hooks("role_home_page") or {}
    if not hook:
        return None

    roles = set(frappe.get_roles())
    for role, routes in hook.items():
        if role == "System User" or role not in roles:
            continue
        if routes:
            return routes[-1]

    return None


def _launcher_bans_portal(user):
    """Whether nextai's App Launcher Visibility guard would bounce this user
    off ``/webapp``.

    ``nextai.chatnext.app_launcher.enforce_app_route_permission`` is a
    ``before_request`` hook that redirects a request for a hidden app's route to
    ``/app-access-denied``. Forcing such a user onto ``/webapp`` would land them
    on that page the instant they signed in, so the redirect stands down and
    frappe's Desk default applies instead.

    Mirrors the guard's own exemptions -- Administrator and System Manager are
    never blocked -- and treats nextai being absent as "no guard".
    """
    if user == "Administrator":
        return False

    try:
        from nextai.chatnext.app_launcher import hidden_apps
    except Exception:
        return False

    if "System Manager" in frappe.get_roles():
        return False

    return APP_NAME in hidden_apps()


# --- patches ---------------------------------------------------------------


def _wrap_set_user_info():
    """Force ``response["home_page"]`` after frappe has picked the Desk.

    Wrapping rather than replacing keeps everything else ``set_user_info`` does
    -- the cookies, ``full_name``, the ``redirect_after_login`` cache -- intact.
    """
    from frappe.auth import LoginManager

    orig = LoginManager.set_user_info
    if getattr(orig, _WRAPPED_FLAG, False):
        return

    @functools.wraps(orig)
    def set_user_info(self, resume=False):
        orig(self, resume=resume)

        # A resumed session is not a login, and frappe writes no home_page for
        # one. /login reached by such a session is handled by the
        # before_request hook below instead.
        if resume:
            return

        try:
            route = landing_route(user_type=(self.info or {}).get("user_type"))
        except Exception:
            # Never let the landing page decide whether someone can log in.
            frappe.log_error(title="Webapp login redirect failed")
            return

        if route:
            frappe.local.response["home_page"] = route

    setattr(set_user_info, _WRAPPED_FLAG, True)
    LoginManager.set_user_info = set_user_info


def _wrap_redirect_post_login():
    """Cover social / SSO logins.

    ``frappe.utils.oauth.login_oauth_user`` finishes with
    ``redirect_post_login``, which builds its own ``response["location"]`` and
    never looks at the ``home_page`` set above. When the OAuth state carries no
    explicit ``redirect_to``, substitute the portal.
    """
    import frappe.utils.oauth as oauth_module

    orig = oauth_module.redirect_post_login
    if getattr(orig, _WRAPPED_FLAG, False):
        return

    @functools.wraps(orig)
    def redirect_post_login(desk_user, redirect_to=None, provider=None):
        if desk_user and not redirect_to:
            try:
                route = landing_route()
            except Exception:
                frappe.log_error(title="Webapp login redirect failed (oauth)")
                route = None

            if route:
                # The unwrapped function builds an absolute URL for its own
                # default, so match that rather than emit a bare path.
                from frappe.utils import get_url

                redirect_to = get_url(route)

        return orig(desk_user, redirect_to=redirect_to, provider=provider)

    setattr(redirect_post_login, _WRAPPED_FLAG, True)
    _repoint("redirect_post_login", orig, redirect_post_login, _OAUTH_IMPORTERS)


def _repoint(attr, orig, new, modules):
    """Point ``module.attr`` at ``new`` wherever it still holds ``orig``.

    ``from frappe.utils.oauth import redirect_post_login`` copies the function
    object into the importing module's namespace, so setting the attribute on
    the defining module alone would leave those call sites unwrapped. A module
    not yet imported needs nothing -- its own import picks up the wrapper.
    """
    for name in modules:
        module = sys.modules.get(name)
        if module is not None and getattr(module, attr, None) is orig:
            setattr(module, attr, new)


# --- before_request --------------------------------------------------------


class _TemporaryRedirect(RequestRedirect):
    """``RequestRedirect``, but 302 instead of werkzeug's permanent 308.

    A 308 is cacheable, and this one is issued from ``/login``: a browser that
    cached it would keep bouncing off the login page long after the user signed
    out. The destination is a bare path rather than the absolute URL werkzeug's
    docstring describes -- a relative Location is valid (RFC 7231) and survives
    proxies that rewrite the host.
    """

    code = 302


def redirect_signed_in_login_page():
    """``before_request``: send an already-signed-in System User who opens
    ``/login`` to the portal.

    Frappe's ``www/login.py`` redirects such a request to
    ``get_default_path() or "/app"`` -- the Desk. This gets in first. It cannot
    be folded into the ``set_user_info`` wrapper because no login happens here:
    the session is resumed, and a resume writes no ``home_page``.

    Only ``/login`` itself is matched. The credential POST goes to
    ``/api/method/login`` and is untouched.
    """
    request = getattr(frappe.local, "request", None)
    if request is None:
        return

    if (request.path or "").rstrip("/") != "/login":
        return

    # An explicit deep link wins, exactly as it does in login.js.
    if request.args.get("redirect-to"):
        return

    try:
        route = landing_route()
    except Exception:
        frappe.log_error(title="Webapp login redirect failed (/login)")
        return

    if not route:
        return

    # frappe.app.application answers a raised HTTPException with the exception
    # itself, so werkzeug renders the redirect for us.
    raise _TemporaryRedirect(route)
