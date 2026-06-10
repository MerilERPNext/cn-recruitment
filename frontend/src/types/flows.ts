/* eslint-disable @typescript-eslint/no-explicit-any */
import { allocatedToType } from "./allocatedToTooltip";

export type ChatAssistantItem = {
  name: string;
};

export type FlowApproval = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  doc_type: string;
  doc_name: string;
  approval_matrix: string;
  approval_mode: string;
  allow_skip_missing_level: number;
  current_approval_step: number;
  status: string;
  task: string;
  restart_from_rejection_point: number;
  todo_category: string;
};


export type ApprovalStageStatus = {
  stage_name: string | null;
  user_id: string | null;
  user: string;
  role: string | null;
  status: string;
  approval_response_data: string;
  form_json: {
    compoenets: any;
  };
};

export interface Attachment {
  storage: string;
  name: string;
  url: string;
  size: number;
  type: string;
  originalName: string;
  data?: {
    message?: {
      file_url?: string;
    };
    baseUrl?: string;
  };
}


export type TodoItem = {
  name: string;
  custom_approval_type?: "Approval Matrix" | "Multi Actions";
  reference_document: any;
  todo_id: string;
  allocated_to: string;
  allocated_roles: string[];
  allocated_to_emp_id: string;
  role: string | null;
  username: string;
  reference_type: string;
  reference_name: string;
  custom_doctype_actions: string;
  custom_allow_revoke: number;
  status: string;
  due_date: string;
  description: string;
  custom_doctype_actions_with_form: string;
  is_allocated_todo: boolean;
  send_back_user: string | null;
  can_edit: boolean;
  todo_status: string;
  approval_stages_status: ApprovalStageStatus[];
  attachments: Attachment[];
};

export type TodoResponse = {
  message: {
    data: TodoItem[];
    total_count: number;
    start: number;
    page_length: number;
  };
};


export type RoleAssignedUsersType = {
  role: string;
  user?: {
    user_id?: string;
    name: string;
    employee: string;
  }[];
  users?: {
    user_id?: string;
    name: string;
    employee: string;
  }[];
}

export type FlowRequestStage = {
  stage_name: string;
  allocated_to: Array<allocatedToType>;
  user_id: string;
  form_data_display: Record<string, unknown>;
  user: string;
  role: string | null;
  status: string;
  approval_time: string | null;
  completion_date: string | null;
  can_act: boolean;
  form_json?: {
    components: any[];
  };
  role_assigned_users?: RoleAssignedUsersType[];
  approval_response_data: string;
  approval_response_data_display?: string;
  todo: {
    custom_approval_type: "Approval Matrix" | "Multi Actions";
    name: string;
    custom_doctype_actions: string;
    custom_doctype_actions_with_form: string;
    role: string;
    allocated_to: string;
    custom_allocated_to_users: Array<{
      name: string;
      owner: string;
      creation: string;
      modified: string;
      modified_by: string;
      docstatus: number;
      idx: number;
      user: string;
      parent: string;
      parentfield: string;
      parenttype: string;
      doctype: string;
      reference_name: string;
    }>;
    custom_assigned_to_roles: RoleSelect[];
    [key: string]: any;
  }
};

export type RoleSelect = {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  role: string;
  parent: string;
  parentfield: string;
  parenttype: string;
  doctype: string;
};

export type FlowRequestItem = {
  request_id: string;
  flow_name: string;
  category: string;
  initiated_on: string;
  initiated_by: string;
  initiated_for: string;
  initiated_by_emp_id: string;
  initiated_for_emp_id: string;
  approval_status: string;
  workflow_status: string;
  overall_flow_status: string;
  approval_stages: FlowRequestStage[];
  initiator_forms: {
    conversation_doc: string;
    form_data: string;
    form_data_display?: string;
    status: string;
    target: string;
    target_name: string;
  }[];
  workflow_stages: WorkflowStage[];
};

export type FlowRequestDetailItem = {
  request_id: string;
  funnel?: string;
  retrigger_definition_name?: string;
  flow_name: string;
  category: string;
  effective_date: string | null;
  initiated_on: string;
  can_edit_initiator_form: boolean;
  initiated_by: string;
  initiated_for: string;
  initiated_by_emp_id: string;
  initiated_for_emp_id: string;
  initiated_by_employee_id: string; // for details page api
  initiated_for_employee_id: string; // for details page api
  approval_status: string;
  workflow_status: string;
  overall_flow_status: string;
  approval_stages: FlowRequestStage[];
  workflow_stages: WorkflowStage[];
  initiator_forms: {
    conversation_doc: string;
    form_data: string;
    form_data_display?: string;
    status: string;
    target: string;
    target_name: string;
  }[];
};


export type WorkflowStage = {
  status: string;
  allocated_to: allocatedToType[];
  role_assigned_users?: RoleAssignedUsersType[];
  selected_action: string | null;
  target: string;
  target_name: string;
  action_options: string;
  form_data: string;
  form_data_display: string;
  trigger_title: string;
  can_act: boolean;
  role?: string | null;
  todo: {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
    custom_subject: string;
    status: string;
    priority: string;
    role: string;
    allocated_to: string;
    custom_allocated_to_users: Array<{
      name: string;
      owner: string;
      creation: string;
      modified: string;
      modified_by: string;
      docstatus: number;
      idx: number;
      user: string;
      parent: string;
      parentfield: string;
      parenttype: string;
      doctype: string;
    }>;
    custom_assigned_to_roles: RoleSelect[];
    custom_parent_todo: string | null;
    custom_allocated_name: string | null;
    custom_redirect_url: string | null;
    color: string | null;
    [key: string]: any;
  };
};

export type FlowRequestResponse = {
  data: FlowRequestItem[];
};

export type SeparationFunnelDetails = FlowRequestResponse;

export type FunnelActivityLogDetail = {
  label: string;
  value: string;
};

export type FunnelActivityLogEntry = {
  activity_type: string;
  category: string;
  title: string;
  timestamp: string;
  details: FunnelActivityLogDetail[];
};

export type FunnelActivityLogData = {
  request_id: string;
  flow_name: string;
  entries: FunnelActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
};

export type FunnelActivityLogResponse = {
  data: FunnelActivityLogData;
};

export type ShouldShowSeparationButtonResponse = {
  show_button: boolean;
  employee: string;
  employee_name: string;
  is_self: boolean;
  days_until_confirmation: number;
  trigger_days: number;
  confirmation_date: string;
  separation_hidden_from_date: string;
  extension_count: number;
};

export type NoticePeriodAndSeparationPolicyResponse = {
  employee: string;
  notice_period: string;
  separation_policy: string;
};

export interface EmployeeSeparationDetails {
  name: string;
  custom_resignation_date?: string;
  custom_notice_period_days?: number;
  custom_final_recovery_days?: number;
  custom_final_reason_for_separation?: string;
  custom_proposed_recovery_days?: number;
  custom_final_category_for_separation?: string;
  custom_mark_do_not_rehire?: number;
  custom_reason_for_proposed_recovery_days?: string;
  custom_proposed_last_working_day?: string;
  custom_requested_last_working_date?: string;
}
