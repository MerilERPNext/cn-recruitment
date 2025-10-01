export interface LeaveRequest {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Approved" | "Open" | "Rejected" | "Cancelled" | "Pending";
  employee_name: string;
  description?: string;
  department?: string;
  custom_reason?: string;
  half_day: boolean;
  custom_attachment?: { url: string }[];
  half_day_date?: string;
  custom_second_half_day_date?: string;
  total_leave_days: number;
}

export interface TeamLeaveRequest {
  id: string;
  name: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Pending" | "Approved" | "Rejected" | "Open" | "Cancelled";
  description?: string;
  department?: string;
  employeeName?: string;
  employeePhoto?: string;
  leaveType?: string;
  dateRange?: string;
  reason?: string;
}

export interface LeaveBalance {
  type: string;
  dont_show_in_frontend: number;
  entitled: number;
  availed: number;
  balance: number;
  carry_over: number;
  carry_forward_expiry_date: string | null;
  visibility_flags: {
    show_entitled: boolean;
    show_balance: boolean;
    show_carry_over: boolean;
    show_availed: boolean;
    show_carry_forward_expiry_date: number;
  };
}

export interface LeaveTransaction {
  type: string;
  total: number;
  monthly: number[];
  dont_show_in_frontend: number;
}

export interface LeaveDetailsResponse {
  leave_balance: LeaveBalance[];
  leave_transactions: LeaveTransaction[];
  global_settings: {
    show_carry_forward_validity_date: number;
    show_leave_taken_count: number;
    show_balance_excluding_future_transactions: number;
    hide_accrued_so_far_this_year: number;
    hide_credited_from_last_year: number;
    hide_annual_allotment: number;
  };
}

type LeaveStatus = "Open" | "Approved" | "Rejected" | "Cancelled";

export interface LeaveApplicationItem {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: LeaveStatus;
  description?: string;
}

export interface LeaveApplication {
  name: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Open" | "Approved" | "Rejected" | "Cancelled" | string;
  description?: string;
}

export interface Holiday {
  name: string;
  date: string;
  type: string;
  holiday_name: string;
  description: string | null;
  repeat_next_year: number;
  creation: string;
  modified: string;
  optional?: boolean;
  owner: string;
  is_repeated: boolean;
  original_doc_name: string;
  leave_type: string;
}

export interface HolidayGroup {
  type_name: string;
  holidays: Holiday[];
}

export interface HolidayApiResponse {
  message: { status: string; data: HolidayGroup[] };
}

export interface TeamRequest {
  id: string;
  name: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Open" | "Approved" | "Rejected" | "Cancelled";
  description?: string;
  todo_id: string;
}

export interface CompOffResponse {
  name: string;
  work_from_date: string;
  work_end_date: string;
  leave_type: string;
  reason: string;
  custom_status: string;
  pay_button_required: boolean;
}

export interface LeaveFieldFlags {
  leave_type: number;
  from_date: number;
  to_date: number;
  custom_reason: number;
  description: number;
  custom_attachment: number;
  half_day: number;
  half_day_date: number;
  custom_second_half_day_date: number;
}

export interface LeaveFieldResponse {
  show: LeaveFieldFlags;
  mandatory: LeaveFieldFlags;
  custom_min_days_for_mandatory_attachment: number;
}

export interface LeaveReason {
  name: string;
  reason: string;
  reason_type: string;
  reason_frequency: string;
  limit: string;
  assignment_type: string;
  company: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
}

//Leave requestType
export interface MyLeaveRequestType {
  reference_document: LeaveRequest;
  allocated_to: string;
  reference_type: string;
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
  reference_type: string;
}

// types/leaves.ts

export interface LeaveApplication {
  name: string;
  owner: string;
  creation: string; // ISO datetime
  modified: string; // ISO datetime
  modified_by: string;
  docstatus: number;
  idx: number;
  naming_series: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  company: string;
  department: string;
  custom_optional_holidays?: string | null;
  custom_optionall_holidays?: string | null;
  from_date: string;
  to_date: string;
  half_day: number;
  half_day_date: string | null;
  custom_second_half_day_date?: string | null;
  custom_half_day_type?: string | null;
  total_leave_days: number;
  custom_reason?: string | null;
  description?: string | undefined;
  custom_attachment?: string | null;
  leave_balance: number;
  custom_compensatory_leave_request?: string | null;
  custom_auto_created: number;
  custom_auto_creation_type?: string | null;
  custom_pay_rate: number;
  leave_approver?: string | null;
  leave_approver_name?: string | null;
  follow_via_email: number;
  posting_date: string;
  status: string;
  salary_slip?: string | null;
  color?: string | null;
  letter_head?: string | null;
  amended_from?: string | null;
  doctype: "Leave Application";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comp_off_consumption?: any[];
}

// Optional: props for cards if you want LeaveCard similar to EmpAttendanceRequestCard
export interface LeaveCardProps {
  data: MyLeaveRequestType;
  columns?: number;
  buttonStatus?: ButtonStatusResponse;
}

//button status response
export interface ButtonStatusResponse {
  leave_applications: {
    name: string;
    employee: string;
    leave_type: string;
    from_date: string;
    to_date: string;
    status: "Open" | "Approved" | "Rejected" | "Cancelled"; // you can extend if API has more
    docstatus: number;
    custom_auto_created: number;

    show_replace_button: boolean;
    replace_reason: string;

    show_edit_button: boolean;
    edit_reason: string;

    show_revoke_button: boolean;
    revoke_reason: string;
  }[];
}

export type EditApprovedLeavePayload = {
  leave_application: string;
  new_values: {
    leave_type?: string;
    from_date?: string;
    to_date?: string;
    half_day?: 0 | 1;
    half_day_date?: string;
    custom_half_day_type?: "First Half" | "Second Half";
    custom_second_half_day_date?: string;
    description?: string;
    custom_reason?: string;
    custom_attachment?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
};
