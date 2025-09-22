// Employee interface based on Frappe Employee DocType
export interface Employee {
  designation: string;
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
  grade?: string;
  employment_type?: string;
  date_of_joining: string;
  date_of_birth: string;
  gender: string;
  image?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Left';
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

  custom_allow_mobile_checkin ?:boolean;
  custom_enable_web_clockin ?:boolean;
}

export interface EmployeeNode  {
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