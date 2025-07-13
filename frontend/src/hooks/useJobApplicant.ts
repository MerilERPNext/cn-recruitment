import { useQuery, type UseQueryOptions, UseQueryResult } from "@tanstack/react-query"; 
import { jobApplicantService } from "../services/jobApplicantService"; 
import { PermissionError } from "../types/interview"; 
import type { JobApplicantDetailsResponse, GetJobApplicantParams, JobApplicantFieldOptionsResponse } from "../types/jobApplicant"; 

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
    queryKey: ["job-applicant-details", params.applicant_name], // Unique key for caching
    queryFn: () => jobApplicantService.getJobApplicantDetails(params), // Function to fetch data
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
    retry: defaultRetry, // Custom retry logic
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    enabled: !!params.applicant_name, // Only run query if applicant_name is provided
    ...options, // Spread any additional options passed to the hook
  });
};

/**
 * Custom React Query hook for fetching job applicant status and sub-status dropdown options.
 * @param {Omit<UseQueryOptions<JobApplicantFieldOptionsResponse>, "queryKey" | "queryFn">} [options] - Optional React Query options.
 * @returns {UseQueryResult<JobApplicantFieldOptionsResponse, Error>} The query result object.
 */
export const useJobApplicantDropdownOptions = (
  options?: Omit<UseQueryOptions<JobApplicantFieldOptionsResponse>, "queryKey" | "queryFn">,
): UseQueryResult<JobApplicantFieldOptionsResponse, Error> => {
  return useQuery<JobApplicantFieldOptionsResponse, Error>({
    queryKey: ["job-applicant-dropdown-options"], // Unique key for caching
    queryFn: () => jobApplicantService.getJobApplicantDropdownOptions(), // Function to fetch data
    staleTime: Infinity, // Options are unlikely to change often, so can be cached indefinitely
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};


export { isPermissionError };