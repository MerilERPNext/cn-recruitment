import frappe

@frappe.whitelist()
def get_filtered_employees(grades=None, departments=None, designations=None):
    filters = {'status': 'Active'}

    if grades:
        grade_list = frappe.parse_json(grades)
        filters['grade'] = ['in', grade_list]

    if departments:
        department_list = frappe.parse_json(departments)
        filters['department'] = ['in', department_list]

    if designations:
        designation_list = frappe.parse_json(designations)
        filters['designation'] = ['in', designation_list]

    employees = frappe.get_all(
        'Employee',
        fields=['name', 'employee_name', 'department'],
        filters=filters
    )
    return employees
