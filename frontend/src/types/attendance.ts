import { BaseItem } from "../components/Notices/types/noticeItem";

// types/attendance.ts
export type Attendance = {
  name: string;
  owner: string;
  creation: string; // ISO datetime string
  modified: string; // ISO datetime string
  modified_by: string;
  docstatus: number;
  idx: number;
  naming_series: string;
  employee: string;
  employee_name: string;
  working_hours: number;
  status: "Present" | "Absent" | "Half Day" | "On Leave";
  leave_type: string | null;
  custom_half_day_type: string;
  leave_application: string | null;
  attendance_date: string; // ISO date string (e.g. '2025-07-01')
  company: string;
  department: string;
  attendance_request: string | null;
  shift: string | null;
  in_time: string | null;
  out_time: string | null;
  late_entry: number;
  early_exit: number;
  amended_from: string | null;
};

export interface AttendanceRequest {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  employee: string;
  employee_name: string;
  department: string;
  company: string;
  from_date: string;
  to_date: string;
  half_day: number;
  half_day_date: string | null;
  include_holidays: number;
  shift: string | null;
  reason: string;
  explanation: string | null;
  amended_from: string | null;
  status: string;
  custom_in_time: string;
  custom_out_time: string;
  custom_checkin_type: string;
  custom_checkout_time: string;
  todo_id: string;
  custom_status: string;
  custom_request_type: string;
  custom_to_time?: string;
  custom_from_time?: string;
  custom_attachment?: string;
  custom_location?: string;
}

export interface MyAttendanceRequest {
  reference_document: AttendanceRequest;
  reference_type: string;
  allocated_to: string;
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
  status: string;
  can_edit?: boolean;
}

export type OvertimeDetail = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  shift_date: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  message: string;
  parent: string;
  parentfield: string;
  parenttype: string;
  doctype: string;
};

export type PlannedOvertimeRequest = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  employee: string;
  status: string;
  attachment: string;
  amended_from: string | null;
  reason: string | null;
  doctype: string;
  overtime_details: OvertimeDetail[];
};

export interface MyPlannedAttendanceRequest {
  reference_document: PlannedOvertimeRequest;
  custom_doctype_actions: string;
  custom_open_chatnext_assistant_on_action: boolean;
  custom_approval_type: string;
  reference_type: string;
  allocated_to: string;
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
  status: string;
}
export interface AttendanceRequestValidations {
  attendance_adjustment_requests: number;
  clockin_requests: number;
  shift_change_requests: number;
  out_duty_requests: number;
  short_leave_requests: number;
  is_mandatory:boolean
}

export interface RequestCardProps {
  request: AttendanceRequest;
  isActionedCard?: boolean;
  isSelected?: boolean;
  onAction?: () => void;
}
export interface BulkActionProps {
  selectedIds: string[];
  pendingRequests: AttendanceRequest[];
  onSelectAll: () => void;
  onBulkAction: (action: "Approve" | "Reject") => void;
  loadingAction?: {
    action: "Approve" | "Reject";
    isLoading: boolean;
  } | null;
}

export type EmployeeCheckInLog = {
  name: string;
  employee: string;
  time: string;
  log_type: "IN" | "OUT";
  shift: string;
  shift_start: string;
  shift_end: string;
  shift_actual_start: string;
  shift_actual_end: string;
};

export type EmployeeShift = {
  shift: string;
  end_time: string;
  start_time: string;
};

export type EmployeeShiftSummary = {
  present: number;
  absent: number;
  leaves: number;
  avg_overtime: string;
  avg_late_by: string;
  avg_working_hours: string;
};
export type EmployeeStatusType =
  | "present"
  | "absent"
  | "on leave"
  | "half day"
  | "work from home";

export interface EmployeeStatus extends BaseItem {
  employee_name: string;
  status: EmployeeStatusType;
  in_time?: string;
  out_time?: string;
  name: string;
  employee: string;
  working_hours: number;
  shift: string;
}

export type CanShowClockIn = {
  can_show: boolean;
};

export type AllEventsAndAttendanceT = {
  start: string;
  end: string;
};

export type AttendanceRecord = {
  name: string;
  doctype: string;
  start: string;
  end: string;
  title: string;
  status: string;
  docstatus: string;
  employee: string;
  half_day_status_second_half?: string;
  half_day_status_first_half?: string;
  in_time?: string;
  out_time?: string;
  shift?: string;
};

export type PolicyQuestion = {
  name: string;
  owner: string;
  creation: string; // ISO date string
  modified: string; // ISO date string
  modified_by: string;
  docstatus: number;
  idx: number;
  policy_question: string;
  attendance_policy: string;
  doctype: "Policy Question";
  questions: Question[];
};

export type Question = {
  name: string;
  owner: string;
  creation: string; // ISO date string
  modified: string; // ISO date string
  modified_by: string;
  docstatus: number;
  idx: number;
  question_name: string;
  status: string;
  description: string;
  parent: string;
  parentfield: "questions";
  parenttype: "Policy Question";
  doctype: "Question";
};
export type LoadingAction = {
  id: string;
  action: string;
};
export type CustomError = Error & {
  response?: { data?: { message?: { error: string }; exception?: string } };
};

export type UserRoles = {
  user: string;
  roles: Record<string, 0 | 1>;
  total_assigned: number;
};

export type Policy = {
  name: string;
};

export type WeeklyOff = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  weekly_off: string;
  weekly_off_code: string;
  assignment_type: string;
  company: string;
  description: string;
  consider_as_halfday: number;
};
export type IPRestrictionsT = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  network_name: string;
  group_company: string;
  ip_address_from: string;
  ip_address_to: string;
  tag: string;
};

export type ShiftLocationT = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  location_name: string;
  checkin_radius: number;
  custom_parent_company_id: string;
  latitude: number;
  longitude: number;
  custom_tags: string | null;
  geolocation: string | null;
};

export type ShiftBlock = {
  name: string;
  owner: string;
  creation: string; // ISO date-time string or custom format
  modified: string; // ISO date-time string or custom format
  modified_by: string;
  docstatus: number;
  idx: number;
  shift_block_name: string;
  naming_series: string;
  assignment_type: string;
  company: string;
  shift_block_type: string;
  weekly_off: string;
};
