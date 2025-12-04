/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";

import { addGoalRequest, Checkin, CheckInButtonVisibilityResponse, getAllGoalPlans, getCheckInButtonVisibility, getCheckinCommentConfig, getGoalDetails, getGoalPlanDetails, RequestCheckin, updateGoalRequest } from "../services/goalService";
import { GoalPlanId } from "../types/goal";
 
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
    mutationFn: ( payload  : any) =>
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
    mutationFn: ( payload  : any) =>
      updateGoalRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["goal-id", "goal"],
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

export const useGoalPlanDetails = (goalId: string,user?: string ): UseQueryResult<
  any,
  Error
> => {
  const params = user ? {goal_plan_framework: goalId, user} : {goal_plan_framework: goalId, is_self: true};
  return useQuery<any, Error>({
    queryKey: ["goal-id", "goal", goalId, user ?? "self"],
    queryFn: () =>  getGoalPlanDetails(params),
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
    queryKey: ["team-goal", ],
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
    mutationFn: ( payload  : any) =>
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
    mutationFn: ( payload  : any) =>
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


