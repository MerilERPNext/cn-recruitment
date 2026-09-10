/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Checks whether a value represents a non-empty string or array.
 */
const hasValue = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 && trimmed !== "—" && trimmed !== "-" && trimmed.toLowerCase() !== "not assigned";
  }
  if (Array.isArray(val)) {
    return val.length > 0;
  }
  if (typeof val === "number") {
    return val > 0;
  }
  return false;
};

/**
 * Determines whether a task or request item is assigned or unassigned,
 * matching how the "Assigned To" column is resolved across all My Request pages
 * (including multi-level approval hierarchies).
 *
 * @param rawItem The request object, todo item, or row data.
 * @returns true if the task has a valid assignee; false if unassigned.
 */
export const isTaskAssigned = (rawItem: any): boolean => {
  if (!rawItem) return false;

  // If item wraps a todo list (e.g. Loans, Benefits), check unwrapped items too
  const candidates: any[] = [rawItem];
  if (Array.isArray(rawItem.todo_list) && rawItem.todo_list.length > 0) {
    candidates.push(...rawItem.todo_list);
  }
  if (rawItem.todo && typeof rawItem.todo === "object") {
    candidates.push(rawItem.todo);
  }
  if (rawItem.data && typeof rawItem.data === "object") {
    candidates.push(rawItem.data);
  }

  for (const item of candidates) {
    if (!item) continue;

    // 1. Check direct role_assigned_users (multi-level matrix)
    if (Array.isArray(item.role_assigned_users) && item.role_assigned_users.length > 0) {
      return true;
    }

    // 2. Check direct allocation fields
    if (hasValue(item.allocated_to)) return true;
    if (hasValue(item.allocated_roles)) return true;
    if (hasValue(item.allocated_to_emp_id)) return true;
    if (hasValue(item.assigned_to)) return true;
    if (typeof item.assigned_users_count === "number" && item.assigned_users_count > 0) return true;

    // 3. Multi-level approval stages status resolution (same as getAssignedUsersCell)
    const stages: any[] = item.approval_stages_status ?? [];
    if (stages.length > 0) {
      const fallback = stages[stages.length - 1];
      const activeStage = stages.find((s) => s.status?.toLowerCase() !== "approved") ?? fallback;

      if (activeStage) {
        // Role assigned users at active stage
        if (Array.isArray(activeStage.role_assigned_users) && activeStage.role_assigned_users.length > 0) {
          return true;
        }

        // Direct users allocated to active stage
        if (Array.isArray(activeStage.allocated_to) && activeStage.allocated_to.length > 0) {
          return true;
        }

        // Specific user/employee mapped to active stage
        if (hasValue(activeStage.user) || hasValue(activeStage.user_id) || hasValue(activeStage.employee_id)) {
          return true;
        }

        // Active stage user count
        const totalUsers = activeStage.assigned_users_count ?? activeStage.todo?.assigned_users_count;
        if (typeof totalUsers === "number" && totalUsers > 0) {
          return true;
        }

        // Active stage nested todo allocation
        if (activeStage.todo && isTaskAssigned(activeStage.todo)) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Extracts normalized action data and todo details from any request row/item format.
 */
export const extractRequestItemData = (rawItem: any) => {
  if (!rawItem) {
    return {
      todoId: "",
      actions: [] as string[],
      status: "",
      approvalType: "Approval Matrix" as const,
      openAssistant: false,
      referenceType: "",
      referenceName: "",
    };
  }

  const primary = rawItem?.todo_list?.[0] || rawItem?.todo || rawItem;

  const todoId =
    primary?.todo_id ||
    primary?.name ||
    rawItem?.todo_id ||
    rawItem?.name ||
    "";

  // Parse custom_doctype_actions which can be string array or JSON string or comma-separated
  let actions: string[] = [];
  const rawActions = primary?.custom_doctype_actions ?? rawItem?.custom_doctype_actions;
  if (Array.isArray(rawActions)) {
    actions = rawActions.map((a) => String(a).trim()).filter(Boolean);
  } else if (typeof rawActions === "string") {
    try {
      const parsed = JSON.parse(rawActions);
      if (Array.isArray(parsed)) {
        actions = parsed.map((a) => String(a).trim()).filter(Boolean);
      } else {
        actions = rawActions.split(",").map((a) => a.trim()).filter(Boolean);
      }
    } catch {
      actions = rawActions.split(",").map((a) => a.trim()).filter(Boolean);
    }
  }

  const status = String(
    primary?.status ||
    rawItem?.status ||
    primary?.todo_status ||
    rawItem?.todo_status ||
    ""
  );

  const approvalType = (
    primary?.custom_approval_type ||
    rawItem?.custom_approval_type ||
    "Approval Matrix"
  ) as "Approval Matrix" | "Multi Actions";

  const openAssistant = Boolean(
    primary?.custom_open_chatnext_assistant_on_action ??
    rawItem?.custom_open_chatnext_assistant_on_action
  );

  const referenceType = String(
    primary?.reference_type ||
    rawItem?.reference_type ||
    primary?.doctype ||
    rawItem?.doctype ||
    ""
  );

  const referenceName = String(
    primary?.reference_name ||
    rawItem?.reference_name ||
    primary?.docname ||
    rawItem?.docname ||
    ""
  );

  return {
    todoId,
    actions,
    status,
    approvalType,
    openAssistant,
    referenceType,
    referenceName,
  };
};
