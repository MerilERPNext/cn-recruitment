"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
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
} from "lucide-react"
import {
  useDoctypeSchema,
  useFrappeInfiniteQuery,
  useFrappeDocuments,
  useFrappeDocumentCount,
  isPermissionError,
} from "../hooks/useFrappeQuery"

interface BaseItem {
  name: string;
}

type PageData = {
  totalCount: number;
  results: unknown[];
};

interface FrappeListViewProps<T extends BaseItem> {
  doctype: string
  ItemComponent: React.ComponentType<{ item: T; index?: number; doctype: string }>
  isSearch?: boolean
  isFilter?: boolean
  pageSize?: number
  defaultFilters?: Record<string, string>
  defaultFields?: string[]
  searchFields?: string[]
  onItemClick?: (item: T) => void
  infiniteScroll?: boolean
  permissionErrorMessage?: string
}

const FrappeListView = <T extends BaseItem>({
  doctype,
  ItemComponent,
  isSearch = true,
  isFilter = false,
  pageSize = 20,
  defaultFilters = {},
  defaultFields = ["name", "modified"],
  searchFields = [],
  onItemClick, 
  infiniteScroll = false,
  permissionErrorMessage,
}: FrappeListViewProps<T>) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const queryClient = useQueryClient()

  // Console log component props
  console.log(`🎯 FrappeListView initialized for doctype: ${doctype}`, {
    pageSize,
    defaultFilters,
    defaultFields,
    searchFields,
    infiniteScroll,
  })

  useEffect(() => {
    setFilters(defaultFilters || {})
  }, [JSON.stringify(defaultFilters)])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, filters])

  // Fetch doctype schema
  const { data: doctypeSchemaData, isLoading: schemaLoading } = useDoctypeSchema(doctype)
  const doctypeSchema = doctypeSchemaData?.data

  // Log schema data
  useEffect(() => {
    if (doctypeSchemaData) {
      console.log(`📋 Schema loaded for ${doctype}:`, doctypeSchemaData)
      console.log(
        `🔍 Available fields for ${doctype}:`,
        doctypeSchemaData.data?.fields?.map((f) => f.fieldname),
      )
    }
  }, [doctypeSchemaData, doctype])

  // Common query parameters
  const queryParams = {
    doctype,
    pageSize,
    searchTerm: debouncedSearchTerm,
    filters,
    fields: defaultFields,
    searchFields,
  }

  console.log(`🔧 Query params for ${doctype}:`, queryParams)

  // Infinite query for infinite scroll
  const infiniteQueryResult = useFrappeInfiniteQuery(queryParams, {
    enabled: infiniteScroll,
  })

  // Traditional pagination query
  const paginationQueryResult = useFrappeDocuments(
    {
      ...queryParams,
      pageParam: (currentPage - 1) * pageSize,
    },
    {
      enabled: !infiniteScroll,
    },
  )

  // Count query for traditional pagination
  const { data: countData } = useFrappeDocumentCount(
    {
      doctype,
      searchTerm: debouncedSearchTerm,
      filters: Object.entries(filters).map(([key, value]) => [key, '=', value]),
    },
    {
      enabled: !infiniteScroll,
    },
  )

  // Log query results
  useEffect(() => {
    if (infiniteScroll && infiniteQueryResult.data) {
      console.log(`♾️ Infinite query data for ${doctype}:`, infiniteQueryResult.data)
      console.log(`📄 Total pages loaded for ${doctype}: ${infiniteQueryResult.data.pages.length}`)
      infiniteQueryResult.data.pages.forEach((page: number, index: number) => {
        console.log(`📄 Page ${index + 1} data for ${doctype}:`, page)
      })
    }
  }, [infiniteQueryResult.data, doctype, infiniteScroll])

  useEffect(() => {
    if (!infiniteScroll && paginationQueryResult.data) {
      console.log(`📋 Pagination query data for ${doctype}:`, paginationQueryResult.data)
    }
  }, [paginationQueryResult.data, doctype, infiniteScroll])

  useEffect(() => {
    if (countData) {
      console.log(`🔢 Count data for ${doctype}:`, countData)
    }
  }, [countData, doctype])

  // Determine which query result to use
  const queryResult = infiniteScroll ? infiniteQueryResult : paginationQueryResult

  // Process data based on query type
  const processedData = useMemo(() => {
    let data: T[] = []; // Type as T[] instead of unknown[]

    if (infiniteScroll) {
      const pages = infiniteQueryResult.data?.pages as { data: T[] }[] | undefined
      data = pages?.flatMap((page) => page.data) || []
      console.log(data, "gggggggggggggggg")
    } else {
      data = (paginationQueryResult.data?.data as unknown as T[]) || []
    }

    console.log(`📦 Processed data for ${doctype}:`, data)
    console.log(`📊 Total processed items for ${doctype}: ${data.length}`)

    if (data.length > 0) {
      console.log(`🔍 First item sample for ${doctype}:`, data[0])
      if (data.length > 1) {
        console.log(`🔍 Second item sample for ${doctype}:`, data[1])
      }
    }

    return data
  }, [infiniteScroll, infiniteQueryResult.data, paginationQueryResult.data, doctype])

  // Calculate pagination values for traditional pagination
  const totalCount = infiniteScroll
    ? (infiniteQueryResult.data?.pages[0] as unknown as PageData)?.totalCount || 0
    : countData?.message || 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCount)

  console.log(`📊 Pagination info for ${doctype}:`, {
    totalCount,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    pageSize,
  })

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`🔍 Search term changed for ${doctype}:`, e.target.value)
    setSearchTerm(e.target.value)
  }

  const handleFilterChange = (fieldname: string, value: string) => {
    console.log(`🔧 Filter changed for ${doctype}:`, { fieldname, value })
    setFilters((prev: Record<string, string>) => ({
      ...prev,
      [fieldname]: value,
    }))
  }

  const clearFilters = () => {
    console.log(`🧹 Clearing filters for ${doctype}`)
    setFilters({})
    setSearchTerm("")
    setDebouncedSearchTerm("")
  }

  const refreshData = () => {
    console.log(`🔄 Refreshing data for ${doctype}`)
    queryClient.invalidateQueries({ queryKey: ["documents", doctype] })
    queryClient.invalidateQueries({ queryKey: ["documents-infinite", doctype] })
    queryClient.invalidateQueries({ queryKey: ["document-count", doctype] })
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      console.log(`📄 Going to page ${page} for ${doctype}`)
      setCurrentPage(page)
    }
  }

  const loadMore = () => {
    if (infiniteQueryResult.hasNextPage && !infiniteQueryResult.isFetchingNextPage) {
      console.log(`⬇️ Loading more data for ${doctype}`)
      infiniteQueryResult.fetchNextPage()
    }
  }

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
                "Load More"
              )}
            </button>
          ) : null}
        </div>
      )
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
            let pageNum
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
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
            )
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
    )
  }

  const renderFilters = () => {
    if (!isFilter || !showFilters || !doctypeSchema) return null

    const filterableFields = doctypeSchema?.fields?.filter(
      (field) => field.fieldtype === "Select" || field.fieldtype === "Link",
    )

    return (
      <>
        {/* Backdrop overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowFilters(false)} />
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
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* Filters content */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {filterableFields?.map((field) => (
                <div key={field.fieldname}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                  {field.fieldtype === "Select" ? (
                    <select
                      value={filters[field.fieldname] || ""}
                      onChange={(e) => handleFilterChange(field.fieldname, e.target.value)}
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
    )
  }

  const isLoading = queryResult.isLoading || schemaLoading
  const error = queryResult.error

  // Log loading and error states
  useEffect(() => {
    console.log(`⏳ Loading state for ${doctype}:`, { isLoading, schemaLoading, queryLoading: queryResult.isLoading })
  }, [isLoading, schemaLoading, queryResult.isLoading, doctype])

  useEffect(() => {
    if (error) {
      console.error(`❌ Error for ${doctype}:`, error)
    }
  }, [error, doctype])

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
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters ? "bg-gray-100" : ""}`}
              >
                <Filter className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-sm text-gray-600 mb-4">{permissionErrorMessage || error.message}</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={refreshData}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <RetryIcon className="h-4 w-4 mr-2" />
                        Try Again
                      </button>
                      <button
                        onClick={() => (window.location.href = "/login?redirect-to=" + window.location.pathname)}
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
                    <p className="text-sm text-gray-600 mb-4">{error.message}</p>
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
            {processedData.map((item, index) => {
              if (index < 3) {
                console.log(`🎨 Rendering item ${index + 1} for ${doctype}:`, item)
              }
              return (
                <div
                  key={item.name || index}
                  onClick={() => {
                    console.log(`👆 Item clicked for ${doctype}:`, item)
                    onItemClick?.(item) // Use optional chaining
                  }}
                  className={`mb-2 ${onItemClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
                >
                  <ItemComponent item={item} index={index} doctype={doctype} />
                </div>
              )
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

      {/* Pagination */}
      {!isLoading && !error && processedData.length > 0 && renderPagination()}
    </>
  )
}

export default FrappeListView