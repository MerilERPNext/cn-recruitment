// hooks/useScheduledImports.ts
import { useQuery } from "@tanstack/react-query";
import { scheduledImportsService } from "../services/scheduledImportsService";
import type {
  ImportStatusSummary,
  ScheduledDataImport,
} from "../types/scheduledImports";

const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

const defaultRetry = (failureCount: number, error: unknown) =>
  isPermissionError(error) ? false : failureCount < 3;

export const useScheduledImports = (owner: string, monthFilter?: string) => {
  return useQuery<ScheduledDataImport[], Error>({
    queryKey: ["scheduled-data-imports", owner, monthFilter],
    queryFn: () => scheduledImportsService.getImportsByOwner(owner, monthFilter),
    enabled: !!owner,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Aggregated status counts for the summary cards — served by a single
// backend GROUP BY query rather than reducing the full list client-side.
export const useScheduledImportsSummary = (
  owner: string,
  monthFilter?: string,
) => {
  return useQuery<ImportStatusSummary, Error>({
    queryKey: ["scheduled-data-imports-summary", owner, monthFilter],
    queryFn: () =>
      scheduledImportsService.getStatusSummary(owner, monthFilter),
    enabled: !!owner,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
