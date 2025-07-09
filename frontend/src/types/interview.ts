/* eslint-disable @typescript-eslint/no-explicit-any */

// Generic Frappe types
export interface DoctypeField {
    fieldname: string
    label: string
    fieldtype: string
    options?: string
  }
  
  export interface DoctypeSchema {
    data: {
      fields: DoctypeField[]
    }
  }
  
  export interface DocumentItem {
    name: string
    title?: string
    status?: string
    modified: string
    owner?: string
    [key: string]: any
  }
  
  export interface GetDocumentsParams {
    doctype: string
    pageParam?: number
    pageSize: number
    searchTerm?: string
    filters?: Record<string, any>
    fields: string[]
    searchFields: string[]
  }
  
  export interface FrappePageResponse {
    pages: any
    data: DocumentItem[]
    totalCount: number
    hasNextPage: boolean
    nextCursor?: number
  }
  
  export interface FrappeDocumentsResponse {
    data: DocumentItem[]
    totalCount: number
  }
  
  export interface GetCountParams {
    doctype: string
    searchTerm?: string
    filters?: Record<string, any>
  }
  
  export interface GetCountResponse {
    message: number
  }
  
  export class PermissionError extends Error {
    constructor(
      message: string,
      public statusCode = 403,
    ) {
      super(message)
      this.name = "PermissionError"
    }
  }
  
  // Interview-specific types
  export interface InterviewDetail {
    custom_full_name: string
    [key: string]: any
  }
  
  export interface InterviewData {
    name: string
    job_applicant: string
    designation: string
    scheduled_on: string
    from_time: string
    to_time: string
    custom_interview_type: string
    custom_zoom_link: string
    interview_round: string
    custom_resume_attachment: string
    interview_details: InterviewDetail[]
    [key: string]: any
  }
  
  export interface InterviewRound {
    name: string
    round_name: string
    status: string
    [key: string]: any
  }
  
  export interface InterviewAndRoundsResponse {
    interview: InterviewData
    rounds: InterviewRound[]
  }
  
  export interface GetInterviewParams {
    interview_id: string
  }
  
  export interface InterviewServiceType {
    getInterviewAndRounds: (params: GetInterviewParams) => Promise<InterviewAndRoundsResponse>
  }
  