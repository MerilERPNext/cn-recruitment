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
  name: string;
  title: string;
  weightage: number;
  achievement: number;
  status: string;
}

export interface MyGoalsGoal {
  name: string;
  title: string;
  description: string;
  goal_type: string;
  department: string;
  department_title: string;
  weightage: number;
  status: string;
  achievement: number;
  submission_status: string;
  start_date: string;
  end_date: string;
  key_results: MyGoalsKeyResult[];
}

export interface MyGoalsData {
  employee: string;
  employee_name: string;
  designation: string;
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
  goals: Goal[];
}

export interface Goal {
  goal: string;
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
  draftGoals: DraftGoalItem[];
  setDraftGoals: React.Dispatch<React.SetStateAction<DraftGoalItem[]>>;
  addDraftGoals: (goals: GoalTemplate | GoalTemplate[]) => void;
  removeDraftGoal: (id: string) => void;
  updateDraftGoalWeightage: (id: string, weightage: number) => void;
  clearDraftGoals: () => void;
};

export type GoalsRequest = {
  goals: string[];
};
