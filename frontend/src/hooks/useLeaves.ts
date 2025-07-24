import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";

export const useMyLeaveRequests = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["my-leave-requests", employeeId],
    queryFn: () => leaveService.getMyLeaveRequests(employeeId!),
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
      queryClient.invalidateQueries({ queryKey: ["request-comp-off"] });
    },
    onError:(e)=>{
      console.log(e)
    }
  });
}
