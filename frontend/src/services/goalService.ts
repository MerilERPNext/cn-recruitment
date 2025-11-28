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

export const getGoalDetails = async(
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

export const getGoalPlanDetails = async({goal_plan_framework, is_self, user}:{
  goal_plan_framework: string, is_self?: boolean, user?: string }) => {
    try{
    const params: Record<string, unknown> = { goal_plan_framework };

    if (typeof is_self === "boolean") {
      params.is_self = is_self;
    }

    if (user) {
      params.user = user;
    }

    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_goal_plan_details",
      params
    );

    return response;
  }catch(error){
    console.warn("get goals Error: ", error)
  }
}

export interface CheckInButtonVisibilityResponse  {
  checkin_description: string;
  checkin_status: string;
  due_date: string;
  show_checkin: boolean;
  show_request_checkin: boolean;
}

export const getCheckInButtonVisibility = async(
  goal_plan: string, employee?: string, user?: string ) : Promise<CheckInButtonVisibilityResponse>  => {
    try{
    const params: Record<string, unknown> = { goal_plan };

    if (typeof employee === "string") {
      params.employee = employee;
    }

    if (user) {
      params.user = user;
    }

    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_checkin_button_visibility",
      params
    );

    return response as CheckInButtonVisibilityResponse;
  }catch(error){
    console.warn("get goals Error: ", error)
    throw error;
  }
  }


  export const RequestCheckin = async (
    body : any
) => {
  try {
    const response =  await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.request_checkin",
      body
    );

    return response;
  } catch (error) {
    console.error("📡 Error while Updating goal request in:", error);
    throw error;
  }
};

 export const Checkin = async (
    body : any
) => {
  try {
    const response =  await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.employee_checkin",
      body
    );

    return response;
  } catch (error) {
    console.error("📡 Error while Updating goal request in:", error);
    throw error;
  }
};

export const getCheckinCommentConfig = async (
  goal_plan: string,
) => {
  try {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_checkin_comment_config",
      { goal_plan }
    );

    return response;
  } catch (error) {
    console.warn("get checkin comment config Error: ", error);
  }
};


