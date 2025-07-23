import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShiftRequestService } from "../services/shiftRequests";
import { ShiftRequest } from "../types/shift";
import { toast } from "react-hot-toast"; // Optional: for notifications

export const useShiftRequests = () => {
  return useQuery<ShiftRequest[]>({
    queryKey: ["shift-requests", "draft"],
    queryFn: ShiftRequestService.getDraftShiftRequests,
  });
};

export const useApproveShiftRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftRequestName: string) =>
      ShiftRequestService.approveShiftRequest(shiftRequestName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-requests"] });
      toast.success("Shift request approved successfully!");
    },
    onError: (error: Error) => {
      console.error("Error approving shift request:", error);
      toast.error("Failed to approve shift request. Please try again.");
    },
  });
};

export const useRejectShiftRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftRequestName: string) =>
      ShiftRequestService.rejectShiftRequest(shiftRequestName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-requests"] });
      toast.success("Shift request rejected.");
    },
    onError: (error: Error) => {
      console.error("Error rejecting shift request:", error);
      toast.error("Failed to reject shift request. Please try again.");
    },
  });
};
