import { useMutation, useQuery, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { recruitmentService } from "../services/recruitmentService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import { CreateJobRequisitionPayload } from "../types/recruitment";
import { IJPField, IJPApplicationSubmitPayload, IJPApplicationSubmitResponse, UseSubmitIJPApplicationVariables } from "../components/Recruitment/IJPTypes";

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

export function useIJPApplicationFields(opening: string) {
  return useQuery({
    queryKey: ["ijp-application-fields", opening],
    queryFn: () => recruitmentService.getIJPApplicationFields(opening),
    enabled: !!opening,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitIJPApplication(): UseMutationResult<
  IJPApplicationSubmitResponse,
  Error,
  UseSubmitIJPApplicationVariables
> {
  const queryClient = useQueryClient();

  return useMutation<
    IJPApplicationSubmitResponse,
    Error,
    UseSubmitIJPApplicationVariables
  >({
    mutationFn: ({ opening, data }: UseSubmitIJPApplicationVariables) =>
      recruitmentService.submitIJPApplication(opening, data),

    onSuccess: (_, { opening }) => {
      queryClient.invalidateQueries({
        queryKey: ["ijp-openings"],
      });
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to submit IJP application. Please try again."
        )
      );
    },
  });
}