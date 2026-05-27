/**
 * Raw Employee DocType row: `get_list` / `get_doc` with `fields: ["*"]`.
 *
 * Matches the JSON returned by `EmployeeService.getCurrentEmployeeAllDetails` when `fields`
 * is omitted or `["*"]` (the service default).
 */
export interface EmployeeFromAPI {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;

  // Core Identity
  employee: string;
  employee_number: string;
  naming_series: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  employee_name: string;
  salutation?: string;
  gender: string;
  date_of_birth: string;
  date_of_joining: string;
  image?: string;

  // Status
  status: "Active" | "Inactive" | "Suspended" | "Left";
  custom_employment_status?: "On Probation" | "Confirmation" | "Probation Extended" | "On Notice Period";

  // Organization
  company: string;
  department?: string;
  designation: string;
  grade?: string;
  reports_to?: string;
  employment_type?: string;
  branch?: string;
  job_applicant?: string;

  // Custom Org Fields
  custom_is_rehired?: number;
  custom_previous_emp_id?: string;
  custom_business_unit?: string;
  custom_head_quarter_city?: string;
  custom_band?: string;
  custom_functional_area?: string;
  custom_hod?: string;
  custom_hrbp?: string;
  custom_dotted_line_manager?: string;
  custom_cxo?: string;

  // Employment Lifecycle
  custom_probation_period?: string;
  scheduled_confirmation_date?: string;
  final_confirmation_date?: string;
  contract_end_date?: string;
  notice_number_of_days?: number;
  date_of_retirement?: string;
  custom_transfer_date?: string;

  // Onboarding / Docs
  custom_introduction_call?: string;
  custom_reminder_call?: string;
  custom_reminder_call_?: string;
  custom_onboarding_completion_information?: string;
  custom_onboarding_invitation?: string;
  custom_agreement?: string;
  custom_cheque?: string;
  custom_declaration_letter?: string;
  custom_acknowledgement_letter?: string;

  // Contact
  user_id?: string;
  cell_number?: string;
  personal_email?: string;
  company_email?: string;
  prefered_email?: string;
  prefered_contact_email?: string;

  // Extended Contact
  custom_mobile_id?: string;
  custom_personal_email_id_access?: number;
  custom_personal_mobile_access?: number;
  custom_personal_mobile_no?: string;
  custom_whatsapp_no?: string;
  custom__personal_mobile_access?: number;
  custom_office_mobile_access?: number;
  custom_office_mobile_no?: string;
  custom_extension_mobile_no?: string;
  custom_facebook_id?: string;
  custom_linkedin_id?: string;

  // Address
  current_address?: string;
  permanent_address?: string;
  custom_same_as_current?: number;
  current_accommodation_type?: string;
  permanent_accommodation_type?: string;

  // Emergency
  person_to_be_contacted?: string;
  emergency_phone_number?: string;
  relation?: string;
  custom_emergency_blood_group?: string;
  custom_emergency_email?: string;
  custom_alternative_emergency_contact_number?: string;

  // Attendance & Shift
  attendance_device_id?: string;
  holiday_list?: string;
  default_shift?: string;
  custom_allow_mobile_checkin?: number;
  custom_enable_web_clockin?: number;
  custom_use_shift_blocks?: number;
  custom_shift_blocks?: string;
  custom_attendance_exception?: number;
  custom_policy_name?: string;
  custom_weekly_off?: string;
  custom_device_id?: string;
  custom_enable_custom_punch_direction?: number;

  // Approvals
  expense_approver?: string;
  leave_approver?: string;
  shift_request_approver?: string;
  custom_shift_issuer?: string;

  // Salary
  ctc?: number;
  salary_currency?: string;
  salary_mode?: string;
  payroll_cost_center?: string;
  pan_number?: string;

  // Compliance / Business
  custom_location_type?: string;
  custom_gst_number?: string;
  custom_trade_name?: string;
  custom_supplier_id?: string;
  custom_business_category?: string;
  custom_business_segment?: string;
  custom_work_flow_policy?: string;
  custom_bank_account_in_erp?: string;
  custom_location_type_?: string;
  custom_is_relocation_employee?: number;
  custom_relocation_based_on?: string;
  custom_pt_applicable?: number;
  custom_pt_registration_no?: string;
  custom_pt_state?: string;
  custom_pt_location?: string;

  // Bank
  bank_name?: string;
  bank_ac_no?: string;
  ifsc_code?: string;
  micr_code?: string;
  iban?: string;

  // Personal
  marital_status?: string;
  blood_group?: string;
  custom_religion?: string;
  custom_nationality?: string;
  health_details?: string;
  family_background?: string;
  custom_aadhar_no?: string;
  custom_aadhar_number?: string;

  // PF / ESIC
  custom_minimum_wage_state?: string;
  custom_consultant_type?: string;
  custom_eps_applicability?: number;
  custom_pf_applicable_from?: string;
  custom_pf_registration_location?: string;
  custom_pf_enrollment_status?: string;
  custom_existing_member_of_pf?: number;
  provident_fund_account?: string;
  custom_esic_applicable?: number;
  custom_uan?: string;
  custom_esic_enrollment_status?: string;
  custom_esic_number?: string;
  custom_esic_registration_code?: string;
  custom_esic_applicable_till?: string;
  custom_esic_ip_number?: string;
  custom_esic_applicable_from?: string;

