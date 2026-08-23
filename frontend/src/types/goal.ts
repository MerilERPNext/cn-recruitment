import type React from "react";
import { GoalTemplate } from "../components/Performance/GoalCreation/component/goal-model/types";

// -------------------------
// Subgoal (is_group: 0)
// -------------------------
export interface SubGoalItem {
  name: string;
  employee: string;
  title: string;
  description: string;
  weightage: number;
  start_date: string;
  end_date: string;
  achievement: number;
  status: string;
  parent_goals_key_result_areas: string;
  is_group: 0;
}

export interface GoalPlanId {
    name: string;
}

export interface SubGoal{
    achievement: number;
    description: string;
    employee: string;
    end_date: string;
    is_group: number;
    name: string;
    parent_goals_key_result_areas: string;
    start_date: string;
    status: string;
    title: string;
    weightage: number;
}
// -------------------------
// Main Group Goal (is_group: 1)
// -------------------------
export interface GroupGoalItem {
  achievement: number;
    description: string;
    end_date: string;
    goal: string;
    is_group: number;
    start_date: string;
    status: string;
    subgoals: SubGoal[];
    weightage: number;
}


// -------------------------
// Union of all possible goal items
// For flexibility in lists
// -------------------------
export type GoalPlanItem = GroupGoalItem | SubGoalItem;


// -------------------------
// Full Goal Plan API Response
// -------------------------
export interface GoalPlanResponse {
  name: string;
  employee: string;
  goal_plan_framework: string;
  total_goals: number;
  total_subgoals: number;
  goal_plan_items: GroupGoalItem[];
}

export interface GoalFormConfigDepartment {
  name: string;
  department_name: string;
}

export interface GoalFormConfigDesignation {
  name: string;
  designation_name?: string;
}

export interface RequestCheckInPayload {
  employee: string;
  goal: string;
  due_date?: string;
  message?: string;
}
export interface LinkFieldOption {
  id: string;
  label: string;
}
export interface LinkFieldOptionsData {
  status?: string;
  doctype?: string;
  title_field?: string;
  total?: number;
  results: LinkFieldOption[];
}
export interface RequestCheckInRequest {
  payload: RequestCheckInPayload;
}

export interface RequestCheckInData {
  employee: string;
  goal: string;
  goal_key: string;
  title: string;
  checkin_requested: boolean;
  checkin_due: string | null;
  requested_by: string;
}

export interface RequestCheckInResponse {
  message: {
    success: boolean;
    message: string;
    data: RequestCheckInData;
  };
}
export interface GoalFormConfigCycle {
  name: string;
  cycle_name: string;
  status: string;
}

export interface GoalFormConfigFramework {
  name: string;
  methodology: string;
  sub_goals_enabled: number;
}

export interface GoalFormConfigLimits {
  min_goals: number | null;
  max_goals: number | null;
  min_goal_weightage: number | null;
  max_goal_weightage: number | null;
  min_krs: number | null;
  max_krs: number | null;
}

export interface GoalFormConfig {
  employee: string;
  can_create: boolean;
  active_cycle: GoalFormConfigCycle | null;
  framework: GoalFormConfigFramework | null;
  goal_types: string[];
  start_date: string;
  end_date: string;
  departments: GoalFormConfigDepartment[];
  designations?: GoalFormConfigDesignation[];
  limits: GoalFormConfigLimits;
}

export interface GoalFormConfigResponse {
  success: boolean;
  message: string;
  data: GoalFormConfig;
}

export type GoalSaveAction = "draft" | "submit";

export interface GoalSaveKeyResult {
  title: string;
  weightage: number;
}

export interface GoalSaveItem {
  goal: string | null;
  goal_type: string;
  title: string;
  description: string;
  weightage: number;
  department: string;
  designation?: string;
  key_results: GoalSaveKeyResult[];
}

export interface SaveGoalsPayload {
  action: GoalSaveAction;
  goals: GoalSaveItem[];
}

export interface SaveGoalsResponseGoal {
  title: string;
  goal: string;
  submission_status: string;
  key_results: string[];
}

export interface SaveGoalsResponse {
  success: boolean;
  message: string;
  data: { goals: SaveGoalsResponseGoal[] };
}
export interface GoalSubmitResponse {
  success: boolean;
  message: string;
  data: { acknowledged: any[], remaining:number };
}

// -------------------------
// My Goals List API Response
// (from goal_api.get_my_goals)
// -------------------------
export interface MyGoalsKeyResult {
  goal_key: string;
  name?: string;
  goal?: string | null;
  title: string;
  weightage: number;
  achievement: number;
  status?: string;
  goal_status?: string;
  last_checkin_date?: string | null;
  checkin_requested?: boolean;
  checkin_due?: string | null;
  is_locked?: boolean;
  metric?: string | number | null;
  target?: number;
  target_type?: string;
}

