import FrappeAPI from "../utils/frappeAPI"
import type {
  InterviewDetailsResponse,
  InterviewRoundResponse,
  FeedbackSubmissionData,
  FeedbackSubmissionResponse,
  GetFeedbackParams,
  GetInterviewRoundParams,
  FrappeMethodResponse,
} from "../types/feedback"

// Type guards
const isFrappeMethodResponse = (obj: unknown): obj is FrappeMethodResponse => {
  return typeof obj === 'object' && obj !== null && 'status' in obj && 'message' in obj;
}

const hasStatusProperty = (obj: unknown): obj is { status: string } => {
  return typeof obj === 'object' && obj !== null && 'status' in obj;
}

const hasMessageProperty = (obj: unknown): obj is { message: string } => {
  return typeof obj === 'object' && obj !== null && 'message' in obj;
}

export const feedbackService = {
  // Get Interview Round doctype data (includes skills as child table)
  getInterviewRoundData: async ({ interview_round }: GetInterviewRoundParams): Promise<InterviewRoundResponse> => {
    try {
      console.log(`Fetching interview round details for feedback: ${interview_round}`)
      const result = await FrappeAPI.getDocument("Interview Round", interview_round)
      console.log(result, "interview round data")

      return {
        success: true,
        data: result || {},
      }
    } catch (error) {
      console.error(`❌ Failed to fetch interview round data for ${interview_round}:`, error)
      throw error
    }
  },

  // Fetch interview details for feedback form
  getInterviewForFeedback: async ({ interview_id }: GetFeedbackParams): Promise<InterviewDetailsResponse> => {
    try {
      console.log(`Fetching interview details for feedback: ${interview_id}`)
      const result = await FrappeAPI.getDocument("Interview", interview_id)

      return {
        interview: result || {},
      }
    } catch (error) {
      console.error(`Failed to fetch interview details for ${interview_id}:`, error)
      throw error
    }
  },

  // Submit feedback with proper type handling
  submitFeedback: async (feedbackData: FeedbackSubmissionData): Promise<FeedbackSubmissionResponse> => {
    try {
      console.log(`Submitting feedback:`, feedbackData)
      const result = await FrappeAPI.callMethod(
        "recruitment.api_interview.interview.create_interview_feedback",
        feedbackData,
      )

      // Handle unknown result with type guards
      if (isFrappeMethodResponse(result)) {
        const response: FeedbackSubmissionResponse = {
          status: hasStatusProperty(result) && typeof result.status === 'string' 
            ? (result.status as "success" | "error") 
            : "error",
          message: hasMessageProperty(result) && typeof result.message === 'string' 
            ? result.message 
            : "Unknown error",
        }

        // Add any additional properties from the result
        if (typeof result === 'object' && result !== null) {
          Object.keys(result).forEach(key => {
            if (key !== 'status' && key !== 'message') {
              response[key] = result[key as keyof typeof result]
            }
          })
        }

        return response
      }

      // Fallback response if result is not a proper object
      return {
        status: "error",
        message: "Invalid response from server",
      }
    } catch (error) {
      console.error(`❌ Failed to submit feedback:`, error)
      throw error
    }
  },
}
