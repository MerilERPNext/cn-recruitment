export interface LeaveRequest {
  name: string;
  leave_type: string;
  custom_leave_type_name: string;
  from_date: string;
  to_date: string;
  status: "Approved" | "Open" | "Rejected" | "Cancelled" | "Pending";
  employee_name: string;
  description?: string;
  department?: string;
  custom_reason?: string;
  custom_rejection_reason?: string;
  half_day: boolean;
  custom_attachment?: { url: string }[];
  half_day_date?: string;
  custom_second_half_day_date?: string;
  total_leave_days: number;
  posting_date: string;
  reason_name?: string;
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
  leave_id: string;
  type: string;
  annual_allocation: number;
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
  balance_excluding_future_transactions: number;
  optional_leave?: number;
}

export interface LeaveTransaction {
  type: string;
  name?: string;
  total: number;
  monthly: number[];
  dont_show_in_frontend: number;
}

export interface LeaveBalanceResponse {
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
  custom_leave_type_name?: string;
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
  leave_type_name?: string;
  optional_leave?: number;
}
export type HolidayGroupType = "Optional" | "National Holiday" | "Mandatory";

export interface HolidayGroup {
  type_name: HolidayGroupType;
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
  docstatus: number;
  allocated_to?: string[];
  allocated_roles?: string[];
  allocated_to_user: string;
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
  show_half_day_options?: number;
  show_individual_continuous?: number;
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
  allocated_to: string[];
  allocated_roles?: string[];
  role: string;
  reference_type: string;
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
  can_edit?: boolean;
  send_back_user?: string;
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
  custom_rejection_reason?: string | null;
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

//Leave Balance Drawer Tabs Types

export interface PassbookTransactionRange {
  from_date: string;
  to_date: string;
}

export interface PassbookCycleOption {
  label: string;
  value: string;
  from_date: string;
  to_date: string;
}

export interface LeavePassbookMetadataResponse {
  transaction_range: PassbookTransactionRange;
  cycle_options: PassbookCycleOption[];
  default_cycle_label: string;
  default_cycle: string;
  leave_cycle_type: string;
}

export interface LeavePassbookEntry {
  time: string;
  creation: string;
  comment: string;
  opening_balance: number;
  transacted_balance: number;
  closing_balance: number;
  current_cycle_accrual: number;
  carry_forward: number;
  leaves_taken: number;
  encashment: number;
  yearly_allotment: number;
  transaction_type: string;
  transaction_name: string;
  from_date: string;
  to_date: string;
}
export interface LeavePassbookResponse {
  entries: LeavePassbookEntry[];
}

export interface AccrualPeriodOption {
  label: string;
  value: number;
  period_label: string;
  cron_run_date: string;
  is_allocated: number;
  is_excluded: number;
}

export interface AccrualAllocationInfo {
  name: string;
  from_date: string;
  to_date: string;
  total_leaves_allocated: number;
}

export interface AccrualJournalMetadataResponse {
  period_options: AccrualPeriodOption[];
  default_period: number;
  default_period_label: string;
  allocation_info: AccrualAllocationInfo;
}

export interface AccrualPolicy {
  earn_leave: number;
  earned_leave_frequency: string;
  rounding: string;
  max_leaves_allowed: number;
  accrual_point: string;
  no_of_weeks: number | null;
}

export interface AccrualData {
  period_number: number;
  period_label: string;
  cron_run_date: string;
  is_allocated: number;
  is_excluded: number;
  leaves_allocated: number;
  exclusion_reason: string;
  accrual_policy: AccrualPolicy;
  accrual_policy_text: string;
  formula: string;
  net_balance_credited: number;
}

export interface AccrualJournalEntriesResponse {
  accrual_data: AccrualData;
}

export interface PolicyQuestionItem {
  name: string;
  question_name: string;
  status: "Yes" | "No";
  description: string;
  idx: number;
}

export interface PolicyQuestionsResponse {
  name: string;
  doctype_name: string;
  target_doctype: string;
  policy_question: string;
  questions: PolicyQuestionItem[];
}

// types/attendance.ts

export interface AttendanceStatusItem {
  employee_name: string;
  attendance_date: string; // yyyy-mm-dd
  status: "Present" | "Absent" | "On Leave" | string;
}

export type AttendanceStatusResponse = AttendanceStatusItem[];
