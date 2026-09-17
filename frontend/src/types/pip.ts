export interface PipStatus {
  flow_config: string;
  flow_title: string;
  pip_priority: number;
  locked: boolean;
  completed: boolean;
  lock_message: string;
  blocked_by: string;
  blocked_by_priority: number;
}

export interface PipTriggerDataObj {
  trigger_category?: string;
  name_of_action: string;
  page_type?: string;
  showInActionList?: boolean;
  node_label?: string;
  submit?: boolean;
  doctype?: string;
  show_as_button?: boolean;
  visiblity_condition?: boolean;
  button_label?: string;
}

export interface PipFlowTriggerItem {
  name: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  owner?: string;
  docstatus?: number;
  idx?: number;
  data?: string;
  position?: string;
  type?: string;
  id?: string;
  element_type?: string;
  targethandle?: string | null;
  target?: string | null;
  sourcehandle?: string | null;
  source?: string | null;
  parent?: string;
  parentfield?: string;
  parenttype?: string;
  name_of_action?: string;
  button_label?: string;
  funnel_name?: string;
  data_obj?: PipTriggerDataObj;
  pip_status: PipStatus;
}

export interface PipFunnelActivityStage {
  name?: string;
  stage_name?: string;
  status?: string;
  allocated_to?: Array<{
    user_id?: string;
    name?: string;
    employee?: string;
  }>;
}

export interface PipFunnelActivityItem {
  request_id: string;
  flow_name: string;
  category?: string;
  initiated_on?: string;
  initiated_by?: string;
  initiated_by_emp_id?: string;
  initiated_for?: string;
  initiated_for_emp_id?: string;
  approval_status?: string;
  workflow_status?: string;
  overall_flow_status?: string;
  approval_stages?: PipFunnelActivityStage[];
  flow_type?: string;
}
