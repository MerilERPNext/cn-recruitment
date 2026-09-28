"""Land signed-in employees on the Employee Self Service portal (``/webapp``)
instead of the Desk.

Who this applies to
-------------------
A signed-in desk user holding the ``Employee`` role -- the portal is Employee
Self Service, so someone with no employee identity has no reason to land there.
Everyone else (Website Users, external recruiters, admin-only accounts) keeps
frappe's own choice. See :func:`landing_route` for the full order of checks.

Why this needs code rather than a hook
--------------------------------------
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

So no hook can move a desk user's landing page after login. Everything here
hangs off one ``before_request`` entry point, :func:`on_before_request`, which
covers the three ways a session is handed a destination:

* **The credential and ``/api/method/login`` flow.** The login runs inside
  ``HTTPRequest()``, which ``frappe.app.init_request`` builds *before* it runs
  the ``before_request`` hooks -- so by the time this module gets control the
  login has already happened and written ``response["home_page"]``.
  :func:`_override_login_response` rewrites that value, which is still sitting
  in ``frappe.local.response`` and does not reach the client until
  ``build_response`` runs at the end of the request; ``handler.handle`` skips
  ``execute_cmd`` for ``cmd == "login"``, so nothing in between touches it.
  Rewriting the response also covers the ``default_workspace`` short-circuit
  above, which never consults ``get_default_path``.
* **Social / SSO and email-link logins**, which sign the user in later in the
  same request, inside the handler, and then issue their own HTTP redirect
  without looking at ``response["home_page"]``. Those need
  ``frappe.utils.oauth.redirect_post_login`` wrapped, and
  :func:`_install_oauth_wrapper` does it from here -- ``before_request`` still
  runs ahead of the handler, so the wrapper is always in place in time.
* **``/login`` opened by a session that is already signed in**, which frappe's
  own ``www/login.py`` sends to ``get_default_path() or "/app"``.
  :func:`_redirect_signed_in_login_page` gets in first.

Why not patch ``LoginManager.set_user_info``
--------------------------------------------
An earlier version of this module wrapped it, installed from
``recruitment/__init__.py`` so the wrapper would be in place before the first
login. That does not work: **nothing imports the ``recruitment`` package before
``HTTPRequest()`` runs.** ``frappe.get_hooks`` serves ``hooks.py`` out of the
Redis cache without importing the app at all, so on a warm cache the package is
first imported as a side effect of resolving a ``before_request`` hook -- that
is, *after* the login it was supposed to redirect. The observable result was a
redirect that silently did nothing on a freshly started worker and started
working once that worker had served one request. Rewriting the response needs
no patch and no import timing at all.

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
  over ``home_page``, and :func:`_redirect_signed_in_login_page` stands down for
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


def on_before_request():
    """``before_request`` hook -- the only entry point into this module.

    Order matters: the OAuth wrapper goes in first because the handler that
    would use it runs later in this same request; then the response rewrite for
    a credential login that has *already* happened inside ``HTTPRequest()``;
    then the ``/login`` redirect, which signals by raising.
    """
    try:
        _install_oauth_wrapper()
        _override_login_response()
    except Exception:
        # A landing page is never worth failing a login over.
        _log_failure("Webapp login redirect failed")

    # Deliberately outside the guard above: this one reports success by raising
    # a redirect, which must not be swallowed as an error.
    _redirect_signed_in_login_page()


def _log_failure(title):
    """Never let logging a failure become the failure.

    This runs inside the login request, where an Error Log insert of its own can
    fail; an exception escaping here would turn a cosmetic problem into a user
    who cannot sign in.
    """
    try:
        frappe.log_error(title=title)
    except Exception:
        pass


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


# --- the credential / API login ---------------------------------------------


def _override_login_response():
    """Rewrite the ``home_page`` that a just-completed login wrote.

    ``response["message"] == "Logged In"`` is set by ``set_user_info`` only for a
    non-Website-User login that is not a session resume, so it identifies
    exactly the case worth acting on -- an ordinary authenticated request leaves
    ``message`` unset. The value is still server-side at this point (``login.js``
    reads it from the JSON built at the end of the request), so replacing it is
    indistinguishable from frappe having chosen the portal itself.
    """
    response = getattr(frappe.local, "response", None)
    if not response or response.get("message") != "Logged In":
        return

    route = landing_route()
    if route:
        response["home_page"] = route


# --- social / SSO logins ----------------------------------------------------


def _install_oauth_wrapper():
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
                _log_failure("Webapp login redirect failed (oauth)")
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


def _redirect_signed_in_login_page():
    """Send an already-signed-in user who opens ``/login`` to the portal.

    Frappe's ``www/login.py`` redirects such a request to
    ``get_default_path() or "/app"`` -- the Desk. This gets in first. It is
    separate from :func:`_override_login_response` because no login happens
    here: the session is resumed, and a resume writes no ``home_page``.

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
        _log_failure("Webapp login redirect failed (/login)")
        return

    if not route:
        return

    # frappe.app.application answers a raised HTTPException with the exception
    # itself, so werkzeug renders the redirect for us.
    raise _TemporaryRedirect(route)
