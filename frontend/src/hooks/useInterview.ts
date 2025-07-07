import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { interviewService } from "../services/interviewService"
import { PermissionError } from "../types/interview"
import type { InterviewAndRoundsResponse, GetInterviewParams } from "../types/interview"

// Utility to check if error is permission-related
const isPermissionError = (error: unknown): error is PermissionError => {
  if (error instanceof PermissionError) {
    return true
  }
  if (error instanceof Error) {
    return (
      error.message.includes("permission") ||
      error.message.includes("403") ||
      error.message.includes("Access Restricted")
    )
  }
  return false
}

// Default retry function that doesn't retry permission errors
const defaultRetry = (failureCount: number, error: unknown) => {
  if (isPermissionError(error)) {
    return false
  }
  return failureCount < 3
}

// Hook for fetching interview and rounds data
export const useInterviewAndRounds = (
  params: GetInterviewParams,
  options?: Omit<UseQueryOptions<InterviewAndRoundsResponse>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["interview-and-rounds", params.interview_id],
    queryFn: () => interviewService.getInterviewAndRounds(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!params.interview_id, // Only run query if interview_id exists
    ...options,
  })
}

// Export utility function
export { isPermissionError }
