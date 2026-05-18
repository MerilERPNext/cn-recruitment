import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { mandatoryTasksService } from "../services/mandatoryTasksService";
import type { MandatoryTasksResponse } from "../types/mandatoryTasks";

export const MANDATORY_TASKS_QUERY_KEY = ["mandatory-tasks"] as const;

export const useMandatoryTasks = (
  options?: { enabled?: boolean },
): UseQueryResult<MandatoryTasksResponse, Error> => {
  return useQuery<MandatoryTasksResponse, Error>({
    queryKey: MANDATORY_TASKS_QUERY_KEY,
    queryFn: () => mandatoryTasksService.getMandatoryTasks(),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
};

