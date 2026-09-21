"""TEMPORARY test data for the AOP budget check (safe to delete).

Creates two Departments and two Cost Centers with budgets, and five Job
Requisitions that land in every case ``recruitment.api.requisition_budget``
handles. It then turns on Recruitment Settings -> "Enable AOP Budget Check" and
runs the nightly flag refresh once.

All amounts are annual, INR.

  Masters                        Budget      Utilized    Left
  AOP Test Dept - Healthy        50,00,000   10,00,000   40,00,000
  AOP Test Dept - Tight          20,00,000   12,00,000    8,00,000
  AOP Test CC - Healthy          40,00,000    5,00,000   35,00,000
  AOP Test CC - Tight            10,00,000    7,00,000    3,00,000

  Each department's cost center is the CC of the same name.

  Requisitions ([AOP-TEST] in the description)
  R1 Within budget        Healthy dept, 6L x 2 = 12L, Approval Pending -> not flagged
  R2 Over dept + CC       Tight dept,   5L x 2 = 10L, Approved Draft   -> FLAGGED
                          (dept 8L left, CC Tight 3L left)
  R3 Cost-center split    Healthy dept, 4L x 2 =  8L, Approval Pending -> FLAGGED
                          row 1: 50% CC Healthy / 50% CC Tight, row 2: 100% CC Tight
                          -> CC Tight needs 6L, has 3L; the department is fine
  R4 Archived             Tight dept,   9L x 2 = 18L, Archived         -> not flagged
  R5 Draft                Tight dept,   9L x 2 = 18L, Draft            -> not flagged

The requisitions are created while every budget is untouched, and the
utilization is written afterwards. That is exactly the "budget changed after the
requisition was raised" case the Over Budget flag exists for.

Run:
    bench --site recruitment execute recruitment.aop_budget_seed.run
Report:
    bench --site recruitment execute recruitment.aop_budget_seed.report
Cleanup (also turns the setting back off):
    bench --site recruitment execute recruitment.aop_budget_seed.cleanup
"""

import json

import frappe
from frappe.utils import today

from recruitment.api import requisition_budget as budget

MARKER = "[AOP-TEST]"
DEPT_PREFIX = "AOP Test Dept - "
CC_PREFIX = "AOP Test CC - "
LAKH = 100_000

COMPANY = "PW"
PARENT_COST_CENTER = "Vidyapeeth - PW"

MASTERS = {
    # key: (budget, utilized)
    "Healthy": {"dept": (50 * LAKH, 10 * LAKH), "cc": (40 * LAKH, 5 * LAKH)},
    "Tight": {"dept": (20 * LAKH, 12 * LAKH), "cc": (10 * LAKH, 7 * LAKH)},
}


def _log(msg):
    print(msg)


def _people():
    """An employee, designation and branch the site already uses on a requisition."""
    row = frappe.db.sql(
        """select jr.designation, jr.requested_by, pd.location, pd.reporting_manager
		from `tabJob Requisition` jr join `tabPosition Details` pd on pd.parent = jr.name
		where jr.company = %s and pd.location is not null and pd.reporting_manager is not null
		  and jr.description not like %s
		order by jr.creation limit 1""",
        (COMPANY, f"%{MARKER}%"),
        as_dict=True,
    )
    if not row:
        frappe.throw(
            "No existing requisition to borrow a designation / employee / branch from."
        )
    return row[0]


def _ensure_cost_center(key):
    name = frappe.db.get_value(
        "Cost Center", {"cost_center_name": CC_PREFIX + key, "company": COMPANY}
    )
    if name:
        return name
    cc = frappe.get_doc(
        {
            "doctype": "Cost Center",
            "cost_center_name": CC_PREFIX + key,
            "parent_cost_center": PARENT_COST_CENTER,
            "company": COMPANY,
            "is_group": 0,
        }
    )
    cc.insert(ignore_permissions=True)
    return cc.name


def _ensure_department(key, cost_center):
    name = frappe.db.get_value(
        "Department", {"department_name": DEPT_PREFIX + key, "company": COMPANY}
    )
    if not name:
        dept = frappe.get_doc(
            {
                "doctype": "Department",
                "department_name": DEPT_PREFIX + key,
                "company": COMPANY,
            }
        )
        dept.insert(ignore_permissions=True)
        name = dept.name
    frappe.db.set_value(
        "Department", name, budget.DEPARTMENT_COST_CENTER_FIELD, cost_center
    )
    return name


def _set_budget(doctype, name, amounts):
    frappe.db.set_value(
        doctype,
        name,
        {
            budget.BUDGET_FIELD: amounts[0],
            budget.UTILIZATION_FIELD: amounts[1],
        },
    )


