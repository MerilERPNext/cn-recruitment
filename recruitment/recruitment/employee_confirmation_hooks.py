# Copyright (c) 2026, Prathamesh Jadhav and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import add_months, add_days, getdate, today


def calculate_final_confirmation_date(doc, method=None):
  
    if not doc.date_of_joining or not doc.custom_notice_period or not doc.custom_probation_period:
        return

    probation_period = frappe.get_doc("Probation Period", doc.custom_probation_period)

    if not probation_period.duration_of_probation:
        return

    if probation_period.probation_period_in == "Months":
        confirmation_date = add_months(doc.date_of_joining, probation_period.duration_of_probation)
    elif probation_period.probation_period_in == "Days":
        confirmation_date = add_days(doc.date_of_joining, probation_period.duration_of_probation)
    else:
        return

    doc.final_confirmation_date = confirmation_date

    if not doc.scheduled_confirmation_date:
        doc.scheduled_confirmation_date = confirmation_date
