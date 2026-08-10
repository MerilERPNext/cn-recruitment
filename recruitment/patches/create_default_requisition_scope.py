"""Create the built-in "Default - System Managers" Raise Requisition Scope.

Raising a Job Requisition is deny-by-default: a user may raise only if some
Raise Requisition Scope record admits them. Before this patch a site with no
records let *everyone* raise; now it would let *no one*. This record is what
keeps administrators from being locked out — role System Manager, no scope bases
ticked, so System Managers may raise for all companies, departments and
designations. Every other population needs its own record.

One-time: the record is protected from deletion by
`RaiseRequisitionScope.on_trash`, so it does not need re-asserting on every
migrate. Still written idempotently — a patch that has already run must be
harmless if it is ever re-run by hand.

Fresh installs do not come through here: `frappe.installer.install_app` defaults
to `set_as_patched=True`, which logs every patch as completed without executing
it. `install.after_install` seeds the record for those sites instead.
"""

import frappe

from recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope import (
	DEFAULT_SCOPE_NAME,
	ensure_default_scope,
)


def execute():
	ensure_default_scope()

	if not frappe.db.exists("Raise Requisition Scope", DEFAULT_SCOPE_NAME):
		# Nothing else in the app can create it, and without it only
		# Administrator can raise a requisition — worth a loud log line rather
		# than a silent lockout discovered by a user.
		frappe.logger("recruitment").error(
			"create_default_requisition_scope: %s was not created; "
			"raising requisitions is now restricted to Administrator until a "
			"Raise Requisition Scope record exists." % DEFAULT_SCOPE_NAME
		)
