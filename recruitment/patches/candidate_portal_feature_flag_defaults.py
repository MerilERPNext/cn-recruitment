import frappe


DEFAULT_FEATURE_FLAGS = (
    ("Open Jobs", 1),
    ("My Jobs", 1),
    ("Action Center", 1),
    ("Documents", 0),
    ("Candidate Dashboard", 1),
)


def execute():
    if not frappe.db.exists("DocType", "Candidate Portal Feature Flag"):
        return

    doc = frappe.get_single("Candidate Portal Feature Flag")
    existing_pages = {
        row.page_name.strip().lower()
        for row in doc.feature_flags
        if row.page_name
    }

    changed = False
    for page_name, is_enabled in DEFAULT_FEATURE_FLAGS:
        if page_name.lower() in existing_pages:
            continue

        doc.append(
            "feature_flags",
            {
                "page_name": page_name,
                "is_enabled": is_enabled,
            },
        )
        changed = True

    if changed:
        doc.save(ignore_permissions=True)
