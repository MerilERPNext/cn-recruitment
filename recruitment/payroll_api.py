import frappe
from frappe.utils import getdate
from hrms.payroll.doctype.salary_structure.salary_structure import make_salary_slip
from frappe import _

def process_components(components, ctc_component_names, comp_type):
    component_list = []
    total = 0
    for comp in components:
        if comp.salary_component in ctc_component_names:
            amount = round(comp.amount)
            total += amount
            component_list.append({
                "component": comp.salary_component,
                "amount": amount,
                "annual_amount": amount * 12,
                "type": comp_type
            })
    return component_list, total

@frappe.whitelist()
def generate_salary_slip(employee):
    component_part_of_ctc = []
    monthly_ctc = 0
    annual_ctc=0

    try:
        if not employee:
            return {"error": "Employee not provided"}

        salary_structure = frappe.get_list(
            "Salary Structure Assignment",
            filters={"employee": employee, "docstatus": 1},
            fields=["name", "salary_structure", "from_date"],
            order_by="from_date desc",
            limit=1,
        )

        if not salary_structure:
            return {"error": f"No active Salary Structure Assignment found for {employee}"}

        assignment = salary_structure[0]

        slip = make_salary_slip(
            source_name=assignment.salary_structure,
            employee=employee,
            print_format="Salary Slip Standard",
            for_preview=1,
            posting_date=assignment.from_date,
        )

        # Collect component names from earnings and deductions
        component_names = list(
            {e.salary_component for e in slip.earnings if e.salary_component}.union(
                {d.salary_component for d in slip.deductions if d.salary_component}
            )
        )

        ctc_component_names = set()
        if component_names:
            ctc_components = frappe.get_all(
                "Salary Component",
                filters={"name": ["in", component_names], "custom_is_part_of_ctc": 1},
                fields=["name"],
            )
            ctc_component_names = {comp.name for comp in ctc_components}

        # Process earnings
        earnings_ctc, earnings_total = process_components(slip.earnings, ctc_component_names, "Earning")
        component_part_of_ctc.extend(earnings_ctc)
        monthly_ctc += earnings_total
        annual_ctc+=earnings_total*12

        # Process deductions
        # deductions_ctc, _ = process_components(slip.deductions, ctc_component_names, "Deduction")
        # component_part_of_ctc.extend(deductions_ctc)
        # monthly_ctc+=

        deductions_ctc, deductions_total = process_components(slip.deductions, ctc_component_names, "Deduction")
        component_part_of_ctc.extend(deductions_ctc)
        monthly_ctc += deductions_total
        annual_ctc+=deductions_total*12
        
        # Note: Not adding deductions to monthly CTC

        # Process reimbursements
        assignment_doc = frappe.get_doc("Salary Structure Assignment", assignment.name)
        if hasattr(assignment_doc, "custom_employee_reimbursements"):
            for reimbursement in assignment_doc.custom_employee_reimbursements:
                amount = round(reimbursement.monthly_total_amount)
                monthly_ctc += amount
                annual_ctc+=amount*12
                component_part_of_ctc.append({
                    "component": reimbursement.reimbursements,
                    "amount": amount,
                    "annual_amount": amount * 12,
                    "type": "Reimbursement"
                })

        net_pay = slip.rounded_total or 0
        gross_pay = slip.gross_pay or 0
        total_deduction = slip.total_deduction or 0

        return {
            "component_part_of_ctc": component_part_of_ctc,
            "total_reimbursement_amount": assignment_doc.custom_total_reimbursement_amount,
            "monthly_ctc": monthly_ctc,
            "annual_ctc": annual_ctc,
            "net_pay": net_pay,
            "gross_pay": gross_pay,
            "total_deduction": total_deduction
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in generate_salary_slip")
        return {"error": "An unexpected error occurred while generating the salary slip."}



@frappe.whitelist()
def address_details(user_id):
    
    try:
        if not user_id:
            return {
                "status": "error",
                "message": _("Missing required parameter: user_id")
            }

        user_id = user_id.replace('"', '').strip()

        employee_name = frappe.get_value("Employee", {"user_id": user_id, "status": "Active"}, "name")

        if not employee_name:
            return {
                "status": "error",
                "message": _("Active employee not found for the given user ID.")
            }

        addresses = frappe.get_all(

            "Address",
            filters={"custom_employee": employee_name},
            fields=[
                "name", "address_title", "address_line1", "address_line2", "city",
                "county", "state", "country", "pincode", "email_id", "phone", "address_type"
            ]
        )

        # Default empty structure
        default_address = { 
            "name": "",
            "address_title": "",
            "address_line1": "",
            "address_line2": "",
            "city": "",
            "county": "",
            "state": "",
            "country": "",
            "pincode": "",
            "email_id": "",
            "phone": ""
        }

        current_address = default_address.copy()
        permanent_address = default_address.copy()
        emergency_address = default_address.copy()

        for addr in addresses:
            addr_data = addr.copy()
            addr_data.pop("address_type", None)

            if addr["address_type"] == "Current":
                current_address = addr_data
            elif addr["address_type"] == "Permanent":
                permanent_address = addr_data
            elif addr["address_type"] == "Emergency":
                emergency_address = addr_data

        return {
            "status": "success",
            "data": {
                "current_address": current_address,
                "permanent_address": permanent_address,
                "emergency_address": emergency_address
            }
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), title="Error in address_details API")
        return {
            "status": "error",
            "message": _("An unexpected error occurred while fetching address details.")
        }
