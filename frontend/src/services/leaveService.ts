import FrappeAPI from "../utils/frappeAPI";
import { uploadReplaceLeaveAttachments } from "../components/Leaves/replaceLeaveHelper";
import type {
  AccrualJournalEntriesResponse,
  AccrualJournalMetadataResponse,
  AttendanceStatusResponse,
  ButtonStatusResponse,
  LeaveFieldResponse,
  LeaveHistoryEmployee,
  LeavePassbookMetadataResponse,
  LeavePassbookResponse,
  LeaveReason,
  LeaveRequest,
  PolicyQuestionsResponse,
  TeamRequest,
  LeaveDateRangeResponse,
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
    leaveType?: string,
  ): Promise<LeaveBalanceResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.custom_get_leave_details",
      {
        employee: employeeId,
        date: date,
        ...(leaveType ? { leave_type: leaveType } : {}),
      },
    );

    return response as LeaveBalanceResponse;
  },

  getHolidays: async (
    employeeId: string,
    year: string,
  ): Promise<HolidayGroup[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_holidays",
      { employee: employeeId, year },
    );
    const typed = response as HolidayApiResponse;
    return typed.message.data;
  },

  allowApplicationOfOptionalHolidaysForPastDates:
    async (): Promise<boolean> => {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.cn_leave_shift_managment.doctype.leave_settings.leave_settings.allow_application_of_optional_holidays_for_past_dates",
      );

      return response as boolean;
    },

  getTeamRequests: async (): Promise<TeamRequest[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_applications",
    );
    return (response as TeamRequest[]).map((req) => ({
      ...req,
      id: req.name,
    }));
  },

  postTaskAction: async (
    todo_ids: string | string[],
    selected_action: "Approve" | "Reject",
  ) => {
    return FrappeAPI.callMethod(
      "nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.action_api_handler",
      {
        todo_ids: Array.isArray(todo_ids) ? todo_ids : [todo_ids],
        selected_action,
      },
    );
  },

  getCompOffList: async (employeeId: string): Promise<CompOffResponse[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.overtime.get_employee_compoff_with_pay_status",
      {
        employee: employeeId,
      },
    );

    return response as CompOffResponse[];
  },

  payCompOff: async (comp_off_name: string) => {
    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.compoff_sandwich.create_leave_encashment",
      {
        comp_off_name,
      },
    );
  },

  getLeaveRequestFields: async (
    leaveType: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<LeaveFieldResponse> => {
    const params: Record<string, string> = {
      leave_type: leaveType,
    };
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;

    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_application_field_config",
      params,
    );

    return response as LeaveFieldResponse;
  },

  getLeaveReason: async (): Promise<LeaveReason[]> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_application_reasons",
    );
    return response as LeaveReason[];
  },

  getButtonsStatus: async (employee: string): Promise<ButtonStatusResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.custom_apis.get_leave_application_buttons",
      {
        employee,
      },
    );
    return response as ButtonStatusResponse;
  },

  replaceLeave: async (params: {
    leave_application: string;
    new_leave_type?: string;
    first_half_leave_type?: string;
    second_half_leave_type?: string;
    reason?: string;
    description?: string;
    attachment?: unknown;
    replaceBoth?: boolean;
  }) => {
    const {
      leave_application,
      new_leave_type,
      first_half_leave_type,
      second_half_leave_type,
      reason,
      description,
      attachment,
      replaceBoth,
    } = params;

    if (!leave_application) {
      throw new Error("leave_application is required");
    }

    // Upload first; backend receives File doc `name` only, never Form.io file objects
    const uploadedFileDocNames = await uploadReplaceLeaveAttachments(
      attachment,
      Boolean(replaceBoth),
    );

    const optionalFields: Record<string, string> = {};
    if (reason) {
      optionalFields.reason = reason;
    }
    if (description) {
      optionalFields.description = description;
    }

    if (new_leave_type && !first_half_leave_type && !second_half_leave_type) {
      const apiPayload: Record<string, string> = {
        leave_application,
        new_leave_type,
        ...optionalFields,
      };
      if (uploadedFileDocNames.attatchment) {
        apiPayload.attatchment = uploadedFileDocNames.attatchment;
      }
      return FrappeAPI.callMethod(
        "cn_leave_shift_managment.custom_apis.replace_leave_application",
        apiPayload,
      );
    }

    if (first_half_leave_type && second_half_leave_type && !new_leave_type) {
      const apiPayload: Record<string, string> = {
        leave_application,
        first_half_leave_type,
        second_half_leave_type,
        ...optionalFields,
      };
      if (uploadedFileDocNames.attatchment1) {
        apiPayload.attatchment1 = uploadedFileDocNames.attatchment1;
      }
      if (uploadedFileDocNames.attatchment2) {
        apiPayload.attatchment2 = uploadedFileDocNames.attatchment2;
      }
      return FrappeAPI.callMethod(
        "cn_leave_shift_managment.custom_apis.replace_half_day_leave_application",
        apiPayload,
      );
    }

    throw new Error(
      "Invalid parameters provided. Pass either new_leave_type OR both first_half_leave_type and second_half_leave_type.",
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
      },
    );
  },

  editApproved: async (
    leave_application: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new_values: string | Record<string, any>,
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
      },
    );
  },

  getAttendancePolicyForDate: async (
    employee: string | number,
    targetDate: string,
  ): Promise<AttendancePolicyResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_attendance_policy_for_date_api",
      {
        employee: String(employee),
        target_date: targetDate,
      },
    );

    return response as AttendancePolicyResponse;
  },

  getPassbookTransactionMetadata: async (
    employeeId: string,
    leaveType: string,
  ): Promise<LeavePassbookMetadataResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_passbook_metadata",
      {
        employee: employeeId,
        leave_type: leaveType,
      },
    );

    return response as LeavePassbookMetadataResponse;
  },

  getPassbookTransaction: async (
    employeeId: string,
    leaveType: string,
    cycleStart: string,
  ): Promise<LeavePassbookResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_leave_passbook_entries",
      {
        employee: employeeId,
        leave_type: leaveType,
        cycle_start: cycleStart,
      },
    );

    return response as LeavePassbookResponse;
  },

  getAccrualJournalMetadata: async (
    employeeId: string,
    leaveType: string,
  ): Promise<AccrualJournalMetadataResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_accrual_journal_metadata",
      {
        employee: employeeId,
        leave_type: leaveType,
      },
    );

    return response as AccrualJournalMetadataResponse;
  },

  getAccrualJournalEntries: async (
    employeeId: string,
    leaveType: string,
    periodNumber: number,
  ): Promise<AccrualJournalEntriesResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_accrual_journal_entries",
      {
        employee: employeeId,
        leave_type: leaveType,
        period_number: periodNumber,
      },
    );

    return response as AccrualJournalEntriesResponse;
  },

  getPolicyQuestions: async (
    doctypeName: string,
    targetDoctype: string,
  ): Promise<PolicyQuestionsResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.doctype.policy_question.policy_question.get_policy_questions",
      {
        doctype_name: doctypeName,
        target_doctype: targetDoctype,
      },
    );

    return response as PolicyQuestionsResponse;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createLeaveApplication: async (leaveData: any) => {
    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.create_leave_application",
      {
        leave_data: leaveData,
      },
    );
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createLeaveApplicationBatch: async (leaveData: any) => {
    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.create_leave_application_batch",
      {
        leave_data: leaveData,
      },
    );
  },

  getAttendanceStatus: async (
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AttendanceStatusResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_attendance_status",
      {
        employee: employeeId,
        from_date: fromDate,
        to_date: toDate,
      },
    );

    return response as AttendanceStatusResponse;
  },

  bulkUpdateRejectionReason: async (
    doctype: string,
    docnames: string[],
    comment: string,
  ) => {
    return FrappeAPI.callMethod(
      "recruitment.api.update_comment.update_comment",
      {
        doctype,
        docnames,
        fieldname: "custom_rejection_reason",
        comment,
      },
    );
  },

  updateRejectionReason: async (leaveApplicationId: string, reason: string) => {
    if (!leaveApplicationId) {
      throw new Error("Leave Application ID is required");
    }
    return FrappeAPI.updateDocument("Leave Application", leaveApplicationId, {
      custom_rejection_reason: reason,
    });
  },

  isRejectionReasonMandatory: async (): Promise<{ message: boolean }> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.is_rejection_reason_mandatory",
    );
    return response as { message: boolean };
  },

  checkAttachmentMandatory: async (
    leaveType: string,
  ): Promise<{ is_mandatory: number }> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.check_attachment_mandatory_for_leave",
      {
        leave_type: leaveType,
      },
    );
    return response as { is_mandatory: number };
  },

  getNumberOfLeaveDays: async (
    employee: string,
    leaveType: string,
    fromDate: string,
    toDate: string,
    individualDates: string,
  ): Promise<number> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.override.get_number_of_leave_days",
      {
        employee,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        individual_dates: individualDates,
      },
    );
    // Handle both { message: number } and number directly
    return typeof response === "object" &&
      response !== null &&
      "message" in response
      ? (response as { message: number }).message
      : (response as number);
  },

  getLeaveDateRange: async (
    employee: string,
    leaveType: string,
  ): Promise<LeaveDateRangeResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_leave_shift_managment.api.get_leave_application_date_range",
      {
        employee,
        leave_type: leaveType,
      },
    );
    return response as LeaveDateRangeResponse;
  },

  getLeaveHistory: async (year: string): Promise<LeaveHistoryEmployee[]> => {
    const response = await FrappeAPI.getMethod(
      "cn_leave_shift_managment.api.get_reportees_leave_applications",
      { year },
    );
    return response as LeaveHistoryEmployee[];
  },
};
