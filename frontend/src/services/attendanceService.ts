// services/attendanceService.ts
import FrappeAPI from "../utils/frappeAPI";
import type {
  AllEventsAndAttendanceT,
  Attendance,
  AttendanceRecord,
  AttendanceRequest,
  AttendanceRequestValidations,
  CanShowClockIn,
  EmployeeCheckInLog,
  EmployeeShift,
  EmployeeShiftSummary,
  IPRestrictionsT,
  Policy,
  PolicyQuestion,
  ShiftBlock,
  ShiftLocationT,
  UserRoles,
  WeeklyOff,
} from "../types/attendance";
import { FilterCondition } from "../types/frappe";

export const attendanceService = {
  getAllAttendance: async (
    fields?: string[],
    filters?: FilterCondition[]
  ): Promise<Attendance[]> => {
    const response = await FrappeAPI.getDocumentList("Attendance", {
      fields: fields && fields?.length > 0 ? fields : ["*"],
      filters: filters,
    });
    return response.data as Attendance[];
  },

  getHomeSummaryDetails: async (
    userId: string,
    filters?: string
  ): Promise<EmployeeCheckInLog[]> => {
    try {
      const response = await FrappeAPI.getMethod(
        "cn_leave_shift_managment.api.get_shift_checkins",
        {
          user: userId,
          filters: filters || "",
        }
      );
      return response as EmployeeCheckInLog[];
    } catch (error) {
      console.error("📡 Error marking notice as read:", error);
      throw error;
    }
  },
  getEmployeeShift: async (
    userId: string,
    filters?: object
  ): Promise<EmployeeShift> => {
    try {
      const response = await FrappeAPI.getMethod(
        "cn_leave_shift_managment.api.get_employee_shift",
        {
          user: userId,
          filters: filters,
        }
      );
      return response as EmployeeShift;
    } catch (error) {
      console.error("📡 Error in fetching employee shift:", error);
      throw error;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEmployeeDeviceId: async (): Promise<any> => {
    try {
      const response = await FrappeAPI.getMethod(
        "cn_leave_shift_managment.api.get_employee_device_id"
      );
      return response;
    } catch (error) {
      console.error("📡 Error in fetching employee device id:", error);
      throw error;
    }
  },

  getQuickAttendanceSummary: async (
    employeeId: string,
    fromDate: string,
    toDate: string
  ): Promise<EmployeeShiftSummary> => {
    try {
      const response = await FrappeAPI.getMethod(
        "cn_leave_shift_managment.api.get_quick_summary",
        {
          employee: employeeId,
          from_date: fromDate,
          to_date: toDate,
        }
      );
      return response as EmployeeShiftSummary;
    } catch (error) {
      console.error("📡 Error fetching quick attendance summary:", error);
      throw error;
    }
  },

  checkInOutService: async (
    body: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.api.create_employee_checkin",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },
  editAttendance: async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.attendance.delete_and_recreate_attendance_from_leave_application",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },
  canShowClockIn: async (
    params: Record<string, unknown>
  ): Promise<CanShowClockIn> => {
    try {
      const response = await FrappeAPI.getMethod(
        "cn_leave_shift_managment.api.can_show_web_clockin",
        params
      );
      return response as CanShowClockIn;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },
  employeeCheckInDetails: async (
    filters?: FilterCondition[]
  ): Promise<EmployeeCheckInLog[]> => {
    try {
      const response = await FrappeAPI.getDocumentList("Employee Checkin", {
        filters: filters,
        fields: ["*"],
      });
      return response?.data as EmployeeCheckInLog[];
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },
  clockInOutService: async (
    body: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.api.create_employee_clockin",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while clocking in:", error);
      throw error;
    }
  },

  //for checking attachment is mandatory or not
  checkAttachmentMandatory: async (
    empId: string | null | undefined,
    date: string | null,
    request_type: string
  ): Promise<AttendanceRequestValidations> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.api.check_attachment_mandatory",
        {
          employee: empId,
          date,
          request_type,
        }
      );
      return response as AttendanceRequestValidations;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },

  setEmployeeDeviceId: async (
    body: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.api.set_employee_device_id",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while setting device id:", error);

      // Handle specific 417 error - Expectation Failed
      // Check for various ways the error might be structured
      let is417Error = false;

      if (error && typeof error === "object") {
        // Check for Axios error structure
        if (
          "response" in error &&
          error.response &&
          typeof error.response === "object"
        ) {
          const response = error.response as { status?: number };
          if (response.status === 417) {
            is417Error = true;
          }
        }

        // Check for error status property directly
        if ("status" in error && error.status === 417) {
          is417Error = true;
        }

        // Check for error code property
        if ("code" in error && error.code === 417) {
          is417Error = true;
        }
      }

      if (is417Error) {
        console.warn(
          "📡 Device ID setting not supported or endpoint not available (417 Expectation Failed) - skipping"
        );
        // Return false instead of throwing to prevent app crash
        return false;
      }

      throw error;
    }
  },
  getAllEventsAndAttendance: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: any
  ): Promise<AttendanceRecord[]> => {
    try {
      console.log("📅 Calling get_events with filters:", filters);
      const response = await FrappeAPI.callMethod(
        `cn_leave_shift_managment.get_events`,
        filters
      );
      console.log("📅 Successfully got events response:", response);
      return response as AttendanceRecord[];
    } catch (error) {
      console.error("📡 Error while getting events and attendance:", error);

      // Enhanced error logging for debugging
      if (error && typeof error === "object") {
        console.log("🔍 Error object structure:", {
          hasResponse: "response" in error,
          hasStatus: "status" in error,
          hasCode: "code" in error,
          errorKeys: Object.keys(error),
          response: "response" in error ? error.response : undefined,
        });
      }

      // Handle specific 417 error - likely from device ID setting within the API
      // Check for various ways the error might be structured
      let is417Error = false;
      let errorStatus = null;
      if (error && typeof error === "object") {
        // Check for Axios error structure
        if (
          "response" in error &&
          error.response &&
          typeof error.response === "object"
        ) {
          const response = error.response as { status?: number };
          errorStatus = response.status;
          if (response.status === 417) {
            is417Error = true;
          }
        }

        if ("status" in error && error.status === 417) {
          is417Error = true;
          errorStatus = error.status;
        }

        // Check for error code property
        if ("code" in error && error.code === 417) {
          is417Error = true;
          errorStatus = error.code;
        }
      }

      console.log(
        `🔍 Error status detected: ${errorStatus}, is417Error: ${is417Error}`
      );

      if (is417Error) {
        console.warn(
          "📡 Device ID setting failed within get_events API (417 Expectation Failed) - returning empty array"
        );
        // Return empty array instead of throwing to prevent app crash
        return [];
      }

      throw error;
    }
  },

  getPolicyForDate: async (
    filters: AllEventsAndAttendanceT
  ): Promise<string> => {
    try {
      const response = await FrappeAPI.callMethod(
        `cn_leave_shift_managment.api._get_policy_for_date`,
        filters
      );
      return response as string;
    } catch (error) {
      console.error("📡 Error while setting device id:", error);
      throw error;
    }
  },
  getAttendancePolicies: async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: any
  ): Promise<PolicyQuestion> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.cn_leave_shift_managment.doctype.policy_question.policy_question.get_policy_questions",
        filters
      );
      return response as PolicyQuestion;
    } catch (error) {
      console.error("📡 Error while setting device id:", error);
      throw error;
    }
  },

  getAllAttendanceRequests: async (
    pageSize: number | string,
    filters?: FilterCondition[]
  ): Promise<AttendanceRequest[]> => {
    const response = await FrappeAPI.getDocumentList("Attendance Request", {
      fields: ["*"],
      filters: filters,
      limit: Number(pageSize),
      orderBy: "creation desc",
    });
    return response.data as AttendanceRequest[];
  },
  getAttendanceById: async (
    filters?: FilterCondition[]
  ): Promise<Attendance[]> => {
    const response = await FrappeAPI.getDocumentList("Attendance", {
      fields: ["*"],
      filters: filters,
      orderBy: "creation desc",
    });
    return response.data as Attendance[];
  },
  getUserRoles: async (filters?: FilterCondition[]): Promise<UserRoles> => {
    const response = await FrappeAPI.callMethod(
      "cn_leave_shift_managment.api.get_user_roles",
      {
        fields: ["*"],
        filters: filters,
        orderBy: "creation desc",
      }
    );
    return response as UserRoles;
  },
  getToDoWithReferenceDoc: async (todo_id?: string): Promise<any> => {
    const response = await FrappeAPI.callMethod(
      "cn_hrms_core.api.get_reference_doc",
      {
        todo_id: todo_id,
      }
    );
    return response;
  },

  getAttendance: async (filters?: FilterCondition[]): Promise<Attendance[]> => {
    const response = await FrappeAPI.getDocumentList("Attendance", {
      fields: ["*"],
      filters,
    });
    return response.data as Attendance[];
  },
  getLeaveType: async (filters?: FilterCondition[]): Promise<[]> => {
    const response = await FrappeAPI.getDocumentList("Leave Type", {
      fields: ["*"],
      filters,
    });
    return response.data as [];
  },

  createAttendanceRequest: async (
    body: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await FrappeAPI.createDocument(
        "Attendance Request",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while Adding attendance request in:", error);
      throw error;
    }
  },

  reqValidationsForAttendanceRequest: async (
    empId: string
  ): Promise<AttendanceRequestValidations> => {
    try {
      const response = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.cn_leave_shift_managment.overrides.attendace_request.get_active_attendance_policy",
        {
          employee: empId,
        }
      );
      return response as AttendanceRequestValidations;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },

  actionOnAttendanceRequest: async (
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

  plannedOvertimeAllowed: async (empId: string): Promise<boolean> => {
    try {
      const res = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.cn_leave_shift_managment.doctype.planned_overtime_request.planned_overtime_request.planned_overtime_allowed",
        {
          employee: empId,
        }
      );
      return res as boolean;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },
  addAttendanceAssignment: async (
    empId: string,
    data: object
  ): Promise<boolean> => {
    try {
      const res = await FrappeAPI.callMethod(
        "cn_leave_shift_managment.api.assign_shift",
        {
          employees: JSON.stringify([empId]),
          assignment_data: JSON.stringify(data),
        }
      );
      return res as boolean;
    } catch (error) {
      console.error("📡 Error while checking in:", error);
      throw error;
    }
  },
  plannedOvertimeRequestAttachments: async (empId: string) => {
    return FrappeAPI.callMethod(
      "cn_leave_shift_managment.cn_leave_shift_managment.doctype.planned_overtime_request.planned_overtime_request.attest",
      {
        employee: empId,
      }
    );
  },

  createPlannedOvertimeRequest: async (
    body: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await FrappeAPI.createDocument(
        "Planned Overtime Request",
        body
      );
      return response as boolean;
    } catch (error) {
      console.error("📡 Error while Planned Overtime Request in:", error);
      throw error;
    }
  },
};

