import FrappeAPI from "../utils/frappeAPI";
import type { OpenApprovalTodosResponse } from "../types/tasks";

export const tasksService = {
  getMyPendingCount: async (
    doctype: string,
    employeeId: string,
    extraParams: Record<string, unknown> = {},
  ): Promise<number> => {
    if (!employeeId) return 0;
    const response = (await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_open_approval_todos",
      {
        doctype,
        employee: employeeId,
        page_length: 1,
        start: 0,
        ...extraParams,
      },
    )) as OpenApprovalTodosResponse;

    const total =
      response?.message?.total_count ??
      response?.total_count ??
      response?.data?.total_count ??
      (Array.isArray(response?.message?.data) ? response.message.data.length : 0);

    return typeof total === "number" ? total : Number(total) || 0;
  },

  getAttendancePendingCount: (employeeId: string): Promise<number> => {
    return tasksService.getMyPendingCount("Attendance Request", employeeId, {
      custom_status: "Pending",
      filters: JSON.stringify({ custom_status: "Pending" }),
      order_by: "creation desc",
      todo_status: ["in", ["Open", "Closed"]],
    });
  },

  getLeavePendingCount: (employeeId: string): Promise<number> => {
    return tasksService.getMyPendingCount("Leave Application", employeeId, {
      status: "Open",
      filters: JSON.stringify({ status: "Open" }),
      order_by: "creation desc",
      todo_status: ["in", ["Open", "Closed"]],
    });
  },

  getExpensePendingCount: (employeeId: string): Promise<number> => {
    return tasksService.getMyPendingCount("Expense Claim", employeeId, {
      approval_status: "Pending",
      filters: JSON.stringify({ approval_status: "Pending" }),
      order_by: "creation desc",
      todo_status: ["in", ["Open", "Closed"]],
    });
  },
};
