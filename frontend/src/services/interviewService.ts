import FrappeAPI from "../utils/frappeAPI"
import type { InterviewAndRoundsResponse, GetInterviewParams } from "../types/interview"

export const interviewService = {
  // Fetch interview and rounds data
  getInterviewAndRounds: async ({ interview_id }: GetInterviewParams): Promise<InterviewAndRoundsResponse> => {
    try {
      console.log(` Fetching interview and rounds for ID: ${interview_id}`)

    const result = await FrappeAPI.getDocument("Interview", interview_id)

      console.log(`Ѻ Interview and rounds response:`, result)
     

      return {
        interview: result || {},
        rounds: result?.rounds || [],
      }
    } catch (error) {
      console.error(`❌ Failed to fetch interview and rounds for ID ${interview_id}:`, error)
      throw error
    }
  },
}
