import frappe
from frappe.utils import getdate
from hrms.payroll.doctype.salary_structure.salary_structure import make_salary_slip
from frappe import _

def _session_employee():
    """The Employee linked to the logged-in user, if any."""
    if frappe.session.user in ("Guest", None):
        return None
    return frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")


def _is_hr_privileged():
    """A user with payroll/HR rights who may view any employee's data."""
    return bool(
        frappe.has_permission("Salary Slip", "read")
        or frappe.has_permission("Salary Structure Assignment", "read")
    )


def _can_view_employee(employee):
    """Who may view an employee's compensation/PII:
      - the employee themselves,
      - anyone in that employee's management chain (the existing "view as"
        feature managers use via X-Target-Employee-Id / ?targetEmployee URL),
      - an HR/payroll-privileged user.
    Closes the IDOR (arbitrary employee id) without breaking the manager/HR view.
    """
    if not employee:
        return False
    me = _session_employee()
    if me and me == employee:
        return True
    if _is_hr_privileged():
        return True
    if me:
        cur, seen = employee, set()
        for _ in range(20):  # walk reports_to up; cap guards against cycles
            mgr = frappe.db.get_value("Employee", cur, "reports_to")
            if not mgr or mgr in seen:
                break
            if mgr == me:
                return True
            seen.add(mgr)
            cur = mgr
    return False


def _require_employee_access(employee):
    if not _can_view_employee(employee):
        frappe.throw(_("Not permitted to view this employee's data."), frappe.PermissionError)


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
    total_deduction=0

    monthly_ctc_eligible=0

    # The frontend's "view as" feature targets an employee via this header.
    # Kept for compatibility, but now authorized below (previously it let any
    # caller view any employee's salary). Guard the request access so a non-HTTP
    # / internal call (frappe.request is None) never throws here.
    request = getattr(frappe, "request", None)
    target_employee = request.headers.get("X-Target-Employee-Id") if request else None
    if target_employee:
        employee = target_employee

    if not employee:
        return {"error": "Employee not provided"}

    # Authorization first (outside the broad try/except below, so a denial is a
    # clean 403 and never gets swallowed into a generic error).
    _require_employee_access(employee)

    try:
        payroll_settings = frappe.get_single("Payroll Settings")

        if payroll_settings.show_monthly_ctc:
            monthly_ctc_eligible=1
        
            

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
                filters={"name": ["in", component_names], "custom_is_part_of_ctc": 1,"custom_component_sub_type":"Fixed"},
                fields=["name"],
            )
            ctc_component_names = {comp.name for comp in ctc_components}

        earnings_ctc, earnings_total = process_components(slip.earnings, ctc_component_names, "Earning")
        component_part_of_ctc.extend(earnings_ctc)
        monthly_ctc += earnings_total
        annual_ctc+=earnings_total*12


        deductions_ctc, deductions_total = process_components(slip.deductions, ctc_component_names, "Deduction")
        component_part_of_ctc.extend(deductions_ctc)
        monthly_ctc += deductions_total
        annual_ctc+=deductions_total*12
        total_deduction+=deductions_total*12
        

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

        if hasattr(assignment_doc, "custom_variable_pay_components"):

            for v in assignment_doc.custom_variable_pay_components:

                amount = round(v.amount or 0)

                variable_data = {
                    "component": v.variable_name,
                    "amount": 0,  
                    "annual_amount": amount,
                    "type": "Variable Pay"
                }

               
                component_part_of_ctc.append(variable_data)

                if v.part_of_ctc == 1:
                    annual_ctc += amount

        return {
            "component_part_of_ctc": component_part_of_ctc,
            "total_reimbursement_amount": assignment_doc.custom_total_reimbursement_amount,
            "fixed_gross":round(gross_pay) if  monthly_ctc_eligible else round(gross_pay*12),
            "monthly_ctc": round(assignment_doc.base) if monthly_ctc_eligible else monthly_ctc,
            "annual_ctc":  round(assignment_doc.base*12) if monthly_ctc_eligible else annual_ctc,
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

        # Authorization: self / management chain / HR — same model as salary.
        # (Was previously open to any logged-in user for any user_id.)
        if user_id != frappe.session.user and not _can_view_employee(employee_name):
            return {"status": "error", "message": _("Not permitted.")}

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
