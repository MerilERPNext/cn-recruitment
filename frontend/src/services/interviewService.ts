import FrappeAPI from "../utils/frappeAPI"
import type { InterviewAndRoundsResponse, GetInterviewParams, InterviewData, InterviewRound } from "../types/interview"

export const interviewService = {
  // Fetch interview and rounds data
  getInterviewAndRounds: async ({ interview_id }: GetInterviewParams): Promise<InterviewAndRoundsResponse> => {
    try {

      const result = await FrappeAPI.getDocument("Interview", interview_id) as InterviewData

      if (!result) {
        throw new Error("Interview data not found")
      }

      console.log(`✅ Interview and rounds response:`, result)

      return {
        interview: result,
        rounds: result.rounds as InterviewRound[] ,
      }
    } catch (error) {
      console.error(`❌ Failed to fetch interview and rounds for ID ${interview_id}:`, error)
      throw error
    }
  },
}
