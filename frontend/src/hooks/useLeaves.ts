import { useQuery } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";

export const useMyLeaveRequests = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["my-leave-requests", employeeId],
    queryFn: () => leaveService.getMyLeaveRequests(employeeId!),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};
