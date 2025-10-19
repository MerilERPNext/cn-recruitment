/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ExpenseAdvance {
  data: {
    name: string;
    employee_name: string;
    posting_date: string;
    company: string;
    department: string;
    advance_amount: number;
    paid_amount: number;
    pending_amount: number;
    status: string;
  }[];
}

export interface ExpenseTypeFieldsResponse {
  fields?: any[];
  claim_type_based_on?: string;
  is_amount_readonly: boolean;
  [key: string]: any;
}

export interface CalculateExpenseParams {
  expense_type: string;
  units: number;
  vehicle_type?: string | null;
}

export interface CalculateExpenseMessage {
  success: boolean;
  amount: number;
  amount_per_unit: number;
}

export interface CalculateExpenseResponse {
  message: CalculateExpenseMessage;
}
