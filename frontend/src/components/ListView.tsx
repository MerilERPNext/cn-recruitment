import React, { useState, useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

// TypeScript interfaces
interface DoctypeField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
}

interface DoctypeSchema {
  data: {
  fields: DoctypeField[];
  }
}

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
  searchFields?: string[];
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
  count: number;
}

// Frappe API service functions
const frappeApi = {
  // Fetch doctype schema
  getDoctypeSchema: async (doctype: string): Promise<DoctypeSchema> => {
    // Replace with actual Frappe API call
    const response = await fetch(`/api/v2/doctype/${doctype}/meta`);
    return response.json();
    
    // Mock implementation
    // await new Promise(resolve => setTimeout(resolve, 300));
    // return {
    //   fields: [
    //     { fieldname: 'name', label: 'Name', fieldtype: 'Data' },
    //     { fieldname: 'title', label: 'Title', fieldtype: 'Data' },
    //     { fieldname: 'status', label: 'Status', fieldtype: 'Select', options: 'Draft\nActive\nInactive' },
    //     { fieldname: 'modified', label: 'Modified', fieldtype: 'Datetime' },
    //     { fieldname: 'owner', label: 'Owner', fieldtype: 'Link', options: 'User' }
    //   ]
    // };
  },

  // Fetch documents with pagination
  getDocuments: async ({ doctype, pageParam = 0, pageSize, searchTerm, filters, fields, searchFields }: GetDocumentsParams): Promise<GetDocumentsResponse> => {
    const params = new URLSearchParams({
      limit_page_length: pageSize.toString(),
      limit_start: pageParam.toString(),
      fields: JSON.stringify(fields)
    });

    // Add search filters
    let apiFilters = [];
    let orFilters: any[] = [];
    if (searchTerm?.trim()) {
    //   apiFilters.push(['name', 'like', `%${searchTerm}%`]);
    //   searchFields.forEach((field: string) => {
    //     apiFilters.push([field, 'like', `%${searchTerm}%`]);
    //   });

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
        .map(([key, value]) => [key, '=', value]);
      apiFilters.push(...filterArray);
    }

    if (apiFilters.length > 0) {
      params.append('filters', JSON.stringify(apiFilters));
    }
    if (orFilters.length > 0) {
      params.append('or_filters', JSON.stringify(orFilters));
    }


    // Replace with actual Frappe API call
    const response = await fetch(`/api/resource/${doctype}?${params}`);
    const result = await response.json();
    
    return result;

    // // Filter mock data based on search and filters
    // let filteredData = mockData;
    // if (searchTerm?.trim()) {
    //   filteredData = filteredData.filter(item => 
    //     item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //     (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase()))
    //   );
    // }

    // if (filters?.status) {
    //   filteredData = filteredData.filter(item => item.status === filters.status);
    // }

    // return {
    //   data: filteredData,
    //   totalCount: 50, // Mock total count
    //   hasNextPage: pageParam + pageSize < 50,
    //   nextCursor: pageParam + pageSize < 50 ? pageParam + pageSize : undefined
    // };
  },

  // Get total count for traditional pagination
  getDocumentCount: async ({ doctype, filters }: GetCountParams): Promise<GetCountResponse> => {
    // Replace with actual Frappe API call
    const response = await fetch(`/api/resource/${doctype}?count=true&filters=${JSON.stringify(filters)}`);
    return response.json();
    
    // await new Promise(resolve => setTimeout(resolve, 200));
    // return { count: 50 }; // Mock count
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
}

const FrappeListView: React.FC<FrappeListViewProps> = ({ 
  doctype, 
  ItemComponent, 
  isSearch = true, 
  isFilter = true, 
  pageSize = 20,
  defaultFilters = {},
  defaultFields = ['name', 'modified'],
  searchFields = [],
  onItemClick = null,
  infiniteScroll = false // Toggle between infinite scroll and traditional pagination
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const queryClient = useQueryClient();

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
    // cacheTime: 10 * 60 * 1000, // 10 minutes
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
        fields: defaultFields
      }),
    enabled: !infiniteScroll,
    // keepPreviousData: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    (countData?.count || 0);
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
        <div className="flex items-center justify-center px-4 py-6 bg-white border-t border-gray-200">
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
          ) : (
            <span className="text-sm text-gray-500">No more items to load</span>
          )}
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
    console.log(doctypeSchema);
    const filterableFields = doctypeSchema?.fields?.filter(
      field => field.fieldtype === 'Select' || field.fieldtype === 'Link'
    );

    return (
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filterableFields?.map(field => (
            <div key={field.fieldname}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {field.fieldtype === 'Select' ? (
                <select
                  value={filters[field.fieldname] || ''}
                  onChange={(e) => handleFilterChange(field.fieldname, e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All</option>
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  };

  const isLoading = queryResult.isLoading || schemaLoading;
  const error = queryResult.error;

  return (
    <>
      {/* Header */}
      <div className="border-gray-200 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {isSearch && (
              <div className="relative">
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
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading data: {error.message}</span>
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
// Example Item Component for demonstration
// const ExampleItemComponent: React.FC<{ item: DocumentItem; doctype: string }> = ({ item, doctype }) => (
//   <div className="px-4 py-3">
//     <div className="flex items-center justify-between">
//       <div className="flex-1 min-w-0">
//         <p className="text-sm font-medium text-gray-900 truncate">
//           {item.title || item.name}
//         </p>
//         <p className="text-sm text-gray-500 truncate">
//           {item.name}
//         </p>
//       </div>
//       <div className="flex items-center space-x-4 text-sm text-gray-500">
//         {item.status && (
//           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//             item.status === 'Active' ? 'bg-green-100 text-green-800' :
//             item.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
//             'bg-gray-100 text-gray-800'
//           }`}>
//             {item.status}
//           </span>
//         )}
//         <span>{new Date(item.modified).toLocaleDateString()}</span>
//       </div>
//     </div>
//   </div>
// );

// // Demo usage with React Query Provider
// export default function App() {
//   return (
//     <div className="p-6 max-w-6xl mx-auto space-y-8">
//       <h1 className="text-2xl font-bold">Frappe List View with React Query</h1>
      
//       <div>
//         <h2 className="text-lg font-semibold mb-4">Traditional Pagination</h2>
//         <FrappeListView
//           doctype="Task"
//           ItemComponent={ExampleItemComponent}
//           isSearch={true}
//           isFilter={true}
//           doctypeName="Tasks"
//           pageSize={10}
//           defaultFields={['name', 'title', 'status', 'modified', 'owner']}
//           onItemClick={(item) => console.log('Clicked item:', item)}
//           infiniteScroll={false}
//         />
//       </div>

//       <div>
//         <h2 className="text-lg font-semibold mb-4">Infinite Scroll</h2>
//         <FrappeListView
//           doctype="Customer"
//           ItemComponent={ExampleItemComponent}
//           isSearch={true}
//           isFilter={true}
//           doctypeName="Customers"
//           pageSize={10}
//           defaultFields={['name', 'title', 'status', 'modified', 'owner']}
//           onItemClick={(item) => console.log('Clicked item:', item)}
//           infiniteScroll={true}
//         />
//       </div>
//     </div>
//   );
// }