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

export type Attachment = {
  file_url: string;
};

export type TodoItem = {
  todo_id: string;
  allocated_to: string;
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