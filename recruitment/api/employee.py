import frappe

@frappe.whitelist()
def search_members(query=None):
    if not query:
        return []

    # Search Employees matching query in multiple fields
    employees = frappe.db.sql("""
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
    """, { "query": f"%{query}%" }, as_dict=True)

    return employees
