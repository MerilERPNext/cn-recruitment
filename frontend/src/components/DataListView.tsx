/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useQueryClient,
  useQuery,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Loader2,
  Shield,
  RepeatIcon as RetryIcon,
} from "lucide-react";
import { useLocation } from "react-router";
import FrappeAPI from "../utils/frappeAPI";

interface BaseItem {
  name?: string;
  id?: string | number;
  [key: string]: any;
}

interface FetchParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  filters?: Record<string, any>;
  orderBy?: string;
  [key: string]: any;
}

interface CustomAPIConfig {
  method: string;
  params?: Record<string, any>;
  body?: Record<string, any>;
  searchFields?: string[];
}

interface FetchResult<T> {
  data: T[];
  totalCount?: number;
  hasNextPage?: boolean;
  nextCursor?: any;
}

export interface PreListComponentProps<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  setCurrentPage: (page: number) => void;
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface PostListComponentProps<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  setCurrentPage: (page: number) => void;
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  totalCount: number;
}

interface FilterField {
  fieldname: string;
  label: string;
  fieldtype:
    | "Select"
    | "Link"
    | "Data"
    | "Int"
    | "Float"
    | "Check"
    | "Date"
    | "Datetime";
  options?: string[];
}

interface DataListViewProps<T extends BaseItem> {
  queryKey: string | string[];
  fetchFunction?: (params: FetchParams) => Promise<FetchResult<T>>;
  customAPI?: CustomAPIConfig;
  ItemComponent: React.ComponentType<{
    item: T;
    index?: number;
  }>;
  PreListComponent?: React.ComponentType<PreListComponentProps<T>>;
  PostListComponent?: React.ComponentType<PostListComponentProps<T>>;
  SkeletonComponent?: React.ComponentType;
  isSearch?: boolean;
  isFilter?: boolean;
  isLoading?: boolean;
  pageSize?: number;
  defaultFilters?: Record<string, any>;
  searchFields?: string[];
  onItemClick?: (item: T) => void;
  infiniteScroll?: boolean;
  permissionErrorMessage?: string;
  showRefreshButton?: boolean;
  onRefetchAvailable?: (refetch: () => void) => void;
  onDataLoad?: (data: T[]) => void;
  refetchTrigger?: boolean;
  onRefetchComplete?: () => void;
  orderBy?: string;
  showPagination?: boolean;
  filterFields?: FilterField[];
  getItemKey?: (item: T, index: number) => string;
  enableUrlParams?: boolean;
}

