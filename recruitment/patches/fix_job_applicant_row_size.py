import frappe


def execute():
	"""
	Fix MariaDB OperationalError (1118: Row size too large > 65535 bytes) on tabJob Applicant.
	Converting custom VARCHAR(140) columns (addresses, locations, links, etc.) to TEXT
	frees up ~540 bytes per column in InnoDB inline row storage, providing ample headroom
	for migrations and schema updates.
	"""
	if not frappe.db.table_exists("Job Applicant"):
		return

	columns_to_convert = [
		"custom_address_line_1",
		"custom_address_line_2",
		"custom_citytown",
		"custom_state",
		"custom_postal_code",
		"custom_citytown_permanent",
		"custom_postal_code_permanent",
		"custom_state_permanent",
		"custom_line2_citytown",
		"custom_line2_state",
		"custom_line2_postal_code",
		"custom_current_location",
		"custom_home_town",
		"custom_location_prefrences",
		"custom_offered_location",
		"custom_noncompete",
		"custom_linkedin_url",
		"custom_linkedin_id",
		"custom_bond_if_any",
		"custom_applicant_last_name_",
		"custom_applicant_last_name",
		"custom_team_head",
		"custom_name_of_the_candidate",
		"custom_project",
	]

	# Build single ALTER TABLE query for existing columns for maximum speed and atomic execution
	alter_clauses = []
	for col in columns_to_convert:
		if frappe.db.has_column("Job Applicant", col):
			alter_clauses.append(f"MODIFY COLUMN `{col}` TEXT")

	if alter_clauses:
		try:
			query = f"ALTER TABLE `tabJob Applicant` {', '.join(alter_clauses)}"
			frappe.db.sql_ddl(query)
		except Exception as e:
			# Fallback to column by column in case of any specific column issue
			for clause in alter_clauses:
				try:
					frappe.db.sql_ddl(f"ALTER TABLE `tabJob Applicant` {clause}")
				except Exception:
					pass
