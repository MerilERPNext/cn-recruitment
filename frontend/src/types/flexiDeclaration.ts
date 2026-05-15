/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FlexiComponent {
  salary_component: string;
  type: string;
  visibility_type: "Editable" | "Read Only" | string;
  max_amount: string | number;
  variable_name: string;
  check_box_variable_name: string | null;
  amount: number;
}

export interface ComponentPartOfCTC {
  component: string;
  amount: number;
  annual_amount: number;
  type: string;
}

export interface SalaryData {
  assignment_name: string;
  docstatus: number;
  active: number;
  from_date: string;
  salary_structure: string;
  component_part_of_ctc: ComponentPartOfCTC[];
  variable_pay_include_ctc: any[];
  variable_pay_exclude_ctc: any[];
  monthly_ctc: number;
  annual_ctc: number;
  gross_pay: number;
  net_pay: number;
  total_deduction: number;
  fixed_gross_annual: number;
  fixed_gross_monthly: number;
  monthly_reimbursement: number;
  annual_reimbursement: number;
  total_ctc: number;
  version: any[];
}

export interface FlexiDataResponse {
  flexi_components: FlexiComponent[];
  salary_data: SalaryData;
}

export interface YearOption {
  name: string;
}

export interface FlexiLockingPeriodVisibility {
  visibility: boolean;
}

export interface FlexiLockingPeriod {
  individual_start_date: any;
  individual_end_date: any;
  employee: string;
  start_date: string;
  end_date: string;
  status: "Open" | "Closed";
  doctype_name: string;
}

