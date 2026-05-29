import frappe
from frappe.utils import getdate, add_days, add_months, today, cint
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


PROBATION_STATUSES = ("On Probation", "Probation Extended")
CONFIRMED_STATUS = "Confirmed"


def update_employee_relieving_date(doc, method=None):
    if not doc.custom_final_last_working_day or not doc.employee_name:
        return

    employee_doc = frappe.get_doc("Employee", {"employee_name": doc.employee_name})
    if employee_doc:
        frappe.db.set_value(
            "Employee",
            employee_doc.name,
            {
                "relieving_date": frappe.utils.getdate(doc.custom_final_last_working_day),
                "custom_recovery_days": cint(doc.custom_final_recovery_days or 0),
                "custom_pay_days": cint(doc.get("custom_pay_days") or 0),
            },
        )

    if doc.custom_resignaion_type == "Termination" and doc.employee:
        emp = frappe.get_doc("Employee", doc.employee)
        emp.custom_employment_status = "Terminated"
        emp.status = "Suspended"
        emp.save(ignore_permissions=True)
        if emp.user_id:
            frappe.db.set_value("User", emp.user_id, "enabled", 0)


def calculate_lwd_from_notice_period(doc, method=None):
    if not doc.employee:
        return

    if doc.custom_final_last_working_day:
        return

    notice_period_name = (
        doc.custom_notice_period
        or frappe.db.get_value("Employee", doc.employee, "custom_notice_period")
    )
    if not notice_period_name or not frappe.db.exists("Notice Period", notice_period_name):
        return

    resignation_date = getdate(doc.custom_resignation_date) if doc.custom_resignation_date else getdate(today())
    lwd, notice_days = _compute_last_working_date(notice_period_name, resignation_date, doc.employee)
    if not lwd:
        return

    doc.custom_final_last_working_day = lwd
    doc.custom_notice_period_days = cint(notice_days or 0)


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
def calculate_lwd_api(employee, resignation_date=None, notice_days=None, notice_period=None):
    if not employee:
        return None

    notice_period_name = notice_period or frappe.db.get_value(
        "Employee", employee, "custom_notice_period"
    )
    if not notice_period_name or not frappe.db.exists("Notice Period", notice_period_name):
        return None

    start = getdate(resignation_date) if resignation_date else getdate(today())
    lwd, _ = _compute_last_working_date(notice_period_name, start, employee)
    return lwd


def _compute_last_working_date(notice_period_name, resignation_date, employee):
    np = frappe.get_doc("Notice Period", notice_period_name)
    employment_status = frappe.db.get_value(
        "Employee", employee, "custom_employment_status"
    ) or CONFIRMED_STATUS

    anchor = getdate(resignation_date) if np.from_resignation_date else getdate(today())
    duration, unit = _get_notice_duration_and_unit(np, employment_status, employee, anchor)
    if duration <= 0:
        return None, 0

    tentative_end = (
        getdate(add_months(anchor, duration)) if unit == "Months"
        else add_days(anchor, duration)
    )
    notice_days = (tentative_end - anchor).days

    if not (np.exclude_weekly_offs or np.exclude_holidays or np.exclude_unpaid_leaves):
        return tentative_end, notice_days

    end = tentative_end
    prev_count = -1
    while True:
        excluded = _build_excluded_dates(employee, anchor, end, np)
        count = sum(1 for d in excluded if anchor < d <= end)
        if count == prev_count:
            break
        end = add_days(tentative_end, count)
        prev_count = count

    while end in _build_excluded_dates(employee, anchor, end, np):
        end = add_days(end, 1)
    return end, notice_days


def _get_notice_duration_and_unit(np, employment_status, employee, anchor):
    if np.enable_tenure_based_notice_period and employee \
            and employment_status in (*PROBATION_STATUSES, CONFIRMED_STATUS):
        slabs = sorted(np.tenure_based_slabs or [], key=lambda s: s.start_month)
        doj = frappe.db.get_value("Employee", employee, "date_of_joining")
        if slabs and doj:
            tenure_months = _tenure_in_months(doj, anchor)
            slab = _find_slab(slabs, tenure_months)
            if employment_status in PROBATION_STATUSES:
                duration = int(slab.duration_if_in_probation or 0)
                unit = np.set_notice_period_under_probation_in or "Days"
            else:
                duration = int(slab.duration_if_confirmed or 0)
                unit = np.set_notice_period_after_confirmation_in or "Days"
            return duration, unit

    if employment_status in PROBATION_STATUSES:
        return (
            int(np.duration_of_notice_period_under_probation or 0),
            np.set_notice_period_under_probation_in or "Days",
        )
    if employment_status == CONFIRMED_STATUS:
        return (
            int(np.duration_of_notice_period_after_confirmation or 0),
            np.set_notice_period_after_confirmation_in or "Days",
        )
    return 0, None


def _tenure_in_months(doj, anchor):
    doj = getdate(doj)
    anchor = getdate(anchor)
    if anchor < doj:
        return 0
    rd = relativedelta(anchor, doj)
    months = rd.years * 12 + rd.months
    if rd.days >= 15:
        months += 1
    return months


def _find_slab(slabs, tenure_months):
    matched = None
    for slab in slabs:
        if slab.start_month <= tenure_months <= slab.end_month:
            matched = slab
            if slab.end_month == tenure_months:
                break
    if matched:
        return matched
    if tenure_months > slabs[-1].end_month:
        return slabs[-1]
    return slabs[0]


def _build_excluded_dates(employee, start_date, end_date, np):
    excluded = set()
    if np.exclude_weekly_offs:
        for d in get_week_off_days(employee, start_date, end_date):
            excluded.add(getdate(d))
    if np.exclude_holidays:
        for d in get_holiday_dates(employee):
            d = getdate(d)
            if start_date <= d <= end_date:
                excluded.add(d)
    if np.exclude_unpaid_leaves:
        for d in _get_unpaid_leave_dates(employee, start_date, end_date):
            excluded.add(getdate(d))
    return excluded


def _get_unpaid_leave_dates(employee, start_date, end_date):
    rows = frappe.db.sql(
        """
        SELECT la.from_date, la.to_date
        FROM `tabLeave Application` la
        JOIN `tabLeave Type` lt ON lt.name = la.leave_type
        WHERE la.employee = %s
          AND la.status = 'Approved'
          AND la.docstatus = 1
          AND lt.is_lwp = 1
          AND la.from_date <= %s
          AND la.to_date >= %s
        """,
        (employee, end_date, start_date),
        as_dict=True,
    )
    dates = []
    for r in rows:
        d = max(getdate(r.from_date), getdate(start_date))
        end = min(getdate(r.to_date), getdate(end_date))
        while d <= end:
            dates.append(d)
            d = add_days(d, 1)
    return dates



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
