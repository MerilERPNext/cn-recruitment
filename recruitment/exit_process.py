import frappe

# @frappe.whitelist()
# def get_exit_interviews():
#     current_date =  frappe.utils.today()
#     sql_qry = """SELECT es.employee
#                 FROM `tabEmployee Separation` as es
#                 WHERE es.custom_last_working_date = CURRENT_DATE + INTERVAL 2 DAY"""
#     variables["ei_employees"] = frappe.db.sql(sql_qry,as_dict = True)
#     frappe.msgprint(str(sql_qry_data))
