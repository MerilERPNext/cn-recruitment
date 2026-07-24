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
