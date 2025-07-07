import React, { useState, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Loader2, Shield, RefreshCw as RetryIcon } from 'lucide-react';
import { DoctypeSchema, PermissionError, handleApiError } from '../utils/frappeAPI';

/**
 * FrappeListView Component
 * 
 * A comprehensive list view component for Frappe/ERPNext applications with built-in
 * permission error handling and graceful error recovery.
 * 
 * Features:
 * - Automatic 403 permission error detection and handling
 * - User-friendly error messages with retry options
 * - Infinite scroll or traditional pagination
 * - Search and filtering capabilities
 * - Customizable error messages
 * - Automatic retry logic (excluding permission errors)
 * 
 * Usage Example:
 * ```tsx
 * import FrappeListView from './ListView';
 * 
 * const MyComponent = () => {
 *   const JobItem = ({ item }) => (
 *     <div className="p-4 border rounded">
 *       <h3>{item.title}</h3>
 *       <p>{item.status}</p>
 *     </div>
 *   );
 * 
 *   return (
 *     <FrappeListView
 *       doctype="Job Opening"
 *       ItemComponent={JobItem}
 *       isSearch={true}
 *       isFilter={true}
 *       pageSize={20}
 *       searchFields={['title', 'description']}
 *       permissionErrorMessage="You don't have access to view job openings. Please contact HR for assistance."
 *       onItemClick={(item) => console.log('Clicked:', item)}
 *     />
 *   );
 * };
 * ```
 * 
 * Permission Error Handling:
 * - Automatically detects 403 errors from Frappe API
 * - Shows user-friendly permission error messages
 * - Provides retry and refresh options
 * - Does not retry permission errors (avoids unnecessary API calls)
 * - Supports custom permission error messages via permissionErrorMessage prop
 */




interface DocumentItem {
  name: string;
  title?: string;
  status?: string;
  modified: string;
  owner?: string;
  [key: string]: any;
}

interface GetDocumentsParams {
  doctype: string;
  pageParam?: number;
  pageSize: number;
  searchTerm?: string;
  filters?: Record<string, any>;
  fields: string[];
  searchFields: string[];
}

interface GetDocumentsResponse {
  data: DocumentItem[];
  totalCount: number;
  hasNextPage: boolean;
  nextCursor?: number;
}

interface GetCountParams {
  doctype: string;
  searchTerm?: string;
  filters?: Record<string, any>;
}

interface GetCountResponse {
  message: number;
}





// Utility to check if error is permission-related
const isPermissionError = (error: unknown): error is PermissionError => {
  // Check if it's a PermissionError instance
  if (error instanceof PermissionError) {
    return true;
  }
  
  // Check if it's an Error with permission-related message
  if (error instanceof Error) {
    return error.message.includes('permission') || 
           error.message.includes('403') || 
           error.message.includes('Access Restricted');
  }
  
  // Check if it's a plain object (React Query might serialize errors)
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as any).message;
    return typeof message === 'string' && (
      message.includes('permission') || 
      message.includes('403') || 
      message.includes('Access Restricted')
    );
  }
  
  return false;
};

