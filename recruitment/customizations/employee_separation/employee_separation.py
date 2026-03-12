import frappe
from frappe.utils import getdate, add_days, today, cint
from datetime import datetime, timedelta


def update_employee_relieving_date(doc, method=None):
    if not doc.custom_actual_last_working_date or not doc.employee_name:
        return

    employee_doc = frappe.get_doc("Employee", {"employee_name": doc.employee_name})
    if employee_doc:
        frappe.db.set_value(
            "Employee",
            employee_doc.name,
            "relieving_date",
            frappe.utils.getdate(doc.custom_actual_last_working_date)
        )


def calculate_lwd_from_notice_period(doc, method=None):
   
    if not doc.employee:
        return

    if doc.custom_actual_last_working_date:
        return

    employee = frappe.get_doc("Employee", doc.employee)

    notice_period_name = employee.custom_notice_period
    if not notice_period_name:
        return

    try:
        notice_period = frappe.get_doc("Notice Period", notice_period_name)
    except frappe.DoesNotExistError:
        return

    employment_status = employee.custom_employment_status or ""

    notice_days = 0

    if employment_status in ["On Probation", "Probation Extended"]:
        notice_days = notice_period.duration_of_notice_period_under_probation or 0
    elif employment_status == "Confirmed":
        notice_days = notice_period.duration_of_notice_period_after_confirmation or 0
    else:
        notice_days = notice_period.duration_of_notice_period_under_probation or 0

    if notice_days > 0:
        resignation_date = getdate(doc.custom_resignation_date) if doc.custom_resignation_date else getdate(today())
        lwd = get_lwd_skipping_holidays(doc.employee, resignation_date, cint(notice_days))
        doc.custom_actual_last_working_date = lwd
        doc.custom_notice_period_days = notice_days


def get_lwd_skipping_holidays(employee, start_date, notice_days):
    end_estimate = add_days(start_date, notice_days * 2)
    weekly_offs = get_week_off_days(employee, start_date, end_estimate)
    holidays = get_holiday_dates(employee)

    non_working = set()
    for d in weekly_offs:
        non_working.add(getdate(d))
    for d in holidays:
        non_working.add(getdate(d))

    current = start_date
    working_days_counted = 0
    while working_days_counted < notice_days:
        current = add_days(current, 1)
        if current not in non_working:
            working_days_counted += 1

    if current in non_working:
        current = add_days(current, -1)
        while current in non_working:
            current = add_days(current, -1)

    return current


@frappe.whitelist()
def calculate_lwd_api(employee, resignation_date=None, notice_days=None):
    if not employee:
        return None

    if not notice_days:
        emp = frappe.get_doc("Employee", employee)
        notice_period_name = emp.custom_notice_period
        if not notice_period_name:
            return None

        try:
            notice_period = frappe.get_doc("Notice Period", notice_period_name)
        except frappe.DoesNotExistError:
            return None

        employment_status = emp.custom_employment_status or ""
        if employment_status in ["On Probation", "Probation Extended"]:
            notice_days = notice_period.duration_of_notice_period_under_probation or 0
        elif employment_status == "Confirmed":
            notice_days = notice_period.duration_of_notice_period_after_confirmation or 0
        else:
            notice_days = notice_period.duration_of_notice_period_under_probation or 0

    notice_days = cint(notice_days)
    if notice_days <= 0:
        return None

    start = getdate(resignation_date) if resignation_date else getdate(today())
    return get_lwd_skipping_holidays(employee, start, notice_days)



def get_week_off_days(employee, start_date, end_date):
    holiday_dates = []

    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

    assignment_cache = {}

    current_date = start_date
    while current_date <= end_date:
        shift_assignment = frappe.db.sql("""
            SELECT
                name, start_date, end_date, shift_type
            FROM `tabShift Assignment`
            WHERE
                employee = %(employee)s
                AND docstatus = 1
                AND status = 'Active'
                AND start_date <= %(check_date)s
                AND (
                    end_date IS NULL
                    OR end_date >= %(check_date)s
                )
            ORDER BY start_date DESC
            LIMIT 1
        """, {
            'employee': employee,
            'check_date': current_date
        }, as_dict=True)

        if shift_assignment:
            assignment = shift_assignment[0]

            if assignment.name not in assignment_cache:
                doc = frappe.get_doc("Shift Assignment", assignment.name)

                custom_holiday = doc.custom_holiday

                if custom_holiday:
                    assignment_start = getdate(assignment.start_date)
                    assignment_end = getdate(assignment.end_date) if assignment.end_date else end_date

                    assignment_week_offs = process_week_offs(custom_holiday, assignment_start, assignment_end)
                    assignment_cache[assignment.name] = set(assignment_week_offs)
                else:
                    assignment_cache[assignment.name] = set()

            if current_date in assignment_cache[assignment.name]:
                holiday_dates.append(current_date)

        current_date = add_days(current_date, 1)

    return sorted(list(set(holiday_dates)))


