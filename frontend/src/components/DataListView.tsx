/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  RepeatIcon as RetryIcon,
  Shield,
} from "lucide-react";
import { NoDataFound } from "./shared/atoms/NoDataFound";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import {
  useCustomApiInfiniteQuery,
  useCustomApiQuery,
} from "../hooks/useCustomApi";
import { useScreenSize } from "../hooks/useScreenSize";
import {
  customApiService,
  type CustomAPIConfig,
  type FetchParams,
} from "../services/customApiService";
import type { FrappePageResponse } from "../types/frappe";
import SearchInputWrapper from "./shared/SearchBar";
import { useCardTableSort } from "./shared/CardTableContext";

interface BaseItem {
  name?: string;
  id?: string | number;
  [key: string]: any;
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

export interface FilterOption {
  label: string;
  value: string | any[]; // Can be a simple string or complex array like ["in", ["Draft", "Approved"]]
  key?: string; // Optional key for matching when value is complex (e.g., "Approved")
  customAPIParams?: Record<string, any>; // Additional params to add to customAPI when this option is selected
  additionalFilters?: Record<string, any>; // Additional filters to merge into the filters object
  excludeFieldFromFilters?: boolean; // If true, the parent fieldname is removed from filters (only additionalFilters/customAPIParams apply)
}

export interface FilterField {
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
  // options?: string[];
  options?: (string | FilterOption)[];
  emptyValueConfig?: {
    filterValue?: any; // Value to use when empty/Select option is chosen
    customAPIParams?: Record<string, any>; // Additional params for empty state
  };
}

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
}

const DateInput = ({ value, onChange }: DateInputProps) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
    />
  );
};

interface DataListViewProps<T extends BaseItem> {
  queryKey: string | string[];
  fetchFunction?: (params: FetchParams) => Promise<FrappePageResponse>;
  customAPI?: CustomAPIConfig;
  ItemComponent?: React.ComponentType<{
    item: T;
    index?: number;
  }>;
  renderItem?: (item: T, index: number) => React.ReactNode;
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
  loadMorePagination?: boolean;
  permissionErrorMessage?: string;
  showRefreshButton?: boolean;
  onRefetchAvailable?: (refetch: () => void) => void;
  onDataLoad?: (data: T[]) => void;
  refetchTrigger?: boolean | number;
  onRefetchComplete?: () => void;
  orderBy?: string;
  showPagination?: boolean;
  filterFields?: FilterField[];
  getItemKey?: (item: T, index: number) => string;
  enableUrlParams?: boolean;
  onFiltersChange?: (filters: Record<string, any>) => void;
  onSearchChange?: (search: string) => void;
  clientFilterFn?: (data: T[]) => T[];
  clientSortFn?: (data: T[]) => T[];
  noRecordsScreen?:
  | React.ReactNode
  | ((filters: Record<string, any>) => React.ReactNode);
}

