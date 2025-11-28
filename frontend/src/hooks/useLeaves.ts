import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AttendancePolicyResponse,
  leaveService,
} from "../services/leaveService";
import { CompOffResponse } from "../types/leaves";

import type {
  LeaveDetailsResponse,
  HolidayGroup,
  TeamRequest,
  LeaveFieldResponse,
  LeaveReason,
  ButtonStatusResponse,
  EditApprovedLeavePayload,
} from "../types/leaves";
import toast from "react-hot-toast";

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
  date: string
) => {
  return useQuery<LeaveDetailsResponse>({
    queryKey: ["leave-balance", employeeId, date],
    queryFn: () => {
      if (!employeeId) throw new Error("Employee ID is required");
      return leaveService.getLeaveBalance(employeeId, date);
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

export const useGetHolidays = (employeeId: string | undefined) => {
  return useQuery<HolidayGroup[]>({
    queryKey: ["holidays", employeeId],
    queryFn: () => {
      if (!employeeId) throw new Error("Employee ID is required");
      return leaveService.getHolidays(employeeId);
    },
    enabled: !!employeeId,
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
  toDate?: string
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
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      let errorMsg = "Submission failed. Please try again.";

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

//get attendance policy

export const useGetAttendancePolicyForDate = (
  employee?: string | number,
  targetDate?: string
) => {
  return useQuery<AttendancePolicyResponse>({
    queryKey: ["attendance-policy-for-date", employee, targetDate],
    queryFn: () => {
      if (!employee || !targetDate) {
        throw new Error("employee and targetDate are required");
      }
      return leaveService.getAttendancePolicyForDate(
        String(employee),
        targetDate
      );
    },
    enabled: !!employee && !!targetDate,
    staleTime: 0,
    refetchOnMount: "always",
  });
};
