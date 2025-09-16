import FrappeAPI from "../utils/frappeAPI";
import type { LeaveRequest, TeamRequest } from "../types/leaves";
import { HolidayApiResponse } from "../types/leaves";
import type { LeaveDetailsResponse, HolidayGroup } from "../types/leaves";
import { CompOffResponse } from "../types/leaves";

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
    const typed = response as HolidayApiResponse;
    return typed.message.data;
  },

  getTeamRequests: async (): Promise<TeamRequest[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_applications"
    );
    return (response as TeamRequest[]).map((req) => ({
      ...req,
      id: req.name,
    }));
  },

  postTaskAction: async (
    todo_ids: string | string[],
    selected_action: "Approve" | "Reject"
  ) => {
    return FrappeAPI.callMethod(
      "nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.action_api_handler",
      {
        todo_ids: Array.isArray(todo_ids) ? todo_ids : [todo_ids],
        selected_action,
      }
    );
  },

  getCompOffList: async (employeeId: string): Promise<CompOffResponse[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.overtime.get_employee_compoff_with_pay_status",
      {
        employee: employeeId,
      }
    );

    return response as CompOffResponse[];
  },

  payCompOff: async (comp_off_name: string) => {
    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.compoff_sandwich.create_leave_encashment",
      {
        comp_off_name,
      }
    );
  },
};
