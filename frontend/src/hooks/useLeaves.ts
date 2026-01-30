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

export const useMyLeaveRequests = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["my-leave-requests", employeeId],
    queryFn: () => leaveService.getMyLeaveRequests(employeeId!),
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
      if (!leaveType || !fromDate || !toDate) {
        throw new Error("leaveType, fromDate, and toDate are required");
      }
      return leaveService.getLeaveRequestFields(leaveType, fromDate, toDate);
    },
    enabled: !!leaveType && !!fromDate && !!toDate,
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
    }) => leaveService.replaceLeave(params),

    onSuccess: () => {
      toast.dismiss();
      toast.success("Leave replaced successfully");

      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["custom-api"] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const formatedError = errorResponseFormater(err);
      toast.error(formatedError);
      console.log("Errorr Replacing Leave", err);
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

    onSuccess: async() => {
      
      await new Promise((res)=> setTimeout(res, 4000));

      queryClient.invalidateQueries({
        queryKey: ["custom-api"],
      });

       queryClient.invalidateQueries({
        queryKey: ["leave-requests"],
      });

      queryClient.invalidateQueries({ queryKey: ["employee-attendance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
     
      queryClient.invalidateQueries({
        queryKey: ["custom-api-infinite", "cn_leave_shift_managment.api.get_open_approval_todos"],
      });

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
