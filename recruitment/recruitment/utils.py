from contextlib import contextmanager

import frappe


# add check _app_permission
def check_app_permission():
    # allow if user has Employee Self Service Role
    user_roles = frappe.get_roles()
    if "Employee Self Service" in user_roles:
        return True
    return False


@contextmanager
def as_administrator():
    """Run a block as Administrator, leaving the caller's own session intact.

    `frappe.set_user` is not a sudo primitive. Besides the user it overwrites
    `frappe.session.sid` with the username and empties `frappe.session.data`,
    and calling it a second time to "restore" only puts the user back — the sid
    and the session payload stay clobbered. At the end of the request frappe
    writes that gutted payload into the session cache under the caller's real
    sid (`frappe.sessions.Session.update`), so the cached session loses its
    `user`; the next request cannot resume it and the caller is signed out.
    A logged-in admin merely *calling* such an endpoint gets logged out.

    Everything `set_user` overwrites is therefore captured here and put back,
    the session dict included, so elevation cannot outlive the block.
    """
    session = frappe.local.session
    saved = {key: session.get(key) for key in ("user", "sid", "data")}
    saved_form_dict = frappe.local.form_dict

    frappe.set_user("Administrator")
    try:
        yield
    finally:
        frappe.set_user(saved["user"])
        # `set_user` mutates this dict rather than replacing it, so writing the
        # saved keys straight back restores sid and data as well.
        session.update(saved)
        frappe.local.form_dict = saved_form_dict
