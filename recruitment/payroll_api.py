import frappe
from frappe.utils import getdate
from hrms.payroll.doctype.salary_structure.salary_structure import make_salary_slip
from frappe import _

def process_components(components, ctc_component_names):
    component_list = []
    total = 0
    for comp in components:
        if comp.salary_component in ctc_component_names:
            amount = round(comp.amount)
            total += amount
            component_list.append({
                "component": comp.salary_component,
                "amount": amount,
                "annual_amount": amount * 12
            })
    return component_list, total

@frappe.whitelist()
def generate_salary_slip(employee):
    earning_component_part_of_ctc = []
    deduction_component_part_of_ctc = []
    reimbursements_part_of_ctc = []
    monthly_ctc = 0

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

        # Collect component names
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

        # Process earnings (included in CTC)
        earning_component_part_of_ctc, earnings_total = process_components(slip.earnings, ctc_component_names)
        monthly_ctc += earnings_total

        # Deductions are NOT part of CTC by default, so we skip adding their value to CTC.
        deduction_component_part_of_ctc, _ = process_components(slip.deductions, ctc_component_names)

        # Process reimbursements
        assignment_doc = frappe.get_doc("Salary Structure Assignment", assignment.name)
        if hasattr(assignment_doc, "custom_employee_reimbursements"):
            for reimbursement in assignment_doc.custom_employee_reimbursements:
                amount = round(reimbursement.monthly_total_amount)
                monthly_ctc += amount
                reimbursements_part_of_ctc.append({
                    "component": reimbursement.reimbursements,
                    "amount": amount,
                    "annual_amount": amount * 12
                })

        net_pay = slip.rounded_total or 0

        return {
            "earning_component_part_of_ctc": earning_component_part_of_ctc,
            "deduction_component_part_of_ctc": deduction_component_part_of_ctc,
            "reimbursements_part_of_ctc": reimbursements_part_of_ctc,
            "total_reimbursement_amount": assignment_doc.custom_total_reimbursement_amount,
            "monthly_ctc": monthly_ctc,
            "annual_ctc": monthly_ctc * 12,
            "net_pay": net_pay,
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
                "message": _("Missing user_id")
            }

        
        employee = frappe.get_list(
            "Employee",
            filters={"user_id": user_id, "status": "Active"},
            fields=["name"]
        )

        if not employee:
            return {
                "status": "error",
                "message": _("No active employee found for this user_id")
            }

        employee_name = employee[0].name

        
        address_list = frappe.get_all(
            "Address",
            filters={"custom_employee": employee_name},
            fields=[
                "name", "address_title", "address_line1", "address_line2",
                "city", "county", "state", "country", "pincode",
                "email_id", "phone", "address_type"
            ]
        )

        
        current_address = []
        permanent_address = []
        emergency_address = []

        
        for addr in address_list:
            address_data = {
                "name": addr.name,
                "address_title": addr.address_title,
                "address_line1": addr.address_line1,
                "address_line2": addr.address_line2,
                "city": addr.city,
                "county": addr.county,
                "state": addr.state,
                "country": addr.country,
                "pincode": addr.pincode,
                "email_id": addr.email_id,
                "phone": addr.phone,
            }

            if addr.address_type == "Current":
                current_address.append(address_data)
            elif addr.address_type == "Permanent":
                permanent_address.append(address_data)
            elif addr.address_type == "Emergency":
                emergency_address.append(address_data)

        return {
            "status": "success",
            "message": _("Address details fetched successfully"),
            "data": {
                "current_address": current_address,
                "permanent_address": permanent_address,
                "emergency_address": emergency_address
            }
        }

    except Exception as e:
        frappe.log_error(message=str(e), title="Error in address_details API")
        return {
            "status": "error",
            "message": _("An unexpected error occurred"),
            "error": str(e)
        }