def _make_requisition(people, *, title, department, salary_lakh, status, allocations):
    """`allocations`: one entry per position — a list of (cost center, %) or None."""
    req = frappe.new_doc("Job Requisition")
    req.company = COMPANY
    req.department = department
    req.designation = people.designation
    req.requested_by = people.requested_by
    req.status = "Draft"
    req.posting_date = today()
    # Today, not later: future dates are refused unless Recruitment Settings allows them.
    req.expected_by = today()
    req.custom_hiring_type = "Lateral"
    req.custom_salary_range_currency = "INR"
    req.custom_salary_timeframe = "Annual"
    req.custom_salary_range_min = str(int(salary_lakh * LAKH * 0.8))
    req.custom_salary_range_max = str(int(salary_lakh * LAKH))
    req.no_of_positions = len(allocations)
    req.description = f"{MARKER} {title}"
    req.reason_for_requesting = f"{title} — test record for the AOP budget check."
    for split in allocations:
        req.append(
            "custom_position_details",
            {
                "location": people.location,
                "reporting_manager": people.reporting_manager,
                "vacancy_type": "New",
                "cost_center_allocations": (
                    json.dumps(
                        [{"cost_center": cc, "percentage": pct} for cc, pct in split]
                    )
                    if split
                    else ""
                ),
            },
        )
    req.insert(ignore_permissions=True)
    if status != "Draft":
        # Status written at db level so no approval flow starts for a test record.
        frappe.db.set_value("Job Requisition", req.name, "status", status)
    _log(f"  {req.name}  {status:<16} {title}")
    return req.name


FUNCTIONAL_AREA = "AOP_TEST_FA"
DESIGNATION_NAME = "AOP_TEST_EXEC"
DESIGNATION_TITLE = "AOP Test Executive"
# One designation per test department: the requisition form lists only the chosen
# department's Active designations, and takes the functional area from the designation.
DESIGNATIONS = {"Healthy": "AOP_TEST_EXEC_HEALTHY", "Tight": "AOP_TEST_EXEC_TIGHT"}


def _ensure(doctype, name, values):
    if not frappe.db.exists(doctype, name):
        frappe.get_doc({"doctype": doctype, **values}).insert(ignore_permissions=True)
        _log(f"  created {doctype} {name}")
    return name


def _ensure_designations(dept):
    """A designation, with its functional area, under each test department."""
    _ensure(
        "Functional Area",
        FUNCTIONAL_AREA,
        {
            "functional_area_code": FUNCTIONAL_AREA,
            "functional_area_name": "AOP Test Functional Area",
            "status": "Active",
        },
    )
    _ensure(
        "Designation Name",
        DESIGNATION_NAME,
        {"designation_code": DESIGNATION_NAME, "designation_name": DESIGNATION_TITLE},
    )
    for key, code in DESIGNATIONS.items():
        _ensure(
            "Designation",
            code,
            {
                "custom_designation_code": code,
                "custom_company": COMPANY,
                "custom_designation": DESIGNATION_NAME,
                "custom_designation_title": f"{DESIGNATION_TITLE} ({key})",
                "designation_name": f"{DESIGNATION_TITLE} ({key})",
                "custom_department": dept[key],
                "custom_functional_area": FUNCTIONAL_AREA,
                "custom_status": "Active",
            },
        )


def add_designations():
    """Add only the designations / functional area to an already-seeded site."""
    dept = {
        key: frappe.db.get_value(
            "Department", {"department_name": DEPT_PREFIX + key, "company": COMPANY}
        )
        for key in MASTERS
    }
    if not all(dept.values()):
        frappe.throw("The AOP test departments don't exist yet — run the seed first.")
    _ensure_designations(dept)
    frappe.db.commit()


