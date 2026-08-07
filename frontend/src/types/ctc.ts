export interface SalaryComponent {
  component: string;
  amount: number;
  annual_amount: number;
  type: 'Earning' | 'Deduction' | 'Reimbursement';
}

export interface AmountComponent {
  component: string;
  monthly_amount?: number;
  annual_amount: number;
  amount?: number;
}

export interface SalarySlip {
  earning_part_of_ctc: SalaryComponent[];
  deduction_part_of_ctc: SalaryComponent[];
  reimbursements_part_of_ctc: SalaryComponent[];
  fixed_gross: AmountComponent[];
  fixed_ctc: AmountComponent[];
  variable_pay_include_ctc?: SalaryComponent[];
  variable_pay_exclude_ctc?: SalaryComponent[];
  total_final_ctc: AmountComponent[];
  annual_ctc?: number;
  total_deduction?: number;
  net_pay?: number;
}