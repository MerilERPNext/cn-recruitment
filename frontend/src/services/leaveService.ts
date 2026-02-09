import FrappeAPI from "../utils/frappeAPI";
import type {
  AccrualJournalEntriesResponse,
  AccrualJournalMetadataResponse,
  AttendanceStatusResponse,
  ButtonStatusResponse,
  LeaveFieldResponse,
  LeavePassbookMetadataResponse,
  LeavePassbookResponse,
  LeaveReason,
  LeaveRequest,
  PolicyQuestionsResponse,
  TeamRequest,
} from "../types/leaves";
import { HolidayApiResponse } from "../types/leaves";
import type { LeaveBalanceResponse, HolidayGroup } from "../types/leaves";
import { CompOffResponse } from "../types/leaves";

export type AttendancePolicyResponse = {
  message: string;
};

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
    date: string,
    leaveType?: string
  ): Promise<LeaveBalanceResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.custom_get_leave_details",
      {
        employee: employeeId,
        date: date,
        ...(leaveType ? { leave_type: leaveType } : {}),
      }
    );

    return response as LeaveBalanceResponse;
  },

  getHolidays: async (
    employeeId: string,
    year: string
  ): Promise<HolidayGroup[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_holidays",
      { employee: employeeId, year }
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

  getAttendancePolicyForDate: async (
    employee: string | number,
    targetDate: string
  ): Promise<AttendancePolicyResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_attendance_policy_for_date_api",
      {
        employee: String(employee),
        target_date: targetDate,
      }
    );

    return response as AttendancePolicyResponse;
  },

  getPassbookTransactionMetadata: async (
    employeeId: string,
    leaveType: string
  ): Promise<LeavePassbookMetadataResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_passbook_metadata",
      {
        employee: employeeId,
        leave_type: leaveType,
      }
    );

    return response as LeavePassbookMetadataResponse;
  },

  getPassbookTransaction: async (
    employeeId: string,
    leaveType: string,
    cycleStart: string
  ): Promise<LeavePassbookResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_passbook_entries",
      {
        employee: employeeId,
        leave_type: leaveType,
        cycle_start: cycleStart,
      }
    );

    return response as LeavePassbookResponse;
  },

  getAccrualJournalMetadata: async (
    employeeId: string,
    leaveType: string
  ): Promise<AccrualJournalMetadataResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_accrual_journal_metadata",
      {
        employee: employeeId,
        leave_type: leaveType,
      }
    );

    return response as AccrualJournalMetadataResponse;
  },

  getAccrualJournalEntries: async (
    employeeId: string,
    leaveType: string,
    periodNumber: number
  ): Promise<AccrualJournalEntriesResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_accrual_journal_entries",
      {
        employee: employeeId,
        leave_type: leaveType,
        period_number: periodNumber,
      }
    );

    return response as AccrualJournalEntriesResponse;
  },

  getPolicyQuestions: async (
    doctypeName: string,
    targetDoctype: string
  ): Promise<PolicyQuestionsResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.doctype.policy_question.policy_question.get_policy_questions",
      {
        doctype_name: doctypeName,
        target_doctype: targetDoctype,
      }
    );

    return response as PolicyQuestionsResponse;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createLeaveApplication: async (leaveData: any) => {
    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.create_leave_application",
      {
        leave_data: leaveData,
      }
    );
  },

  getAttendanceStatus: async (
    employeeId: string,
    fromDate: string,
    toDate: string
  ): Promise<AttendanceStatusResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_attendance_status",
      {
        employee: employeeId,
        from_date: fromDate,
        to_date: toDate,
      }
    );

    return response as AttendanceStatusResponse;
  },

  updateRejectionReason: async (
    leaveApplicationId: string,
    reason: string
  ) => {
    if (!leaveApplicationId) {
      throw new Error("Leave Application ID is required");
    }
    return FrappeAPI.updateDocument("Leave Application", leaveApplicationId, {
      custom_rejection_reason: reason,
    });
  },

  isRejectionReasonMandatory: async (): Promise<{ message: boolean }> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.is_rejection_reason_mandatory"
    );
    return response as { message: boolean };
  },
};
