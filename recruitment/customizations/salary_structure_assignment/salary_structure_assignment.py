import frappe


def on_submit(self,method):
    update_employee_promotion(self)





def update_employee_promotion(self):
    if self.custom_promotion_id:
        get_promotion_doc=frappe.get_doc("Employee Promotion",self.custom_promotion_id)
        get_promotion_doc.custom_new_salary_structure_assignment_id=self.name
        get_promotion_doc.custom_new_effective_from=self.from_date
        get_promotion_doc.revised_ctc=self.base
        get_promotion_doc.custom_status="Payroll Configured"
        get_promotion_doc.save()