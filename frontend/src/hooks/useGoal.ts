/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";

import {
  addGoalRequest,
  Checkin,
  CheckInButtonVisibilityResponse,
  getAllGoalPlans,
  getCheckInButtonVisibility,
  getCheckinCommentConfig,
  getGoalAndSubgoalFieldConfigs,
  getGoalDetails,
  getGoalPlanDetails,
  getGoalPlanFrameworkSettings,
  getReviewRecordDetails,
  getReviewRecordListView,
  RequestCheckin,
  updateGoalRequest
} from "../services/goalService";
import { GoalPlanFrameworkSettings, GoalPlanId } from "../types/goal";
import { GoalReviewResponse, ReviewListSelfResponse } from "../types/goalReviewDetails";

export const useGetAllGoalPlans = (EmployeeId: string): UseQueryResult<
  GoalPlanId[],
  Error
> => {
  return useQuery<GoalPlanId[], Error>({
    queryKey: ["goal-id", "goal", EmployeeId],
    queryFn: () => getAllGoalPlans(EmployeeId),
    refetchOnWindowFocus: true,
    // ...defaultQueryOptions,
  });
};


export function useAddGoalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) =>
      addGoalRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["goal-id", "goal"],
      });
    },
  });
}


export function useUpdateGoalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) =>
      updateGoalRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["goal-id", "goal", "goal-plan"],
      });
    },
  });
}

export const useGoalDetails = (goalId: string): UseQueryResult<
  any,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["goal-id", "goal", goalId],
    queryFn: () => getGoalDetails(goalId),
    refetchOnWindowFocus: true,
    // ...defaultQueryOptions,
  });
};

export const useGoalPlanDetails = (goalId: string, user?: string): UseQueryResult<
  any,
  Error
> => {
  const params = user ? { goal_plan_framework: goalId, user } : { goal_plan_framework: goalId, is_self: true };
  return useQuery<any, Error>({
    queryKey: ["goal-id", "goal", goalId, user ?? "self"],
    queryFn: () => getGoalPlanDetails(params),
    refetchOnWindowFocus: true,
    // ...defaultQueryOptions,
  });
};


export const useGetCheckInButtonVisibility = (goal_plan: string, employee: string): UseQueryResult<
  CheckInButtonVisibilityResponse,
  Error
> => {
  return useQuery<CheckInButtonVisibilityResponse, Error>({
    queryKey: ["goal-id", "goal", goal_plan, employee],
    queryFn: () => getCheckInButtonVisibility(goal_plan, employee),
    refetchOnWindowFocus: true,
    enabled: !!goal_plan && !!employee,
    // ...defaultQueryOptions,
  });
};


export const useGetTeamGoalPlan = (goal_plan_framework: string): UseQueryResult<any, Error> => {
  return useQuery<any, Error>({
    queryKey: ["team-goal",],
    queryFn: async () => {
      return getGoalPlanDetails({ goal_plan_framework, is_self: false });
    },
    refetchOnWindowFocus: true,
    enabled: !!goal_plan_framework,
  });
};


export function useRequestCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) =>
      RequestCheckin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["goal-id", "goal"],
      });
    },
  });
}

export function useCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) =>
      Checkin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["goal-id", "goal"],
      });
    },
  });
}

export const useGetCheckinCommentConfig = (goal_plan: string): UseQueryResult<
  any,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["checkin-comment", "goal", goal_plan],
    queryFn: () => getCheckinCommentConfig(goal_plan),
    refetchOnWindowFocus: true,
    enabled: !!goal_plan,
    // ...defaultQueryOptions,
  });
};


export const useGetGoalPlanFrameworkSettings = (goal_plan: string): UseQueryResult<
  GoalPlanFrameworkSettings,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["goal-plan", "framwork-settings", goal_plan],
    queryFn: () => getGoalPlanFrameworkSettings(goal_plan),
    refetchOnWindowFocus: true,
    enabled: !!goal_plan,
    // ...defaultQueryOptions,
  });
};

// Base common fields shared by goal_attributes & sub_goal_attributes
interface BaseAttribute {
  fieldname: string;
  attribute_name: string;
  is_enable: boolean;
  is_mandatory: boolean;
  is_editable: boolean;
  needs_approval: boolean;
}

// For clarity, keep separate types — even though both share same shape
export interface GoalAttribute extends BaseAttribute {}

export interface SubGoalAttribute extends BaseAttribute {}

export interface GoalPlanResponse {
  status: string;
  goal_plan: string;
  framework: string;
  goal_attributes: GoalAttribute[];
  sub_goal_attributes: SubGoalAttribute[];
}

export const useGetGoalAndSubgoalFieldConfigs = (goal_plan: string): UseQueryResult<
  GoalPlanResponse,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["goal-plan", "goal-subgoal-field-config", goal_plan],
    queryFn: () => getGoalAndSubgoalFieldConfigs(goal_plan),
    refetchOnWindowFocus: true,
    enabled: !!goal_plan,
    // ...defaultQueryOptions,
  });
};

export interface ReviewApiResponse {
  status: string;
  manager_employee: string;
  total_count: number;
  data: EmployeeData[];
}

export interface EmployeeData {
  employee: string;
  employee_name: string;
  designation: string | null;
  department: string;
  image: string | null;
  user_id: string;
  reporting_through: string[];
  has_active_review: boolean;
  review_record: ReviewRecord | null;
  review_cycle: ReviewCycle | null;
}

export interface ReviewRecord {
  name: string;
  average_achievement: number;
  average_score: number;
  overall_score: number;
  review_framework: string;
  goal_plan: string;
}

export interface ReviewCycle {
  name: string;
  review_cycle_name: string;
  review_cycle_id: string;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  description: string;
}

export const useGetReviewRecordListView = (user: string, tab: "Team"): UseQueryResult<
  ReviewApiResponse,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["goal-plan", "goal-subgoal-field-config", user, "Team"],
    queryFn: () => getReviewRecordListView(user, tab),
    refetchOnWindowFocus: true,
    enabled: !!user && !!tab,
    // ...defaultQueryOptions,
  });
};

export const useGetReviewRecordListViewSelf = (user: string): UseQueryResult<
  ReviewListSelfResponse,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["goal-plan", "goal-subgoal-field-config-self", user, "Self"],
    queryFn: () => getReviewRecordListView(user, "Self"),
    refetchOnWindowFocus: true,
    enabled: !!user,
    // ...defaultQueryOptions,
  });
};


export const useGetReviewRecordDetails = (user: string, review_record_name: string ): UseQueryResult<
  GoalReviewResponse,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["goal-plan", "review-record-details", user, review_record_name],
    queryFn: () => getReviewRecordDetails(user, review_record_name),
    refetchOnWindowFocus: true,
    enabled: !!review_record_name,
    // ...defaultQueryOptions,
  });
};
