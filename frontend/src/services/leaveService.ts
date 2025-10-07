import FrappeAPI from "../utils/frappeAPI";
import type {
  ButtonStatusResponse,
  LeaveFieldResponse,
  LeaveReason,
  LeaveRequest,
  TeamRequest,
} from "../types/leaves";
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
        "docstatus",
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

  getLeaveRequestFields: async (
    leaveType: string,
    fromDate: string,
    toDate: string
  ): Promise<LeaveFieldResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_application_field_config",
      {
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
      }
    );

    return response as LeaveFieldResponse;
  },

  getLeaveReason: async (): Promise<LeaveReason[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_application_reasons"
    );
    return response as LeaveReason[];
  },

  getButtonsStatus: async (employee: string): Promise<ButtonStatusResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.custom_apis.get_leave_application_buttons",
      {
        employee,
      }
    );
    return response as ButtonStatusResponse;
  },

  replaceLeave: async (params: {
    leave_application: string;
    new_leave_type?: string;
    first_half_leave_type?: string;
    second_half_leave_type?: string;
  }) => {
    const {
      leave_application,
      new_leave_type,
      first_half_leave_type,
      second_half_leave_type,
    } = params;

    if (!leave_application) {
      throw new Error("leave_application is required");
    }

    if (new_leave_type && !first_half_leave_type && !second_half_leave_type) {
      return FrappeAPI.callMethod(
        "cn_leave_shift_managment.custom_apis.replace_leave_application",
        {
          leave_application,
          new_leave_type,
        }
      );
    }

    if (first_half_leave_type && second_half_leave_type && !new_leave_type) {
      return FrappeAPI.callMethod(
        "cn_leave_shift_managment.custom_apis.replace_half_day_leave_application",
        {
          leave_application,
          first_half_leave_type,
          second_half_leave_type,
        }
      );
    }

    throw new Error(
      "Invalid parameters provided. Pass either new_leave_type OR both first_half_leave_type and second_half_leave_type."
    );
  },

  revokeApproved: async (leave_application_name: string) => {
    if (!leave_application_name) {
      throw new Error("leave_application_name is required");
    }

    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.custom_apis.force_cancel_leave_application",
      {
        leave_application_name,
      }
    );
  },

  editApproved: async (
    leave_application: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new_values: string | Record<string, any>
  ) => {
    if (!leave_application) {
      throw new Error("leave_application is required");
    }

    if (!new_values) {
      throw new Error("new_values is required");
    }

    const formattedValues =
      typeof new_values === "string" ? new_values : JSON.stringify(new_values);

    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.custom_apis.handle_edit_approved_application",
      {
        leave_application,
        new_values: formattedValues,
      }
    );
  },
};
