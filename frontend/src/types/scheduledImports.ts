export type ImportStatus =
  | "Draft"
  | "Pending for approval"
  | "Processed"
  | "Scheduled"
  | "Processing"
  | "Completed"
  | "Partially Successful"
  | "Failed"
  | "Cancelled";

export type ImportOperation = "Insert" | "Overwrite";
export type ImportSchedule = "Immediate" | "Custom";
export type ImportDelimiter = "Comma" | "Tab" | "Semicolon" | "Pipe";

// Imports that didn't come through clean: the annotated error file is
// offered for these, plus for anything carrying a per-row failure or skip.
export const ERROR_FILE_STATUSES: ImportStatus[] = [
  "Failed",
  "Partially Successful",
];

export const hasErrorFile = (item: {
  status?: string;
  failed_records_count?: number;
  skipped_records_count?: number;
}): boolean =>
  (item.failed_records_count ?? 0) > 0 ||
  (item.skipped_records_count ?? 0) > 0 ||
  ERROR_FILE_STATUSES.includes(item.status as ImportStatus);

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
  skipped_records_count: number;
  error_log: string | null;
  import_log: string | null;
}

export interface ImportStatusSummary {
  total: number;
  pendingApproval: number;
  pendingScheduled: number;
  processing: number;
  processed: number;
  partiallySuccessful: number;
  failedCancelled: number;
}
