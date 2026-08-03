export interface TimesheetDetail {
  activity_type: string;
  project?: string;
  task?: string;
  expected_hours?: number;
  from_time: string;
  to_time: string;
  description?: string;
  hours: number;
  completed?: boolean | number;
  is_billable?: boolean | number;
}

export interface TimesheetPayload {
  company: string;
  employee: string;
  project?: string;
  customer?: string;
  time_logs: TimesheetDetail[];
}

export interface TimesheetResponse {
  name: string;
  company: string;
  employee: string;
  time_logs: TimesheetDetail[];
  employee_name?: string;
  customer_name?: string;
  customer?: string;
  project_name?: string;
  parent_project?: string;
  start_date?: string;
  end_date?: string;
  total_hours?: number;
  status?: string;
  [key: string]: unknown;
}

export interface TimesheetListRecord {
  name: string;
  employee_name?: string;
  employee?: string;
  company?: string;
  customer?: string;
  customer_name?: string;
  parent_project?: string;
  project_name?: string;
  start_date?: string;
  end_date?: string;
  total_hours?: number;
  status?: string;
  [key: string]: unknown;
}

export interface TimesheetFormData {
  company?: string;
  employee?: string;
  parent_project?: string;
  customer?: string;
  time_logs?: TimesheetDetail[];
  [key: string]: unknown;
}

// --- Weekly Timesheet Types ---

export interface WeeklyTimesheetParams {
  employee_id: string;
  week_start_date: string;
}

export interface WeeklyTimesheetTimeLog {
  description: string;
  hours: number;
  project_name: string;
  project_id: string | null;
  task_name: string;
  task_id: string | null;
}

export interface WeeklyTimesheetRecord {
  name: string;
  company: string;
  parent_project: string | null;
  project_id: string | null;
  project_name: string | null;
  status: string;
  docstatus: number;
  total_hours: number;
  is_editable: boolean;
  time_logs: WeeklyTimesheetTimeLog[];
  timesheet_hours: number;
}

export interface WeeklyTimesheetDay {
  date: string;
  day_name: string;
  attendance_hours: number;
  attendance_status: string | null;
  timesheet_hours: number;
  timesheet_records: WeeklyTimesheetRecord[];
}

export interface WeeklyTimesheetResponse {
  success: boolean;
  employee: string;
  week_start_date: string;
  week_end_date: string;
  project_id: string | null;
  project_name: string | null;
  is_editable: boolean;
  days: WeeklyTimesheetDay[];
}

export interface TimesheetEntryRow {
  project: string;
  task: string;
  comment: string;
  hrs: number;
}

export type TimesheetEntryPayload = Record<string, {
  status: string;
  rows?: TimesheetEntryRow[];
}>;
