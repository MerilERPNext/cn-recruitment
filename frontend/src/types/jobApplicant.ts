export interface JobApplicantBasicDetails {
  name: string; 
  applicant_name: string; 
  email_id: string;
  phone_number: string;
  job_title: string; 
  designation: string; 
  status: string; 
  sub_status: string; 
  location: string; 
  experience: string; 
  expected_ctc: string; 
  notice_period: string; 
  profile_image: string | null;
  resume_attachment: string | null; 
  creation: string; 
  custom_recruiter_name: string;
  custom_current_designation: string;
  custom_current_company_name: string;
  custom_linkedin_url: string;
  custom_permanent_address: string;
  custom_current_address: string;
  custom_expected_doj: string | null; 
  source: string;
  applicant_rating: number;
  custom_home_town: string;
  custom_recruiter_remark: string;
}

// Interface for individual employment history entries
export interface EmploymentEntry {
  company_name: string;
  designation: string;
  start_date: string; 
  end_date: string | null; 
  duration: string; 
  address: string;
  salary: number; 
}

// Interface for individual education history entries
export interface EducationEntry {
  university: string;
  degree: string;
  field_of_study: string;
  level: string;
  start_year: string | number;
  end_year: string | number;
}

// Interface for individual notes entries (from custom_crm_note)
export interface ApplicantNote {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  type: string; 
}

// Interface for individual applicant timeline events
export interface ApplicantTimelineEvent {
  id: string;
  type: string; 
  timestamp: string;
  description: string;
  by_user: string | null;
}

// Interface for individual communication history events
export interface CommunicationEvent {
  id: string;
  type: string; 
  timestamp: string;
  description: string;
  icon: string; 
}


// The overall response structure from your new custom Frappe API method for applicant details
export interface JobApplicantDetailsResponse {
  job_applicant: JobApplicantBasicDetails;
  employment_history: EmploymentEntry[];
  education_history: EducationEntry[];
  notes: ApplicantNote[];
  applicant_timeline_events: ApplicantTimelineEvent[];
  communication_history: CommunicationEvent[];
}

// Interface for the response of the new API method to fetch dropdown options
export interface JobApplicantFieldOptionsResponse {
  status_options: string[];
  sub_status_options: string[];
}

// Parameters for fetching a specific job applicant
export interface GetJobApplicantParams {
  applicant_name: string;
}
