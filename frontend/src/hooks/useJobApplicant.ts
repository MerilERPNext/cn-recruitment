import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import {
  jobApplicantService,
  commentService,
} from "../services/jobApplicantService";
import type { JobApplicant ,AddCommentPayload,
  CommentItem, } from "../types/jobApplicant";

const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

const defaultRetry = (failureCount: number, error: unknown) =>
  isPermissionError(error) ? false : failureCount < 3;

// job applicant ko fetch karna 
export const useJobApplicant = (
  name: string,
  options?: Omit<UseQueryOptions<JobApplicant, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<JobApplicant, Error>({
    queryKey: ["job-applicant", name],
    queryFn: () => jobApplicantService.getJobApplicantById(name),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!name,
    ...options,
  });
};


// Post comment
export const useAddComment = (
  options?: UseMutationOptions<void, Error, AddCommentPayload>
) => {
  return useMutation<void, Error, AddCommentPayload>({
    mutationFn: (payload) => commentService.addComment(payload),
    ...options,
  });
};

// Fetch comments for applicant
export const useComments = (
  applicantId: string,
  options?: Omit<UseQueryOptions<CommentItem[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<CommentItem[], Error>({
    queryKey: ["comments", applicantId],
    queryFn: () => commentService.getCommentsForApplicant(applicantId),
    enabled: !!applicantId,
    staleTime: 60 * 1000,
    ...options,
  });
};


//  Update job applicant (status, sub_status, custom_substatus)
export const useUpdateJobApplicant = () => {
  return useMutation({
    mutationFn: ({
      name,
      updates,
    }: {
      name: string;
      updates: Partial<{
        status: string;
        sub_status: string;
        custom_substatus: string;
      }>;
    }) => jobApplicantService.updateJobApplicant(name, updates),
  });
};


// Fetch sub statuses based on parent status
export const useSubStatuses = (
  parentStatus: string,
  options?: Omit<UseQueryOptions<string[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<string[], Error>({
    queryKey: ["sub-statuses", parentStatus],
    queryFn: () => jobApplicantService.getSubStatuses(parentStatus),
    enabled: !!parentStatus,
    ...options,
  });
};

export { isPermissionError };

