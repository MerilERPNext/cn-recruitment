import type {
  GoalFormConfig,
  GoalFormConfigResponse,
  GoalPlanId,
  GoalPlanItem,
  GoalPlanResponse,
  GroupGoalItem,
  MyGoalsResponse,
  SaveGoalsPayload,
  SaveGoalsResponse,
  SubGoalItem,
} from "../types/goal";
import FrappeAPI from "../utils/frappeAPI";

export type GroupedGoalItem = GroupGoalItem & { subgroup: SubGoalItem[] };

const isGroupGoalItem = (item: GoalPlanItem): item is GroupGoalItem => item.is_group === 1;
const isSubGoalItem = (item: GoalPlanItem): item is SubGoalItem => item.is_group === 0;

export const performanceService = {
  getAllGoalPlans: async (employeeId: string): Promise<GoalPlanId[]> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_assigned_goal_plan",
      { employee_id: employeeId },
    );

    return response as GoalPlanId[];
  },

  getGoalFormConfig: async (): Promise<GoalFormConfig> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_goal_form_config",
    );

    return (response as GoalFormConfigResponse).data;
  },

  addGoals: (body: Record<string, unknown>): Promise<unknown> =>
    FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.add_goals_in_goal_plan",
      body,
    ),

  updateGoals: (body: Record<string, unknown>): Promise<unknown> =>
    FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.update_goal_plan_items",
      body,
    ),

  getGoalPlanDetails: async (goalId: string): Promise<GoalPlanResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_goal_details",
      { goal_name: goalId },
    );

    return response as GoalPlanResponse;
  },

  saveGoals: async (payload: SaveGoalsPayload): Promise<SaveGoalsResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.save_goals",
      { payload },
    );

    return response as SaveGoalsResponse;
  },

  getMyGoals: async (): Promise<MyGoalsResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_my_goals",
    );

    return response as MyGoalsResponse;
  },
};


export const groupGoalsByParent = (items: GoalPlanItem[]): GroupedGoalItem[] => {
  const groupedGoals: GroupedGoalItem[] = [];
  let currentGroup: GroupedGoalItem | null = null;

  items.forEach((item) => {
    if (isGroupGoalItem(item)) {
      currentGroup = { ...item, subgroup: [] };
      groupedGoals.push(currentGroup);
    } else if (isSubGoalItem(item) && currentGroup) {
      currentGroup.subgroup.push(item);
    }
  });

  return groupedGoals;
};
