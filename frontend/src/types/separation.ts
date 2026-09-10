export interface FunnelActivityLog {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
    target: string;
    target_type: string;
    status: string;
    todo: string;
    funnel_task: string;
    doc_type: string;
    doc_name: string;
    action_options: string;
    selected_action: string | null;
    parent: string;
    parentfield: string;
    parenttype: string;
    doctype: string;
    isLast?: boolean;
}

interface FunnelActivity {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
    triggered_by: string;
    status: string;
    funnel: string;
    funnel_version: string;
    funnel_workflow: string;
    triggered_for: null;
    doctype: string;
    log: FunnelActivityLog[];
}

export interface SeparationWorkflowResponse {
    show_workflow: boolean;
    funnel_activity: FunnelActivity | null;
}


// SeparationFunnelDataResponse
export interface SeparationFunnelDataResponse {
    name: string;
    creation: string;
    modified: string;
    modified_by: string;
    owner: string;
    docstatus: number;
    idx: number;
    status: string;
    priority: string;
    color: string | null;
    date: string;
    allocated_to: string | null;
    description: string;
    reference_type: string;
    reference_name: string;
    role: string;
    assigned_by: string | null;
    assigned_by_full_name: string | null;
    sender: string | null;
    assignment_rule: string | null;
    _user_tags: string | null;
    _comments: string | null;
    _assign: string | null;
    _liked_by: string | null;
    _seen: string | null;
    custom_subject: string | null;
    custom_todo_type: string | null;
    custom_allocated_name: string | null;
    custom_due_datetime: string | null;
    custom_parent_todo: string | null;
    custom_event_set: number;
    custom_interval: number;
    custom_frequency: string;
    custom_day_list: string | null;
    custom_occurences: number;
    custom_ends: string;
    custom_end_date: string | null;
    custom_remainders: number;
    custom_reminders_list: string | null;
    custom_doctype_actions: string;
    custom_funnel_task: string;
    custom_approval_type: string;
    custom_open_chatnext_assistant_on_action: number;
    is_delegated: number;
    delegation_type: string;
    delegation_status: string;
    delegated_from: string | null;
    delegation_date: string | null;
    delegation_reference: string | null;
    delegation_reason: string | null;
    delegation_notes: string | null;
    enable_auto_delegation: number;
    auto_delegation_triggered: number;
    auto_delegation_attempts: number;
    last_auto_delegation_date: string | null;
    custom_type_of_activity: string;
    custom_allow_revoke: number;
    custom_selected_doctype_action: string | null;
    custom_doctype_actions_with_form: string | null;
    current_escalation_level: number;
    escalation_matrix: string | null;
    last_escalation_date: string | null;
    next_escalation_due: string | null;
    escalation_count: number;
    escalation_history: string | null;
    sla_breach_time: string | null;
    original_assignee: string | null;
    custom_enable_auto_escalation: number;
    custom_escalation_target_type: string;
    custom_escalation_target: string | null;
    custom_autoreassign_to_escalation_manager: number;
    custom_dynamic_route: string;
    custom_auto_approvereject_applicable: number;
    custom_auto_action_type: string;
    options_data: string;
}

export interface SupportContact {
  id: string;
  name: string;
  email: string;
}

export interface EmployeeSupportContacts {
  relieving_date?: string | null;
  manager: SupportContact;
  hrbp: SupportContact;
  hdTeam: SupportContact;
}

export interface SeparationOpenItemTasks {
  user?: string;
  open_tasks: number;
}

export interface SeparationOpenItemAttendanceFlags {
  from_date?: string;
  to_date?: string;
  total_flags: number;
  absent_days?: number;
  lwp_days?: number;
}

export interface SeparationOpenItemExpenses {
  total_claims: number;
  total_amount: number;
}

export interface SeparationOpenItemsData {
  employee?: string;
  open_tasks?: SeparationOpenItemTasks;
  attendance_flags?: SeparationOpenItemAttendanceFlags;
  expenses?: SeparationOpenItemExpenses;
}

export interface AssignedUser {
  user_id: string;
  name: string;
  employee?: string;
}

export interface SeparationWorkflowStage {
  stage_name: string;
  status: string;
  is_cleared: boolean;
  is_cancelled: boolean;
  selected_action?: string | null;
  todo?: string;
  funnel_task?: string;
  todo_status?: string;
  description?: string;
  due_date?: string | null;
  completed_on?: string | null;
  assigned_users?: AssignedUser[];
  assigned_roles?: string[];
  order: number;
}

export interface SeparationWorkflowStagesResponse {
  employee?: string;
  separation?: string;
  flow_status?: string;
  total_stages?: number;
  cleared_stages?: number;
  pending_stages?: number;
  workflow_stages?: SeparationWorkflowStage[];
}

export interface FullAndFinalEmployeeInfo {
  employee: string;
  employee_name: string;
  company: string;
  department: string;
  designation: string;
  date_of_joining?: string;
  relieving_date?: string;
}

export interface FullAndFinalPeriod {
  start_date: string;
  end_date: string;
}

export interface FullAndFinalDays {
  working_days: number;
  absent_days: number;
  lwp_days: number;
  payment_days: number;
  arrear_days: number;
  pay_days: number;
  recovery_days: number;
}

export interface FullAndFinalSalaryComponent {
  salary_component: string;
  amount: number;
}

export interface FullAndFinalLeaveEncashment {
  total_days: number;
  rate_per_day: number;
  total_amount: number;
  rows?: unknown[];
}

export interface FullAndFinalTotals {
  total_earnings: number;
  total_deductions: number;
  total_payables: number;
  total_recovery: number;
  extra_recovery_earning: number;
  extra_recovery_deduction: number;
  extra_payment_earning: number;
  extra_payment_deduction: number;
  pay_days_arrear: number;
  leave_encashment: number;
  asset_recovery: number;
  total_payable: number;
  total_deduction: number;
  net_settlement: number;
  gross_pay: number;
  salary_total_deduction: number;
  net_pay: number;
  total_payable_amount: number;
  total_receivable_amount: number;
  total_asset_recovery_cost: number;
}

export interface FullAndFinalSummary {
  payable_breakup: {
    salary_earnings: number;
    payables: number;
    pay_days_arrear: number;
    recovery_days: number;
  };
  total_payable: number;
  receivable_breakup: {
    salary_deductions: number;
    receivables: number;
    asset_recovery: number;
    extra_recovery_deduction: number;
    extra_payment_deduction: number;
  };
  total_receivable: number;
  net_pay: number;
  direction: string;
  is_recoverable: boolean;
  amount_in_words?: string;
  currency: string;
}

export interface FullAndFinalEstimateResponse {
  employee: FullAndFinalEmployeeInfo;
  period: FullAndFinalPeriod;
  days: FullAndFinalDays;
  attendance?: Record<string, number>;
  earnings: FullAndFinalSalaryComponent[];
  deductions: FullAndFinalSalaryComponent[];
  payables?: unknown[];
  receivables?: unknown[];
  asset_recovery?: unknown[];
  assets_allocated?: unknown[];
  extra_recovery?: {
    earning_breakup: unknown[];
    deduction_breakup: unknown[];
  };
  extra_payment?: {
    earning_breakup: unknown[];
    deduction_breakup: unknown[];
  };
  leave_encashment?: FullAndFinalLeaveEncashment;
  accrued_benefit?: unknown[];
  accrued_component_summary?: unknown[];
  totals: FullAndFinalTotals;
  final: FullAndFinalSummary;
  currency: string;
  warnings?: string[];
}
