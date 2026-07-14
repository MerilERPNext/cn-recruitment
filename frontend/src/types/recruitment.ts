// Position Details Types
export interface PositionDetail {
  position_number?: number;
  location: string;
  sub_location?: string;
  functional_area?: string;
  reporting_manager: string;
  employee_type: string;
  vacancy_type?: string;
}

export interface ReplacementPositionDetail {
  position_number?: number;
  location: string;
  sub_location?: string;
  replacement_for: string;
  reporting_manager: string;
  employee_type: string;
  vacancy_type?: string;
}

// Form Data Types (what the form collects)
export interface JobRequisitionFormData {
  // Basic Details
  hiring_manager: string;
  company: string;
  department: string;
  designation: string;
  functional_area?: string;
  custom_division?: string;
  status?: string;

  // Job Details
  experience_from?: number;
  experience_to?: number;
  experience_unit?: "years" | "months";
  salary_currency: string;
  salary_min: string | number;
  salary_max: string | number;
  salary_timeframe: "Hourly" | "Daily" | "Weekly" | "Fortnightly" | "Monthly" | "Annual";
  recruitment_start_date?: string;
  hiring_lead: string;
  additional_roles_responsibilities?: string;
  additional_skills?: string;
  expected_compensation?: number;
  expected_by?: string;
  custom_employment_type?: string;
  custom_employment_type_link?: string;
  custom__employee_type?: string;
  custom_location?: string;
  custom_work_experience?: string;
  custom_work_experience_range?: string;
  custom_preferred_notice_period?: string;
  custom_preferred_company?: string;
  custom_other_preferred_companies?: string;
  custom_job_description_template?: string;
  custom_salary?: string;
  employment_type?: string;
  location?: string;
  preferred_company?: string;
  job_description_template?: string;
  description?: string;
  reason_for_requesting?: string;
  custom_skills?: string[];

  // Position Selection
  position_type: "new" | "replacement";
  number_of_new_positions?: number;
  number_of_replacement_positions?: number;
  number_of_positions?: number;
  positions?: PositionDetail[];
  replacement_positions?: ReplacementPositionDetail[];
  custom_position_details?: any[];
  custom_regions?: { region: string; no_of_openings: number }[];
  custom_hiring_type?: "Lateral" | "Fresher";

  // Other Details
  comments_instructions?: string;
  cost_centre: string;
  designation_change?: string;
  custom_qualifications?: { qualification: string; mandatory: string }[];
  custom_pre_screened_candidates?: { candidate_name: string; email: string; phone: string; cv?: any; offer_directly: boolean }[];
  custom_assign_to_recruiter?: string;
}

// API Payload Types (what gets sent to the backend)
export interface CreateJobRequisitionPayload {
  requested_by: string | undefined;
  company: string;
  requested_by_designation: string;
  department: string;
  designation: string;
  custom_functional_area?: string;
  custom_experience_range_from?: string;
  custom_experience_range_to?: string;
  custom_experience_unit?: string;
  custom_hiring_lead: string;
  custom_salary_range_currency: string;
  custom_salary_range_min: string | number;
  custom_salary_range_max: string | number;
  custom_salary_timeframe: string;
  posting_date: string;
  requested_by_dept: string;
  custom_type_of_position: "New" | "Replacement";
  no_of_positions: number;
  custom_comments__instructions?: string;
  custom_cost_centre?: string;
  custom_designation_change?: string;
  custom_additional_roles__responsibilities?: string;
  custom_additional_skills?: string;
  custom_position_details?: (PositionDetail | ReplacementPositionDetail)[];
  custom_regions?: { region: string; no_of_openings: number }[];
  custom_hiring_type?: "Lateral" | "Fresher";

