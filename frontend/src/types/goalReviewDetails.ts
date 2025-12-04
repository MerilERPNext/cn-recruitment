// ------------------ TOP LEVEL RESPONSE ------------------

export interface GoalReviewResponse {
  status: string;
  data: ReviewData;
}

export interface ReviewData {
  review_record: ReviewRecord;
  employee: EmployeeProfile;
  review_cycle: ReviewCycle;
  review_framework: ReviewFramework;
  approval_stages: ApprovalWorkflow;
  scales: ScaleSettings;
  goals: GoalsSection;
  overall_section: OverallSection;
  current_user_context: CurrentUserContext;
  promotional_framework: PromotionalFramework;
  forms: ReviewForms;
}

// ------------------ 1. REVIEW RECORD & EMPLOYEE ------------------

export interface ReviewRecord {
  name: string;
  employee: string;
  employee_name: string;
  status: string;
  docstatus: number;
  goal_plan: string;
  review_cycle: string;
  review_framework: string;
  approval_matrix: string;
  average_achievement: number;
  average_score: number;
  overall_score: number;
}

export interface EmployeeProfile {
  employee_id: string;
  employee_name: string;
  user_id: string;
  designation: string | null;
  department: string;
  image: string | null;
  company: string;
}

// ------------------ 2. CONFIGURATION (CYCLE & FRAMEWORK) ------------------

export interface ReviewCycle {
  name: string;
  review_cycle_name: string;
  review_cycle_id: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface ReviewFramework {
  name: string;
  review_name: string;
  review_id: string;
  status: string;
  
  // Goals
  goal_enabled: 0 | 1;
  goal_rating_scale: string; // "01"
  auto_calculate: 0 | 1;
  suggest_ratings: 0 | 1;
  decimal_values: 0 | 1;
  normalized_values: 0 | 1;

  // Competency
  competency_enabled: 0 | 1;
  competency_auto_calculate: 0 | 1;
  competency_suggest_ratings: 0 | 1;
  competency_decimal_values: 0 | 1;
  competency_normalized_values: 0 | 1;

  // Overall
  overall_performance_enabled: 0 | 1;
  overall_rating_scale: string; // "02"
  overall_auto_calculate: 0 | 1;
  overall_suggest_ratings: 0 | 1;

  // Stages & Roles
  self_stage_enabled: 0 | 1;
  evaluator_1_enabled: 0 | 1;
  evaluator_1_role: string;
  evaluator_2_enabled: 0 | 1;
  evaluator_2_role: string;
  reviewer_stage_enabled: 0 | 1;
  reviewer_role: string;

  // Settings
  calibration_enabled: 0 | 1;
  acknowledgement_enabled: 0 | 1;
  show_stars_on_rating_scale: 0 | 1;
  enable_dropdown_on_rating_scale: 0 | 1;
  disable_attachments: 0 | 1;
}

// ------------------ 3. APPROVAL WORKFLOW ------------------

export interface ApprovalWorkflow {
  has_tracker: boolean;
  tracker_name: string;
  tracker_status: string;
  approval_mode: string;
  current_step: number;
  total_steps: number;
  stages: ApprovalStage[];
}

export interface ApprovalStage {
  idx: number;
  stage_name: string;
  approver_type: string;
  role: string | null;
  employee_doc_field: string;
  status: string; // e.g., "in_progress", "pending"
  status_label: string;
  completion_date: string | null;
  is_current: boolean;
  is_completed: boolean;
  approver_info: ApproverInfo;
  allow_revoke: 0 | 1;
  allow_sendback: 0 | 1;
}

export interface ApproverInfo {
  type: string;
  user: string | null;
  user_name: string | null;
  role: string | null;
  employee_field: string;
}

// ------------------ 4. SCALES ------------------

export interface ScaleSettings {
  settings: {
    show_stars: boolean;
    enable_dropdown: boolean;
    goal_auto_calculate: boolean;
    overall_auto_calculate: boolean;
  };
  goal_scale: RatingScale;
  overall_review_scale: RatingScale;
}

export interface RatingScale {
  name: string;
  rating_scale_name: string;
  length_of_scale: number;
  scale_details: ScaleDetail[];
}

export interface ScaleDetail {
  scale_marker: string;
  marks: number;
  description: string;
}

// ------------------ 5. GOALS DATA ------------------

export interface GoalsSection {
  has_goals: boolean;
  goal_plan: string;
  data: GoalPlanData;
  user_role: string;
  assessment_settings: AssessmentSettings;
  visibility_settings: VisibilitySettings;
}

export interface GoalPlanData {
  name: string;
  employee: string;
  goal_plan_framework: string;
  total_goals: number;
  total_subgoals: number;
  average_achievement: number;
  average_score: number;
  overall_score: number;
  goal_plan_items: GoalItem[];
}

export interface GoalItem {
  goal: string;
  description: string;
  weightage: number;
  start_date: string;
  end_date: string;
  achievement: number;
  status: string;
  is_group: 0 | 1;
  score: number;
  subgoals: SubGoal[];
  goal_review: GoalReviewContainer;
}

export interface SubGoal {
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
  is_group: 0 | 1;
  achieved: number;
  target: number;
  metric: string;
  target_type: string;
  score: number;
}

export interface GoalReviewContainer {
  name: string;
  goal: string;
  is_group: 0 | 1;
  reviews: ReviewEntry[];
}

// ------------------ 6. OVERALL SECTION ------------------

export interface OverallSection {
  goals_overall: ReviewEntry[];
  overall_review: ReviewEntry[];
  user_role: string;
}

// Shared Interface for Goal Reviews and Overall Reviews
export interface ReviewEntry {
  // Identification
  role: string; // "self", "evaluator_1", etc.
  role_label?: string; // e.g. "Self", "Evaluator 1" (Present in Goals, optional in Overall)
  by?: string; // Label used in Overall Section
  is_current_user: boolean;
  employee?: string | null; // Present in Overall