// Frappe API service functions
const frappeApi = {
  // Fetch doctype schema
  getDoctypeSchema: async (doctype: string): Promise<DoctypeSchema> => {
    try {
      const response = await fetch(`/api/v2/doctype/${doctype}/meta`);
      
      // Handle non-ok responses first
      if (!response.ok) {
        await handleApiError(response, `doctype schema for ${doctype}`);
      }
      
      // Parse response JSON
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw a generic error
        throw new Error(`Failed to parse response from ${doctype} schema API`);
      }
      
      // Check for Frappe-specific error responses in the JSON
      if (result.error) {
        if (result.error.includes('permission') || result.error.includes('403')) {
          throw new PermissionError(
            `You don't have permission to access the ${doctype} doctype. Please contact your administrator for access.`,
            403
          );
        }
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to load doctype schema: ${errorMessage}`);
    }
  },

  // Fetch documents with pagination
  getDocuments: async ({ doctype, pageParam = 0, pageSize, searchTerm, filters, fields, searchFields }: GetDocumentsParams): Promise<GetDocumentsResponse> => {
    try {
      const params = new URLSearchParams({
        limit_page_length: pageSize.toString(),
        limit_start: pageParam.toString(),
        fields: JSON.stringify(fields)
      });
      
      // Add search filters
      let apiFilters = [];
      let orFilters: any[] = [];
      if (searchTerm?.trim()) {
        if (searchFields.length > 0) {
          searchFields.forEach((field: string) => {
            orFilters.push([field, 'like', `%${searchTerm}%`]);
          });
        }
      }

      // Add custom filters
      if (filters && Object.keys(filters).length > 0) {
        const filterArray = Object.entries(filters)
          .filter(([_, value]) => value !== '' && value != null)
          .map(([key, value]) => {
            // If value is an array and matches [operator, operand], use as [key, operator, operand]
            if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string') {
              return [key, value[0], value[1]];
            }
            // If value is a primitive, use '='
            return [key, '=', value];
          });
        apiFilters.push(...filterArray);
      }

      if (apiFilters.length > 0) {
        params.append('filters', JSON.stringify(apiFilters));
      }
      if (orFilters.length > 0) {
        params.append('or_filters', JSON.stringify(orFilters));
      }

      const response = await fetch(`/api/resource/${doctype}?${params}`);
      
      // Handle non-ok responses first
      if (!response.ok) {
        await handleApiError(response, `${doctype} documents`);
      }
      
      // Parse response JSON
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw a generic error
        throw new Error(`Failed to parse response from ${doctype} API`);
      }
      
      // Check for Frappe-specific error responses in the JSON
      if (result.error) {
        if (result.error.includes('permission') || result.error.includes('403')) {
          throw new PermissionError(
            `You don't have permission to access ${doctype} documents. Please contact your administrator for access.`,
            403
          );
        }
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to load documents: ${errorMessage}`);
    }
  },

  // Get total count for traditional pagination
  getDocumentCount: async ({ doctype, filters }: GetCountParams): Promise<GetCountResponse> => {
    try {
      const response = await fetch(`/api/method/frappe.client.get_count?doctype=${doctype}&filters=${JSON.stringify(filters)}`);
      
      // Handle non-ok responses first
      if (!response.ok) {
        await handleApiError(response, `document count for ${doctype}`);
      }
      
      // Parse response JSON
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw a generic error
        throw new Error(`Failed to parse response from ${doctype} count API`);
      }
      
      // Check for Frappe-specific error responses in the JSON
      if (result.error) {
        if (result.error.includes('permission') || result.error.includes('403')) {
          throw new PermissionError(
            `You don't have permission to access ${doctype} documents. Please contact your administrator for access.`,
            403
          );
        }
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get document count: ${errorMessage}`);
    }
  }
};

interface FrappeListViewProps {
  doctype: string;
  ItemComponent: React.ComponentType<any>;
  isSearch?: boolean;
  isFilter?: boolean;
  pageSize?: number;
  defaultFilters?: Record<string, any>;
  defaultFields?: string[];
  searchFields?: string[];
  onItemClick?: (item: any) => void;
  infiniteScroll?: boolean;
  permissionErrorMessage?: string;
}

const FrappeListView: React.FC<FrappeListViewProps> = ({ 
  doctype, 
  ItemComponent, 
  isSearch = !true, 
  isFilter = !true, 
  pageSize = 20,
  defaultFilters = {},
  defaultFields = ['name', 'modified'],
  searchFields = [],
  onItemClick = null,
  infiniteScroll = false, // Toggle between infinite scroll and traditional pagination
  permissionErrorMessage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const queryClient = useQueryClient();

  // Sync filters with defaultFilters prop
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

  // Query key for caching
  const queryKey = ['documents', doctype, debouncedSearchTerm, filters, defaultFields];

  // Fetch doctype schema
  const { 
    data: doctypeSchemaData, 
    isLoading: schemaLoading 
  } = useQuery({
    queryKey: ['doctype-schema', doctype],
    queryFn: () => frappeApi.getDoctypeSchema(doctype),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error instanceof PermissionError || isPermissionError(error)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const doctypeSchema = doctypeSchemaData?.data;

  // Infinite query for infinite scroll
  const infiniteQueryResult = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: number }) => 
      frappeApi.getDocuments({
        doctype,
        pageParam: pageParam || 0,
        pageSize,
        searchTerm: debouncedSearchTerm,
        filters,
        fields: defaultFields,
        searchFields
      }),
    getNextPageParam: (lastPage: GetDocumentsResponse) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: infiniteScroll,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error instanceof PermissionError || isPermissionError(error)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Traditional pagination query
  const paginationQueryResult = useQuery({
    queryKey: [...queryKey, currentPage],
    queryFn: () => 
      frappeApi.getDocuments({
        doctype,
        pageParam: (currentPage - 1) * pageSize,
        pageSize,
        searchTerm: debouncedSearchTerm,
        filters,
        fields: defaultFields,
        searchFields
      }),
    enabled: !infiniteScroll,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error instanceof PermissionError || isPermissionError(error)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Count query for traditional pagination
  const { data: countData } = useQuery({
    queryKey: ['document-count', doctype, filters],
    queryFn: () => frappeApi.getDocumentCount({
      doctype,
      searchTerm: debouncedSearchTerm,
      filters
    }),
    enabled: !infiniteScroll,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry permission errors
      if (error instanceof PermissionError || isPermissionError(error)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Determine which query result to use
  const queryResult = infiniteScroll ? infiniteQueryResult : paginationQueryResult;

  // Process data based on query type
  const processedData = useMemo(() => {
    if (infiniteScroll) {
      return infiniteQueryResult.data?.pages.flatMap(page => page.data) || [];
    } else {
        return paginationQueryResult.data?.data || [];
    }
  }, [infiniteScroll, infiniteQueryResult.data, paginationQueryResult.data]);

  // Calculate pagination values for traditional pagination
  const totalCount = infiniteScroll ? 
    (infiniteQueryResult.data?.pages[0]?.totalCount || 0) : 
    (countData?.message || 0);
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (fieldname: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [fieldname]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setDebouncedSearchTerm('');
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['documents', doctype] });
    queryClient.invalidateQueries({ queryKey: ['document-count', doctype] });
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const loadMore = () => {
    if (infiniteQueryResult.hasNextPage && !infiniteQueryResult.isFetchingNextPage) {
      infiniteQueryResult.fetchNextPage();
    }
  };

  const renderPagination = () => {
    if (infiniteScroll) {
      return (
        <div className="flex items-center justify-center px-4 py-6 bg-white border-gray-200">
          {infiniteQueryResult.hasNextPage ? (
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
                'Load More'
              )}
            </button>
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
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
      field => field.fieldtype === 'Select' || field.fieldtype === 'Link'
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Filters content */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {filterableFields?.map(field => (
                <div key={field.fieldname}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  {field.fieldtype === 'Select' ? (
                    <select
                      value={filters[field.fieldname] || ''}
                      onChange={(e) => handleFilterChange(field.fieldname, e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All {field.label}</option>
                      {field.options?.split('\n').map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={filters[field.fieldname] || ''}
                      onChange={(e) => handleFilterChange(field.fieldname, e.target.value)}
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

  const isLoading = queryResult.isLoading || schemaLoading;
  const error = queryResult.error;

  // Debug: Log error details
  if (error) {
    console.log('ListView error detected:', {
      error,
      errorType: error.constructor.name,
      isPermissionError: error instanceof PermissionError,
      message: error.message
    });
  }

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
            {isFilter && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  showFilters ? 'bg-gray-100' : ''
                }`}
              >
                <Filter className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      <div className="min-h-96">
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
                        onClick={() => window.location.href = '/login?redirect-to=' + window.location.pathname}
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
        ) : isLoading && processedData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2 text-gray-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500">No records found</span>
          </div>
        ) : (
          <div>
            {processedData.map((item, index) => (
              <div
                key={item.name || index}
                onClick={() => onItemClick?.(item)}
                className={`mb-2 ${
                  onItemClick ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
              >
                <ItemComponent item={item} doctype={doctype} />
              </div>
            ))}
            
            {/* Loading indicator for fetching more data */}
            {(queryResult.isFetching && processedData.length > 0) && (
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

      {/* Pagination */}
      {!isLoading && !error && processedData.length > 0 && renderPagination()}
    </>
  );
};

export default FrappeListView;