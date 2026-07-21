import FrappeAPI from "../utils/frappeAPI";
import type { FrappePageResponse } from "../types/frappe";

interface CustomAPIConfig {
  method: string;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  searchFields?: string[];
  /** Optional custom keys for pagination payload. Defaults to { startKey: 'start', pageLengthKey: 'page_length' } */
  paginationKeys?: {
    startKey?: string;
    pageLengthKey?: string;
  };
  /** Optional custom keys for reading pagination values from the API response.
   *  Defaults: { dataKey: 'data', totalCountKey: 'total_count', pageLengthKey: 'page_length', startKey: 'start' } */
  responseKeys?: {
    dataKey?: string;
    totalCountKey?: string;
    pageLengthKey?: string;
    startKey?: string;
  };
  /** Controls how the start/page parameter is sent in the payload.
   *  - 'offset' (default): sends record index (0, 20, 40...)
   *  - 'page': sends page number (1, 2, 3...) */
  paginationType?: "offset" | "page";
}

interface FetchParams {
  pageParam?: number;
  pageSize?: number;
  searchTerm?: string;
  filters?: Record<string, unknown>;
  orderBy?: string;
  searchFields?: string[];
  [key: string]: unknown;
}

// Define expected response formats from Frappe API
type FrappeArrayResponse<T> = Array<T>;

// interface FrappeObjectResponse<T> {
//   data?: T[];
//   results?: T[];
//   total_count?: number;
//   totalCount?: number;
//   page_length?: number;
//   start?: number;
//   has_next_page?: boolean;
//   hasNextPage?: boolean;
// }

// Type guard to check if response is an array
function isArrayResponse<T>(
  response: unknown
): response is FrappeArrayResponse<T> {
  return Array.isArray(response);
}


export const customApiService = {
  // Pure API service function - wrapped by React Query hooks in useCustomApi.ts for reactivity
  async fetchData<T>(
    customAPI: CustomAPIConfig,
    params: FetchParams
  ): Promise<FrappePageResponse> {
    try {
      // Determine which searchFields to use - params takes precedence over customAPI config
      const searchFields = params.searchFields || customAPI.searchFields;

      // Use custom pagination keys if provided, otherwise default to Frappe standard keys
      const startKey = customAPI.paginationKeys?.startKey ?? "start";
      const pageLengthKey = customAPI.paginationKeys?.pageLengthKey ?? "page_length";
      const isPageBased = customAPI.paginationType === "page";

      // Convert offset-based pageParam to page number if paginationType is 'page'
      const startValue = params.pageParam !== undefined
        ? (isPageBased
          ? Math.floor(params.pageParam / (params.pageSize || 20)) + 1
          : params.pageParam)
        : undefined;

      // Prepare API call parameters with correct parameter names
      const apiParams: Record<string, unknown> = {
        ...customAPI.params,
        ...(params.searchTerm && searchFields
          ? {
            search_term: params.searchTerm,
            search_fields: searchFields,
          }
          : {}),
        ...(startValue !== undefined ? { [startKey]: startValue } : {}),
        ...(params.pageSize ? { [pageLengthKey]: params.pageSize } : {}),
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

      // Response keys for reading pagination values from the response
      const resDataKey = customAPI.responseKeys?.dataKey;
      const resTotalCountKey = customAPI.responseKeys?.totalCountKey;
      const resPageLengthKey = customAPI.responseKeys?.pageLengthKey;
      const resStartKey = customAPI.responseKeys?.startKey;

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
      } else if (
        response !== null &&
        typeof response === "object" &&
        !Array.isArray(response)
      ) {
        // eslint-disable-next-line
        const res = response as Record<string, any>;

        // Data: custom key → 'data' → 'results' → []
        data = (resDataKey ? res[resDataKey] : undefined)
          ?? res.data ?? res.results ?? [];

        // Total count: custom key → 'total_count' → 'totalCount' → data.length
        totalCount = (resTotalCountKey ? res[resTotalCountKey] : undefined)
          ?? res.total_count ?? res.totalCount ?? data.length;

        // Page length: custom key → 'page_length' → params.pageSize → 20
        pageLength = (resPageLengthKey ? res[resPageLengthKey] : undefined)
          ?? res.page_length ?? params.pageSize ?? 20;

        // Start: custom key → 'start' → params.pageParam → 0
        start = (resStartKey ? res[resStartKey] : undefined)
          ?? res.start ?? params.pageParam ?? 0;
      }

      // Calculate pagination properly using the response values
      // For page-based APIs, convert page number back to offset for consistent internal logic
      const effectiveStart = isPageBased
        ? ((start || 1) - 1) * (params.pageSize || 20)
        : start;
      const hasNextPage = effectiveStart + pageLength < totalCount;
      const nextCursor = hasNextPage ? effectiveStart + pageLength : undefined;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
        totalCount,
        hasNextPage,
        nextCursor,
        pages: [Math.floor(effectiveStart / pageLength) + 1],
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
