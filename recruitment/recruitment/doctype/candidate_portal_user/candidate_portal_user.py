import frappe
from frappe.model.document import Document


class CandidatePortalUser(Document):
    # Doctypes that hang off this portal user via their `candidate` Link.
    # Candidate Portal Session can be multiple per user, and Candidate Portal OTP
    # Log accumulates over time — both must go when the user is deleted.
    _CASCADE_CHILD_DOCTYPES = ("Candidate Portal OTP Log", "Candidate Portal Session")

    def on_trash(self):
        """Cascade-delete every OTP Log and Session tied to this portal user so the
        whole chain clears in one go.

        Runs in `on_trash`, which Frappe executes BEFORE the link-existence check
        on this user — so once the children are gone the user itself deletes
        without a "linked with" error. Children are removed with force=True, which
        skips their own link checks, so the Session referenced by this user's
        `last_session` field doesn't block its own deletion either."""
        for child_doctype in self._CASCADE_CHILD_DOCTYPES:
            names = frappe.get_all(
                child_doctype, filters={"candidate": self.name}, pluck="name"
            )
            for name in names:
                frappe.delete_doc(
                    child_doctype,
                    name,
                    force=True,
                    ignore_permissions=True,
                    delete_permanently=True,
                )
