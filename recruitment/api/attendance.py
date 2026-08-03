import json

import frappe


@frappe.whitelist()
def get_attendance_list(filters=None, order_by=None, limit_page_length=0):
    """Return Attendance records (all fields) enriched with department_name and shift_name.

    Mirrors the shape of `/api/resource/Attendance?fields=["*"]`, but additionally
    resolves the human-readable department/shift labels via a single extra query
    instead of requiring dedicated custom fields on the Attendance doctype.
    """
    frappe.has_permission("Attendance", "read", throw=True)

    if isinstance(filters, str):
        filters = json.loads(filters) if filters else None

    records = frappe.get_all(
        "Attendance",
        filters=filters,
        fields=["*"],
        order_by=order_by or "creation desc",
        limit_page_length=limit_page_length or 0,
    )

    departments = {r.department for r in records if r.get("department")}
    shifts = {r.shift for r in records if r.get("shift")}

    department_names = (
        frappe._dict(
            frappe.get_all(
                "Department",
                filters={"name": ["in", list(departments)]},
                fields=["name", "department_name"],
                as_list=True,
            )
        )
        if departments
        else {}
    )
    shift_names = (
        frappe._dict(
            frappe.get_all(
                "Shift Type",
                filters={"name": ["in", list(shifts)]},
                fields=["name", "custom_shift_name"],
                as_list=True,
            )
        )
        if shifts
        else {}
    )

    for record in records:
        record["department_name"] = department_names.get(record.get("department")) or record.get("department")
        record["shift_name"] = shift_names.get(record.get("shift")) or record.get("shift")

    return records
