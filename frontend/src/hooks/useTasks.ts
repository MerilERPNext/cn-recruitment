import { useQuery } from "@tanstack/react-query";
import { tasksService } from "../services/tasksService";
import type { PendingTaskCounts } from "../types/tasks";

export function useAttendancePendingCount(employeeId?: string) {
  return useQuery<number>({
    queryKey: ["tasks", "attendance-pending-count", employeeId],
    queryFn: () =>
      employeeId ? tasksService.getAttendancePendingCount(employeeId) : 0,
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function useLeavePendingCount(employeeId?: string) {
  return useQuery<number>({
    queryKey: ["tasks", "leave-pending-count", employeeId],
    queryFn: () =>
      employeeId ? tasksService.getLeavePendingCount(employeeId) : 0,
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function useExpensePendingCount(employeeId?: string) {
  return useQuery<number>({
    queryKey: ["tasks", "expense-pending-count", employeeId],
    queryFn: () =>
      employeeId ? tasksService.getExpensePendingCount(employeeId) : 0,
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

export function useMyPendingTaskCounts(employeeId?: string): PendingTaskCounts {
  const attendanceQuery = useAttendancePendingCount(employeeId);
  const leaveQuery = useLeavePendingCount(employeeId);
  const expenseQuery = useExpensePendingCount(employeeId);

  const attendanceCount = attendanceQuery.data ?? 0;
  const leaveCount = leaveQuery.data ?? 0;
  const expenseCount = expenseQuery.data ?? 0;
  const totalPendingCount = attendanceCount + leaveCount + expenseCount;

  const isLoading =
    attendanceQuery.isLoading ||
    leaveQuery.isLoading ||
    expenseQuery.isLoading;

  const isError =
    attendanceQuery.isError || leaveQuery.isError || expenseQuery.isError;

  const error =
    attendanceQuery.error || leaveQuery.error || expenseQuery.error;

  const refetch = () => {
    attendanceQuery.refetch();
    leaveQuery.refetch();
    expenseQuery.refetch();
  };

  return {
    attendanceCount,
    leaveCount,
    expenseCount,
    totalPendingCount,
    isLoading,
    isError,
    error,
    refetch,
  };
}