def process_week_offs(custom_holiday, start_date, end_date):
    holiday_dates = []
    day_config = {
        "Sunday": (6, get_nth_weekday_of_month),
        "Monday": (0, get_nth_weekday_of_month),
        "Tuesday": (1, get_nth_weekday_of_month),
        "Wednesday": (2, get_nth_weekday_of_month),
        "Thursday": (3, get_nth_weekday_of_month),
        "Friday": (4, get_nth_weekday_of_month),
        "Saturday": (5, get_nth_weekday_of_month),
    }
    for j in custom_holiday:
        if j.day in day_config:
            weekday_num, func = day_config[j.day]
            holiday_dates.extend(get_weekday_dates(start_date, end_date, weekday_num, j, func))
    return holiday_dates


def get_weekday_dates(start_date, end_date, weekday, config, month_func):
    dates = []

    if weekday == 6:
        first_day = start_date + timedelta(days=(6 - start_date.weekday()))
    else:
        first_day = start_date + timedelta(days=(weekday - start_date.weekday() + 7) % 7)

    first_day = getdate(first_day)

    if config.all:
        current = first_day
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=7)

    if config.first:
        current = first_day
        while current <= end_date:
            if month_func(current, weekday) == 1:
                dates.append(current)
            current += timedelta(days=7)

    if config.second:
        current = first_day
        while current <= end_date:
            if month_func(current, weekday) == 2:
                dates.append(current)
            current += timedelta(days=7)

    if config.third:
        current = first_day
        while current <= end_date:
            if month_func(current, weekday) == 3:
                dates.append(current)
            current += timedelta(days=7)

    if config.fourth:
        current = first_day
        while current <= end_date:
            if month_func(current, weekday) == 4:
                dates.append(current)
            current += timedelta(days=7)

    if config.fifth:
        current = first_day
        while current <= end_date:
            if month_func(current, weekday) == 5:
                dates.append(current)
            current += timedelta(days=7)

    return dates


def get_nth_weekday_of_month(date, weekday):
    if isinstance(date, str):
        date = datetime.strptime(date, "%Y-%m-%d")

    first_day_of_month = date.replace(day=1)
    first_occurrence = first_day_of_month + timedelta(days=(weekday - first_day_of_month.weekday() + 7) % 7)
    first_occurrence = getdate(first_occurrence)

    week_difference = (getdate(date) - first_occurrence).days // 7
    return week_difference + 1


def get_holiday_dates(employee):
    if not employee:
        return []

    dates = []

    user_assign = frappe.db.sql("""
        SELECT DISTINCT parent
        FROM `tabAssigned Users`
        WHERE employee_id = %s
    """, (employee,), as_dict=True)

    if not user_assign:
        return []

    assigned_parents = [row["parent"] for row in user_assign]

    holiday_list = frappe.db.sql("""
        SELECT DISTINCT parent
        FROM `tabAssignment Group`
        WHERE dynamic_user_assignment IN %s
    """, (tuple(assigned_parents),), as_dict=True)

    for row in holiday_list:
        holi = frappe.db.get_value("Holidays", row["parent"], "name")
        if holi:
            holiday_doc = frappe.get_doc("Holidays", row["parent"])

            if holiday_doc.type == "Mandatory":
                dates.append(holiday_doc.date)

            if holiday_doc.type == "National Holiday" and holiday_doc.repeat_next_year:
                original_date = holiday_doc.date
                start_year = original_date.year
                current_year = datetime.today().year
                if start_year == current_year:
                    dates.append(holiday_doc.date)
                for year in range(start_year + 1, current_year + 1):
                    try:
                        new_date = original_date.replace(year=year)
                    except Exception:
                        continue
                    dates.append(new_date)

    return sorted(set(dates))
