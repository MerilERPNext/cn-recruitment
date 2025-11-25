/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";

import { addGoalRequest, getAllGoalPlans, getGoalPLanDetails, updateGoalRequest } from "../services/goalService";
import { GoalPlanId } from "../types/goal";
 
export const useGetAllGoalPlans = (EmployeeId: string): UseQueryResult<
  GoalPlanId[],
  Error
> => {
  return useQuery<any, Error>({
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

export const useGetGoalPlanDetails = (goalId: string): UseQueryResult<
  any,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["goal-id", "goal", goalId],
    queryFn: () => getGoalPLanDetails(goalId),
    refetchOnWindowFocus: true,
    // ...defaultQueryOptions,
  });
};
