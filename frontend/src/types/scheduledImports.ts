export type ImportStatus =
  | "Draft"
  | "Processed"
  | "Scheduled"
  | "Processing"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type ImportOperation = "Insert" | "Overwrite";
export type ImportSchedule = "Immediate" | "Custom";
export type ImportDelimiter = "Comma" | "Tab" | "Semicolon" | "Pipe";

export interface ScheduledDataImport {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  import_type: string;
  operation: ImportOperation;
  company: string;
  status: ImportStatus;
  file_to_import: string;
  has_field_names: number;
  date_format: string;
  delimiter: ImportDelimiter;
  schedule_the_import: ImportSchedule;
  scheduled_date: string | null;
  time_slot: string;
  timezone: string;
  scheduled_datetime: string | null;
  started_at: string | null;
  completed_at: string | null;
  imported_records_count: number;
  failed_records_count: number;
  error_log: string | null;
  import_log: string | null;
}

export interface ImportStatusSummary {
  total: number;
  pendingApproval: number;
  pendingScheduled: number;
  processing: number;
  processed: number;
  failedCancelled: number;
}
