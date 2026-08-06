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
    job_requisition: JobRequisition;
    interviews: Interview[]; // Replace any[] with Interview[]
    review_count: number;
    job_applicant_count: number;
    interview_count: number;
    approval_flow?: RequisitionApprovalFlow;
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
    rows?: { actioned: number; total: number };
    row_approvals?: RequisitionRowApproval[];
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
