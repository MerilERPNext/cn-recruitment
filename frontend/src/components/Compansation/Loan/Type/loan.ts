import { TodoType } from "../../../../types/todos";

export interface RepaymentSchedule {
  balance_loan_amount: number;
  creation: string;
  docstatus: number;
  doctype: string;
  idx: number;
  interest_amount: number;
  modified: string;
  modified_by: string;
  name: string;
  owner: string;
  parent: string;
  parentfield: string;
  parenttype: string;
  payment_date: string;
  principal_amount: number;
  total_payment: number;
}

export interface Loan {
  rate_of_interest: number;
  status: string;
  applicant_name: string;
  applicant: string;
  company: string;
  loan_type: string;
  loan_requested_amount: number;
  loan_approved_amount: number;
  loan_start_date: string;
  loan_tenure: number;
  mode_of_payment: string;
  applicant_type: string;
  monthly_repayment_amount: number;
  total_amount_paid: number;
  total_interest_payable: number;
  total_payment: number;
  standard_interest: number;
  emi_type: string;
  loan_name: string;
  name: string;
  creation: string;
  posting_date: string;
  repayment_schedule: RepaymentSchedule[];
  todo_list?: TodoType[];
  [key: string]: unknown;
}

export interface Installment {
  name?: string;
  creation?: string;
  modified?: string;
  payment_date?: string;
  total_payment?: number;
  principal_amount?: number;
  interest_amount?: number;
  balance_loan_amount?: number;
  perquisite_amount?: number;
  status?: string;
}

export type LoanResponseType = {
  loan_product: string;
  loan_amount: number;
  repayment_method: string;
  repayment_periods: number;
  description: string;
};

export interface HoldInstallmentPayload {
  doc_id: string;
  payment_date: string;
  hold_option: string;
  number_of_months: number;
  [key: string]: unknown;
}

export interface EditInstallmentPayload {
  doc_id: string;
  payment_date: string;
  hold_option: string;
  number_of_months: number;
  repayment_amount: number;
  [key: string]: unknown;
}

export interface InstallmentActionResponse {
  message?: string;
  status?: string;
  [key: string]: unknown;
}