export interface MyGoalsGoal {
  goal_key: string;
  name?: string;
  goal?: string | null;
  title: string;
  description: string;
  goal_type: string;
  checkin_due:string;
  department: string;
  department_title: string;
  weightage: number;
  status: string;
  achievement: number;
  goal_status?: string;
  submission_status?: string;
  start_date?: string;
  last_checkin_date?:string;
  end_date?: string;
  key_results: MyGoalsKeyResult[];
}

export interface MyGoalsData {
  employee: string;
  employee_name: string;
  designation: string;
  designation_title: string;
  active_cycle: string;
  goals: MyGoalsGoal[];
  total: number;
}

export interface MyGoalsResponse {
  success: boolean;
  message: string;
  data: MyGoalsData;
}

export interface SubmitSelectedGoalsPayload {
  goals: Array<{
    goal: string;
    weightage: number;
  }>;
}

export interface DeleteGoalsPayload {
  goals: string[];
}

export interface GoalActionResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface MandatoryGoalsResponse {
  message: Message;
}

export interface Message {
  success: boolean;
  message: string;
  data: MandatoryGoalsData;
}

export interface MandatoryGoalsData {
  count: number;
  has_pending: boolean;
  pushed_by: string;
  company: string;
  lock_date: string; // ISO date string (YYYY-MM-DD)
  active_cycle: string;
  goals: Templates[] ;
}

export interface Goal {
  goal: string;
  title: string;
  weightage: number;
}
export interface Templates {
  template: string;
  title: string;
  weightage: number;
}

// -------------------------
// Goal Model Context Types
// -------------------------
export interface DraftGoalItem extends GoalTemplate {
  weightage?: number;
}

export type RequestLeaveDefaults = {
  fromDate?: string;
  toDate?: string;
  leaveType?: string;
  halfDay?: boolean;
  halfDayOption?: "First Half" | "Second Half";
  half_day_date?: string;
  custom_second_half_day_date?: string;
  description?: string;
  custom_reason?: string;
  custom_attachment?: { url: string }[];
  source?: "holiday" | "other";
  hideHalfDayToggle?: boolean;
  isEdit?: boolean;
  leave_application?: string;
};

export type GoalModelContextType = {
  selectedGoalPlanId: string;
  setGoalPlanId: (id: string) => void;
  showModal: boolean;
  openModal: (defaults?: RequestLeaveDefaults) => void;
  closeModal: () => void;
  defaults: RequestLeaveDefaults | null;

  // Global Draft Goals State & Actions
  draftGoals: (DraftGoalItem | CascadeGoal)[];
  setDraftGoals: React.Dispatch<React.SetStateAction<(DraftGoalItem | CascadeGoal)[]>>;

  addDraftGoals: (goals: GoalTemplate | CascadeGoal | (GoalTemplate | CascadeGoal)[]) => void;
  removeDraftGoal: (id: string) => void;
    updateDraftGoalWeightage: (id: string, weightage: number) => void;
  clearDraftGoals: () => void;
};

export type GoalsRequest = {
  templates: string[];
};
export interface ReferenceGoalsResponse {
  success: boolean;
  message: string;
  data: ReferenceGoalsData;
}

export interface ReferenceGoalsData {
  count: number;
  total: number;
  active_cycle: string;
  goals: Goal[];
}

export interface Goal {
  goal: string;
  title: string;
  description: string;
  goal_type: string;
  category: string;
  department: string | null;
  department_title: string | null;
  weightage: number;
  scorecard_pillar: string | null;
  performance_cycle: string;
  owner_employee: string;
  owner_employee_name: string;
  key_results: KeyResult[];
  locked:boolean
  designation:string
}

export interface KeyResult {
  id?: string;
  title?: string;
  description?: string;
  target?: number | string;
  achieved?: number | string;
  weightage?: number;
  status?: string;
  metric: number | null;
  target_type: string;
}

export interface ReferenceGoalsParams {
  search?: string;
  department?: string;
  designation?: string;
  goal_type?: "OKR" | "MBO";
  cycle_only?: 0 | 1;
  exclude_own?: 0 | 1;
  limit?: number;
  start?: number;
}

export interface GoalRepositoryGoal {
  goal_template: string;
  title: string;
  description: string;
  department:string;
  designation:string;
  category: string;
  locked:boolean;
  scorecard_pillar: string | null;
  weightage: number;
  key_results: KeyResult[];
}

export interface GoalRepositoryItem {
  repository: string;
  title: string;
  description: string;
  recommended: number;
  usage_count: number;
  goal_count: number;
  total_weightage: number;
  goals: GoalRepositoryGoal[];
}

export interface GoalRepositoryData {
  count: number;
  total: number;
  active_cycle: string;
  repositories: GoalRepositoryItem[];
}

