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
