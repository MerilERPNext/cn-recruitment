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

export interface VersionValueChanged {
  property: string;
  old_value: any;
  new_value: any;
  modified: string;
  modified_by: string;
}

export interface VersionItem {
  salary_structure_assignment: string;
  version_name: string;
  values_changed: VersionValueChanged[];
  row_values_changed?: any[];
}

export interface SalarySlip {
  employee?: string;
  assignment_name?: string;
  docstatus?: number;
  active?: number;
  from_date?: string;
  salary_structure?: string;
  custom_ctc_category?: string | null;
  earning_part_of_ctc: SalaryComponent[];
  deduction_part_of_ctc: SalaryComponent[];
  reimbursements_part_of_ctc: SalaryComponent[];
  fixed_gross: AmountComponent[];
  fixed_ctc: AmountComponent[];
  variable_pay_include_ctc?: SalaryComponent[];
  variable_pay_exclude_ctc?: SalaryComponent[];
  total_final_ctc: AmountComponent[];
  variable_deduction?: SalaryComponent[];
  net_pay?: AmountComponent[] | number;
  version?: VersionItem[];
  annual_ctc?: number;
  total_deduction?: number;
}

export interface SalaryStructureAssignmentItem extends SalarySlip {
  fixed_gross_annual?: number;
}