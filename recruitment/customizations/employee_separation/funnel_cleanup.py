import json

import frappe


def cleanup_separation_funnel_artifacts(doc, method=None):
  
    sep_name = doc.name
    if not sep_name:
        return

    task_names = set()
    workflow_names = set()
    fa_names = set()
    todo_names = []
    tracker_names = []

    fa_names.update(
        frappe.get_all(
            "Funnel Activity Log",
            filters={"doc_type": "Employee Separation", "doc_name": sep_name},
            pluck="parent",
        )
    )

    for tracker in frappe.get_all(
        "Approval Tracker",
        filters={"doc_type": "Employee Separation", "doc_name": sep_name},
        fields=["name", "task"],
    ):
        tracker_names.append(tracker.name)
        if tracker.task:
            task_names.add(tracker.task)

    for todo in frappe.get_all(
        "ToDo",
        filters={"reference_type": "Employee Separation", "reference_name": sep_name},
        fields=["name", "custom_funnel_task"],
    ):
        todo_names.append(todo.name)
        if todo.custom_funnel_task:
            task_names.add(todo.custom_funnel_task)

    if fa_names:
        for wf in frappe.get_all(
            "Funnel Activity", filters={"name": ["in", list(fa_names)]}, pluck="funnel_workflow"
        ):
            if wf:
                workflow_names.add(wf)
    if task_names:
        for wf in frappe.get_all(
            "Funnel Task", filters={"name": ["in", list(task_names)]}, pluck="workflow"
        ):
            if wf:
                workflow_names.add(wf)

    for wf in frappe.get_all(
        "Funnel Workflow", filters={"variables": ["like", f'%"{sep_name}"%']}, pluck="name"
    ):
        workflow_names.add(wf)

    workflow_names |= _expand_execution_groups(workflow_names)

    if workflow_names:
        wf_list = list(workflow_names)
        task_names.update(
            frappe.get_all("Funnel Task", filters={"workflow": ["in", wf_list]}, pluck="name")
        )
        fa_names.update(
            frappe.get_all(
                "Funnel Activity", filters={"funnel_workflow": ["in", wf_list]}, pluck="name"
            )
        )
    if task_names:
        task_list = list(task_names)
        seen_todos = set(todo_names)
        for td in frappe.get_all(
            "ToDo", filters={"custom_funnel_task": ["in", task_list]}, pluck="name"
        ):
            if td not in seen_todos:
                seen_todos.add(td)
                todo_names.append(td)

        seen_trackers = set(tracker_names)
        for tk in frappe.get_all(
            "Approval Tracker", filters={"task": ["in", task_list]}, pluck="name"
        ):
            if tk not in seen_trackers:
                seen_trackers.add(tk)
                tracker_names.append(tk)

    for name in todo_names:
        _safe_delete("ToDo", name)
    for name in tracker_names:
        _safe_delete("Approval Tracker", name)
    for name in fa_names:
        _safe_delete("Funnel Activity", name)
    for name in task_names:
        _safe_delete("Funnel Task", name)
    for name in workflow_names:
        _safe_delete("Funnel Workflow", name)


def _expand_execution_groups(workflow_names):
    extra = set()
    common_ids = set()
    for wf in workflow_names:
        variables_raw = frappe.db.get_value("Funnel Workflow", wf, "variables") or "{}"
        try:
            cid = json.loads(variables_raw).get("common_workflow_execution_id")
        except Exception:
            cid = None
        if cid:
            common_ids.add(cid)
    for cid in common_ids:
        extra.update(
            w
            for w in frappe.get_all(
                "Funnel Activity", filters={"common_execution_id": cid}, pluck="funnel_workflow"
            )
            if w
        )
        extra.update(
            frappe.get_all(
                "Funnel Workflow", filters={"variables": ["like", f"%{cid}%"]}, pluck="name"
            )
        )
    return extra


def _safe_delete(doctype, name):
    if not name or not frappe.db.exists(doctype, name):
        return
    try:
        frappe.delete_doc(
            doctype, name, force=1, ignore_permissions=True, delete_permanently=True
        )
    except Exception:
        frappe.log_error(
            title="Separation funnel cleanup failed",
            message=f"Could not delete {doctype} {name}\n{frappe.get_traceback()}",
        )
