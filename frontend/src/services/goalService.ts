import { GoalPlanId } from "../types/goal";
import FrappeAPI from "../utils/frappeAPI";

export const getAllGoalPlans = async (
employeeId: string,
): Promise<GoalPlanId[]> => {
    const response = await FrappeAPI.getMethod(
    "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_assigned_goal_plan",
    {
        employee_id: employeeId
    }
    );
    return response as GoalPlanId[];
};

export const addGoalRequest = async (
    body: Record<string, unknown>
  ) => {
    try {
      const response =  await FrappeAPI.callMethod(
        "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.add_goals_in_goal_plan",
        body
      );

      return response;
    } catch (error) {
      console.error("📡 Error while adding goal request in:", error);
      throw error;
    }
  };

  export const updateGoalRequest = async (
    body: Record<string, unknown>
  ) => {
    try {
      const response =  await FrappeAPI.callMethod(
        "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.update_goal_plan_items",
        body
      );

      return response;
    } catch (error) {
      console.error("📡 Error while Updating goal request in:", error);
      throw error;
    }
  };


export function groupByIsGroup(items: any[]) {
  const result: any[] = [];
  let currentGroup: any = null;

  items.forEach(item => {
    if (item.is_group === 1) {
      // Start a new group
      currentGroup = { ...item, subgroup: [] };
      result.push(currentGroup);
    } else {
      // is_group === 0
      if (currentGroup) {
        currentGroup.subgroup.push(item);
      }
    }
  });

  return result;
}

export const getGoalPLanDetails = async(
  goalId: string) => {
    try{
    const response = await FrappeAPI.getMethod(
     "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_goal_details",
    {
        goal_name: goalId
    }
    );

    return response;
  }catch(error){
    console.warn("get goals Error: ", error)
  }
}