export const getAllAttendancePolicies = async (
  filters?: FilterCondition[]
): Promise<{ data: Policy[] }> => {
  const res = await FrappeAPI.getDocumentList("Attendance Policies", {
    filters: filters,
    orderBy: "creation desc",
  });
  return {
    data: res.data as Policy[], // Return the expected format
  };
};
export const getAllWeekOffs = async (
  filters?: FilterCondition[]
): Promise<{ data: WeeklyOff[] }> => {
  const res = await FrappeAPI.getDocumentList("Week Off", {
    filters: filters,
    fields: ["*"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as WeeklyOff[], // Return the expected format
  };
};
export const getAllIpRestrictions = async (
  filters?: FilterCondition[]
): Promise<{ data: IPRestrictionsT[] }> => {
  const res = await FrappeAPI.getDocumentList("IP Restrictions", {
    filters: filters,
    fields: ["*"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as IPRestrictionsT[], // Return the expected format
  };
};
export const getAllShiftLocations = async (
  filters?: FilterCondition[]
): Promise<{ data: ShiftLocationT[] }> => {
  const res = await FrappeAPI.getDocumentList("Shift Location", {
    filters: filters,
    fields: ["*"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as ShiftLocationT[], // Return the expected format
  };
};
export const getAllShiftBlocks = async (
  filters?: FilterCondition[]
): Promise<{ data: ShiftBlock[] }> => {
  const res = await FrappeAPI.getDocumentList("Shift Blocks", {
    filters: filters,
    fields: ["*"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as ShiftBlock[], // Return the expected format
  };
};
