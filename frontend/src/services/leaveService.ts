import FrappeAPI from "../utils/frappeAPI";
import type { LeaveRequest } from "../types/leaves";

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

  requestCompOffLeave:async (body: any): Promise<any> => {
      try {
      const response = await fetch(`/api/resource/Compensatory Leave Request`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      return result
    } catch (error) {
      console.error('📡 Error archiving notice:', error);
      return false;
    }

  }
};
