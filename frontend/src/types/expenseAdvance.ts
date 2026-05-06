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

export interface Participant {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  employee_type: "Self" | "Employee" | "Guest" | string;
  employee?: string;
  employee_name?: string;
  guest_name?: string;
  percentage: number;
  allocated_amount: number;
  parent: string;
  parentfield: string;
  parenttype: string;
  doctype: string;
}

export type ParticipantUpdateItem = {
  name: string; // The database name/ID of the child row in custom_participants
  employee_type?: string;
  employee?: string;
  employee_name?: string;
  guest_name?: string;
  percentage?: number;
};

export interface ApprovalStage {
  stage_name: string | null;
  user: string | null;
  role: string;
  status: string;
  approval_time: string | null;
  employee_id: string | null;
  designation_name: string | null;
}

export interface ExpenseClaim {
  name: string;
  owner: string;
  creation: string;
  modified: Date;
  modified_by: string;
  docstatus: number;
  idx: number;
  naming_series: string;
  employee: string;
  employee_name: string;
  department: string;
  company: string;
  custom_is_recurring_expense: number;
  custom_frequency: string;
  custom_day_of_month: number;
  custom_day_of_week: string;
  custom_expense_category: string;
  custom_expense_category_name?: string;
  custom_is_shared_expense: number;
  expense_approver: string;
  approval_status: string;
  total_sanctioned_amount: number;
  total_taxes_and_charges: number;
  total_advance_amount: number;
  grand_total: number;
  total_claimed_amount: number;
  total_amount_reimbursed: number;
  posting_date: Date;
  is_paid: number;
  payable_account: string;
  cost_center: string;
  status: string;
  doctype: string;
  advances: any[];
  taxes: any[];
  custom_participants: Participant[];
  expenses: Expense[];
  approval_stages_status: ApprovalStage[];
}

export interface Expense {
  name: string;
  uid?: string;
  owner: string;
  creation: Date;
  modified: Date;
  modified_by: string;
  docstatus: number;
  idx: number;
  expense_date: string;
  custom_reimbursement_category_: string;
  expense_type: string;
  default_account: string;
  custom_claim_type_based_on: string;
  custom_approval_staus: string;
  custom_mercent: string;
  custom_from_location?: string;
  custom_to_location?: string;
  custom_invoice_number: string;
  custom_vehicle_type?: string;
  custom_units?: string;
  description: string;
  amount: number;
  custom_currency: string;
  custom_amount_in_other_currency: number;
  custom_claim_type_name: string;
  sanctioned_amount: number;
  custom_sanctioned_amount_in_other_currency: number;
  custom_exchange_rate: number;
  custom_attach_receipt: string;
  cost_center: string;
  parent: string;
  parentfield: string;
  parenttype: string;
  doctype: string;
  custom_start_datetime?: Date;
  custom_location?: string;
  custom_end_datetime?: Date;
  custom_form_json?: string | null;
  custom_form_data?: string | null;
}


export interface ExpenseClaimType {
  reference_document: ExpenseClaim;
  allocated_to: string[];
  allocated_roles?: string[];
  role: string;
  reference_type: string;
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
  can_edit?: boolean;
  send_back_user?: string;
  todo_status: string;
  due_date: string;
}

export interface Advance {
  name: string;
  owner: string;
  creation: Date;
  docstatus: number;
  custom_advance_type: string;
  custom_advance_policy: string;
  advance_amount: number;
  posting_date: string;
  
}
export interface ExpenseAdvanceType {
  reference_document: Advance;
  allocated_to: string[];
  allocated_roles?: string[];
  role: string;
  reference_type: string;
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
  can_edit?: boolean;
  send_back_user?: string;
  todo_status: string;
  due_date: string;
}
