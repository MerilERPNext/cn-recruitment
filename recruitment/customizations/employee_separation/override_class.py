from hrms.hr.doctype.employee_separation.employee_separation import EmployeeSeparation


def submit_effects_allowed(doc):
	return (doc.get("custom_status") or "") == "Approved"


class CustomEmployeeSeparation(EmployeeSeparation):
	def on_submit(self):
		if not submit_effects_allowed(self):
			return
		super().on_submit()

	def on_cancel(self):
		if not self.get("project"):
			return
		super().on_cancel()
