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

export interface CurrencyType {
  name: string;
  symbol: string;
  fraction: string;
  fraction_units: number;
}

export interface ProjectType {
  name: string;
  project_name: string;
}

export interface CostCenterType {
  name: string;
  cost_center_name: string;
  company?: string;
}
