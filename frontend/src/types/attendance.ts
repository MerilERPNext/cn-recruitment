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
  status: "Present" | "Absent" | "Half Day" | "On Leave" | string;
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
