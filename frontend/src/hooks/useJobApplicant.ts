
// useJobApplicant.ts
import { useQuery, type UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { jobApplicantService } from "../services/jobApplicantService";
import { PermissionError } from "../types/interview";
import type { JobApplicantDetailsResponse, GetJobApplicantParams } from "../types/jobApplicant";

// Utility to check if error is permission-related (re-used from your existing code)
const isPermissionError = (error: unknown): error is PermissionError => {
  if (error instanceof PermissionError) {
    return true;
  }
  if (error instanceof Error) {
    return (
      error.message.includes("permission") ||
      error.message.includes("403") ||
      error.message.includes("Access Restricted")
    );
  }
  return false;
};

// Default retry function that doesn't retry permission errors (re-used from your existing code)
const defaultRetry = (failureCount: number, error: unknown) => {
  if (isPermissionError(error)) {
    return false;
  }
  return failureCount < 3;
};

/**
 * Custom React Query hook for fetching job applicant details.
 * @param {GetJobApplicantParams} params - The parameters for fetching the applicant (e.g., applicant_name).
 * @param {Omit<UseQueryOptions<JobApplicantDetailsResponse>, "queryKey" | "queryFn">} [options] - Optional React Query options.
 * @returns {UseQueryResult<JobApplicantDetailsResponse, Error>} The query result object.
 */
export const useJobApplicantDetails = (
  params: GetJobApplicantParams,
  options?: Omit<UseQueryOptions<JobApplicantDetailsResponse>, "queryKey" | "queryFn">,
): UseQueryResult<JobApplicantDetailsResponse, Error> => {
  return useQuery<JobApplicantDetailsResponse, Error>({
    queryKey: ["job-applicant-details", params.applicant_name],
    queryFn: () => jobApplicantService.getJobApplicantDetails(params),
    staleTime: 5 * 60 * 1000,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!params.applicant_name,
    ...options,
  });
};

/**
 * Custom React Query hook for fetching job applicant status dropdown options.
 * @param {Omit<UseQueryOptions<string[]>, "queryKey" | "queryFn">} [options] - Optional React Query options.
 * @returns {UseQueryResult<string[], Error>} The query result object.
 */
export const useJobApplicantStatusOptions = (
  options?: Omit<UseQueryOptions<string[]>, "queryKey" | "queryFn">,
): UseQueryResult<string[], Error> => {
  return useQuery<string[], Error>({
    queryKey: ["job-applicant-status-options"],
    queryFn: () => jobApplicantService.getJobApplicantStatusOptions(),
    staleTime: Infinity,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

/**
 * Custom React Query hook for fetching job applicant sub-status dropdown options
 * based on a selected main status.
 * @param {string} mainStatus - The main status to filter sub-statuses by.
 * @param {Omit<UseQueryOptions<string[]>, "queryKey" | "queryFn">} [options] - Optional React Query options.
 * @returns {UseQueryResult<string[], Error>} The query result object.
 */
export const useJobApplicantSubStatusOptions = (
  mainStatus: string,
  options?: Omit<UseQueryOptions<string[]>, "queryKey" | "queryFn">,
): UseQueryResult<string[], Error> => {
  return useQuery<string[], Error>({
    queryKey: ["job-applicant-sub-status-options", mainStatus],
    queryFn: () => jobApplicantService.getJobApplicantSubStatusOptions(mainStatus),
    staleTime: Infinity,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!mainStatus,
    ...options,
  });
};


export { isPermissionError };
