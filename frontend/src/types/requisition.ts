export interface JobRequisition {
    name: string;
    designation: string;
    department: string;
    employment_type: string;
    expected_by: string;
    no_of_positions: number;
    description: string | null;
    status: string;
    salary_range: string;
    deadline: string;
    location: string;
    custom_assign_to_recruiter: string;
  }
  
  // Define an interface for Interview
  export interface Interview {
    id?: string; // Optional, as we don't know the exact structure
    candidate?: string;
    date?: string;
    status?: string;
  }
  
export interface RequisitionDetailsResponse {
    // The flat requisition record `get_job_requisition_details` returns — the
    // same shape the list endpoint serialises, so it carries the alternate
    // detail tables (`custom_position_details` for Lateral, `custom_regions`
    // for Fresher) and `available_tables` saying which one has rows.
    requisition?: any;
    job_requisition: JobRequisition;
    interviews: Interview[]; // Replace any[] with Interview[]
    review_count: number;
    job_applicant_count: number;
    interview_count: number;
    approval_flow?: RequisitionApprovalFlow;
    // Filled only while the requisition is flagged Over Budget — see
    // recruitment.api.requisition_budget.
    budget_status?: RequisitionBudgetStatus;
  }

/** A Department / Cost Center whose budget left can't cover the requisition. */
export interface RequisitionBudgetShortfall {
    doctype: "Department" | "Cost Center";
    name: string;
    label: string;
    budget: number;
    utilized: number;
    available: number;
    required: number;
    summary: string;
  }

export interface RequisitionBudgetStatus {
    over_budget: boolean;
    shortfalls: RequisitionBudgetShortfall[];
  }

  export interface RequisitionRowApproval {
    label: string;
    row_docnames: string[];
    status: string;
    approvers: string[];
    action_taken_by: string[];
    completed_date: string | null;
  }

  export interface RequisitionApprovalStage {
    stage_index: number;
    stage_name: string;
    approvers: string[];
    roles: string[];
    action_taken_by: string[];
    action: string;
    status: string;
    trigger_date: string | null;
    completed_date: string | null;
    is_row_stage?: boolean;
    rows?: { actioned: number; total: number; approved?: number; rejected?: number };
    row_approvals?: RequisitionRowApproval[];
    // Act button fields — populated by backend only for pending stages that
    // have a linked ToDo with custom_doctype_actions.
    todo_id?: string | null;
    custom_doctype_actions?: string | null;
    custom_approval_type?: string | null;
  }

  export interface RequisitionApprovalFlow {
    requisition: string;
    has_approval: boolean;
    tracker: string;
    status: string;
    mode: string;
    current_step: number;
    started_on: string | null;
    stages: RequisitionApprovalStage[];
  }
  
  export interface GetRequisitionParams {
    requisition_name: string;
  }
  
  export interface StatusDisplay {
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
    label: string;
  }
  
  export class PermissionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PermissionError';
    }
  }
