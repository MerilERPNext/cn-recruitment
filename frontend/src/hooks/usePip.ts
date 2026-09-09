import { useQuery } from "@tanstack/react-query";
import type { FlowRequestItem } from "../types/flows";
import {
  ActiveRepotreeTypes,
  getActiveReportees,
  getPipFlowRequestsByEmployee,
} from "../services/pipService";

/**
 * Fetches active direct reportees for the given manager employee ID.
 * Used to populate the employee sidebar in the PIP view.
 */
export const useActiveReportees = (effectiveEmployeeId: string | undefined) => {
  return useQuery<ActiveRepotreeTypes[]>({
    queryKey: ["pip-active-reportees", effectiveEmployeeId],
    queryFn: () => getActiveReportees(effectiveEmployeeId!),
    enabled: !!effectiveEmployeeId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetches all PIP flow requests that were initiated for a specific employee.
 * Used to check whether a PIP flow has already been started and show its status.
 */
export const usePipFlowRequestsByEmployee = (
  employeeId: string | undefined
) => {
  return useQuery<FlowRequestItem[]>({
    queryKey: ["pip-flow-requests-by-employee", employeeId],
    queryFn: () => getPipFlowRequestsByEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 1 * 60 * 1000,
  });
};