  // Permissions
  can_view_rating: boolean;
  can_view_comment: boolean;
  can_edit: boolean;

  // Data
  // Note: API returns "review": "0" (string) in goals, but "review_ratings" in overall
  review?: string | null; 
  goal_ratings?: number | null;
  review_ratings?: number | null; 
  
  comment?: string | null;
  goal_comment?: string | null;
  review_comment?: string | null;

  // Configuration
  show_rating: 0 | 1;
  rating_mandatory: 0 | 1;
  show_comment: 0 | 1;
  comment_mandatory: 0 | 1;
}

export interface AssessmentSettings {
  for_role: string;
  goal_rating: 0 | 1;
  goal_rating_mandatory: 0 | 1;
  goal_comment: 0 | 1;
  goal_comment_mandatory: 0 | 1;
  goals_overall_rating: 0 | 1;
  goals_overall_rating_mandatory: 0 | 1;
  goals_overall_comments: 0 | 1;
  goals_overall_comments_mandatory: 0 | 1;
  overall_review_rating: 0 | 1;
  overall_review_rating_mandatory: 0 | 1;
  overall_review_comments: 0 | 1;
  overall_review_comments_mandatory: 0 | 1;
  select_form: string;
}

export interface VisibilitySettings {
  can_view_ratings_of: string[];
  can_view_comments_of: string[];
  can_view_forms_of: string[];
}

// ------------------ 7. CONTEXT & PROMOTIONAL ------------------

export interface CurrentUserContext {
  user: string;
  user_role: string;
  is_employee: boolean;
  is_approver: boolean;
  current_stage_approver: boolean;
  role_in_review: string;
  can_edit: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_send_back: boolean;
}

export interface PromotionalFramework {
  is_visible: boolean;
  options: any | null;
  form: any | null;
}

// ------------------ 8. FORMS ------------------

export interface ReviewForms {
  self: FormDefinition;
  evaluator_1: FormDefinition;
  evaluator_2: FormDefinition;
  // Reviewer stage might appear here dynamically if enabled
  [key: string]: FormDefinition; 
}

export interface FormDefinition {
  // The 'form' field is a Stringified JSON (Form.io schema)
  form: string | null;
  is_current_user: boolean;
  can_view: boolean;
}


// ReviewListSelfResponse
export interface ReviewListSelfResponse {
  status: string;
  data: MessageData;
}

export interface MessageData {
  employee: string;
  employee_name: string;
  designation: string | null;
  department: string;
  image: string | null;
  user_id: string;
  has_active_review: boolean;
  review_record: ReviewRecordSample;
  review_cycle: ReviewCycleSample;
}

export interface ReviewRecordSample {
  name: string;
  average_achievement: number;
  average_score: number;
  overall_score: number;
  review_framework: string;
  goal_plan: string;
}

export interface ReviewCycleSample {
  name: string;
  review_cycle_name: string;
  review_cycle_id: string;
  start_date: string;
  end_date: string;
  description: string;
}