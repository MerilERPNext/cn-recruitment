import FrappeAPI from "../utils/frappeAPI";
import type { LeaveRequest } from "../types/leaves";

export const leaveService = {
  getMyLeaveRequests: async (employeeId: string): Promise<LeaveRequest[]> => {
    const result = await FrappeAPI.getDocumentList("Leave Application", {
      filters: [["employee", "=", employeeId || "HR-EMP-00001"]],
      fields: [
        "name",
        "leave_type",
        "from_date",
        "to_date",
        "status",
        "employee_name",
        "description",
      ],
      orderBy: "creation desc",
      limit: 50,
    });
    return result.data as LeaveRequest[];
  },
};
