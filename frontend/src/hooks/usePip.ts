import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { FlowRequestItem } from "../types/flows";
import {
  ActiveRepotreeTypes,
  getAllActiveEmployees,
  getActiveReportees,
  getPipFlowRequestsByEmployee,
  getPipFlowRequestsForEmployee,
} from "../services/pipService";

const PAGE_SIZE = 20;

/**
 * Infinite query for fetching all active employees (admin mode) with backend search & pagination.
 */
export const useInfiniteAllActiveEmployees = (
  searchTerm = "",
  enabled = true,
  pageSize = PAGE_SIZE
) => {
  return useInfiniteQuery<ActiveRepotreeTypes[]>({
    queryKey: ["all-active-employees-infinite", searchTerm, pageSize],
    queryFn: ({ pageParam = 0 }) =>
      getAllActiveEmployees({
        searchTerm,
        limit: pageSize,
        limitStart: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const items = Array.isArray(lastPage) ? lastPage : [];
      if (items.length < pageSize) {
        return undefined;
      }
      return allPages.length * pageSize;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Infinite query for fetching active direct reportees with backend search & pagination.
 */
export const useInfiniteActiveReportees = (
  effectiveEmployeeId: string | undefined,
  searchTerm = "",
  enabled = true,
  pageSize = PAGE_SIZE
) => {
  return useInfiniteQuery<ActiveRepotreeTypes[]>({
    queryKey: [
      "pip-active-reportees-infinite",
      effectiveEmployeeId,
      searchTerm,
      pageSize,
    ],
    queryFn: ({ pageParam = 0 }) =>
      getActiveReportees(effectiveEmployeeId!, {
        searchTerm,
        limit: pageSize,
        limitStart: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const items = Array.isArray(lastPage) ? lastPage : [];
      if (items.length < pageSize) {
        return undefined;
      }
      return allPages.length * pageSize;
    },
    enabled: enabled && !!effectiveEmployeeId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Fetches all active employees across the entire organization.
 * Used by admin users to populate the employee sidebar in the PIP view.
 */
export const useAllActiveEmployees = (enabled = true) => {
  return useQuery<ActiveRepotreeTypes[]>({
    queryKey: ["all-active-employees"],
    queryFn: () => getAllActiveEmployees(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetches active direct reportees for the given manager employee ID.
 * Used to populate the employee sidebar in the PIP view.
 */
export const useActiveReportees = (effectiveEmployeeId: string | undefined, enabled = true) => {
  return useQuery<ActiveRepotreeTypes[]>({
    queryKey: ["pip-active-reportees", effectiveEmployeeId],
    queryFn: () => getActiveReportees(effectiveEmployeeId!),
    enabled: enabled && !!effectiveEmployeeId,
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

/**
 * Fetches PIP flow requests scoped to a target employee using X-Target-Employee-Id header.
 */
export const usePipFlowRequestsForEmployee = (
  employeeId: string | undefined
) => {
  return useQuery<FlowRequestItem[]>({
    queryKey: ["pip-flow-requests-for-employee", employeeId],
    queryFn: () => getPipFlowRequestsForEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 1 * 60 * 1000,
  });
};
