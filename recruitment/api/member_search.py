import frappe
import typing

@frappe.whitelist()
def search_members(filters: dict = {}, fields: list = ["name"], pageStart: int = 0, pageSize: int = 13, searchTerm: str = "", searchFields: list = ["name"]) -> typing.List[typing.Dict]:
    # Was an open Employee-data read for any logged-in user (caller controls
    # fields + filters via a non-permission-aware db.get_all). Require Employee read.
    frappe.has_permission("Employee", "read", throw=True)
    or_filters = []
    if searchTerm:
        for field in searchFields:
            or_filters.append([field, "like", f"%{searchTerm}%"])
    # OR conditions must go through get_all's dedicated `or_filters` param. Injecting them as
    # filters["or"] makes the query builder treat "or" as a fieldname and raise IndexError.
    return frappe.get_list(
        "Employee",
        filters=filters,
        or_filters=or_filters or None,
        fields=fields,
        limit_start=pageStart,
        limit_page_length=pageSize,
    )