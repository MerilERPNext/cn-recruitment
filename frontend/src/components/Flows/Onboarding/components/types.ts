export type OnboardingTab =
  | "Onboarding Documents"
  | "Workflow Tasks"
  | "Verification Reports";

export interface DocumentRow {
  name: string;
  status: string;
  timeSinceTrigger: string;
  completionDate: string;
}

export interface WorkflowTaskRow {
  name: string;
  category: string;
  status: string;
  assignee: string;
  timeSinceTrigger: string;
}