def run():
    if frappe.get_all(
        "Job Requisition", filters={"description": ["like", f"%{MARKER}%"]}, limit=1
    ):
        _log("AOP test data already exists — run cleanup first to recreate it.")
        return report()

    people = _people()

    _log("Masters")
    cc = {key: _ensure_cost_center(key) for key in MASTERS}
    dept = {key: _ensure_department(key, cc[key]) for key in MASTERS}
    for key in MASTERS:
        _log(f"  {dept[key]}  /  {cc[key]}")
    _ensure_designations(dept)

    # Requisitions are raised while nothing is budgeted yet ...
    budget_setting = frappe.db.get_single_value(
        "Recruitment Settings", budget.SETTING_FIELD
    )
    frappe.db.set_single_value("Recruitment Settings", budget.SETTING_FIELD, 0)

    _log("Requisitions")
    _make_requisition(
        people,
        title="R1 Within budget",
        department=dept["Healthy"],
        salary_lakh=6,
        status="Approval Pending",
        allocations=[None, None],
    )
    _make_requisition(
        people,
        title="R2 Over department and cost center budget",
        department=dept["Tight"],
        salary_lakh=5,
        status="Approved Draft",
        allocations=[None, None],
    )
    _make_requisition(
        people,
        title="R3 Cost center split over budget",
        department=dept["Healthy"],
        salary_lakh=4,
        status="Approval Pending",
        allocations=[[(cc["Healthy"], 50), (cc["Tight"], 50)], [(cc["Tight"], 100)]],
    )
    _make_requisition(
        people,
        title="R4 Archived (never flagged)",
        department=dept["Tight"],
        salary_lakh=9,
        status="Archived",
        allocations=[None, None],
    )
    _make_requisition(
        people,
        title="R5 Draft (never flagged)",
        department=dept["Tight"],
        salary_lakh=9,
        status="Draft",
        allocations=[None, None],
    )

    # ... then Accounts "update" the budgets, the check is switched on, and the
    # nightly job runs once.
    for key, amounts in MASTERS.items():
        _set_budget("Department", dept[key], amounts["dept"])
        _set_budget("Cost Center", cc[key], amounts["cc"])
    frappe.db.set_single_value("Recruitment Settings", budget.SETTING_FIELD, 1)
    frappe.clear_cache()
    budget.refresh_over_budget_flags()
    frappe.db.commit()

    if not budget_setting:
        _log(
            "\nEnabled Recruitment Settings -> Enable AOP Budget Check (cleanup turns it off)."
        )
    return report()


def report():
    rows = frappe.get_all(
        "Job Requisition",
        filters={"description": ["like", f"%{MARKER}%"]},
        fields=[
            "name",
            "status",
            "department",
            "no_of_positions",
            "custom_salary_range_max",
            budget.OVER_BUDGET_FIELD,
            "description",
        ],
        order_by="description",
    )
    _log("\nMasters (budget / utilized / left)")
    for doctype, prefix, label in (
        ("Department", DEPT_PREFIX, "department_name"),
        ("Cost Center", CC_PREFIX, "cost_center_name"),
    ):
        for m in frappe.get_all(
            doctype,
            filters={label: ["like", f"{prefix}%"]},
            fields=["name", budget.BUDGET_FIELD, budget.UTILIZATION_FIELD],
            order_by="name",
        ):
            b, u = m[budget.BUDGET_FIELD], m[budget.UTILIZATION_FIELD]
            _log(
                f"  {doctype:<11} {m.name:<32} {b:>12,.0f} {u:>12,.0f} {b - u:>12,.0f}"
            )

    _log("\nRequisitions")
    for r in rows:
        flag = "OVER BUDGET" if r[budget.OVER_BUDGET_FIELD] else "-"
        _log(
            f"  {r.name}  {r.status:<16} {flag:<12} {r.description.replace(MARKER, '').strip()}"
        )
        for s in (
            budget.shortfalls(frappe.get_doc("Job Requisition", r.name))
            if r[budget.OVER_BUDGET_FIELD]
            else []
        ):
            _log(f"      • {s['summary']}")
    _log(
        f"\nSetting enabled: {bool(frappe.db.get_single_value('Recruitment Settings', budget.SETTING_FIELD))}"
    )


def _delete_requisitions(names):
    """Requisitions plus the assignment ToDos / Comments their insert left behind."""
    if not names:
        return
    frappe.db.delete(
        "ToDo", {"reference_type": "Job Requisition", "reference_name": ["in", names]}
    )
    frappe.db.delete(
        "Comment",
        {"reference_doctype": "Job Requisition", "reference_name": ["in", names]},
    )
    for name in names:
        frappe.delete_doc("Job Requisition", name, force=True, ignore_permissions=True)
        _log(f"  deleted {name}")


def cleanup():
    _delete_requisitions(
        frappe.get_all(
            "Job Requisition",
            filters={"description": ["like", f"%{MARKER}%"]},
            pluck="name",
        )
    )
    # Designations before their Designation Name / Functional Area and departments.
    masters = [("Designation", name) for name in DESIGNATIONS.values()]
    masters += [
        ("Designation Name", DESIGNATION_NAME),
        ("Functional Area", FUNCTIONAL_AREA),
    ]
    for doctype, field, prefix in (
        ("Department", "department_name", DEPT_PREFIX),
        ("Cost Center", "cost_center_name", CC_PREFIX),
    ):
        masters += [
            (doctype, name)
            for name in frappe.get_all(
                doctype, filters={field: ["like", f"{prefix}%"]}, pluck="name"
            )
        ]
    for doctype, name in masters:
        if not frappe.db.exists(doctype, name):
            continue
        try:
            frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
            _log(f"  deleted {doctype} {name}")
        except Exception as exc:
            _log(f"  could not delete {doctype} {name}: {exc}")
    frappe.db.set_single_value("Recruitment Settings", budget.SETTING_FIELD, 0)
    budget.refresh_over_budget_flags()
    frappe.db.commit()
    _log("Cleanup done; Enable AOP Budget Check turned off.")
