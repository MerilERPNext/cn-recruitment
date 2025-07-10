import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import { feedbackService } from "../services/feedbackService"
import { PermissionError } from "../types/interview"
import type {
  SkillsResponse,
  InterviewDetailsResponse,
  FeedbackSubmissionData,
  GetFeedbackParams,
} from "../types/feedback"

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

// Hook for fetching skills
export const useSkills = (options?: Omit<UseQueryOptions<SkillsResponse>, "queryKey" | "queryFn">) => {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => feedbackService.getSkills(),
    staleTime: 10 * 60 * 1000, // 10 minutes - skills don't change often
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  })
}

// Hook for fetching interview details for feedback
export const useInterviewForFeedback = (
  params: GetFeedbackParams,
  options?: Omit<UseQueryOptions<InterviewDetailsResponse>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["interview-feedback", params.interview_id],
    queryFn: () => feedbackService.getInterviewForFeedback(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!params.interview_id, // Only run query if interview_id exists
    ...options,
  })
}

// Hook for submitting feedback
export const useFeedbackSubmission = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (feedbackData: FeedbackSubmissionData) => feedbackService.submitFeedback(feedbackData),
    onSuccess: (_data, variables) => {
      console.log(`✅ Feedback submitted successfully for interview: ${variables.interview}`)
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["interview-feedback", variables.interview] })
      queryClient.invalidateQueries({ queryKey: ["documents", "Interview"] })
      queryClient.invalidateQueries({ queryKey: ["documents-infinite", "Interview"] })
    },
    onError: (error, variables) => {
      console.error(`❌ Failed to submit feedback for interview: ${variables.interview}`, error)
    },
    retry: (failureCount, error) => {
      if (isPermissionError(error)) {
        return false
      }
      return failureCount < 2 // Retry submission only once
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

// Export utility function
export { isPermissionError }