export interface GoalRepositoryResponse {
  success: boolean;
  message: string;
  data: GoalRepositoryData;
}

export type GoalRepositoriesResponse = GoalRepositoryResponse;

export interface CascadeGoal {
  goal: string;
  title: string;
  description?: string | null;
  goal_type?: string;
  scope?: string;
  category?: string;
  department?: string | null;
  department_title?: string | null;
  recommended?: boolean;
  weightage?: number;
  scorecard_pillar?: string | null;
  performance_cycle?: string;
  is_manager_goal?: number;
  owner_employee?: string;
  owner_name?: string;
  owner_designation?: string | null;
  used_by_count?: number;
  key_results?: KeyResult[];
  designation?:string;
  locked?: boolean;
}

export interface CascadeGoalsData {
  count: number;
  total: number;
  cascade_enabled: boolean;
  active_cycle: string | null;
  goals: CascadeGoal[];
}

export interface CascadeGoalsResponse {
  success: boolean;
  message: string;
  data: CascadeGoalsData;
}

export interface CascadeGoalsParams {
  search?: string;
  department?: string;
  designation?: string;
  limit?: number;
  start?: number;
}

// -------------------------
// Goal Detail API Response
// (from goal_api.get_goal_detail)
// -------------------------
export interface GoalDetailKeyResult {
  goal_key: string;
  goal: string | null;
  title: string;
  weightage: number;
  metric?: string;
  target?: number | string;
  target_type?: string;
  goal_status?: string;
  achievement: number;
  achieved?: number | string | null;
  status?: string;
}

export interface GoalDetailData {
  goal_key: string;
  goal: string | null;
  title: string;
  description: string;
  goal_type: string;
  department: string;
  department_title: string | null;
  designation: string;
  auto_calculate?: boolean | number;
  designation_title: string | null;
  weightage: number;
  status: string;
  goal_status: string;
  is_mandatory: number;
  is_locked?: boolean | number;
  source_template: string | null;
  achievement: number;
  score: number;
  goal_plan: string;
  plan_status: string;
  active_cycle: string | null;
  active_cycle_title: string | null;
  start_date: string | null;
  end_date: string | null;
  key_results: GoalDetailKeyResult[];
}

export interface GoalDetailResponse {
  success: boolean;
  message: string;
  data: GoalDetailData;
}

export type GoalCheckInSentiment = "On Track" | "At Risk" | "Blocked";

export interface SubmitGoalCheckInPayload {
  goal: string;
  new_value: number;
  sentiment: GoalCheckInSentiment;
  note: string;
  attachment?: string;
}

export interface GoalCheckIn {
  name: string;
  checkin_date: string;
  new_value: number;
  progress: number;
  sentiment: GoalCheckInSentiment;
  note: string;
  attachment: string | null;
  creation: string;
  manager_comment:string | null;
  manager_comment_by:string | null;
  manager_comment_on:string |null
}

export interface SubmitGoalCheckInResponse {
  success: boolean;
  message: string;
  data: GoalCheckIn & {
    check_in: string;
    goal: string;
    goal_key: string;
    achievement: number;
    status: string;
  };
}

export interface GoalCheckInsResponse {
  success: boolean;
  message: string;
  data: {
    goal: string;
    count: number;
    check_ins: GoalCheckIn[];
  };
}

export interface PerformanceOverviewData {
  framework: string;
  cycle_name: string;
  status: string;
  start_date: string;
  end_date: string;
  methodology: string;
  description: string;
  company: string;
  configured_by: string;
  participants: number;
  stages?: any[];
  current_stage?: string | null;
  locks_on?: string | null;
  overall_progress?: number;
  goal_count?: number;
  days_remaining?: number;
  checkins?: {
    done: number;
    expected: number;
    streak: number;
  };
  last_manager_1on1?: string | null;
}

export interface PerformanceOverviewResponse {
  success: boolean;
  message: string;
  data: PerformanceOverviewData;
}

export interface PeerReviewItem {
  nomination: string;
  subject: string;
  subject_name: string;
  designation: string;
  department: string;
  process: string;
  process_name: string;
  basis: string;
  status: string;
  submitted: boolean;
  due_date: string;
  due_in_days: number;
}

export interface MyPeerReviewsData {
  count: number;
  pending: number;
  reviews: PeerReviewItem[];
}

export interface MyPeerReviewsResponse {
  success: boolean;
  message: string;
  data: MyPeerReviewsData;
}

export interface FeedbackScaleOption {
  value: number;
  label: string;
}

export interface FeedbackAnonymity {
  threshold: number;
  note: string;
}

export interface FeedbackFormItem {
  id: string;
  title: string;
  description: string;
  rating?: number | null;
  comment?: string;
  weightage:number
}

