export type ExpenseCategoryType = "General" | "Relocation";

export interface ExpensePolicyQuestion {
  question_name: string;
  status: string;
  description: string;
}

export interface ExpensePolicyCategory {
  category_name: string;
  category_display_name: string;
  questions: ExpensePolicyQuestion[];
}

export interface ExpensePolicyQuestionsResponse {
  success: boolean;
  message?: string;
  data: ExpensePolicyCategory[];
  options: string[];
}

export interface AllowRequestsOnHoldResponse {
  allow_requests_to_be_put_on_hold: boolean;
  show_approval_buttons: boolean;
  allow_overwriting_amount_while_processing_reimbursement_advance: boolean;
  allow_overwriting_amount_more_than_claimed_while_approving: boolean;
  show_on_notice_flag_in_process_and_pay_reimbursement_page: boolean;
}
