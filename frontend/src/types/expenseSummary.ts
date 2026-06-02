/** Types for Expense Reimbursement Summary API */

/** A single expense claim record within a summary category */
export interface ReimbursementRecord {
  name: string;
  no_of_expenses: number;
  rejected_count: number;
  amount: number;
  approved_amount: number;
  claimed_amount: number;
  request_date: string;
  approval_status: string;
  status: string;
  last_action_status: string | null;
  approved_by: string | null;
  approved_by_employee: string | null;
  approved_on: string | null;
}

/** A summary category (e.g. total_expenses, pending_for_submission, etc.) */
export interface ReimbursementCategory {
  count: number;
  amount: number;
  records: ReimbursementRecord[];
}

/** The full reimbursement summary response from the API.
 *  FrappeAPI.getMethod unwraps `response.data.message`, so
 *  this type represents the already-unwrapped payload. */
export interface ReimbursementSummary {
  total_expenses: ReimbursementCategory;
  pending_for_submission: ReimbursementCategory;
  pending_for_approval: ReimbursementCategory;
  pending_for_processing: ReimbursementCategory;
  pending_for_clarification: ReimbursementCategory;
}
