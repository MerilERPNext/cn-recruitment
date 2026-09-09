import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AttendancePolicyResponse,
  leaveService,
} from "../services/leaveService";
import { CompOffResponse } from "../types/leaves";

import type {
  LeaveBalanceResponse,
  HolidayGroup,
  TeamRequest,
  LeaveFieldResponse,
  LeaveReason,
  ButtonStatusResponse,
  EditApprovedLeavePayload,
  LeavePassbookResponse,
  LeavePassbookMetadataResponse,
  AccrualJournalMetadataResponse,
  AccrualJournalEntriesResponse,
  PolicyQuestionsResponse,
  AttendanceStatusResponse,
  LeaveDateRangeResponse,
  LeaveHistoryItem,
  LeaveSettings,
} from "../types/leaves";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../utils/errorResponseFormater";

export type LeaveType = {
  allocated_leaves: number;
  balance_leaves: number;
};

export type LeaveData = {
  [leaveName: string]: LeaveType;
};

export type LeaveProgressProps = {
  leaveData: LeaveData;
};

export const useMyLeaveRequests = (
  employeeId: string | undefined,
  year?: string,
) => {
  return useQuery({
    queryKey: ["my-leave-requests", employeeId, year],
    queryFn: () => leaveService.getMyLeaveRequests(employeeId!, year),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetLeaveBalance = (
  employeeId: string | undefined,
  date: string,
  leaveType?: string,
) => {
  return useQuery<LeaveBalanceResponse>({
    queryKey: ["leave-balance", employeeId, date, leaveType],
    queryFn: () => {
      if (!employeeId) throw new Error("Employee ID is required");
      return leaveService.getLeaveBalance(employeeId, date, leaveType);
    },
    enabled: !!employeeId && !!date,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Leave balance of an arbitrary employee — e.g. the applicant an approver is
 * acting on. Unlike `useGetLeaveBalance` it drops the X-Target-Employee-Id
 * header, which the backend prefers over the employee argument: a sticky
 * "viewing as" session would otherwise return someone else's balance.
 */
export const useGetEmployeeLeaveBalance = (
  employeeId: string | undefined,
  date: string | undefined,
) => {
  return useQuery<LeaveBalanceResponse>({
    queryKey: ["leave-balance-employee", employeeId, date],
    queryFn: () =>
      leaveService.getLeaveBalance(employeeId!, date!, undefined, {
        skipTargetEmployee: true,
      }),
    enabled: !!employeeId && !!date,
    staleTime: 5 * 60 * 1000,
  });
};

export function useRequestCompOff() {
  const queryClient = useQueryClient();

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (body: any) => leaveService.requestCompOffLeave(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}

export const useGetHolidays = (
  employeeId: string | undefined,
  year: string,
) => {
  return useQuery<HolidayGroup[]>({
    queryKey: ["holidays", employeeId, year],
    queryFn: () => {
      if (!employeeId) throw new Error("Employee ID is required");
      return leaveService.getHolidays(employeeId, year);
    },
    enabled: !!employeeId && !!year,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });
};

export const useAllowApplicationOfOptionalHolidaysForPastDates = () => {
  return useQuery<boolean>({
    queryKey: ["allow-application-of-optional-holidays-for-past-dates"],
    queryFn: () => leaveService.allowApplicationOfOptionalHolidaysForPastDates(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useTeamRequests = () => {
  return useQuery<TeamRequest[], Error>({
    queryKey: ["teamRequests"],
    queryFn: leaveService.getTeamRequests,
    staleTime: 5 * 60 * 1000,
  });
};

export function usePostTaskAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      todo_ids,
      selected_action,
    }: {
      todo_ids: string | string[];
      selected_action: "Approve" | "Reject";
    }) => leaveService.postTaskAction(todo_ids, selected_action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamRequests"] });
    },
  });
}

export const useGetCompOffList = (employeeId: string | undefined) => {
  return useQuery<CompOffResponse[]>({
    queryKey: ["comp-off-list", employeeId],
    queryFn: () => {
      if (!employeeId) throw new Error("Employee ID is required");
      return leaveService.getCompOffList(employeeId);
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

export function usePayCompOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comp_off_name: string) =>
      leaveService.payCompOff(comp_off_name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comp-off-list"] });
    },
  });
}

export const useGetLeaveRequestFields = (
  leaveType?: string | undefined,
  fromDate?: string,
  toDate?: string,
) => {
  return useQuery<LeaveFieldResponse>({
    queryKey: ["leave-request-fields", leaveType, fromDate, toDate],
    queryFn: () => {
      if (!leaveType) {
        throw new Error("leaveType is required");
      }
      return leaveService.getLeaveRequestFields(leaveType, fromDate, toDate);
    },
    enabled: !!leaveType,
    staleTime: 0,
    refetchOnMount: "always",
  });
};

export const useGetLeaveReason = () => {
  return useQuery<LeaveReason[]>({
    queryKey: ["leave-reasons"],
    queryFn: () => leaveService.getLeaveReason(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetButtonsStatus = (employee: string) => {
  return useQuery<ButtonStatusResponse>({
    queryKey: ["leave-buttons-status", employee],
    queryFn: () => leaveService.getButtonsStatus(employee),
    enabled: !!employee,
    staleTime: 5 * 60 * 1000,
  });
};

export function useReplaceLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      leave_application: string;
      new_leave_type?: string;
      first_half_leave_type?: string;
      second_half_leave_type?: string;
      reason?: string;
      description?: string;
      attachment?: unknown;
      replaceBoth?: boolean;
    }) => leaveService.replaceLeave(params),

    onSuccess: () => {
      toast.dismiss();
      toast.success("Leave replaced successfully");

      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["custom-api"] });
      queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-calendar-details"], });
      queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      console.log("error leave request replace", err)
      toast.error(
        errorResponseFormater(err, "Failed to replace leave. Please try again.")
      );
    },
  });
}

export function useRevokeApprovedLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leave_application_name: string) =>
      leaveService.revokeApproved(leave_application_name),

    onSuccess: () => {
      toast.dismiss();
      toast.success("Leave revoked successfully");

      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["custom-api"] });
      queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
      queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-calendar-details"], });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      let errorMsg = "Failed to revoke leave. Please try again.";

      try {
        const raw = err?.response?.data?._server_messages;
        if (raw) {
          const messages = JSON.parse(raw);
          if (Array.isArray(messages) && messages.length > 0) {
            const firstMessage = JSON.parse(messages[0]);
            if (firstMessage?.message) {
              errorMsg = firstMessage.message.replace(/<[^>]*>/g, "").trim();
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse server error message:", e);
      }

      toast.error(errorMsg);
    },
  });
}