const DataListView = <T extends BaseItem>({
  queryKey,
  fetchFunction,
  customAPI,
  ItemComponent,
  isLoading,
  PreListComponent,
  PostListComponent,
  SkeletonComponent,
  isSearch = true,
  isFilter = false,
  pageSize = 20,
  defaultFilters = {},
  searchFields = [],
  onItemClick,
  infiniteScroll = false,
  showRefreshButton = false,
  permissionErrorMessage,
  onRefetchAvailable,
  onDataLoad,
  refetchTrigger = false,
  onRefetchComplete,
  orderBy = "modified desc",
  showPagination = true,
  filterFields = [],
  getItemKey,
  enableUrlParams = true,
}: DataListViewProps<T>) => {
  const { search } = useLocation();
  const queryParam = new URLSearchParams(search);
  const initialSearchQuery = enableUrlParams ? queryParam.get("q") || "" : "";

  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(initialSearchQuery);
  const queryClient = useQueryClient();

  const filtersString = enableUrlParams ? queryParam.get("filters") : null;
  const [queryParamsFilters, setQueryParamsFilters] = useState({});

  useEffect(() => {
    if (!enableUrlParams || !filtersString) {
      setQueryParamsFilters({});
      return;
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(filtersString));
      setQueryParamsFilters(parsed);
    } catch (e) {
      console.error("Invalid filters JSON", e);
      setQueryParamsFilters({});
    }
  }, [filtersString, enableUrlParams]);

  useEffect(() => {
    setFilters(defaultFilters || {});
  }, [JSON.stringify(defaultFilters)]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters]);

  // Create internal fetch function for custom API
  const internalFetchFunction = useMemo(() => {
    if (fetchFunction) {
      return fetchFunction;
    }

    if (customAPI) {
      return async (params: FetchParams): Promise<FetchResult<T>> => {
        try {
          // Prepare API call parameters
          const apiParams = {
            ...customAPI.params,
            ...params.filters,
            ...(params.searchTerm && customAPI.searchFields
              ? {
                  search_term: params.searchTerm,
                  search_fields: customAPI.searchFields,
                }
              : {}),
            ...(params.page !== undefined ? { page: params.page } : {}),
            ...(params.pageSize ? { page_size: params.pageSize } : {}),
            ...(params.orderBy ? { order_by: params.orderBy } : {}),
          };

          // Combine body data
          const apiBody = {
            ...customAPI.body,
            ...apiParams,
          };

          // Call the custom API method
          const response = await FrappeAPI.callMethod(
            customAPI.method,
            apiBody
          );

          // Handle different response formats
          let data: T[] = [];
          let totalCount = 0;
          let hasNextPage = false;

          if (Array.isArray(response)) {
            data = response;
            totalCount = response.length;
          } else if (response && typeof response === "object") {
            data = (response as any).data || (response as any).results || [];
            totalCount =
              (response as any).total_count ||
              (response as any).totalCount ||
              data.length;
            hasNextPage =
              (response as any).has_next_page ||
              (response as any).hasNextPage ||
              false;
          }

          return {
            data,
            totalCount,
            hasNextPage,
          };
        } catch (error) {
          console.error(`Error calling custom API ${customAPI.method}:`, error);
          throw error;
        }
      };
    }

    throw new Error("Either fetchFunction or customAPI must be provided");
  }, [fetchFunction, customAPI]);

  // Common query parameters
  const queryParams = useMemo(
    () => ({
      pageSize,
      searchTerm: debouncedSearchTerm,
      filters: { ...filters, ...queryParamsFilters },
      searchFields,
      orderBy,
    }),
    [
      pageSize,
      debouncedSearchTerm,
      filters,
      queryParamsFilters,
      searchFields,
      orderBy,
    ]
  );

  // Infinite query for infinite scroll
  const infiniteQueryResult = useInfiniteQuery({
    queryKey: [queryKey, "infinite", queryParams],
    queryFn: ({ pageParam = 0 }) =>
      internalFetchFunction({
        ...queryParams,
        page: pageParam,
      }),
    enabled: infiniteScroll && !isLoading,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasNextPage) {
        return pages.length;
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  // Traditional pagination query
  const paginationQueryResult = useQuery({
    queryKey: [queryKey, "pagination", queryParams, currentPage],
    queryFn: () =>
      internalFetchFunction({
        ...queryParams,
        page: currentPage - 1,
      }),
    enabled: !infiniteScroll && !isLoading,
  });

  // Refetch functionality
  const refetch = useCallback(() => {
    if (infiniteScroll) {
      infiniteQueryResult.refetch();
    } else {
      paginationQueryResult.refetch();
    }
    if (onRefetchComplete) {
      onRefetchComplete();
    }
  }, [
    infiniteScroll,
    infiniteQueryResult,
    paginationQueryResult,
    onRefetchComplete,
  ]);

  useEffect(() => {
    if (onRefetchAvailable) {
      onRefetchAvailable(refetch);
    }
  }, [onRefetchAvailable, refetch]);

  useEffect(() => {
    if (refetchTrigger) {
      refetch();
    }
  }, [refetchTrigger, refetch]);

  // Determine which query result to use
  const queryResult = infiniteScroll
    ? infiniteQueryResult
    : paginationQueryResult;

  // Process data based on query type
  const processedData = useMemo(() => {
    let data: T[] = [];

    if (infiniteScroll) {
      data = (infiniteQueryResult.data?.pages?.flatMap((page) => page.data) ||
        []) as T[];
    } else {
      data = (paginationQueryResult.data?.data || []) as T[];
    }

    return data;
  }, [infiniteScroll, infiniteQueryResult.data, paginationQueryResult.data]);

  useEffect(() => {
    if (onDataLoad) {
      onDataLoad(processedData);
    }
  }, [processedData, onDataLoad]);

  // Calculate pagination values for traditional pagination
  const totalCount = useMemo(() => {
    if (infiniteScroll) {
      return infiniteQueryResult.data?.pages[0]?.totalCount || 0;
    }
    return paginationQueryResult.data?.totalCount || 0;
  }, [infiniteScroll, infiniteQueryResult.data, paginationQueryResult.data]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (fieldname: string, value: any) => {
    setFilters((prev: Record<string, any>) => ({
      ...prev,
      [fieldname]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setQueryParamsFilters({});
    if (enableUrlParams) {
      const url = new URL(window.location.href);
      url.searchParams.delete("filters");
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    refetch();
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const loadMore = () => {
    if (
      infiniteQueryResult.hasNextPage &&
      !infiniteQueryResult.isFetchingNextPage
    ) {
      infiniteQueryResult.fetchNextPage();
    }
  };

  const getDefaultItemKey = (item: T, index: number): string => {
    return item.name || item.id?.toString() || `item-${index}`;
  };

  const renderPagination = () => {
    if (infiniteScroll) {
      return (
        <div>
          {infiniteQueryResult.hasNextPage ? (
            <div className="flex items-center justify-center px-4 py-6 bg-white border-gray-200">
              <button
                onClick={loadMore}
                disabled={infiniteQueryResult.isFetchingNextPage}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {infiniteQueryResult.isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing {startIndex + 1} to {endIndex} of {totalCount} results
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-2 text-gray-400 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border rounded-md ${
                  currentPage === pageNum
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-2 py-2 text-gray-400 bg-white border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderFilters = () => {
    if (!isFilter || !showFilters || filterFields.length === 0) return null;

    return (
      <>
        {/* Backdrop overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowFilters(false)}
        />
        {/* Action sheet */}
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          {/* Filters content */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {filterFields.map((field) => (
                <div key={field.fieldname}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  {field.fieldtype === "Select" ? (
                    <select
                      value={filters[field.fieldname] || ""}
                      onChange={(e) =>
                        handleFilterChange(field.fieldname, e.target.value)
                      }
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All {field.label}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.fieldtype === "Check" ? (
                    <input
                      type="checkbox"
                      checked={filters[field.fieldname] || false}
                      onChange={(e) =>
                        handleFilterChange(field.fieldname, e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  ) : field.fieldtype === "Date" ||
                    field.fieldtype === "Datetime" ? (
                    <input
                      type={
                        field.fieldtype === "Datetime"
                          ? "datetime-local"
                          : "date"
                      }
                      value={filters[field.fieldname] || ""}
                      onChange={(e) =>
                        handleFilterChange(field.fieldname, e.target.value)
                      }
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={filters[field.fieldname] || ""}
                      onChange={(e) =>
                        handleFilterChange(field.fieldname, e.target.value)
                      }
                      placeholder={`Filter by ${field.label}`}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Action buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              <button
                onClick={clearFilters}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  const isListLoading = queryResult.isLoading || isLoading;
  const error = queryResult.error;

  const isPermissionError = (error: Error): boolean => {
    return (
      error.message.includes("403") ||
      error.message.includes("permission") ||
      error.message.includes("unauthorized")
    );
  };

  return (
    <>
      {/* Header */}
      <div className="border-gray-200 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 w-full">
            {isSearch && (
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            )}
            {isFilter && filterFields.length > 0 && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  showFilters ? "bg-gray-100" : ""
                }`}
              >
                <Filter className="h-4 w-4" />
              </button>
            )}
            {showRefreshButton && (
              <button
                onClick={refreshData}
                disabled={isListLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isListLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      <div className="min-h-full">
        {PreListComponent && (
          <PreListComponent
            data={processedData}
            isLoading={isListLoading as boolean}
            error={error}
            refetch={refetch}
            setCurrentPage={setCurrentPage}
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={pageSize}
            totalCount={totalCount}
          />
        )}
        {error ? (
          <div className="flex items-center justify-center py-12">
            <div className="max-w-md mx-auto text-center">
              {isPermissionError(error) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Shield className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Access Restricted
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {permissionErrorMessage || error.message}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={refreshData}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <RetryIcon className="h-4 w-4 mr-2" />
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Error Loading Data
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {error.message}
                    </p>
                    <button
                      onClick={refreshData}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RetryIcon className="h-4 w-4 mr-2" />
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : isListLoading && processedData.length === 0 ? (
          SkeletonComponent ? (
            Array.from({ length: 3 }).map((_, index) => (
              <SkeletonComponent key={index} />
            ))
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2 text-gray-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          )
        ) : processedData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500">No records found</span>
          </div>
        ) : (
          <div>
            {processedData.map((item, index) => {
              const itemKey = getItemKey
                ? getItemKey(item, index)
                : getDefaultItemKey(item, index);
              return (
                <div
                  key={itemKey}
                  onClick={() => onItemClick?.(item)}
                  className={`mb-2 md:mb-0 ${
                    onItemClick ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                >
                  <ItemComponent item={item} index={index} />
                </div>
              );
            })}
            {/* Loading indicator for fetching more data */}
            {queryResult.isFetching && processedData.length > 0 && (
              <div className="flex items-center justify-center py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading more...</span>
                </div>
              </div>
            )}
          </div>
        )}
        {PostListComponent && (
          <PostListComponent
            data={processedData}
            isLoading={isListLoading as boolean}
            error={error}
            refetch={refetch}
            setCurrentPage={setCurrentPage}
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={pageSize}
            totalCount={totalCount}
          />
        )}
      </div>

      {/* Pagination */}
      {showPagination &&
        !isListLoading &&
        !error &&
        processedData.length > 0 &&
        renderPagination()}
    </>
  );
};

export default DataListView;
