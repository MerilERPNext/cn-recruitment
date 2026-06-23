import frappe


def _get_separation(variables):
	doc_info = (variables or {}).get("doc") or {}
	name = doc_info.get("name")
	if not name:
		return None
	if not frappe.db.exists("Employee Separation", name):
		return None
	return frappe.get_doc("Employee Separation", name)


def _bulk_decision(variables, answers_var, bulk_pos_key, bulk_neg_key, pos_value, neg_value):
	if not answers_var:
		return None
	ans = (variables or {}).get(answers_var) or {}
	if not isinstance(ans, dict):
		return None
	if bulk_pos_key and ans.get(bulk_pos_key):
		return pos_value
	if bulk_neg_key and ans.get(bulk_neg_key):
		return neg_value
	return None


def apply_expense_decisions(variables=None, answers_var=None, bulk_pos_key=None, bulk_neg_key=None, **kwargs):
	sep = _get_separation(variables)
	if not sep:
		return {"approved": 0, "rejected": 0, "skipped": 0, "errors": ["Employee Separation not found"]}

	bulk = _bulk_decision(variables, answers_var, bulk_pos_key, bulk_neg_key, "Approve", "Reject")

	result = {"approved": 0, "rejected": 0, "skipped": 0, "errors": []}
	for row in (sep.custom_pending_expense_claims or []):
		decision = bulk or (row.status or "").strip()
		if bulk:
			frappe.db.set_value("Pending Expense Claim Detail", row.name, "status", bulk, update_modified=False)
		if decision not in ("Approve", "Reject"):
			result["skipped"] += 1
			continue
		if not row.expense_claim or not frappe.db.exists("Expense Claim", row.expense_claim):
			result["errors"].append(f"Expense Claim {row.expense_claim or '?'} missing")
			continue
		try:
			ec = frappe.get_doc("Expense Claim", row.expense_claim)
			if decision == "Approve":
				if ec.docstatus == 0:
					ec.approval_status = "Approved"
					ec.submit()
					result["approved"] += 1
				else:
					result["skipped"] += 1
			else:
				if ec.docstatus == 0:
					ec.approval_status = "Rejected"
					ec.submit()
					result["rejected"] += 1
				elif ec.docstatus == 1 and ec.approval_status == "Approved":
					ec.cancel()
					result["rejected"] += 1
				else:
					result["skipped"] += 1
		except Exception as e:
			result["errors"].append(f"{row.expense_claim}: {e}")
			frappe.log_error(
				message=frappe.get_traceback(),
				title=f"Separation Expense Decision Error ({row.expense_claim})",
			)

	frappe.db.commit()
	return result


def apply_leave_attendance_decisions(variables=None, answers_var=None, bulk_pos_key=None, bulk_neg_key=None, **kwargs):
	sep = _get_separation(variables)
	if not sep:
		return {"approved": 0, "rejected": 0, "skipped": 0, "errors": ["Employee Separation not found"]}

	bulk = _bulk_decision(variables, answers_var, bulk_pos_key, bulk_neg_key, "Approve", "Reject")

	result = {"approved": 0, "rejected": 0, "skipped": 0, "errors": []}
	for row in (sep.custom_pending_leave_attendance or []):
		decision = bulk or (row.status or "").strip()
		if bulk:
			frappe.db.set_value("Pending Leave Attendance Detail", row.name, "status", bulk, update_modified=False)
		if decision not in ("Approve", "Reject"):
			result["skipped"] += 1
			continue
		if not row.reference_type or not row.reference_name or not frappe.db.exists(row.reference_type, row.reference_name):
			result["errors"].append(f"{row.reference_type or '?'} {row.reference_name or '?'} missing")
			continue
		new_status = "Approved" if decision == "Approve" else "Rejected"
		try:
			ref = frappe.get_doc(row.reference_type, row.reference_name)
			if ref.docstatus != 0:
				result["skipped"] += 1
				continue
			if row.reference_type == "Leave Application":
				ref.status = new_status
				ref.submit()
			else:
				ref.custom_status = new_status
				ref.save(ignore_permissions=True)
				ref.submit()
			if decision == "Approve":
				result["approved"] += 1
			else:
				result["rejected"] += 1
		except Exception as e:
			result["errors"].append(f"{row.reference_name}: {e}")
			frappe.log_error(
				message=frappe.get_traceback(),
				title=f"Separation Leave/Attendance Decision Error ({row.reference_name})",
			)

	frappe.db.commit()
	return result


def apply_attendance_regularization(variables=None, answers_var=None, bulk_pos_key=None, bulk_neg_key=None, **kwargs):
	sep = _get_separation(variables)
	if not sep:
		return {"marked_present": 0, "skipped": 0, "errors": ["Employee Separation not found"]}

	bulk = _bulk_decision(variables, answers_var, bulk_pos_key, bulk_neg_key, "Mark Present", "Keep Absent")

	result = {"marked_present": 0, "skipped": 0, "errors": []}
	for row in (sep.custom_absent_days or []):
		action = bulk or (row.status or "").strip()
		if bulk:
			frappe.db.set_value("Absent Day Detail", row.name, "status", bulk, update_modified=False)
		if action != "Mark Present":
			result["skipped"] += 1
			continue
		if not row.attendance or not frappe.db.exists("Attendance", row.attendance):
			result["errors"].append(f"Attendance {row.attendance or '?'} missing")
			continue
		try:
			att = frappe.get_doc("Attendance", row.attendance)
			if att.docstatus != 1 or att.status != "Absent":
				result["skipped"] += 1
				continue
			att.cancel()
			present = frappe.new_doc("Attendance")
			present.employee = att.employee
			present.employee_name = att.employee_name
			present.attendance_date = att.attendance_date
			present.company = att.company
			present.department = att.department
			present.shift = att.shift
			present.status = "Present"
			present.insert(ignore_permissions=True)
			present.submit()
			result["marked_present"] += 1
		except Exception as e:
			result["errors"].append(f"{row.attendance}: {e}")
			frappe.log_error(
				message=frappe.get_traceback(),
				title=f"Separation Attendance Regularization Error ({row.attendance})",
			)

	frappe.db.commit()
	return result
