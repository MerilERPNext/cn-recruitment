/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery,
  useInfiniteQuery,
  type UseQueryResult,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { customApiService, type CustomAPIConfig, type FetchParams } from "../services/customApiService";
import type { FrappePageResponse } from "../types/frappe";

// Retry logic (same as other hooks)
const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

const defaultRetry = (failureCount: number, error: unknown) => {
  // Don't retry permission errors
  if (isPermissionError(error)) return false;
  return failureCount < 3;
};

const defaultQueryOptions = {
  staleTime: 1000 * 60 * 2, // 2 minutes - shorter than other services as custom APIs may change frequently
  gcTime: 1000 * 60 * 3, // 3 minutes
  retry: defaultRetry,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
};

// Hook for paginated custom API queries
export const useCustomApiQuery = <T = any>(
  customAPI: CustomAPIConfig,
  params: FetchParams,
  options?: Omit<UseQueryOptions<FrappePageResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<FrappePageResponse, Error> => {
  return useQuery<FrappePageResponse, Error>({
    queryKey: [
      "custom-api",
      customAPI.method,
      params.pageParam,
      params.pageSize,
      params.searchTerm,
      params.filters,
      params.orderBy,
      customAPI.params,
    ],
    queryFn: () => customApiService.fetchData<T>(customAPI, params),
    ...defaultQueryOptions,
    ...options,
  });
};

// Hook for infinite scrolling custom API queries
export const useCustomApiInfiniteQuery = <T = any>(
  customAPI: CustomAPIConfig,
  baseParams: Omit<FetchParams, "pageParam">,
  options?: Omit<
    UseInfiniteQueryOptions<FrappePageResponse, Error>,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
  >
) => {
  return useInfiniteQuery({
    queryKey: [
      "custom-api-infinite",
      customAPI.method,
      baseParams.pageSize,
      baseParams.searchTerm,
      baseParams.filters,
      baseParams.orderBy,
      customAPI.params,
    ],
    queryFn: ({ pageParam = 0 }) =>
      customApiService.fetchData<T>(customAPI, {
        ...baseParams,
        pageParam: pageParam as number,
      }),
    getNextPageParam: (lastPage: FrappePageResponse) => lastPage.nextCursor,
    initialPageParam: 0,
    ...defaultQueryOptions,
    ...options,
  });
};

export { isPermissionError };