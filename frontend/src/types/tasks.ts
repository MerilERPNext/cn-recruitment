import type React from "react";

export interface OpenApprovalTodosResponse {
  message?: {
    data?: unknown[];
    total_count?: number;
  };
  total_count?: number;
  data?: {
    total_count?: number;
    data?: unknown[];
  };
}

export interface TaskItemConfig {
  id: string;
  label: string;
  count: number;
  route: string;
  navigationState?: Record<string, unknown>;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface PendingTaskCounts {
  attendanceCount: number;
  leaveCount: number;
  expenseCount: number;
  totalPendingCount: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}