const DataListView = <T extends BaseItem>({
  queryKey,
  fetchFunction,
  customAPI,
  ItemComponent,
  renderItem,
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
  loadMorePagination = false,
  showRefreshButton = false,
  permissionErrorMessage,
  onRefetchAvailable,
  onDataLoad,
  refetchTrigger = false,
  onRefetchComplete,
  orderBy = "creation desc",
  showPagination = true,
  filterFields = [],
  getItemKey,
  enableUrlParams = true,
  onFiltersChange,
  onSearchChange,
  clientFilterFn,
  clientSortFn,
  noRecordsScreen,
}: DataListViewProps<T>) => {
  const { search } = useLocation();
  const queryParam = new URLSearchParams(search);
  const initialSearchQuery = enableUrlParams ? queryParam.get("q") || "" : "";

  const defaultFiltersString = useMemo(
    () => JSON.stringify(defaultFilters || {}),
    [defaultFilters],
  );

  const filtersString = enableUrlParams ? queryParam.get("filters") : null;
  const parsedUrlFilters = useMemo(() => {
    if (!enableUrlParams || !filtersString) return {};
    try {
      return JSON.parse(decodeURIComponent(filtersString));
    } catch (e) {
      console.error("Invalid filters JSON", e);
      return {};
    }
  }, [filtersString, enableUrlParams]);

  const initialFilters = useMemo(() => {
    return { ...(defaultFilters || {}), ...parsedUrlFilters };
  }, [defaultFiltersString, parsedUrlFilters]);

  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, any>>({});
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(initialSearchQuery);
  const [accumulatedData, setAccumulatedData] = useState<T[]>([]);
  const [loadMorePage, setLoadMorePage] = useState(1);
  const queryClient = useQueryClient();

  const { isDesktop } = useScreenSize();
  const maxVisiblePages = isDesktop ? 5 : 2;

  // Memoize stringified filters to avoid complex dependency
  const currentFiltersString = useMemo(
    () => JSON.stringify(debouncedFilters),
    [debouncedFilters],
  );

  const hasActiveFilters = useMemo(() => {
    const filterKeys = Object.keys(filters);

    // Check if any filter key exists and has a value
    const hasNonDefaultFilters = filterKeys.some(key => {
      const filterValue = filters[key];
      const defaultValue = defaultFilters[key];

      // If filter exists and is not empty/null
      if (filterValue !== undefined && filterValue !== null && filterValue !== "") {
        // Check if it's different from default
        if (JSON.stringify(filterValue) !== JSON.stringify(defaultValue)) {
          return true;
        }
      }
      return false;
    });

    // Also check if there are filters beyond default filters
    return filterKeys.length > 0 && hasNonDefaultFilters;
  }, [filters, defaultFilters]);

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(debouncedFilters);
    }
  }, [currentFiltersString, onFiltersChange]);

  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearchChange]);

  useEffect(() => {
    if (showFilters && !isFilterApplied) {
      setPendingFilters({ ...filters });
    }
  }, [showFilters]);

  useEffect(() => {
    if (!enableUrlParams) return;

    const merged = { ...(defaultFilters || {}), ...parsedUrlFilters };
    const mergedString = JSON.stringify(merged);

    setFilters((prev: Record<string, any>) => {
      if (JSON.stringify(prev) !== mergedString) return merged;
      return prev;
    });

    setDebouncedFilters((prev: Record<string, any>) => {
      if (JSON.stringify(prev) !== mergedString) return merged;
      return prev;
    });
  }, [parsedUrlFilters, defaultFiltersString, enableUrlParams]);


  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters((prev: Record<string, any>) => {
        if (JSON.stringify(prev) === JSON.stringify(filters)) return prev;
        return filters;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);


  const cardTableSort = useCardTableSort();

  // Derive server-side orderBy from CardTable sort context (overrides the prop when active)
  const contextOrderBy = useMemo(() => {
    if (!cardTableSort?.sortState) return null;
    const { field, direction } = cardTableSort.sortState;
    const colConfig = cardTableSort.columnSortConfig.find(
      (c) => c?.sortable && (c as { sortable: true; field: string }).field === field,
    ) as { orderByField?: string; field: string } | undefined;
    const serverField = colConfig?.orderByField ?? field;
    return `${serverField} ${direction}`;
  }, [cardTableSort]);

  // Reset to first page when search, filters, or sort changes
  useEffect(() => {
    setCurrentPage(1);
    if (loadMorePagination) {
      setLoadMorePage(1);
      setAccumulatedData([]);
    }
  }, [debouncedSearchTerm, currentFiltersString, contextOrderBy, loadMorePagination]);

  // Common query parameters
  const queryParams = useMemo(() => {
    let processedFilters: Record<string, any> = { ...debouncedFilters };

    // Process filter values based on filterFields configuration
    filterFields.forEach((field) => {
      const currentValue = processedFilters[field.fieldname];

      // Handle empty value case
      if (!currentValue || currentValue === "") {
        if (field.emptyValueConfig?.filterValue !== undefined) {
          processedFilters = {
            ...processedFilters,
            [field.fieldname]: field.emptyValueConfig.filterValue,
          };
        }
      } else {
        // Check if the current value matches a FilterOption
        const matchingOption = field.options?.find((opt) => {
          if (typeof opt === "string") {
            return opt === currentValue;
          }
          // For FilterOption objects, match using key (if provided) or value
          const matchKey = opt.key || opt.value;
          return matchKey === currentValue;
        });

        if (matchingOption && typeof matchingOption !== "string") {
          if (matchingOption.excludeFieldFromFilters) {
            // Remove the parent fieldname from filters, only apply additionalFilters
            delete processedFilters[field.fieldname];
            processedFilters = {
              ...processedFilters,
              ...(matchingOption.additionalFilters || {}),
            };
          } else {
            // Replace the filter value with the actual value (could be complex array)
            processedFilters = {
              ...processedFilters,
              [field.fieldname]: matchingOption.value,
              ...(matchingOption.additionalFilters || {}),
            };
          }
        }
      }
    });

    // Handle date range filters generically: any {field}_start / {field}_end pair
    // gets combined into {field}: ["between", [startValue, endValue]]
    const startKeys = Object.keys(processedFilters).filter((k) => k.endsWith("_start"));
    for (const startKey of startKeys) {
      const baseField = startKey.replace(/_start$/, "");
      const endKey = `${baseField}_end`;

      const startVal = processedFilters[startKey];
      const endVal = processedFilters[endKey];

      delete processedFilters[startKey];
      delete processedFilters[endKey];

      if (startVal || endVal) {
        processedFilters[baseField] = ["between", [
          startVal || "1900-01-01",
          endVal || "2099-12-31",
        ]];
      }
    }

    return {
      pageSize,
      searchTerm: debouncedSearchTerm,
      filters: processedFilters,
      searchFields,
      orderBy: contextOrderBy ?? orderBy,
    };
  }, [
    pageSize,
    debouncedSearchTerm,
    debouncedFilters,
    searchFields,
    orderBy,
    filterFields,
    contextOrderBy,
  ]);

  // Conditionally add/strip customAPI params based on active filters
  const effectiveCustomAPI = useMemo(() => {
    if (!customAPI) return customAPI;

    let additionalParams: Record<string, any> = {};

    // Process filter fields to find matching customAPIParams and auto-pass values
    filterFields.forEach((field) => {
      const currentValue = debouncedFilters?.[field.fieldname];

      // Handle empty value case
      if (!currentValue || currentValue === "") {
        if (field.emptyValueConfig?.customAPIParams) {
          additionalParams = { ...additionalParams, ...field.emptyValueConfig.customAPIParams };
        }
      } else {
        // Check if the current value matches a FilterOption
        const matchingOption = field.options?.find((opt) => {
          if (typeof opt === "string") {
            return opt === currentValue;
          }
          // For FilterOption objects, match using key (if provided) or value
          const matchKey = opt.key || opt.value;
          return matchKey === currentValue;
        });

        if (matchingOption && typeof matchingOption !== "string") {
          // Add customAPIParams from the option if they exist
          if (matchingOption.customAPIParams) {
            additionalParams = { ...additionalParams, ...matchingOption.customAPIParams };
          }
          // Also pass the filter value itself to customAPI if not excluded
          if (!matchingOption.excludeFieldFromFilters) {
            additionalParams[field.fieldname] = matchingOption.value;
          }
        } else {
          // If no matching option or it's just a string, pass the value directly
          additionalParams[field.fieldname] = currentValue;
        }
      }
    });

    // Merge additional params with existing customAPI params
    if (Object.keys(additionalParams).length > 0) {
      return {
        ...customAPI,
        params: { ...customAPI.params, ...additionalParams },
      };
    }

    return customAPI;
  }, [customAPI, debouncedFilters, filterFields]);

  // Create internal fetch function for custom API
  const internalFetchFunction = useMemo(() => {
    if (fetchFunction) {
      return fetchFunction;
    }

    if (effectiveCustomAPI) {
      return (params: FetchParams): Promise<FrappePageResponse> => {
        return customApiService.fetchData<T>(effectiveCustomAPI, params);
      };
    }

    throw new Error("Either fetchFunction or customAPI must be provided");
  }, [fetchFunction, effectiveCustomAPI]);

  // Infinite query for infinite scroll - always call both hooks but enable conditionally
  const customApiInfiniteResult = useCustomApiInfiniteQuery<T>({
    customAPI: effectiveCustomAPI || { method: "", params: {} },
    baseParams: {
      pageSize: queryParams.pageSize,
      searchTerm: queryParams.searchTerm,
      filters: queryParams.filters,
      searchFields: queryParams.searchFields,
      orderBy: queryParams.orderBy,
    },
    options: {
      enabled: infiniteScroll && !isLoading && !!effectiveCustomAPI,
      refetchOnWindowFocus: false,
    },
    queryKeyPrefix: queryKey,
  });

  const fetchFunctionInfiniteResult = useInfiniteQuery({
    queryKey: [queryKey, "infinite", queryParams],
    queryFn: ({ pageParam = 0 }) =>
      internalFetchFunction({
        ...queryParams,
        pageParam: pageParam as number,
      }),
    enabled:
      infiniteScroll && !isLoading && !!fetchFunction && !effectiveCustomAPI,
    getNextPageParam: (lastPage: FrappePageResponse) => lastPage.nextCursor,
    initialPageParam: 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const infiniteQueryResult = effectiveCustomAPI
    ? customApiInfiniteResult
    : fetchFunctionInfiniteResult;

  // Traditional pagination query - always call both hooks but enable conditionally
  const customApiPaginationResult = useCustomApiQuery<T>({
    customAPI: effectiveCustomAPI || { method: "", params: {} },
    params: {
      pageSize: queryParams.pageSize,
      searchTerm: queryParams.searchTerm,
      filters: queryParams.filters,
      searchFields: queryParams.searchFields,
      orderBy: queryParams.orderBy,
      pageParam: (currentPage - 1) * (queryParams.pageSize || 20),
    },
    options: {
      enabled:
        !infiniteScroll &&
        !loadMorePagination &&
        !isLoading &&
        !!effectiveCustomAPI,
      refetchOnWindowFocus: false,
    },
    queryKeyPrefix: queryKey,
  });

  const fetchFunctionPaginationResult = useQuery({
    queryKey: [queryKey, "pagination", queryParams, currentPage],
    queryFn: () =>
      internalFetchFunction({
        ...queryParams,
        pageParam: (currentPage - 1) * (queryParams.pageSize || 20),
      }),
    enabled:
      !infiniteScroll &&
      !loadMorePagination &&
      !isLoading &&
      !!fetchFunction &&
      !effectiveCustomAPI,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const paginationQueryResult = effectiveCustomAPI
    ? customApiPaginationResult
    : fetchFunctionPaginationResult;

  // Load more pagination query - always call both hooks but enable conditionally
  const customApiLoadMoreResult = useCustomApiQuery<T>({
    customAPI: effectiveCustomAPI || { method: "", params: {} },
    params: {
      pageSize: queryParams.pageSize,
      searchTerm: queryParams.searchTerm,
      filters: queryParams.filters,
      searchFields: queryParams.searchFields,
      orderBy: queryParams.orderBy,
      pageParam: (loadMorePage - 1) * (queryParams.pageSize || 20),
    },
    options: {
      enabled: loadMorePagination && !isLoading && !!effectiveCustomAPI,
      refetchOnWindowFocus: false,
    },
    queryKeyPrefix: queryKey,
  });

  const fetchFunctionLoadMoreResult = useQuery({
    queryKey: [queryKey, "loadMore", queryParams, loadMorePage],
    queryFn: () =>
      internalFetchFunction({
        ...queryParams,
        pageParam: (loadMorePage - 1) * (queryParams.pageSize || 20),
      }),
    enabled:
      loadMorePagination &&
      !isLoading &&
      !!fetchFunction &&
      !effectiveCustomAPI,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loadMoreQueryResult = effectiveCustomAPI
    ? customApiLoadMoreResult
    : fetchFunctionLoadMoreResult;

  // Refetch functionality
  const refetch = useCallback(async () => {
    if (loadMorePagination) {
      setLoadMorePage(1);
      setAccumulatedData([]);
    }
    // Instead of calling query-specific refetch(), we use queryClient.refetchQueries
    // which goes through our global interceptor for repeated background fetching.
    queryClient.refetchQueries({ queryKey: [queryKey].flat() });

    if (onRefetchComplete) {
      onRefetchComplete();
    }
  }, [
    loadMorePagination,
    queryKey,
    queryClient,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchTrigger]);

  // Determine which query result to use
  const queryResult = infiniteScroll
    ? infiniteQueryResult
    : loadMorePagination
      ? loadMoreQueryResult
      : paginationQueryResult;

  // Process data based on query type
  const processedData = useMemo(() => {
    let data: T[] = [];

    if (infiniteScroll) {
      // For infinite scroll, pages is an array of FrappePageResponse objects
      const pages = infiniteQueryResult.data?.pages;
      if (pages && Array.isArray(pages)) {
        data = pages.flatMap((page: any) => page.data || []) as T[];
      }
    } else if (loadMorePagination) {
      data = accumulatedData;
    } else {
      data = (paginationQueryResult.data?.data || []) as unknown as T[];
    }

    if (clientFilterFn) {
      data = clientFilterFn(data);
    }

    // clientSortFn is an escape hatch for cases where client-side sorting is needed
    if (clientSortFn) {
      data = clientSortFn(data);
    }
    return data;
  }, [
    infiniteScroll,
    loadMorePagination,
    infiniteQueryResult.data,
    paginationQueryResult.data,
    accumulatedData,
    clientFilterFn,
    clientSortFn,
  ]);

  // Handle accumulating data for load more pagination
  useEffect(() => {
    if (loadMorePagination && loadMoreQueryResult.data?.data) {
      const newData = loadMoreQueryResult.data.data as unknown as T[];
      if (loadMorePage === 1) {
        // For first page, always set the data
        setAccumulatedData(newData);
      } else {
        setAccumulatedData((prev: T[]) => {
          // Check if this data is already included to prevent duplicates
          const existingIds = new Set(
            prev.map((item) => item.name || item.id || JSON.stringify(item)),
          );
          const filteredNewData = newData.filter((item) => {
            const id = item.name || item.id || JSON.stringify(item);
            return !existingIds.has(id);
          });
          return filteredNewData.length > 0
            ? [...prev, ...filteredNewData]
            : prev;
        });
      }
    }
  }, [loadMorePagination, loadMoreQueryResult.data, loadMorePage]);

  // Initialize accumulated data with first page data when available
  useEffect(() => {
    if (
      loadMorePagination &&
      loadMorePage === 1 &&
      loadMoreQueryResult.data?.data &&
      accumulatedData.length === 0
    ) {
      const newData = loadMoreQueryResult.data.data as unknown as T[];
      setAccumulatedData(newData);
    }
  }, [
    loadMorePagination,
    loadMoreQueryResult.data,
    loadMorePage,
    accumulatedData.length,
  ]);

  useEffect(() => {
    if (onDataLoad) {
      onDataLoad(processedData);
    }
  }, [processedData, onDataLoad]);

  // Calculate pagination values for traditional pagination
  const totalCount = useMemo(() => {
    if (infiniteScroll) {
      const firstPage = infiniteQueryResult.data?.pages?.[0];
      return (firstPage as any)?.totalCount || 0;
    } else if (loadMorePagination) {
      return (loadMoreQueryResult.data as FrappePageResponse)?.totalCount || 0;
    }
    return (paginationQueryResult.data as FrappePageResponse)?.totalCount || 0;
  }, [
    infiniteScroll,
    loadMorePagination,
    infiniteQueryResult.data,
    paginationQueryResult.data,
    loadMoreQueryResult.data,
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (fieldname: string, value: any) => {
    setPendingFilters((prev: Record<string, any>) => {
      if (value === "") {
        const newFilters = { ...prev };
        if (defaultFilters && defaultFilters[fieldname] !== undefined) {
          newFilters[fieldname] = defaultFilters[fieldname];
        } else {
          delete newFilters[fieldname];
        }
        return newFilters;
      }
      return {
        ...prev,
        [fieldname]: value, // Store the key for matching
      };
    });
  };

  const applyPendingFilters = () => {
    setFilters(pendingFilters);
    setIsFilterApplied(true);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setPendingFilters({});
    setFilters(defaultFilters);
    setDebouncedFilters(defaultFilters);
    setIsFilterApplied(false);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    if (loadMorePagination) {
      setLoadMorePage(1);
      setAccumulatedData([]);
    }
    if (enableUrlParams) {
      const url = new URL(window.location.href);
      url.searchParams.delete("filters");
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    }
  };

  const clearFilters = () => {
    handleClearFilters();
  };

  const refreshData = () => {
    // Calling refetch() is sufficient as it triggers queryClient.refetchQueries,
    // which starts the background loop and forces an immediate data refresh.
    refetch();
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const loadMore = () => {
    if (infiniteScroll) {
      if (
        infiniteQueryResult.hasNextPage &&
        !infiniteQueryResult.isFetchingNextPage
      ) {
        infiniteQueryResult.fetchNextPage();
      }
    } else if (loadMorePagination) {
      const hasMoreData = accumulatedData.length < totalCount;
      if (hasMoreData && !loadMoreQueryResult.isFetching) {
        setLoadMorePage((prev: number) => prev + 1);
      }
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

    if (loadMorePagination) {
      const hasMoreData = accumulatedData.length < totalCount;
      return (
        <div>
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-700">
              <span>
                Showing {accumulatedData.length} of {totalCount} results
              </span>
            </div>
            {hasMoreData && (
              <button
                onClick={loadMore}
                disabled={loadMoreQueryResult.isFetching}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loadMoreQueryResult.isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            )}
          </div>
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
          {/* Calculate page range */}
          {(() => {
            let startPage = Math.max(
              1,
              currentPage - Math.floor(maxVisiblePages / 2),
            );

            let endPage = startPage + maxVisiblePages - 1;

            if (endPage > totalPages) {
              endPage = totalPages;
              startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            const pages = [];
            for (let i = startPage; i <= endPage; i++) {
              pages.push(i);
            }

            return pages.map((pageNum) => (
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
            ));
          })()}

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
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-[9999]"
          onClick={() => setShowFilters(false)}
        />

        {/* Right Side Drawer */}
        <div
          className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[10000]
        transform transition-transform duration-300 ease-in-out
        ${showFilters ? "translate-x-0" : "translate-x-full"}`}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Filters Content */}
          <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
            {filterFields.map((field) => (
              <div key={field.fieldname}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                </label>

                {field.fieldtype === "Select" ? (
                  <select
                    value={pendingFilters[field.fieldname] || ""}
                    onChange={(e) =>
                      handleFilterChange(field.fieldname, e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>

                    {field.options?.map((option) => {
                      if (typeof option === "string") {
                        return (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        );
                      }
                      // Use key for matching if provided, otherwise use value
                      const optionValue = option.key || (typeof option.value === "string" ? option.value : option.label);
                      return (
                        <option key={optionValue} value={optionValue}>
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                ) : field.fieldtype === "Check" ? (
                  <input
                    type="checkbox"
                    checked={pendingFilters[field.fieldname] || false}
                    onChange={(e) =>
                      handleFilterChange(field.fieldname, e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                ) : field.fieldtype === "Date" ? (
                  <DateInput
                    value={pendingFilters[field.fieldname] || ""}
                    onChange={(val) =>
                      handleFilterChange(field.fieldname, val)
                    }
                  />
                ) : (
                  <input
                    type="text"
                    value={pendingFilters[field.fieldname] || ""}
                    onChange={(e) =>
                      handleFilterChange(field.fieldname, e.target.value)
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 flex gap-3">
            <button
              onClick={clearFilters}
              className="flex-1 px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              onClick={applyPendingFilters}
              className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply
            </button>
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

  const emptyStateContent = useMemo(() => {
    const customScreen =
      typeof noRecordsScreen === "function"
        ? noRecordsScreen(debouncedFilters)
        : noRecordsScreen;

    return (
      customScreen ?? (
        <NoDataFound />
      )
    );
  }, [noRecordsScreen, debouncedFilters]);

  return (
    <div>
      {/* Header — sticky top, constrained to visible width */}
      <div
        className={`${isDesktop ? "sticky" : "static"} left-0 z-10 bg-white pb-2`}
        style={isDesktop ? { width: 'var(--card-table-visible-width, 100%)', top: 'var(--search-bar-offset, 0px)' } : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center w-full lg:border-b border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
            {isSearch && (
              <SearchInputWrapper
                searchTerm={searchTerm}
                handleSearch={handleSearch}
              />
            )}
            {isFilter && filterFields.length > 0 && (
              <div className="flex items-center">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="h-12 px-2 flex items-center text-red-500 hover:bg-red-50 transition border-l border-gray-300"
                    title="Clear all filters"
                  >
                    ✕
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-12 px-3 flex items-center border-l border-gray-300 hover:bg-gray-50 transition relative ${showFilters ? "bg-gray-100" : ""} ${hasActiveFilters ? "text-blue-600" : "text-gray-600"}`}
                >
                  <Filter className="h-4 w-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold"></span>
                    </span>
                  )}
                </button>
              </div>
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
            <SkeletonComponent />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2 text-gray-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          )
        ) : processedData.length === 0 ? (
          emptyStateContent
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
                  className={`mb-2 md:mb-0 ${onItemClick ? "cursor-pointer hover:bg-primary/20" : ""
                    }`}
                >
                  {ItemComponent ? (
                    <ItemComponent item={item} index={index} />
                  ) : renderItem ? (
                    renderItem(item, index)
                  ) : null}
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
      </div>

      {/* Sticky Footer — Actions & Pagination */}
      {!isListLoading &&
        !error &&
        processedData.length > 0 &&
        (PostListComponent || showPagination) && (
          <div
            className="lg:sticky bottom-0 left-0 z-20 bg-white shadow-[0_-4px_6px_-1px_rgb(0_0_0_/_0.05)]"
            style={{ width: 'var(--card-table-visible-width, 100%)' }}
          >
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
            {showPagination && renderPagination()}
          </div>
        )}
    </div>
  );
};

export default DataListView;
