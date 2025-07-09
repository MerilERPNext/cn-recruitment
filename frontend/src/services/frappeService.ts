/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI"
import type {
  DoctypeSchema,
  GetDocumentsParams,
  FrappePageResponse,
} from "../types/frappe"

export const frappeService = {
  getDoctypeSchema: async (doctype: string): Promise<DoctypeSchema> => {
    try {
      console.log(`🔍 Fetching schema for doctype: ${doctype}`)
      const result = await FrappeAPI.getDocMeta(doctype)
      return { data: result }
    } catch (error) {
      console.error(`❌ Failed to load doctype schema for ${doctype}:`, error)
      throw error
    }
  },

getDocumentsPage: async ({
    doctype,
    pageParam = 0,
    pageSize,
    searchTerm,
    filters,
    fields,
    searchFields,
  }: GetDocumentsParams): Promise<FrappePageResponse> => {
    try {
      console.log(`📄 Fetching page data for doctype: ${doctype}`, {
        pageParam,
        pageSize,
        searchTerm,
        filters,
        fields,
        searchFields,
      })
  
      // Build filters
      const apiFilters = []
      const orFilters: any[] = []
  
      if (searchTerm?.trim() && searchFields.length > 0) {
        searchFields.forEach((field: string) => {
          orFilters.push([field, "like", `%${searchTerm}%`])
        })
      }
  
      if (filters && Object.keys(filters).length > 0) {
        const filterArray = Object.entries(filters)
          .filter(([_, value]) => value !== "" && value != null)
          .map(([key, value]) => {
            if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string") {
              return [key, value[0], value[1]]
            }
            return [key, "=", value]
          })
        apiFilters.push(...filterArray)
      }
  
      console.log(`🔍 API Filters for ${doctype}:`, { apiFilters, orFilters })
  
      const result = await FrappeAPI.getDocumentList(doctype, {
        fields,
        filters: apiFilters.length > 0 ? apiFilters : undefined,
        orFilters: orFilters.length > 0 ? orFilters : undefined,
        limit: pageSize,
        limitStart: pageParam,
        orderBy: "modified desc",
      })
  
  
      const hasNextPage = result.data.length === pageSize
      const nextCursor = hasNextPage ? pageParam + pageSize : undefined
  
      const response: FrappePageResponse = {
        data: result.data,
        totalCount: result.totalCount || result.data.length,
        hasNextPage,
        nextCursor,
        pages: [pageParam / pageSize + 1], // ➕ Add this line to fix the error
      }
  
  
      return response
    } catch (error) {
      console.error(`❌ Failed to load documents for ${doctype}:`, error)
      throw error
    }
  }
}