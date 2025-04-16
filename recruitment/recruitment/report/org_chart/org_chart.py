# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
    columns = get_columns()
    data = []

    employees = frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "reports_to"],
    )

    emp_map = {e["name"]: e for e in employees}
    tree = build_tree(emp_map)
    data = flatten_tree(tree)

    return columns, data

def get_columns():
    return [{"label": f"Level {i}", "fieldname": f"level_{i}", "fieldtype": "Link", "options": "Employee", "width": 200} for i in range(1, 10)]


def build_tree(emp_map):
    children = {}
    roots = []

    for emp_id, emp in emp_map.items():
        parent = emp["reports_to"]
        if parent:
            children.setdefault(parent, []).append(emp)
        else:
            roots.append(emp)

    return {"roots": roots, "children": children}

def flatten_tree(tree, max_depth=10):
    result = []

    def walk(node, path, level=0):
        new_path = path + [f'{node["name"]} - {node["employee_name"]}']
        row = {f"level_{i+1}": new_path[i] for i in range(len(new_path))}
        row["indent"] = level
        result.append(row)

        for child in tree["children"].get(node["name"], []):
            walk(child, new_path, level + 1)

    for root in tree["roots"]:
        walk(root, [])

    # ↓↓↓ Clean repeated display values but retain indent
    cleaned_result = []
    previous_row = {}
    for row in result:
        clean_row = {}
        for key, val in row.items():
            if key == "indent":
                clean_row[key] = val
            else:
                clean_row[key] = val if previous_row.get(key) != val else ""
        cleaned_result.append(clean_row)
        previous_row = row.copy()

    return cleaned_result
