import FrappeAPI from "../utils/frappeAPI";
import type { LeaveRequest } from "../types/leaves";

import type { LeaveDetailsResponse, HolidayGroup } from "../types/leaves";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestCompOffLeave: async (body: any): Promise<any> => {
    const response = await fetch(`/api/resource/Compensatory Leave Request`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `Request failed with status ${response.status}`,
      }));
      throw new Error(error.message);
    }

    return response.json();
  },

  getLeaveBalance: async (
    employeeId: string,
    date: string
  ): Promise<LeaveDetailsResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.custom_get_leave_details",
      {
        employee: employeeId,
        date: date,
      }
    );

    return response as LeaveDetailsResponse;
  },

  getHolidays: async (employeeId: string): Promise<HolidayGroup[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_holidays",
      { employee: employeeId }
    );
    const typed = response as {
      message: { status: string; data: HolidayGroup[] };
    };
    return typed.message.data;
  },
};
