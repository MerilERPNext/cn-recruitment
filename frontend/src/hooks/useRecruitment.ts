import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { recruitmentService } from "../services/recruitmentService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import { CreateJobRequisitionPayload } from "../types/recruitment";

export function useCreateJobRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateJobRequisitionPayload) =>
      recruitmentService.createJobRequisition(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["job-requisition"],
      });
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to create job requisition. Please try again."
        )
      );
    },
  });
}