export type GoalStatus = "On-track" | "At-risk" | "Off-track";

export interface KeyResult {
  id: string;
  title: string;
  target: number | string;
}

export interface ApprovalGoal {
  id: string;
  type: "OKR" | "KI";
  employeeInitials: string;
  employeeName: string;
  warning?: string;
  title: string;
  submittedAgo: string;
  weightage: number;
  checked: boolean;
}

export interface TeamMemberGoal {
  id: string;
  type: "OKR" | "KI";
  title: string;
  progress: number;
  status: GoalStatus;
}

export interface TeamMember {
  id: string;
  initials: string;
  name: string;
  designation: string;
  goalCount: number;
  avgProgress: number;
  goals: TeamMemberGoal[];
  expanded: boolean;
}

export interface GoalDetailData {
  id: string;
  type: "OKR" | "KI";
  label: string;
  status: "Submitted";
  approvalStatus: "Pending Approval";
  title: string;
  employeeInitials: string;
  employeeName: string;
  designation: string;
  submittedAgo: string;
  weightage: number;
  start: string;
  end: string;
  metric: string;
  alignedTo: string;
  contribution: string;
  visibility: string;
  autoPull: string;
  description: string;
  keyResults: KeyResult[];
  managerComment: string;
  autoApprovesInDays: number;
  auditLog: string;
}

export type CheckInStatus = "Submitted" | "Missing";

export interface CheckIn {
  id: string;
  initials: string;
  name: string;
  status: CheckInStatus;
  feeling?: string;
  hours?: string;
  accomplished?: string;
  nextWeek?: string;
  blockers?: number;
  missingMessage?: string;
}

export type PerfRating =
  | "Outstanding"
  | "Exceeds"
  | "Meets"
  | "Below"
  | "Unsatisfactory"
  | "-";

export interface CalibrationEmployee {
  id: string;
  initials: string;
  name: string;
  role: string;
  fy24: PerfRating;
  fy25: PerfRating;
  self: PerfRating;
  peerAvg: PerfRating;
  myProposal: PerfRating;
  gridHighlight: [number, number];
}

export interface DistributionBucket {
  label: string;
  target: number;
  actual: number;
  isRed: boolean;
}

export interface ReporteeAssign {
  id: string;
  initials: string;
  name: string;
  subGoalTitle: string;
  weightage: number;
  contribution: number;
  status: "Submitted" | "Approved" | "Draft";
}

export interface OverviewTeamMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  tenure: string;
  goals: number;
  progress: number;
  self: string;
  review: string;
  lastRating: string | null;
  ratingColor: string;
  ratingText: string;
  action: string;
}
