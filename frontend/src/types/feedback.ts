export interface CompetencyRating {
  name: string
  description: string
  rating: number
}

export interface SkillAssessment {
  description: string
  skill: string
  rating: string
}

export interface FeedbackForm {
  interview: string
  interviewer: string | string[] // Updated to allow both string and array
  interview_round: string
  job_applicant: string
  competencies: CompetencyRating[]
  technicalFeedback: string
  communicationFeedback: string
  culturalFitFeedback: string
  overallImpression: string
  recommendation: string
  detailedComments: string
  nextSteps: string
  attachments: File[]
  skillAssessment: SkillAssessment[]
}

export interface Skill {
  skill_name: string
  description?: string
}

export interface SkillsResponse {
  success: boolean
  data: Skill[]
}

export interface InterviewDetailsResponse {
  interview: {
    name: string
    job_applicant: string
    interview_round: string
    interview_details: Array<{
      interviewer: string
    }>
  }
}

export interface FeedbackSubmissionData {
  interview: string
  interviewer: string | string[]
  interview_round: string
  result: string
  job_applicant: string
  feedback: string
  rating: string
  skill_assessment: SkillAssessment[]
}

export interface FeedbackSubmissionResponse {
  status: string
  message?: string
}

export interface GetFeedbackParams {
  interview_id: string
}
