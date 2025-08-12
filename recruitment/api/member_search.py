import frappe
import typing

@frappe.whitelist()
def search_members(filters: dict = {}, fields: list = ["name"], pageStart: int = 0, pageSize: int = 13, searchTerm: str = "", searchFields: list = ["name"]) -> typing.List[typing.Dict]:
    or_filters = []
    for field in searchFields:
        or_filters.append([field, "like", f"%{searchTerm}%"])
    filters["or"] = or_filters
    return frappe.db.get_all("Employee", filters=filters, fields=fields, limit_start=pageStart, limit_page_length=pageSize)