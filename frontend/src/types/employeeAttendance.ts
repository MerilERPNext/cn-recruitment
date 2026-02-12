// API shape
export interface ApiRepayment {
  idx: number;
  payment_date: string;
  payment_amount: number;
  deducted: number;
  balance_amount: number;
}

export type ApiAdvance =  {
  name: string;
   can_edit: number;
  employee_name: string;
  amount: number;
  advance_account: string;
  employee: string;
  advance_type: string;
  status: string;
  start_date: string;
  end_date: string;
  total_advance_amount: number;
  total_paid_amount: number;
  balance_amount: number;
  repayments: ApiRepayment[];
}

// UI shape (your old Advance type)
export interface UiAdvance {
  docname: string;
  employee_name: string;
  name: string;
  amount: number;
  numberOfDeductions: number;
  startDate: string;
  endDate: string;
  advanceStatus: string;
  installments: Installment[];
  can_edit: number;
}

export interface Installment {
  installmentNo: number;
  installmentDate: string;
  openingBalance: number;
  installmentAmount: number;
  principalBalance: number;
}
