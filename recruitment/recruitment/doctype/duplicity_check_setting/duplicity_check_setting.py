# Copyright (c) 2025, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class DuplicityCheckSetting(Document):
    pass
    
@frappe.whitelist()
def get_available_company(doctype, txt, searchfield, start, page_len, filters):
	filters = frappe._dict(filters or {})
	docname = filters.get("docname")

	occupied_companies = []
	filters = {"parenttype": "Duplicity Check Setting"}

	if docname:
		filters["parent"] = ["!=", docname]
     
	company_list = frappe.get_all(
		"Company List",
		filters=filters,
		fields=["company"]
	)

	for row in company_list:
		if row.company:
			occupied_companies.append(row.company)

	occupied_companies = list(set(occupied_companies))

	available_companies = frappe.get_all(
		"Company",
		filters={"name": ["not in", occupied_companies]} if occupied_companies else {},
		pluck="name"
	)
	return [[c] for c in available_companies]
       
			
