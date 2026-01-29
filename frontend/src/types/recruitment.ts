// Position Details Types
export interface PositionDetail {
  position_number?: number;
  location: string;
  functional_area?: string;
  reporting_manager: string;
  employee_type: string;
}

export interface ReplacementPositionDetail {
  position_number?: number;
  location: string;
  replacement_for: string;
  reporting_manager: string;
  employee_type: string;
}

// Form Data Types (what the form collects)
export interface JobRequisitionFormData {
  // Basic Details
  hiring_manager: string;
  company: string;
  department: string;
  designation: string;
  functional_area?: string;

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

  // Position Selection
  position_type: "new" | "replacement";
  number_of_new_positions?: number;
  number_of_replacement_positions?: number;
  positions?: PositionDetail[];
  replacement_positions?: ReplacementPositionDetail[];

  // Other Details
  comments_instructions?: string;
  cost_centre: string;
  designation_change?: string;
}

// API Payload Types (what gets sent to the backend)
export interface CreateJobRequisitionPayload {
  requested_by: string;
  company: string;
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
  custom_cost_centre: string;
  custom_designation_change?: string;
  custom_additional_roles__responsibilities?: string;
  custom_additional_skills?: string;
  custom_position_details: (PositionDetail | ReplacementPositionDetail)[];
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
