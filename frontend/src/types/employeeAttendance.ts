// API shape
export interface ApiRepayment {
  idx: number;
  payment_date: string;
  payment_amount: number;
  deducted: number;
  balance_amount: number;
}

export interface ApiAdvance {
  amount: number;
  advance_account: string
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
  name: string;
  amount: number;
  numberOfDeductions: number;
  startDate: string;
  endDate: string;
  advanceStatus: string;
  installments: Installment[];
}

export interface Installment {
  installmentNo: number;
  installmentDate: string;
  openingBalance: number;
  installmentAmount: number;
  principalBalance: number;
}
