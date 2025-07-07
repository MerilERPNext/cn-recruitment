/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI"
import type {
  DoctypeSchema,
  GetDocumentsParams,
  GetDocumentsResponse,
  GetCountParams,
  GetCountResponse,
} from "../types/interview"

export const frappeService = {
  // Fetch doctype schema
  getDoctypeSchema: async (doctype: string): Promise<DoctypeSchema> => {
    try {
      const result = await FrappeAPI.getDocMeta(doctype)
      return { data: result }
    } catch (error) {
      console.error(`Failed to load doctype schema for ${doctype}:`, error)
      throw error
    }
  },

  // Fetch documents with pagination
  getDocuments: async ({
    doctype,
    pageParam = 0,
    pageSize,
    searchTerm,
    filters,
    fields,
    searchFields,
  }: GetDocumentsParams): Promise<GetDocumentsResponse> => {
    try {
      // Build filters
      const apiFilters = []
      const orFilters: any[] = []

      // Add search filters
      if (searchTerm?.trim() && searchFields.length > 0) {
        searchFields.forEach((field: string) => {
          orFilters.push([field, "like", `%${searchTerm}%`])
        })
      }

      // Add custom filters
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

      return {
        data: result.data,
        totalCount: result.totalCount || result.data.length,
        hasNextPage,
        nextCursor,
      }
    } catch (error) {
      console.error(`Failed to load documents for ${doctype}:`, error)
      throw error
    }
  },

  // Get total count for traditional pagination
  getDocumentCount: async ({ doctype, filters }: GetCountParams): Promise<GetCountResponse> => {
    try {
      const count = await FrappeAPI.getDocumentCount(doctype, filters)
      return { message: count }
    } catch (error) {
      console.error(`Failed to get document count for ${doctype}:`, error)
      throw error
    }
  },
}
