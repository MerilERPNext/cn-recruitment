// Base document fields that appear in all Frappe documents
export interface BaseDocument {
  name: string
  owner: string
  creation: string
  modified: string
  modified_by: string
  docstatus: number
  idx: number
}

// Expected Skill Set (child table of Interview Round)
export interface ExpectedSkillSet extends BaseDocument {
  skill: string
  description?: string
  parent: string
  parentfield: "expected_skill_set"
  parenttype: "Interview Round"
  doctype: "Expected Skill Set"
}

// Interview Round document
export interface InterviewRound extends BaseDocument {
  round_name: string
  interview_type: string
  expected_average_rating: number
  doctype: "Interview Round"
  interviewers: string[] // Array of interviewers if any
  expected_skill_set: ExpectedSkillSet[]
}

// Interview Round API Response - make data optional and flexible
export interface InterviewRoundResponse {
  success: boolean
  data: Partial<InterviewRound> // Make it partial to handle empty objects
}

// Interview Detail (child table of Interview)
export interface InterviewDetail extends BaseDocument {
  interviewer: string
  custom_full_name?: string
  parent: string
  parentfield: "interview_details"
  parenttype: "Interview"
  doctype: "Interview Detail"
}

// Interview document
export interface Interview extends BaseDocument {
  custom_interview_type?: string
  interview_round: string
  job_applicant: string
  custom_resume_attachment?: string
  status: string
  scheduled_on: string
  from_time: string
  to_time: string
  custom_meeting_status?: string
  expected_average_rating: number
  average_rating: number
  reminded: number
  doctype: "Interview"
  interview_details: InterviewDetail[]
}

// Interview API Response - make interview optional and flexible
export interface InterviewDetailsResponse {
  interview: Partial<Interview> // Make it partial to handle empty objects
}

// Skill Assessment for feedback form
export interface SkillAssessment {
  skill: string
  description: string
  rating: string // Stored as string representation of float (0.0 to 1.0)
}

// Competency Rating for UI display
export interface CompetencyRating {
  name: string
  description: string
  rating: number // 0-5 for star rating display
}

// Feedback Form State
export interface FeedbackForm {
  interview: string
  interviewer: string[] // Always array of interviewer emails
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

// Add index signature to FeedbackSubmissionData for API calls
export interface FeedbackSubmissionData {
  interview: string
  interviewer: string[] // Array of interviewer emails
  interview_round: string
  result: string // "Cleared" | "Rejected" | "NA"
  job_applicant: string
  feedback: string
  rating: string // Average rating as string (0.0 to 1.0)
  skill_assessment: SkillAssessment[]
  // Add index signature for API compatibility
  [key: string]: unknown
}

// API Response from Frappe method calls
export interface FrappeMethodResponse {
  status?: "success" | "error"
  message?: string
  [key: string]: unknown
}

// Make API Response more flexible
export interface FeedbackSubmissionResponse {
  status: "success" | "error"
  message?: string
  // Add index signature for unknown API response fields
  [key: string]: unknown
}

// Query Parameters
export interface GetFeedbackParams {
  interview_id: string
}

export interface GetInterviewRoundParams {
  interview_round: string
}

// Skill data structure (if you have a separate skills API)
export interface Skill {
  skill_name: string
  description?: string
}

export interface SkillsResponse {
  success: boolean
  data: Skill[]
}

// Permission Error class
export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PermissionError"
  }
}

// Star Rating Component Props
export interface StarRatingProps {
  rating: number
  onRatingChange: (rating: number) => void
  readonly?: boolean
}

// Success Modal Props
export interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

// Form Validation
export interface FormValidation {
  isValid: boolean
  errors: {
    [key in keyof FeedbackForm]?: string
  }
}

// API Error Response
export interface APIError {
  message: string
  status?: number
  code?: string
}

// Loading States
export interface LoadingStates {
  skills: boolean
  interview: boolean
  submission: boolean
}

// Form Actions
export type FormAction =
  | { type: "SET_FIELD"; field: keyof FeedbackForm; value: string }
  | { type: "SET_SKILL_RATING"; index: number; rating: number }
  | { type: "RESET_FORM" }
  | { type: "LOAD_INTERVIEW_DATA"; data: Interview }
  | { type: "LOAD_SKILLS_DATA"; data: ExpectedSkillSet[] }

// Utility Types
export type InterviewStatus = "Pending" | "Completed" | "Cancelled" | "Rescheduled"
export type InterviewType = "Online" | "Offline" | "Phone"
export type RecommendationType = "Cleared" | "Rejected" | "On Hold"
export type RatingScale = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5

// Component Props Types
export interface InterviewFeedbackFormProps {
  interviewId?: string
  onSubmitSuccess?: () => void
  onCancel?: () => void
}

export interface SkillAssessmentCardProps {
  skill: SkillAssessment
  index: number
  onRatingChange: (index: number, rating: number) => void
}

export interface InterviewDetailsCardProps {
  interview: Interview
}

// Hook Return Types
export interface UseInterviewFeedbackReturn {
  formData: FeedbackForm
  isLoading: boolean
  error: Error | null
  submitFeedback: () => Promise<void>
  resetForm: () => void
  updateField: (field: keyof FeedbackForm, value: string) => void
  updateSkillRating: (index: number, rating: number) => void
  calculateAverageRating: () => string
}

// Type guards for API responses
export function isFrappeMethodResponse(obj: unknown): obj is FrappeMethodResponse {
  return typeof obj === 'object' && obj !== null
}

export function hasStatusProperty(obj: unknown): obj is { status: string } {
  return typeof obj === 'object' && obj !== null && 'status' in obj
}

export function hasMessageProperty(obj: unknown): obj is { message: string } {
  return typeof obj === 'object' && obj !== null && 'message' in obj
}

// Constants
export const RATING_LABELS = {
  0: "Not Assessed",
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
} as const

export const RECOMMENDATION_OPTIONS = ["Cleared", "Rejected", "On Hold"] as const

export const INTERVIEW_TYPES = ["Online", "Offline", "Phone"] as const
