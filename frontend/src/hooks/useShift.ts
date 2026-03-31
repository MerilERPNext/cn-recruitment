import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllShiftTypes, ShiftRequestService } from "../services/shiftRequests";
import { ShiftRequest, UpdateShiftRequestPayload } from "../types/shift";
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

export const useShiftTypes = () => {
  return useQuery({
    queryKey: ["shift-types"],
    queryFn: getAllShiftTypes,
  });
};
// export const useEmployeeShifts = (employee: string) => {
//   return useQuery({
//     queryKey: ["employee-shifts-assignment", employee],
//     queryFn: () => getEmployeeShifts(employee),
//     enabled: !!employee,
//   });
// };

export const useCreateShiftRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ShiftRequest>) =>
      ShiftRequestService.createShiftRequest(payload),
    onSuccess: async () => {
      await new Promise((res) => setTimeout(res, 3000));
      toast.success("Shift request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["shift-requests"] });
    },
    onError: (error: Error) => {
      console.error("Error submitting shift request:", error);
    },
  });
};

export const useUpdateShiftRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateShiftRequestPayload) =>
      ShiftRequestService.updateShiftRequest(payload),
    onSuccess: () => {
      toast.success("Shift request updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["shift-requests"] });
    },
    onError: (error: Error) => {
      console.error("Error updating shift request:", error);
      toast.error("Failed to update shift request. Please try again.");
    },
  });
};

export const useShiftRequestById = (id: string) => {
  return useQuery({
    queryKey: ["shift-request", id],
    queryFn: () => ShiftRequestService.getShiftRequestById(id),
    enabled: !!id, // Only run the query if id is provided
  });
}