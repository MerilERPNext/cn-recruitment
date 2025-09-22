export interface LeaveRequest {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Approved" | "Open" | "Rejected" | "Cancelled" | "Pending";
  employee_name: string;
  description?: string;
  department?: string;
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
  entitled: number;
  availed: number;
  balance: number;
  carry_over: number;
  dont_show_in_frontend: number;
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

export interface MyLeaveRequestType {
  reference_document: LeaveRequest;
  allocated_to: string;
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
}
