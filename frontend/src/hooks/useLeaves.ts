import { useQuery } from "@tanstack/react-query";
import { leaveService } from "../services/leaveService";

export const useMyLeaveRequests = (employeeId: string) => {
  return useQuery({
    queryKey: ["my-leave-requests", employeeId],
    queryFn: () => leaveService.getMyLeaveRequests(employeeId),
    staleTime: 5 * 60 * 1000,
  });
};