  // Exit
  resignation_letter_date?: string;
  relieving_date?: string;
  held_on?: string;
  new_workplace?: string;
  reason_for_leaving?: string;
  feedback?: string;
  leave_encashed?: string;
  encashment_date?: string;

  // Travel
  custom_meal_preference?: string;
  custom_seat_preference?: string;
  custom_is_international?: string;
  custom_seat_section?: string;
  custom_seating_preference?: string;
  custom_hotel_preference_room_type?: string;
  custom_accessibility_needs?: number;
  custom__accessibility_needs?: number;
  custom_preferred_travel_type?: string;
  custom_preferred_travel_class?: string;
  custom_preferred_accommodation_type?: string;

  // Misc
  lft?: number;
  rgt?: number;
  old_parent?: string;
}

export interface IEmployeeWorkHistory {
  name: string;
  owner: string;
  creation: string; // ISO-like datetime string
  modified: string; // ISO-like datetime string
  modified_by: string;
  docstatus: number;
  idx: number;
  history_type: string;
  doctype_name: string;
  records: string;
  field_label: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  parent: string;
  parentfield: string;
  parenttype: string;
  doctype: string;
  records_details: {
    fullname: string;
    department: {
      name: string;
      department_name: string;
    };
    branch: {
      name: string;
      branch_value: string;
    };
  };
}

/**
 * Enriched / list-view / legacy UI fields not always present on the raw Employee doc.
 */

export interface WorkRole {
  from_date: string;
  to_date: string;
  is_current: boolean;
  company: {
    id: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
  };
  designation: {
    id: string;
    name: string;
  };
  functional_area: {
    id: string;
    name: string;
  };
  band: {
    id: string;
    name: string;
  };
  grade: {
    id: string;
    name: string;
  };
  is_promotion: boolean;
}
export interface EmployeeSupplementary {
  designation_name?: string;
  department_display?: string;
  designation_display?: string;
  department_name?: string;
  branch_name?: string;
  branch_display?: string;
  grade_display?: string;
  /** UI alias; API uses `employee` / `name` */
  employee_id?: string;
  email?: string;
  custom_work_history?: IEmployeeWorkHistory[];
  custom_designation_title?: string;
  /** Read-only custom field on some sites; see profile / Form.io mappings */
  custom_designation_name?: string;
  work_roles?: WorkRole[];
}

export interface Employee extends EmployeeFromAPI, EmployeeSupplementary { }

export type CurrentEmployeeAllDetails = Employee;

export interface EmployeeIdCardResponse {
  blood_group: string;
  branch: string;
  branch_name: string;
  cell_number: string;
  company: string;
  company_email: string;
  company_name: string;
  current_address: string | null;
  custom_aadhar_no: string | null;
  custom_employment_status: string;
  date_of_birth: string; // ISO date (YYYY-MM-DD)
  date_of_joining: string; // ISO date
  department: string;
  department_name: string;
  designation: string;
  designation_name: string;
  emergency_phone_number: string | null;
  employee_name: string;
  employee_number: string;
  employment_type: string;
  final_confirmation_date: string; // ISO date
  first_name: string;
  gender: "Male" | "Female" | "Other" | string; // extendable
  image: string | null;
  last_name: string | null;
  middle_name: string | null;
  name: string;
  employee?: string;
  person_to_be_contacted: string | null;
  personal_email: string;
  prefered_email: string;
  status: "Active" | "Inactive" | string; // extendable
}
export interface EmployeeProfileOverview {
  field_label: string;
  display: string;
  value: string;

}
export interface EmployeeFieldsToTrack {
  field_name: string;
  field_label: string;
  field_type: string;
  options: string;
  value: string;
  display: string;
}

export interface Award {
  name: string;
  award_name: string;
  description: string;
  award_category: string;
  award_period: string;
  recognition_type_name: string;
  recognition_type_code: string;
  period_start_date?: string;
  period_end_date?: string;
  icon?: string;
  display_on_profile: 0 | 1;
  employee: string;
  badge_name: string;
  reason: string;
  recognition_type: string;
  awarded_at: string;
}

export interface EmployeeNode {
  name: string;
  id: string;
  lft: number;
  rgt: number;
  reports_to: string | null;
  image: string | null;
  title: string | null;
  connections: number;
  expandable: boolean;
  children: EmployeeNode[];
  collapsed?: boolean;
};

// Simplified Employee interface for ID Card display
export interface EmployeeIdCard {
  id: string;
  name: string;
  employee_name: string;
  department: string;
  designation?: string;
  location?: string;
  startDate: string;
  avatar?: string;
  status: string;
  company?: string;
  employee_number?: string;
  contact?: string;
  email?: string;
}

// Employee list item for search/selection
export interface EmployeeListItem {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
  status: string;
  image?: string;
}

export interface IReason {
  name: string;
  reason: string;
  reason_type: string;
}

export interface IDesignationHierarchy {
  company?: string;
  department?: string;
  designation?: string;
  functional_area?: string;
  start_date?: string;
  data: {
    companies: string[];
    departments: string[];
    designations: string[];
    functional_areas: string[]
  }
}
export interface IGetEmpDesignationHierarchyCurrentDetails {
  data: {
    company: string,
    department: string,
    designation: string,
    functional_area: string,
    start_date: string
  }
}

export interface AttendanceFieldPermissions {
  make_attendance_message_optional: boolean;
  make_reason_non_mandate: boolean;
}