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
  custom_approval_type: string;
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




export type FlowRequestStage = {
  stage_name: string;
  user_id: string;
  user: string;
  role: string | null;
  status: string;
  approval_time: string | null;
  completion_date: string | null;
  form_json?: {
    components: any[];
  };
  approval_response_data: string;
  todo: {
    name: string;
    custom_doctype_actions: string;
    custom_doctype_actions_with_form: string;
    custom_approval_type: string;
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
  approval_status: string;
  workflow_status: string;
  overall_flow_status: string;
  approval_stages: FlowRequestStage[];
  workflow_stages: WorkflowStage[];
  initiator_forms: {
    form_data: string;
    status: string;
    target: string;
    target_name: string;
  }[];
};


export type WorkflowStage = {
  status: string;
  selected_action: string | null;
  target: string;
  target_name: string;
  action_options: string;
  form_data: string;
  trigger_title: string;
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
