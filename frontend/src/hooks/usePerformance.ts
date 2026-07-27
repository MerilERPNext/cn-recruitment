import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { GoalFormConfig, GoalPlanId, GoalPlanResponse, GoalsRequest, GoalSubmitResponse, Message, MyGoalsResponse, SaveGoalsPayload } from "../types/goal";
import { performanceService } from "../services/performanceService";
interface PerformanceQueryKey {

  goalPlans: (employeeId: string) => ["performance", "goal-plans", string];
  goalPlan: (goalId: string) => ["performance", "goal-plan", string];
  goalFormConfig: ["performance", "goal-form-config"];
  myGoals: ["performance", "my-goals"];
  mandatoryGoals: ["performance", "mandatory-goals"];

}
export const PERFORMANCE_QUERY_KEYS: PerformanceQueryKey = {
  goalPlans: (employeeId: string) => ["performance", "goal-plans", employeeId] as const,
  goalPlan: (goalId: string) => ["performance", "goal-plan", goalId] as const,
  goalFormConfig: ["performance", "goal-form-config"] as const,
  myGoals: ["performance", "my-goals"] as const,
  mandatoryGoals: ["performance", "mandatory-goals"] as const,
};

export const useGoalPlans = (employeeId: string): UseQueryResult<GoalPlanId[], Error> =>
  useQuery<GoalPlanId[], Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalPlans(employeeId),
    queryFn: () => performanceService.getAllGoalPlans(employeeId),
    refetchOnWindowFocus: true,
  });

export const useGoalFormConfig = (): UseQueryResult<GoalFormConfig, Error> =>
  useQuery<GoalFormConfig, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalFormConfig,
    queryFn: performanceService.getGoalFormConfig,
    staleTime: 5 * 60 * 1000,
  });

export const useAddGoals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => performanceService.addGoals(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance", "goal-plans"] }),
  });
};

export const useUpdateGoals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => performanceService.updateGoals(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance", "goal-plans"] }),
  });
};

export const useSaveGoals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveGoalsPayload) => performanceService.saveGoals(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", "goal-plans"] });
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myGoals });
    },
  });
};

export const useGoalPlanDetails = (goalId: string): UseQueryResult<GoalPlanResponse, Error> =>
  useQuery<GoalPlanResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalPlan(goalId),
    queryFn: () => performanceService.getGoalPlanDetails(goalId),
    refetchOnWindowFocus: true,
  });

export const useMyGoals = (): UseQueryResult<MyGoalsResponse, Error> =>
  useQuery<MyGoalsResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.myGoals,
    queryFn: () => performanceService.getMyGoals(),
    refetchOnWindowFocus: true,
    staleTime: 1 * 60 * 1000,
  });

export const useGetMandotaryGoals = (): UseQueryResult<Message, Error> =>
  useQuery<Message, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.mandatoryGoals,
    queryFn: () => performanceService.getMandotaryGoals(),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });
export const useSubmitMandatoryGoals = () =>
  useMutation<GoalSubmitResponse, Error, GoalsRequest>({

    mutationFn: (payload) => performanceService.submitMandatoryGoals(payload),

  });