export function useEditApprovedLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: EditApprovedLeavePayload) =>
      leaveService.editApproved(params.leave_application, params.new_values),
    onSuccess: () => {
      toast.dismiss();
      toast.success("Leave updated successfully");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["custom-api"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      let errorMsg = "Failed to update leave. Please try again.";
      try {
        const raw = err?.response?.data?._server_messages;
        if (raw) {
          const messages = JSON.parse(raw);
          if (Array.isArray(messages) && messages.length > 0) {
            const firstMessage = JSON.parse(messages[0]);
            if (firstMessage?.message) {
              errorMsg = firstMessage.message.replace(/<[^>]*>/g, "").trim();
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse server error message:", e);
      }
      toast.error(errorMsg);
    },
  });
}

export const useGetAttendancePolicyForDate = (
  employee?: string | number,
  targetDate?: string,
) => {
  return useQuery<AttendancePolicyResponse>({
    queryKey: ["attendance-policy-for-date", employee, targetDate],
    queryFn: () => {
      if (!employee || !targetDate) {
        throw new Error("employee and targetDate are required");
      }
      return leaveService.getAttendancePolicyForDate(
        String(employee),
        targetDate,
      );
    },
    enabled: !!employee && !!targetDate,
    staleTime: 0,
    refetchOnMount: "always",
  });
};

export const useGetLeavePassbookMetadata = (
  employeeId: string | undefined,
  leaveType: string | undefined,
) => {
  return useQuery<LeavePassbookMetadataResponse>({
    queryKey: ["leave-passbook-metadata", employeeId, leaveType],
    queryFn: () =>
      leaveService.getPassbookTransactionMetadata(
        employeeId as string,
        leaveType as string,
      ),
    enabled: !!employeeId && !!leaveType,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetLeavePassbookTransaction = (
  employeeId: string | undefined,
  leaveType: string | undefined,
  cycleStart: string | undefined,
) => {
  return useQuery<LeavePassbookResponse>({
    queryKey: ["leave-passbook", employeeId, leaveType, cycleStart],
    queryFn: () => {
      if (!employeeId) throw new Error("Employee ID is required");
      if (!leaveType) throw new Error("Leave type is required");
      if (!cycleStart) throw new Error("Cycle start date is required");

      return leaveService.getPassbookTransaction(
        employeeId,
        leaveType,
        cycleStart,
      );
    },
    enabled: !!employeeId && !!leaveType && !!cycleStart,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetAccrualJournalMetadata = (
  employeeId: string | undefined,
  leaveType: string | undefined,
) => {
  return useQuery<AccrualJournalMetadataResponse>({
    queryKey: ["accrual-journal-metadata", employeeId, leaveType],
    queryFn: () => {
      if (!employeeId || !leaveType) {
        throw new Error("Employee ID and Leave Type are required");
      }
      return leaveService.getAccrualJournalMetadata(employeeId, leaveType);
    },
    enabled: !!employeeId && !!leaveType,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useGetAccrualJournalEntries = (
  employeeId: string | undefined,
  leaveType: string | undefined,
  periodNumber: number | null,
) => {
  return useQuery<AccrualJournalEntriesResponse>({
    queryKey: ["accrual-journal-entries", employeeId, leaveType, periodNumber],
    queryFn: () => {
      if (!employeeId || !leaveType || periodNumber === null) {
        throw new Error("Employee, leave type, and period are required");
      }

      return leaveService.getAccrualJournalEntries(
        employeeId,
        leaveType,
        periodNumber,
      );
    },
    enabled: !!employeeId && !!leaveType && periodNumber !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useGetPolicyQuestions = (
  doctypeName: string | undefined,
  targetDoctype: string | undefined,
) => {
  return useQuery<PolicyQuestionsResponse>({
    queryKey: ["policy-questions", doctypeName, targetDoctype],
    queryFn: () => {
      if (!doctypeName || !targetDoctype) {
        throw new Error("Doctype name and target doctype are required");
      }

      return leaveService.getPolicyQuestions(doctypeName, targetDoctype);
    },
    enabled: !!doctypeName && !!targetDoctype,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
};

export function useCreateLeaveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (leaveData: any) =>
      leaveService.createLeaveApplication(leaveData),

    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
        queryClient.invalidateQueries({
          queryKey: ["todo-approvals", "Leave Application"],
        });
        queryClient.invalidateQueries({
          queryKey: ["custom-api"],
        });
        queryClient.invalidateQueries({
          queryKey: ["custom-api-infinite"],
        });
        queryClient.invalidateQueries({
          queryKey: ["leave-buttons-status"],
        });
        queryClient.invalidateQueries({ queryKey: ["employee-attendance-summary"] });
        queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
        queryClient.invalidateQueries({ queryKey: ["attendance-calendar-details"], });
        queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });
      }, 1500);
    },
  });
}

export function useCreateLeaveApplicationBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (leaveData: any) =>
      leaveService.createLeaveApplicationBatch(leaveData),

    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
        queryClient.invalidateQueries({
          queryKey: ["todo-approvals", "Leave Application"],
        });
        queryClient.invalidateQueries({
          queryKey: ["custom-api"],
        });
        queryClient.invalidateQueries({
          queryKey: ["custom-api-infinite"],
        });
        queryClient.invalidateQueries({
          queryKey: ["leave-buttons-status"],
        });
        queryClient.invalidateQueries({ queryKey: ["employee-attendance-summary"] });
        queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
        queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });
      }, 1500);
    },
  });
}

