export interface ExtraDeductionData {
  employee: string;
  employee_name: string;
  name: string;
  salary_component: string;
  amount: number;
  payment_date: string;
  is_tax_applicable: number;
  status: string;
}

export interface ExtraDeductionResponse {
  status: string;
  total_count: number;
  start: number;
  page_length: number;
  data: ExtraDeductionData[];
}
