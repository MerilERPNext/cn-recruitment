import FrappeAPI from "../utils/frappeAPI";
import type { LeaveRequest } from "../types/leaves";

// Add this to leaveService.ts
export interface LeaveBalance {
  type: string;
  entitled: number;
  availed: number;
  balance: number;
}

export const leaveService = {
  getMyLeaveRequests: async (employeeId: string): Promise<LeaveRequest[]> => {
    const result = await FrappeAPI.getDocumentList("Leave Application", {
      filters: [["employee", "=", employeeId]],
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

  getLeaveBalance: async (
    employeeId: string,
    date: string
  ): Promise<LeaveBalance[]> => {
    const response = await FrappeAPI.callMethod(
      "hrms.hr.doctype.leave_application.leave_application.get_leave_details",
      {
        employee: employeeId,
        date: date,
      }
    );
    return response as LeaveBalance[];
  },
};
