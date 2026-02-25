/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { UseInfiniteQueryResult, useQueryClient } from "@tanstack/react-query";
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
  SearchIcon,
} from "lucide-react";
import {
  useDoctypeSchema,
  useFrappeInfiniteQuery,
  useFrappeDocuments,
  useFrappeDocumentCount,
  isPermissionError,
} from "../hooks/useFrappeQuery";
import { useLocation } from "react-router";
import { FilterCondition, FrappePageResponse } from "../types/frappe";
import { mapFiltersToConditions } from "../utils/helperUtils";

interface BaseItem {
  name: string;
}

export interface PreListComponentProps {
  doctype: string;
  ListQuery: UseInfiniteQueryResult<FrappePageResponse, Error>;
  setCurrentPage: (page: number) => void;
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface PostListComponentProps {
  doctype: string;
  ListQuery: UseInfiniteQueryResult<FrappePageResponse, Error>;
  setCurrentPage: (page: number) => void;
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  totalCount: number;
}

type PageData = {
  totalCount: number;
  results: unknown[];
};

interface FrappeListViewProps<T extends BaseItem> {
  doctype: string;
  ItemComponent: React.ComponentType<{
    item: T;
    index?: number;
    doctype: string;
  }>;
  PreListComponent?: React.ComponentType<PreListComponentProps>;
  PostListComponent?: React.ComponentType<PostListComponentProps>;
  SkeletonComponent?: React.ComponentType;
  isSearch?: boolean;
  isFilter?: boolean;
  isLoading?: boolean;
  pageSize?: number;
  defaultFilters?: Record<string, string>;
  defaultFields?: string[];
  searchFields?: string[];
  onItemClick?: (item: T) => void;
  infiniteScroll?: boolean;
  permissionErrorMessage?: string;
  showRefereshButton?: boolean;
  onRefetchAvailable?: (refetch: () => void) => void;
  onDataLoad?: (data: T[]) => void;
  refetchTrigger?: boolean;
  onRefetchComplete?: () => void;
  orderBy?: string;
  showPagination?: boolean;
  layout?: "row" | "column";
  filter?: (item: T) => boolean;
}

const FrappeListView = <T extends BaseItem>({
  doctype,
  ItemComponent,
  isLoading,
  PreListComponent,
  PostListComponent,
  SkeletonComponent,
  isSearch = true,
  isFilter = false,
  pageSize = 20,
  defaultFilters = {},
  defaultFields = ["name", "modified"],
  searchFields = [],
  onItemClick,
  layout = "row",
  infiniteScroll = false,
  showRefereshButton = false,
  permissionErrorMessage,
  onRefetchAvailable,
  onDataLoad,
  refetchTrigger = false,
  onRefetchComplete,
  orderBy = "modified desc",
  showPagination = true,
  filter,
}: FrappeListViewProps<T>) => {
  const { search } = useLocation();
  const queryParam = new URLSearchParams(search);
  const initialSearchQuery = queryParam.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(initialSearchQuery);
  const queryClient = useQueryClient();

  const filtersString = queryParam.get("filters");
  const [queryParamsFilters, setQueryParamsFilters] = useState({});

  useEffect(() => {
    if (!filtersString) {
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
  }, [filtersString]);

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

  // Fetch doctype schema
  const { data: doctypeSchemaData, isLoading: schemaLoading } =
    useDoctypeSchema(doctype);
  const doctypeSchema = doctypeSchemaData?.data;

  // Common query parameters
  const queryParams = {
    doctype,
    pageSize,
    searchTerm: debouncedSearchTerm,
    filters: { ...filters, ...queryParamsFilters },
    fields: defaultFields,
    searchFields,
    orderBy,
  };

  // Infinite query for infinite scroll
  const infiniteQueryResult = useFrappeInfiniteQuery(queryParams, {
    enabled: infiniteScroll && !isLoading,
  });

  // Traditional pagination query
  const paginationQueryResult = useFrappeDocuments(
    {
      ...queryParams,
      pageParam: (currentPage - 1) * pageSize,
    },
    {
      enabled: !infiniteScroll && !isLoading,
    },
  );
  // Usage
  const combinedFilters: FilterCondition[] = [
    ...mapFiltersToConditions(filters || {}),
    ...mapFiltersToConditions(queryParamsFilters || {}),
  ];
  // Count query for traditional pagination
  const { data: countData } = useFrappeDocumentCount(
    {
      doctype,
      searchTerm: debouncedSearchTerm,
      filters: combinedFilters as FilterCondition[],
    },
    {
      enabled: !infiniteScroll,
    },
  );

  useEffect(() => {
    if (onRefetchAvailable) {
      onRefetchAvailable(() => {
        queryClient.invalidateQueries({ queryKey: ["documents-infinite"] });
      });
    }
  }, [onRefetchAvailable]);

  useEffect(() => {
    if (refetchTrigger) {
      refreshData();
    }
  }, [refetchTrigger]);

  // Determine which query result to use
  const queryResult = infiniteScroll
    ? infiniteQueryResult
    : paginationQueryResult;

  // Process data based on query type
  const processedData = useMemo(() => {
    let data: T[] = []; // Type as T[] instead of unknown[]

    if (infiniteScroll) {
      const pages = infiniteQueryResult.data?.pages as
        | { data: T[] }[]
        | undefined;
      data = pages?.flatMap((page) => page.data) || [];
    } else {
      data = (paginationQueryResult.data?.data as unknown as T[]) || [];
    }

    return data;
  }, [
    infiniteScroll,
    infiniteQueryResult.data,
    paginationQueryResult.data,
    doctype,
  ]);

  useEffect(() => {
    if (onDataLoad) {
      onDataLoad(processedData);
    }
  }, [processedData, onDataLoad]);

  // Calculate pagination values for traditional pagination
  const totalCount = infiniteScroll
    ? (infiniteQueryResult.data?.pages[0] as unknown as PageData)?.totalCount ||
    0
    : countData || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (fieldname: string, value: string) => {
    setFilters((prev: Record<string, string>) => ({
      ...prev,
      [fieldname]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setQueryParamsFilters({});
    const url = new URL(window.location.href);
    url.searchParams.delete("filters");
    window.history.replaceState({}, "", url);
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["documents", doctype] });
    queryClient.invalidateQueries({
      queryKey: ["documents-infinite", doctype],
    });
    queryClient.invalidateQueries({ queryKey: ["document-count", doctype] });
    if (onRefetchComplete) {
      onRefetchComplete();
    }
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

  const renderPagination = () => {
    if (infiniteScroll) {
      return (
        <div>
          {infiniteQueryResult.hasNextPage ? (
            <div className="flex items-center justify-center px-4 py-6">
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
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border rounded-md ${currentPage === pageNum
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
    if (!isFilter || !showFilters || !doctypeSchema) return null;

    const filterableFields = doctypeSchema?.fields?.filter(
      (field) => field.fieldtype === "Select" || field.fieldtype === "Link",
    );

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
              {filterableFields?.map((field) => (
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
                      {field.options?.split("\n").map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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

  const isListLoading = queryResult.isLoading || schemaLoading || isLoading;
  const error = queryResult.error;

  return (
    <>
      {/* Header */}
      <div className="border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 w-full">
            {isSearch && (
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            )}
            {isFilter && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters ? "bg-gray-100" : ""
                  }`}
              >
                <Filter className="h-4 w-4" />
              </button>
            )}
            {showRefereshButton && (
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
            doctype={doctype}
            ListQuery={infiniteQueryResult}
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
                      <button
                        onClick={() =>
                        (window.location.href =
                          "/login?redirect-to=" + window.location.pathname)
                        }
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Try Login Again
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
            <SkeletonComponent />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          )
        ) : processedData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500">No records found</span>
          </div>
        ) : (
          <div
            className={
              layout === "column"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
                : "flex flex-col"
            }
          >
            {processedData.map((item, index) => {
              if (filter && !filter(item)) {
                return null;
              }
              return (
                <div
                  key={item.name || `${doctype}-${index}`}
                  onClick={() => {
                    onItemClick?.(item); // Use optional chaining
                  }}
                  className={`mb-2 md:mb-0 ${onItemClick ? "cursor-pointer" : ""
                    }`}
                >
                  <ItemComponent item={item} index={index} doctype={doctype} />
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
            doctype={doctype}
            ListQuery={infiniteQueryResult}
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

interface BaseItemStatic {
  name?: string;
  id?: string | number;
  [key: string]: any;
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

interface StaticListViewProps<T extends BaseItemStatic> {
  data: T[];
  ItemComponent: (index: number, item: T, isLast: boolean) => React.ReactNode;
  PreListComponent?: React.ComponentType<any>;
  PostListComponent?: React.ComponentType<any>;
  SkeletonComponent?: React.ComponentType;

  isSearch?: boolean;
  isFilter?: boolean;
  isLoading?: boolean;

  pageSize?: number;
  loadMorePagination?: boolean;
  infiniteScroll?: boolean;

  filterFields?: FilterField[];
  searchFields?: string[];

  listTitle?: string;
  showRefreshButton?: boolean;

  onItemClick?: (item: T) => void;
  onRefresh?: () => void;

  getItemKey?: (item: T, index: number) => string;
}

export const StaticListView = <T extends BaseItemStatic>({
  data,
  ItemComponent,
  PreListComponent,
  PostListComponent,
  SkeletonComponent,

  isSearch = false,
  isFilter = false,
  pageSize = 20,

  searchFields = [],
  filterFields = [],

  infiniteScroll = false,
  loadMorePagination = false,

  isLoading = false,
  onItemClick,
  showRefreshButton = false,
  onRefresh,
  getItemKey,
}: StaticListViewProps<T>) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Create a stable key for each item (used for dedupe)
  const itemKeyForDedupe = (item: T, index: number) =>
    getItemKey ? getItemKey(item, index) : (item.id ?? item.name ?? `idx_${index}`).toString();

  // Deduplicate incoming data (prevents parent mistakes from showing duplicates)
  const dedupedData = useMemo(() => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (let i = 0; i < data.length; i++) {
      const k = itemKeyForDedupe(data[i], i) ?? JSON.stringify(data[i]);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(data[i]);
      }
    }
    return out;
    // include getItemKey intentionally (if provided it affects dedupe)
  }, [data, getItemKey]);

  // Filtering
  const filteredData = useMemo(() => {
    let result = [...dedupedData];

    // Search filter
    if (debouncedSearch && searchFields.length > 0) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) =>
          (item as any)[field]?.toString().toLowerCase().includes(s)
        )
      );
    }

    // Custom filters
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== "" && val !== undefined && val !== null) {
        result = result.filter((item) => {
          const v = (item as any)[key];
          if (typeof val === "boolean") return v === val;
          return v?.toString() === val.toString();
        });
      }
    });

    return result;
  }, [dedupedData, debouncedSearch, filters, searchFields]);

  // Reset page when data/search/filters change to avoid showing old pages
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, JSON.stringify(filters), dedupedData, pageSize]);

  // Pagination output
  const paginatedData = useMemo(() => {
    // If parent is handling server side pagination (i.e. parent passes only the page)
    // you'd want to disable client-side slicing. This component currently assumes
    // client-side pagination by default. If using server-side, pass the full
    // paginated result as `data` and set pageSize to a large number or set a prop
    // to indicate server-side mode. For general safety we just slice here:
    if (infiniteScroll || loadMorePagination) {
      return filteredData.slice(0, currentPage * pageSize);
    }

    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize, infiniteScroll, loadMorePagination]);

  // Sentinel ref for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (!infiniteScroll) return;

    const node = sentinelRef.current;
    if (!node) return;

    // If an observer already exists, disconnect it before creating a new one
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentPage((p) => p + 1);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observerRef.current.observe(node);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
    // we intentionally depend on the node reference and infiniteScroll
  }, [infiniteScroll, /* sentinelRef is stable */]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const renderPagination = () =>
    infiniteScroll ? null : loadMorePagination ? (
      paginatedData.length < filteredData.length && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-4 py-2 text-sm border rounded-md bg-white hover:bg-gray-100"
          >
            Load More
          </button>
        </div>
      )
    ) : (
      <div className="flex justify-between items-center p-4">
        <span className="text-sm text-gray-600">
          Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{" "}
          {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
        </span>

        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
            {/* ChevronLeft */}
            ‹
          </button>

          <span className="text-sm">{currentPage}</span>

          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            {/* ChevronRight */}
            ›
          </button>
        </div>
      </div>
    );

  return (
    <div>
      {/* HEADER */}
      <div className="flex gap-2 mb-3">
        {isSearch && (
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {isFilter && filterFields.length > 0 && (
          <button onClick={() => setShowFilters(true)} className="px-3 py-2 border rounded-md bg-white">
            {/* Filter icon */}
            Filters
          </button>
        )}

        {showRefreshButton && (
          <button disabled={isLoading} onClick={() => onRefresh?.()} className="px-3 py-2 border rounded-md bg-white">
            {/* Refresh icon */}
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        )}
      </div>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="p-4 rounded-md border bg-gray-50 mb-4">
          {filterFields.map((f) => (
            <div key={f.fieldname} className="mb-3">
              <label className="block text-sm mb-1">{f.label}</label>

              {f.fieldtype === "Select" ? (
                <select
                  value={filters[f.fieldname] || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, [f.fieldname]: e.target.value }))}
                  className="w-full border px-3 py-2 rounded-md"
                >
                  <option value="">All</option>
                  {f.options?.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={filters[f.fieldname] || ""}
                  onChange={(e) => setFilters((p) => ({ ...p, [f.fieldname]: e.target.value }))}
                  className="w-full border px-3 py-2 rounded-md"
                />
              )}
            </div>
          ))}

          <button onClick={() => setShowFilters(false)} className="w-full py-2 bg-blue-600 text-white rounded-md">
            Apply Filters
          </button>
        </div>
      )}

      {/* PRE-LIST */}
      {PreListComponent && (
        <PreListComponent
          data={paginatedData}
          filteredData={filteredData}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}

      {/* LIST */}
      {isLoading ? (
        SkeletonComponent ? (
          <SkeletonComponent />
        ) : (
          <div className="flex justify-center py-8">Loading…</div>
        )
      ) : paginatedData.length === 0 ? (
        <div className="py-12 text-center text-gray-500">No items found</div>
      ) : (
        <>
          {paginatedData.map((item, index) => {
            // compute isLast relative to the currently rendered list
            const isLast = index === paginatedData.length - 1;
            const key =
              getItemKey?.(item, index) ??
              (item.id ?? item.name ?? `item-${JSON.stringify(item).slice(0, 50)}-${index}`);

            return (
              <div key={key} onClick={() => onItemClick?.(item)} className={onItemClick ? "cursor-pointer" : ""}>
                {ItemComponent(index, item, isLast)}
              </div>
            );
          })}

          {infiniteScroll && <div id="static-listview-sentinel" ref={sentinelRef} />}
        </>
      )}

      {/* POST-LIST */}
      {PostListComponent && (
        <PostListComponent
          data={paginatedData}
          filteredData={filteredData}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      )}

      {/* PAGINATION */}
      {renderPagination()}
    </div>
  );
};


export default FrappeListView;