export const useGetAttendanceStatus = (
  employeeId: string | undefined,
  fromDate: string,
  toDate: string,
) => {
  return useQuery<AttendanceStatusResponse>({
    queryKey: ["attendance-status", employeeId, fromDate, toDate],
    queryFn: () => {
      if (!employeeId) {
        throw new Error("Employee ID is required");
      }
      return leaveService.getAttendanceStatus(employeeId, fromDate, toDate);
    },
    enabled: !!employeeId && !!fromDate && !!toDate,
    staleTime: 5 * 60 * 1000,
  });
};

export function useBulkUpdateRejectionReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ doctype, docnames, comment }: { doctype: string; docnames: string[]; comment: string }) =>
      leaveService.bulkUpdateRejectionReason(doctype, docnames, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamRequests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
    },
    onError: (err: unknown) => {
      console.error("Failed to bulk update rejection reason:", err);
      toast.error(errorResponseFormater(err));
    },
  });
}

export function useUpdateRejectionReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      leaveService.updateRejectionReason(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamRequests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
    },
    onError: (err: unknown) => {
      console.error("Failed to update rejection reason:", err);
      toast.error(errorResponseFormater(err));
    },
  });
}

export const useIsRejectionReasonMandatory = () => {
  return useQuery<{ message: boolean }>({
    queryKey: ["isRejectionReasonMandatory"],
    queryFn: leaveService.isRejectionReasonMandatory,
    staleTime: Infinity,
  });
};

