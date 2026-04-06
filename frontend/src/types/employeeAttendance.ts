import { TodoType } from "./todos";


// API shape
export interface ApiRepayment {
  idx: number;
  payment_date: string;
  payment_amount: number;
  deducted: number;
  balance_amount: number;
}

export type ApiAdvance = {
  allocated_to: string[];
  allocated_to_roles: string[];
  allocated_to_user: string | string[] | null;
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
  todo_list: TodoType[] | null;
  repayments: ApiRepayment[];
}

// UI shape (your old Advance type)
export interface UiAdvance {
  allocated_to: string[];
  allocated_to_roles: string[];
  allocated_to_user: string | string[] | null;
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
  todo: TodoType | null;
}

export interface Installment {
  installmentNo: number;
  installmentDate: string;
  openingBalance: number;
  installmentAmount: number;
  principalBalance: number;
}
