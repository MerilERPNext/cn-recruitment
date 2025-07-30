# cn_indian_payroll/cn_indian_payroll/overrides/api.py

import frappe
from frappe.utils import getdate
from hrms.payroll.doctype.salary_structure.salary_structure import make_salary_slip

@frappe.whitelist(allow_guest=True)
def generate_salary_slip(employee):
    earning_component_part_of_ctc = []
    deduction_component_part_of_ctc = []
    reimbursement_component_part_of_ctc = []
    monthly_ctc = 0
    annual_ctc = 0

    try:
        if not employee:
            return {"error": "Employee not provided"}

        salary_structure = frappe.get_list(
            "Salary Structure Assignment",
            filters={"employee": employee, "docstatus": 1},
            fields=["*"],
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

        # Earnings
        if slip and slip.earnings:
            for earning in slip.earnings:
                try:
                    earning_component = frappe.get_doc("Salary Component", earning.salary_component)
                    if earning_component.custom_is_part_of_ctc == 1:
                        monthly_ctc += round(earning.amount)
                        
                        earning_component_part_of_ctc.append({
                            "component": earning_component.name,
                            "amount": round(earning.amount),
                            "annual_amount": round(earning.amount * 12)
                        })
                except:
                    pass

        # Deductions
        if slip and slip.deductions:
            for deduction in slip.deductions:
                try:
                    deduction_component = frappe.get_doc("Salary Component", deduction.salary_component)
                    if deduction_component.custom_is_part_of_ctc == 1:
                        monthly_ctc += round(deduction.amount)
                        
                        deduction_component_part_of_ctc.append({
                            "component": deduction_component.name,
                            "amount": round(deduction.amount),
                            "annual_amount": round(deduction.amount * 12)
                        })
                except:
                    pass

        net_pay = slip.rounded_total or 0

        assignment_doc = frappe.get_doc("Salary Structure Assignment", assignment.name)

        if hasattr(assignment_doc, "custom_employee_reimbursements"):
            for reimbursement in assignment_doc.custom_employee_reimbursements:
                monthly_ctc += round(reimbursement.monthly_total_amount)
                
                reimbursement_component_part_of_ctc.append({
                    "component": reimbursement.reimbursements,
                    "amount": round(reimbursement.monthly_total_amount),
                    "annual_amount": round(reimbursement.monthly_total_amount * 12)
                })

        return {
            # "salary_slip": slip,
            
            "earning_component_part_of_ctc": earning_component_part_of_ctc,
            "deduction_component_part_of_ctc": deduction_component_part_of_ctc,
            "reimbursements_part_of_ctc": reimbursement_component_part_of_ctc,
            "total_reimbursement_amount": assignment_doc.custom_total_reimbursement_amount,
            "monthly_ctc": monthly_ctc,
            "annual_ctc": round(monthly_ctc)*12,
            "net_pay": net_pay,
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in generate_salary_slip")
        return {"error": str(e)}
