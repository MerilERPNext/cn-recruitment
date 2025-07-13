// src/types/jobApplicant.ts

// Basic details for the job applicant
export interface JobApplicantBasicDetails {
  name: string; // The unique ID of the applicant (e.g., "shiv@gamil.com")
  applicant_name: string; // Full name (e.g., "Shiv Kumar")
  email_id: string;
  phone_number: string;
  job_title: string; // The job opening they applied for
  designation: string; // Their role/designation
  status: string; // Current status (e.g., "Open")
  sub_status: string; // Sub-status (e.g., "Waiting for Response")
  location: string; // Combined location (e.g., "Gujrat, India")
  experience: string; // e.g., "5+ Years"
  expected_ctc: string; // e.g., "INR 75000 / Annum"
  notice_period: string; // e.g., "1 Year" (from bond_if_any)
  profile_image: string | null; // URL to profile image (currently null from API)
  resume_attachment: string | null; // URL to resume attachment
  creation: string; // Timestamp of creation
  custom_recruiter_name: string;
  custom_current_designation: string;
  custom_current_company_name: string;
  custom_linkedin_url: string;
  custom_permanent_address: string;
  custom_current_address: string;
  custom_expected_doj: string | null; // Expected Date of Joining
  source: string;
  applicant_rating: number;
  custom_home_town: string;
  custom_recruiter_remark: string;
}

// Interface for individual employment history entries
export interface EmploymentEntry {
  company_name: string;
  designation: string;
  start_date: string; // Formatted date string (e.g., "YYYY-MM-DD")
  end_date: string | null; // Formatted date string or "Present"
  duration: string; // e.g., "4 yrs 7 mos"
  address: string;
  salary: number; // Or string if displayed with currency
  // description?: string; // Add if your backend includes this field
}

// Interface for individual education history entries
export interface EducationEntry {
  university: string;
  degree: string;
  field_of_study: string;
  level: string;
  start_year: string | number;
  end_year: string | number;
  // class_percentage?: string; // Add if your backend includes this field
}

// Interface for individual notes entries (from custom_crm_note)
export interface ApplicantNote {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  type: string; // e.g., "Call" from custom_comment_type
}

// Interface for individual timeline events
export interface TimelineEvent {
  id: string;
  type: string; // e.g., "Application Submitted", "Note (Call)"
  timestamp: string;
  description: string;
  by_user: string | null;
}

// The overall response structure from your new custom Frappe API method
export interface JobApplicantDetailsResponse {
  job_applicant: JobApplicantBasicDetails;
  employment_history: EmploymentEntry[];
  education_history: EducationEntry[];
  notes: ApplicantNote[];
  timeline_events: TimelineEvent[];
}

// Parameters for fetching a specific job applicant
export interface GetJobApplicantParams {
  applicant_name: string;
}

// Re-using PermissionError from your existing types if available, otherwise define it
// Assuming it's in a file like '../types/interview' or '../types/frappe'
// If not, you might need to add it here:
// export class PermissionError extends Error {
//   constructor(message: string, public status?: number) {
//     super(message);
//     this.name = 'PermissionError';
//   }
// }
