import FrappeAPI from "../utils/frappeAPI"
import type {
  SkillsResponse,
  InterviewDetailsResponse,
  FeedbackSubmissionData,
  FeedbackSubmissionResponse,
  GetFeedbackParams,
} from "../types/feedback"

export const feedbackService = {
  // Fetch available skills
  getSkills: async (): Promise<SkillsResponse> => {
    try {

      const result = await FrappeAPI.callMethod("recruitment.api_interview.interview.get_skill_names")


      return {
        success: result?.success || false,
        data: result?.data || [],
      }
    } catch (error) {
      console.error(`❌ Failed to fetch skills:`, error)
      throw error
    }
  },

  // Fetch interview details for feedback form
  getInterviewForFeedback: async ({ interview_id }: GetFeedbackParams): Promise<InterviewDetailsResponse> => {
    try {
      console.log(`🎯 Fetching interview details for feedback: ${interview_id}`)

      const result = await FrappeAPI.callMethod("recruitment.api_interview.interview.get_interview_and_round", {
        interview_id,
      })

      return {
        interview: result?.message?.interview || {},
      }
    } catch (error) {
      console.error(`❌ Failed to fetch interview details for ${interview_id}:`, error)
      throw error
    }
  },

  // Submit feedback
  submitFeedback: async (feedbackData: FeedbackSubmissionData): Promise<FeedbackSubmissionResponse> => {
    try {
      console.log(`🎯 Submitting feedback:`, feedbackData)

      const result = await FrappeAPI.callMethod(
        "recruitment.api_interview.interview.create_interview_feedback",
        feedbackData,
      )

      return {
        status: result?.status || "error",
        message: result?.message,
      }
    } catch (error) {
      console.error(`❌ Failed to submit feedback:`, error)
      throw error
    }
  },
}
