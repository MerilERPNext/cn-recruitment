import FrappeAPI from "../utils/frappeAPI";
import type { FrappePageResponse } from "../types/frappe";

interface CustomAPIConfig {
  method: string;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  searchFields?: string[];
}

interface FetchParams {
  pageParam?: number;
  pageSize?: number;
  searchTerm?: string;
  filters?: Record<string, unknown>;
  orderBy?: string;
  [key: string]: unknown;
}

// Define expected response formats from Frappe API
type FrappeArrayResponse<T> = Array<T>;

interface FrappeObjectResponse<T> {
  data?: T[];
  results?: T[];
  total_count?: number;
  totalCount?: number;
  page_length?: number;
  start?: number;
  has_next_page?: boolean;
  hasNextPage?: boolean;
}

// Type guard to check if response is an array
function isArrayResponse<T>(
  response: unknown
): response is FrappeArrayResponse<T> {
  return Array.isArray(response);
}

// Type guard to check if response is an object with expected properties
function isObjectResponse<T>(
  response: unknown
): response is FrappeObjectResponse<T> {
  return (
    response !== null &&
    typeof response === "object" &&
    !Array.isArray(response) &&
    ("data" in response ||
      "results" in response ||
      "total_count" in response ||
      "totalCount" in response ||
      "page_length" in response ||
      "start" in response ||
      "has_next_page" in response ||
      "hasNextPage" in response)
  );
}

export const customApiService = {
  // Pure API service function - wrapped by React Query hooks in useCustomApi.ts for reactivity
  async fetchData<T>(
    customAPI: CustomAPIConfig,
    params: FetchParams
  ): Promise<FrappePageResponse> {
    try {
      // Prepare API call parameters with correct parameter names
      const apiParams: Record<string, unknown> = {
        ...customAPI.params,
        ...(params.searchTerm && customAPI.searchFields
          ? {
              search_term: params.searchTerm,
              search_fields: customAPI.searchFields,
            }
          : {}),
        ...(params.pageParam !== undefined ? { start: params.pageParam } : {}),
        // Fix: Use limit_page_length instead of page_size for Frappe compatibility
        ...(params.pageSize ? { page_length: params.pageSize } : {}),
        ...(params.orderBy ? { order_by: params.orderBy } : {}),
      };

      // Handle filters separately - format as JSON string for URL parameter
      if (params.filters && Object.keys(params.filters).length > 0) {
        apiParams.filters = JSON.stringify(params.filters);
      }

      // Combine body data
      const apiBody: Record<string, unknown> = {
        ...customAPI.body,
        ...apiParams,
      };

      // Call the custom API method
      const response: unknown = await FrappeAPI.callMethod(
        customAPI.method,
        apiBody
      );

      // Handle different response formats
      let data: T[] = [];
      let totalCount = 0;
      let pageLength = 0;
      let start = 0;

      if (isArrayResponse<T>(response)) {
        data = response;
        totalCount = response.length;
        pageLength = response.length;
        start = 0;
      } else if (isObjectResponse<T>(response)) {
        data = response.data ?? response.results ?? [];
        totalCount = response.total_count ?? response.totalCount ?? data.length;
        pageLength = response.page_length ?? params.pageSize ?? 20;
        start = response.start ?? params.pageParam ?? 0;
      }

      // Calculate pagination properly using the response values
      const hasNextPage = start + pageLength < totalCount;
      const nextCursor = hasNextPage ? start + pageLength : undefined;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
        totalCount,
        hasNextPage,
        nextCursor,
        pages: [Math.floor(start / pageLength) + 1],
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error calling custom API ${customAPI.method}:`,
        errorMessage
      );
      throw error;
    }
  },
};

export type { CustomAPIConfig, FetchParams };
