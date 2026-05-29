# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import json
import frappe
from frappe.model.document import Document


class JobDescription(Document):
	def validate(self):
		self.filter_competencies()
		self.enforce_single_default()

	def filter_competencies(self):
		"""Remove competencies where add_to_jd is unchecked before saving."""
		if self.competencies:
			self.competencies = [
				row for row in self.competencies
				if row.add_to_jd
			]

	def enforce_single_default(self):
		"""Only one Job Description may carry `is_default = 1`.

		When this doc is marked default, clear the flag on every other
		Job Description so the preview-fallback lookup is deterministic.
		"""
		if not self.get("is_default"):
			return

		frappe.db.sql(
			"""
			UPDATE `tabJob Description`
			SET is_default = 0
			WHERE name != %s AND is_default = 1
			""",
			(self.name,),
		)


@frappe.whitelist()
def get_competencies_for_designations(designations):
	"""
	Fetch all competencies mapped to the given designations via Competency Mapping.

	Flow:
	  1. Find all Competency Mapping docs where assign_to_unique_roles
	     contains any of the selected designations.
	  2. For each matching mapping, read its competency_mapping child table.
	  3. Enrich each competency with tier info from Competency master.
	  4. De-duplicate by competency code and return.

	Args:
	    designations: JSON string — list of designation names

	Returns:
	    List of dicts with competency details ready for the child table.
	"""
	if isinstance(designations, str):
		designations = json.loads(designations)

	if not designations:
		return []

	# Step 1: Find Competency Mapping parents that have matching designations
	# JD Designations child table is used in Competency Mapping's "assign_to_unique_roles" field
	matching_parents = frappe.db.sql("""
		SELECT DISTINCT parent
		FROM `tabJD Designations`
		WHERE parenttype = 'Competency Mapping'
		  AND parentfield = 'assign_to_unique_roles'
		  AND designation IN %(designations)s
	""", {"designations": designations}, as_dict=True)

	mapping_names = [row.parent for row in matching_parents]

	if not mapping_names:
		return []

	# Step 2: Get all competency rows from those mappings
	competency_rows = frappe.db.sql("""
		SELECT
			cmt.competency,
			cmt.proficiency,
			cmt.weightage,
			cmt.parent AS mapping_name
		FROM `tabCompetency Mapping Table` cmt
		WHERE cmt.parent IN %(mapping_names)s
	""", {"mapping_names": mapping_names}, as_dict=True)

	if not competency_rows:
		return []

	# Step 3: Get unique competency codes and enrich with master data
	competency_codes = list(set(row.competency for row in competency_rows))

	competency_details = frappe.db.sql("""
		SELECT
			c.name AS competency_code,
			c.competency_name,
			c.competency_tier
		FROM `tabCompetency` c
		WHERE c.name IN %(codes)s
	""", {"codes": competency_codes}, as_dict=True)

	# Build lookup dict
	comp_lookup = {c.competency_code: c for c in competency_details}

	# Step 4: Get designations text for each mapping
	mapping_designations = {}
	for mname in mapping_names:
		desig_rows = frappe.db.get_all(
			"JD Designations",
			filters={
				"parent": mname,
				"parenttype": "Competency Mapping",
				"parentfield": "assign_to_unique_roles"
			},
			fields=["designation"]
		)
		if desig_rows:
			mapping_designations[mname] = ", ".join(
				[d.designation for d in desig_rows]
			)
		else:
			mapping_designations[mname] = "All Roles"

	# Step 5: Build final result, de-duplicated by competency code
	seen = set()
	result = []

	for row in competency_rows:
		if row.competency in seen:
			continue
		seen.add(row.competency)

		comp_info = comp_lookup.get(row.competency, {})

		result.append({
			"competencies_name": row.competency,
			"competencies_mapping": row.mapping_name,
			"designations": mapping_designations.get(row.mapping_name, ""),
			"weightage": row.weightage or "",
			"tier": comp_info.get("competency_tier", ""),
			"add_to_jd": 1
		})

	return result
