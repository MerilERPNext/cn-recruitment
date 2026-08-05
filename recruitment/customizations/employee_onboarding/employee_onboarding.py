import frappe

from recruitment.auto_fetch_fields import make_employee as _make_employee


@frappe.whitelist()
def make_employee(source_name, target_doc=None):
    """HRMS's Employee Onboarding -> Employee mapper, redirected here by
    ``hooks.override_whitelisted_methods``.

    Delegates to the single implementation in ``recruitment.auto_fetch_fields``,
    which is also what the form's "Create Employee" button calls. The two used to
    be separate copies that had drifted: this one read the legacy
    ``mapping_fields`` table while the button read ``recruitment_tool``, so which
    button you pressed decided whether the configured mapping applied at all.
    """
    return _make_employee(source_name, target_doc)
