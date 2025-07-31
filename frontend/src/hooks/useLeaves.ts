import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";


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
export const useGetLeaveBalance = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["leave-balance", employeeId],
    queryFn: () => leaveService.getLeaveBalance(employeeId as string),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};

export function useRequestCompOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: any) => leaveService.requestCompOffLeave(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
    },
    onError:(e)=>{
      console.log(e)
    }
  });
}
