 
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { authService } from "../services/authService";

// Utility function to detect permission errors
const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

// Retry logic
const defaultRetry = (failureCount: number, error: unknown) =>
  isPermissionError(error) ? false : failureCount < 3;

// Custom React Query hook
export const useLoggedInUser = (
  options?: Omit<UseQueryOptions<string, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<string, Error>({
    queryKey: ["logged-in-user"],
    queryFn: () => authService.getLoggedInUser(),
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: true,
    retry: defaultRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};