export const useCheckAttachmentMandatory = (leaveType: string | undefined) => {
  return useQuery({
    queryKey: ["checkAttachmentMandatory", leaveType],
    queryFn: () => {
      if (!leaveType) throw new Error("Leave type is required");
      return leaveService.checkAttachmentMandatory(leaveType);
    },
    enabled: !!leaveType,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetNumberOfLeaveDays = (
  employee: string | undefined,
  leaveType: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined,
  individualDates: string | undefined,
) => {
  return useQuery({
    queryKey: [
      "number-of-leave-days",
      employee,
      leaveType,
      fromDate,
      toDate,
      individualDates,
    ],
    queryFn: async () => {
      if (!employee || !leaveType || !fromDate || !toDate || !individualDates) {
        throw new Error("Missing parameters for get_number_of_leave_days");
      }
      return await leaveService.getNumberOfLeaveDays(
        employee,
        leaveType,
        fromDate,
        toDate,
        individualDates,
      );
    },
    enabled:
      !!employee && !!leaveType && !!fromDate && !!toDate && !!individualDates,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetLeaveDateRange = (
  employee: string | undefined,
  leaveType: string | undefined
) => {
  return useQuery<LeaveDateRangeResponse>({
    queryKey: ["leave-date-range", employee, leaveType],
    queryFn: () => {
      if (!employee || !leaveType) {
        throw new Error("Employee and Leave Type are required");
      }
      return leaveService.getLeaveDateRange(employee, leaveType);
    },
    enabled: !!employee && !!leaveType,
    staleTime: 0,
  });
};

export const useGetLeaveHistory = (year: string) => {
  return useQuery<LeaveHistoryItem[]>({
    queryKey: ["leave-history", year],
    queryFn: () => leaveService.getLeaveHistory(year),
    enabled: !!year,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLeaveSettings = () => {
  return useQuery<LeaveSettings>({
    queryKey: ["leave-settings"],
    queryFn: () => leaveService.getLeaveSettings(),
    staleTime: 5 * 60 * 1000,
  });
};