  custom_division?: string;
  expected_compensation?: number;
  status?: string;
  expected_by?: string;
  custom_employment_type?: string;
  custom_employment_type_link?: string;
  custom__employee_type?: string;
  custom_salary?: string;
  custom_location?: string;
  custom_work_experience?: string;
  custom_work_experience_range?: string;
  custom_preferred_notice_period?: string;
  custom_preferred_company?: string;
  custom_other_preferred_companies?: string;
  custom_qualifications?: { qualification: string; mandatory: string }[];
  custom_job_description_template?: string;
  description?: string;
  reason_for_requesting?: string;
  custom_skills?: string[];
  custom_assign_to_recruiter?: string;
  custom_pre_screened_candidates?: { candidate_name: string; email: string; phone: string; cv?: any; offer_directly: boolean }[];
  job_title?: string;
  source?: string;
}

// API Response Types
export interface JobRequisition {
  name: string;
  creation: string;
  modified: string;
  owner: string;
  modified_by: string;
  docstatus: number;
  requested_by: string;
  company: string;
  department: string;
  designation: string;
  no_of_positions: number;
  posting_date: string;
  status?: string;
  custom_type_of_position?: "New" | "Replacement";
  custom_functional_area?: string;
  custom_hiring_lead?: string;
  description?: string;
}

export interface CreateJobRequisitionResponse {
  message: JobRequisition;
}

export interface RequisitionPosition {
  position_number?: string | number;
  vacancy_type?: string;
  location?: string;
  sub_location?: string;
  functional_area?: string;
  reporting_manager?: string;
  replacement_for?: string;
  // Human-readable titles captured alongside the link ids (for display only).
  location_title?: string;
  sub_location_title?: string;
  functional_area_title?: string;
  reporting_manager_title?: string;
  replacement_for_title?: string;
}

export interface RequisitionQualification {
  qualification?: string;
  mandatory?: string;
}

export interface CVFile {
  url?: string;
  storage?: string;
  file_url?: string;
  name?: string;
}

export interface RequisitionCandidate {
  candidate_name?: string;
  email?: string;
  phone?: string;
  cv?: string | CVFile[] | CVFile | null;
  offer_directly?: boolean;
}

export interface RequisitionFormData {
  hiring_manager?: string;
  company?: string;
  department?: string;
  designation?: string;
  functional_area?: string;
  hiring_lead?: string;
  custom_division?: string;
  location?: string;
  recruitment_start_date?: string;
  expected_by?: string;
  reason_for_requesting?: string;
  description?: string;
  number_of_positions?: number | string;
  number_of_new_positions?: number | string;
  number_of_replacement_positions?: number | string;
  positions?: RequisitionPosition[];
  custom_regions?: { region?: string; no_of_openings?: number }[];
  custom_hiring_type?: "Lateral" | "Fresher";
  custom_employee_type?: string;
  employment_type?: string;
  custom_work_experience_range?: string;
  experience_from?: number;
  experience_to?: number;
  experience_unit?: string;
  custom_preferred_notice_period?: string;
  preferred_company?: string;
  custom_other_preferred_companies?: string;
  custom_assign_to_recruiter?: string;
  salary_currency?: string;
  salary_min?: number | string;
  salary_max?: number | string;
  salary_timeframe?: string;
  expected_compensation?: number | string;
  custom_skills?: string | string[];
  custom_qualifications?: RequisitionQualification[];
  custom_pre_screened_candidates?: RequisitionCandidate[];
  // Human-readable titles captured alongside the link ids (for display only).
  hiring_manager_title?: string;
  company_title?: string;
  department_title?: string;
  designation_title?: string;
  functional_area_title?: string;
  hiring_lead_title?: string;
  location_title?: string;
  employment_type_title?: string;
  preferred_company_title?: string;
  salary_currency_title?: string;
  custom_skills_title?: string[];
}

export interface ReferralField {
  display_name: string;
  reference_name: string;
  section?: string;
  fieldtype?: string;
  reqd?: number;
  visibility?: string;
  options?: string;
  table_fields?: {
    fieldname: string;
    label: string;
    fieldtype?: string;
    reqd?: number;
    in_list_view?: number;
  }[];
}

export type ReferralApplicationValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | unknown[]
  | Record<string, unknown>;
