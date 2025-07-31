import FrappeAPI from "../utils/frappeAPI";
import type { LeaveRequest } from "../types/leaves";
import { LeaveData } from "../hooks/useLeaves";

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

  requestCompOffLeave: async (body: any): Promise<any> => {
    const response = await fetch(`/api/resource/Compensatory Leave Request`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
      throw new Error(error.message);
    }

    return response.json();
  },
  getLeaveBalance: async (
    employeeId: string,
  ): Promise<LeaveData> => {
    const response = await FrappeAPI.callMethod(
      "hrms.api.get_leave_balance_map",
      {
        employee: employeeId,
      }
    );
    return response as LeaveData;
  },
};
