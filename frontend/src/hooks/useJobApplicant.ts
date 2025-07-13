// src/hooks/useJobApplicant.ts

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { jobApplicantService } from "../services/jobApplicantService"; // Adjust this path
import { PermissionError } from "../types/interview"; // Assuming PermissionError is defined here or adjust path
import type { JobApplicantDetailsResponse, GetJobApplicantParams } from "../types/jobApplicant"; // Adjust this path

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
) => {
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

// Export utility function for error checking
export { isPermissionError };
