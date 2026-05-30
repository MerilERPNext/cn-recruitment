import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { recruitmentService } from "../services/recruitmentService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import { CreateJobRequisitionPayload } from "../types/recruitment";
import {
  IJPApplicationSubmitResponse,
  UseSubmitIJPApplicationVariables,
  IJPApplicationWithdrawPayload,
  IJPApplicationWithdrawResponse,
} from "../components/Recruitment/IJPTypes";

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
          "Failed to create job requisition. Please try again.",
        ),
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSuccess: (_, { opening }) => {
      queryClient.invalidateQueries({
        queryKey: ["ijp-openings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-applications"],
      });
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to submit IJP application. Please try again.",
        ),
      );
    },
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ["my-applications"],
    queryFn: () => recruitmentService.getMyApplications(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWithdrawIJPApplication(): UseMutationResult<
  IJPApplicationWithdrawResponse,
  Error,
  IJPApplicationWithdrawPayload
> {
  const queryClient = useQueryClient();

  return useMutation<
    IJPApplicationWithdrawResponse,
    Error,
    IJPApplicationWithdrawPayload
  >({
    mutationFn: (payload: IJPApplicationWithdrawPayload) =>
      recruitmentService.withdrawIJPApplication(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ijp-openings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["my-applications"],
      });
      toast.success("Application withdrawn successfully");
    },
    onError: (error) => {
      toast.error(
        errorResponseFormater(
          error,
          "Failed to withdraw IJP application. Please try again.",
        ),
      );
    },
  });
}