export interface FeedbackFormData {
  nomination: string;
  process: string;
  basis: string;
  subject: string;
  subject_name: string;
  designation: string;
  department: string;
  due_date: string;
  due_in_days: number;
  comment_mandatory: boolean;
  anonymity: FeedbackAnonymity;
  scale: FeedbackScaleOption[];
  status:string;
  locked:boolean
  items?: FeedbackFormItem[];
}

export interface FeedbackFormResponse {
  success: boolean;
  message: string;
  data: FeedbackFormData;
}

export interface FeedbackAnswer {
  id: string;
  rating?: number | null;
  comment?: string;
}

export interface FeedbackPayloadContent {
  nomination: string;
  answers: FeedbackAnswer[];
}

export interface SaveFeedbackPayload {
  payload: FeedbackPayloadContent;
}

export interface SubmitFeedbackPayload {
  payload: FeedbackPayloadContent;
}

export interface SaveFeedbackData {
  feedback: string;
  status: string;
}

export interface SaveFeedbackResponse {
  success: boolean;
  message: string;
  data: SaveFeedbackData;
}

export interface SubmitFeedbackData {
  feedback: string;
  status: string;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  data: SubmitFeedbackData;
}

export interface AddGoalCommentContent {
  goal: string;
  employee: string;
  comment: string;
}

export interface AddGoalCommentPayload {
  payload: AddGoalCommentContent;
}

export interface AddGoalCommentData {
  check_in?: string;
  goal?: string;
  manager_comment?: string;
  manager_comment_by?: string;
}

export interface AddGoalCommentResponse {
  success: boolean;
  message: string;
  data?: AddGoalCommentData;
}

export interface TeamOverviewStage {
  sequence: number;
  stage_name: string;
  stage_type: string;
  start_date: string;
  end_date: string;
  lock_date?: string | null;
  enabled: number;
}

export interface TeamOverviewCards {
  goals_pending_approval: number;
  employees_pending_approval: number;
  team_avg_progress: number;
  expected_progress: number;
  off_track_goals: number;
  off_track_employees: number;
  checkins_due: number;
  checkins_overdue: number;
  no_plan_yet: number;
  on_track_employees: number;
}

export interface TeamOverviewRules {
  off_track_tolerance: number;
  stale_checkin_days: number;
  include_indirect: number;
}

export interface TeamOverviewData {
  framework: string;
  cycle_name: string;
  status: string;
  start_date: string;
  end_date: string;
  methodology: string;
  description: string | null;
  company: string;
  stages: TeamOverviewStage[];
  current_stage: string | null;
  locks_on: string | null;
  days_remaining: number;
  manager: string;
  manager_name: string;
  team_size: number;
  cards: TeamOverviewCards;
  rules: TeamOverviewRules;
}

export interface TeamOverviewParams {
  manager?: string;
}

export interface TeamOverviewResponse {
  success: boolean;
  message: string;
  data: TeamOverviewData;
}

export interface TeamMemberItem {
  employee: string;
  employee_name: string;
  initials: string;
  image: string | null;
  designation: string;
  department: string;
  tenure_years: number;
  goal_plan: string | null;
  plan_status: string;
  goal_count: number;
  goals_pending_approval: number;
  progress: number;
  score: number;
  expected_progress: number;
  off_track_count: number;
  behind_schedule_count: number;
  stale_checkin_count: number;
  checkin_requested: boolean;
  checkin_requested_count: number;
  checkin_overdue: boolean;
  last_checkin_date: string | null;
  days_since_checkin: number | null;
  status: string;
  status_label: string;
  status_tone: string;
  actions: string[];
}

export interface TeamMembersSummary {
  total: number;
  no_plan: number;
  pending_approval: number;
  off_track: number;
  checkin_due: number;
  on_track: number;
}

export interface TeamMembersRules {
  off_track_tolerance: number;
  stale_checkin_days: number;
  include_indirect: number;
}

export interface TeamMembersData {
  manager: string;
  members: TeamMemberItem[];
  count: number;
  matched: number;
  total: number;
  start: number;
  limit: number;
  has_more: boolean;
  summary: TeamMembersSummary;
  filters: string[];
  rules: TeamMembersRules;
}

export type TeamMembersStatusFilter =
  | "all"
  | "no_plan"
  | "pending_approval"
  | "off_track"
  | "checkin_due"
  | "on_track";

export type TeamMembersSortOption =
  | "progress"
  | "progress_desc"
  | "name"
  | "checkin"
  | "off_track";

export interface TeamMembersParams {
  manager?: string;
  status?: TeamMembersStatusFilter;
  sort?: TeamMembersSortOption;
  search?: string;
  limit?: number;
  start?: number;
}

export interface TeamMembersResponse {
  success: boolean;
  message: string;
  data: TeamMembersData;
}
