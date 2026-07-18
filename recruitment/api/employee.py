import frappe

# minimum characters before we run a directory search (avoids mass enumeration on 1 char)
MIN_QUERY_LENGTH = 2


@frappe.whitelist()
def search_members(query=None):
    # Authorization: only users allowed to read Employee may search the directory.
    # Without this, any authenticated user (incl. low-privilege / portal users) could
    # enumerate the whole employee directory.
    frappe.has_permission("Employee", "read", throw=True)

    query = (query or "").strip()
    if len(query) < MIN_QUERY_LENGTH:
        return []

    # Neutralise LIKE wildcards in user input so a caller can't pass "%"/"_" to match
    # everything and scrape the directory.
    escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    like = f"%{escaped}%"

    # Search Employees matching query in multiple fields (parameterised -> no SQL injection).
    rows = frappe.db.sql(
        """
        SELECT DISTINCT emp.name, emp.employee_name, emp.designation
        FROM `tabEmployee` emp
        LEFT JOIN `tabEmployee Skill Map` esm ON emp.name = esm.employee
        LEFT JOIN `tabEmployee Skill` esk ON esk.parent = esm.name
        WHERE emp.employee_name LIKE %(query)s
           OR emp.designation LIKE %(query)s
           OR emp.department LIKE %(query)s
           OR emp.branch LIKE %(query)s
           OR esk.skill LIKE %(query)s
        ORDER BY emp.employee_name ASC
        LIMIT 20
        """,
        {"query": like},
        as_dict=True,
    )
    if not rows:
        return []

    # Raw SQL bypasses Frappe's permission layer, so re-check record-level access:
    # return only employees the caller is actually permitted to read.
    permitted = set(
        frappe.get_list(
            "Employee",
            filters={"name": ["in", [r["name"] for r in rows]]},
            pluck="name",
        )
    )
    return [r for r in rows if r["name"] in permitted]
