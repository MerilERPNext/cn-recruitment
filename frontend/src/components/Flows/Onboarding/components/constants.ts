import { DocumentRow, OnboardingTab, WorkflowTaskRow } from "./types";

export const ONBOARDING_TABS: OnboardingTab[] = [
  "Onboarding Documents",
  "Workflow Tasks",
  "Verification Reports",
];

export const DOCUMENT_DATA: DocumentRow[] = [
  {
    name: "Onboarding form - old",
    status: "Completed",
    timeSinceTrigger: "-",
    completionDate: "01 / 08 / 2025",
  },
  {
    name: "Testing of new product",
    status: "Completed",
    timeSinceTrigger: "-",
    completionDate: "01 / 08 / 2025",
  },
];

export const WORKFLOW_TASKS: WorkflowTaskRow[] = [
  {
    name: "Welcome Email",
    category: "Workflow Task",
    status: "Completed",
    assignee: "Members",
    timeSinceTrigger: "-",
  },
  {
    name: "HRBP day prior connect",
    category: "Workflow Task",
    status: "Completed",
    assignee: "HRBP",
    timeSinceTrigger: "-",
  },
  {
    name: "Reporting Manager Connect",
    category: "Workflow Task",
    status: "Completed",
    assignee: "Manager",
    timeSinceTrigger: "-",
  },
];
