import frappe
from frappe.model.document import Document


CAREER_PAGE_FIELDS = [
	("updated_date", "Updated Date"),
	("job_id", "Job ID"),
	("department", "Department"),
	("location", "Location"),
	("experience_range", "Experience Range"),
	("employee_type", "Employee Type"),
	("employee_sub_type", "Employee Sub Type"),
	("salary_range", "Salary Range"),
]


class TACareersPageSettings(Document):
	def onload(self):
		self.ensure_field_visibility_rows()

	def validate(self):
		self.ensure_field_visibility_rows()

	def ensure_field_visibility_rows(self):
		existing_keys = {row.field_key for row in (self.career_page_field_visibility or [])}
		for key, label in CAREER_PAGE_FIELDS:
			if key not in existing_keys:
				self.append(
					"career_page_field_visibility",
					{
						"field_key": key,
						"field_label": label,
						"tile_visibility": 0,
						"details_visibility": 0,
					},
				)
