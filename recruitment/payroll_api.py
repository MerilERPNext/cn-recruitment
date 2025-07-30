import frappe
from frappe.utils import getdate
from hrms.payroll.doctype.salary_structure.salary_structure import make_salary_slip

@frappe.whitelist()
def generate_salary_slip(employee):
    earning_component_part_of_ctc = []
    deduction_component_part_of_ctc = []
    reimbursement_component_part_of_ctc = []
    monthly_ctc = 0

    try:
        if not employee:
            return {"error": "Employee not provided"}

        salary_structure = frappe.get_list(
            "Salary Structure Assignment",
            filters={"employee": employee, "docstatus": 1},
            fields=["name", "salary_structure", "from_date"],
            order_by="from_date desc",
            limit=1
        )

        if not salary_structure:
            return {"error": f"No active Salary Structure Assignment found for {employee}"}

        assignment = salary_structure[0]

        slip = make_salary_slip(
            source_name=assignment.salary_structure,
            employee=employee,
            print_format='Salary Slip Standard',
            for_preview=1,
            posting_date=assignment.from_date
        )

        # ---- Optimize by fetching components in one go ----
        component_names = list({
            e.salary_component for e in slip.earnings if e.salary_component
        }.union({
            d.salary_component for d in slip.deductions if d.salary_component
        }))

        ctc_component_names = set()
        if component_names:
            ctc_components = frappe.get_all(
                "Salary Component",
                filters={"name": ["in", component_names], "custom_is_part_of_ctc": 1},
                fields=["name"]
            )
            ctc_component_names = {comp.name for comp in ctc_components}

        # ---- Process Earnings ----
        for earning in slip.earnings:
            if earning.salary_component in ctc_component_names:
                amount = round(earning.amount)
                monthly_ctc += amount
                earning_component_part_of_ctc.append({
                    "component": earning.salary_component,
                    "amount": amount,
                    "annual_amount": amount * 12
                })

        # ---- Process Deductions ----
        for deduction in slip.deductions:
            if deduction.salary_component in ctc_component_names:
                amount = round(deduction.amount)
                monthly_ctc += amount
                deduction_component_part_of_ctc.append({
                    "component": deduction.salary_component,
                    "amount": amount,
                    "annual_amount": amount * 12
                })

        # ---- Reimbursements ----
        assignment_doc = frappe.get_doc("Salary Structure Assignment", assignment.name)

        if hasattr(assignment_doc, "custom_employee_reimbursements"):
            for reimbursement in assignment_doc.custom_employee_reimbursements:
                amount = round(reimbursement.monthly_total_amount)
                monthly_ctc += amount
                reimbursement_component_part_of_ctc.append({
                    "component": reimbursement.reimbursements,
                    "amount": amount,
                    "annual_amount": amount * 12
                })

        net_pay = slip.rounded_total or 0

        return {
            "earning_component_part_of_ctc": earning_component_part_of_ctc,
            "deduction_component_part_of_ctc": deduction_component_part_of_ctc,
            "reimbursements_part_of_ctc": reimbursement_component_part_of_ctc,
            "total_reimbursement_amount": assignment_doc.custom_total_reimbursement_amount,
            "monthly_ctc": monthly_ctc,
            "annual_ctc": monthly_ctc * 12,
            "net_pay": net_pay,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in generate_salary_slip")
        return {"error": str(e)}
