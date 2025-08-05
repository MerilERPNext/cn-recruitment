import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";
import type { LeaveDetailsResponse } from "../types/leaves";

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
    mutationFn: (body: any) => leaveService.requestCompOffLeave(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}
