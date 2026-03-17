// Employee interface based on Frappe Employee DocType
export interface Employee {
  designation: string;
  department_display: string;
  designation_display: string;
  shift_request_approver: string | null;
  name: string;
  employee: string;
  employee_name: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  employee_number?: string;
  custom_designation_name?: string;
  department?: string;
  company?: string;
  branch?: string;
  branch_display?: string;
  grade?: string;
  grade_display?: string;
  employment_type?: string;
  date_of_joining: string;
  date_of_birth: string;
  gender: string;
  image?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Left';
  custom_employment_status?: "On Probation" | "Confirmation" | "Probation Extended" | "On Notice Period";
  user_id?: string;
  reports_to?: string;

  // Contact Details
  cell_number?: string;
  personal_email?: string;
  company_email?: string;
  prefered_email?: string;

  // Address
  current_address?: string;
  permanent_address?: string;
  custom_same_as_current?: string;

  // Emergency Contact
  person_to_be_contacted?: string;
  emergency_phone_number?: string;
  relation?: string;

  // Attendance & Leaves
  attendance_device_id?: string;
  holiday_list?: string;
  default_shift?: string;

  // Personal Details
  marital_status?: string;
  blood_group?: string;
  custom_aadhar_no?: string;

  // Employment Details
  job_applicant?: string;
  scheduled_confirmation_date?: string;
  final_confirmation_date?: string;
  contract_end_date?: string;
  notice_number_of_days?: number;
  date_of_retirement?: string;

  // Salary Information
  ctc?: number;
  salary_currency?: string;
  salary_mode?: string;
  payroll_cost_center?: string;
  pan_number?: string;
  provident_fund_account?: string;

  // Bank Details
  bank_name?: string;
  bank_ac_no?: string;
  ifsc_code?: string;

  // Exit Details
  resignation_letter_date?: string;
  relieving_date?: string;
  held_on?: string;
  new_workplace?: string;
  reason_for_leaving?: string;
  feedback?: string;

  custom_allow_mobile_checkin?: boolean;
  custom_enable_web_clockin?: boolean;
  custom_weekly_off?: string;
  employee_id: string;
  custom_work_history?: IEmployeeWorkHistory[];
}

export interface EmployeeProfileOverview {
  field_label: string;
  display: string;
  value: string;

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