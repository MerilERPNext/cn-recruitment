// src/types/jobApplicant.ts

export interface JobApplicant {
  name: string;
  applicant_name: string;
  email_id?: string;
  phone_number?: string;
  job_title?: string;
  designation?: string;
  status?: string;
  country?: string;
  source?: string;
  applicant_rating?: number;
  resume_attachment?: string;
  resume_link?: string;
  notes?: string;
  creation: string;
  profile_image?: string;
  custom_gender?: string;
  custom_substatus?: string;
}

export interface CommentItem {
  name: string;
  content: string;
  creation: string;
  owner: string;
}

export interface AddCommentPayload {
  content: string;
  reference_doctype: string;
  reference_name: string;
  subject?: string;
}
