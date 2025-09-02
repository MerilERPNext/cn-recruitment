import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";
import type {
  LeaveDetailsResponse,
  HolidayGroup,
  TeamRequest,
} from "../types/leaves";

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
