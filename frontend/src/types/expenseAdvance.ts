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

export interface ExpenseType {
  name: string;
}

export interface ExpenseTypeField {
  fieldname: string;
  label: string;
  fieldtype: string;
  required: boolean;
}

export interface ExpenseTableFieldSettings {
  advance_policy: string | null;
  show_project: boolean;
  project_mandatory: boolean;
  show_cost_center: boolean;
  cost_center_mandatory: boolean;
  show_currency: boolean;
  currency_mandatory: boolean;
  expense_table_mandatory: boolean;
  allowed_currencies: string[];
  show_only_employee_projects: boolean;
  enable_custom_conversion: boolean;
  conversion_date_option: string | null;
}

