// services/frappeService.ts
import FrappeAPI from "../utils/frappeAPI";
import type {
  DoctypeSchema,
  GetDocumentsParams,
  FrappePageResponse,
  FilterOperator,
  DocumentItem,
  GetCountParams,
  GetCountResponse,
} from "../types/frappe";

type FilterCondition = [string, FilterOperator, unknown];

export const frappeService = {
  getDoctypeSchema: async (doctype: string): Promise<DoctypeSchema> => {
    try {
      console.log(`🔍 Fetching schema for doctype: ${doctype}`);
      const result = await FrappeAPI.getDocMeta(doctype);
      return { data: result };
    } catch (error) {
      console.error(`❌ Failed to load doctype schema for ${doctype}:`, error);
      throw error;
    }
  },

  getDocumentsPage: async ({
    doctype,
    pageParam = 0,
    pageSize,
    searchTerm,
    filters = {},
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
      });

      const apiFilters: FilterCondition[] = [];
      const orFilters: FilterCondition[] = [];

      // Build OR search filters
      if (searchTerm?.trim() && searchFields.length > 0) {
        for (const field of searchFields) {
          orFilters.push([field, "like", `%${searchTerm}%`]);
        }
      }

      // Build AND filters from object
      if (filters && Object.keys(filters).length > 0) {
        const filterArray: FilterCondition[] = Object.entries(filters)
          .filter(([, value]) => value !== "" && value != null)
          .map(([key, value]) => {
            if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string") {
              return [key, value[0] as FilterOperator, value[1]];
            }
            return [key, "=", value];
          });

        apiFilters.push(...filterArray);
      }

      console.log(`🔍 API Filters for ${doctype}:`, { apiFilters, orFilters });

      const result = await FrappeAPI.getDocumentList(doctype, {
        fields,
        filters: apiFilters.length > 0 ? apiFilters : undefined,
        orFilters: orFilters.length > 0 ? orFilters : undefined,
        limit: pageSize,
        limitStart: pageParam,
        orderBy: "modified desc",
      }) as { data: DocumentItem[]; totalCount?: number };

      const hasNextPage = result.data.length === pageSize;
      const nextCursor = hasNextPage ? pageParam + pageSize : undefined;

      return {
        data: result.data,
        totalCount: result.totalCount ?? result.data.length,
        hasNextPage,
        nextCursor,
        pages: [pageParam / pageSize + 1],
      };
    } catch (error) {
      console.error(`❌ Failed to load documents for ${doctype}:`, error);
      throw error;
    }
  },

  // Added getDocumentCount method
  getDocumentCount: async ({ doctype, searchTerm, filters }: GetCountParams): Promise<GetCountResponse> => {
    try {
      console.log(`🔢 Fetching count for doctype: ${doctype}`, { searchTerm, filters });
      const apiFilters: FilterCondition[] = filters || [];
      
      // Add search term as OR filters if provided
      const orFilters: FilterCondition[] = [];
      if (searchTerm?.trim()) {
        // Assuming searchFields are not provided in GetCountParams; adjust if needed
        orFilters.push(["name", "like", `%${searchTerm}%`]);
      }

      const result = await FrappeAPI.callMethod("frappe.client.get_count", {
        doctype,
        filters: apiFilters.length > 0 ? apiFilters : undefined,
        or_filters: orFilters.length > 0 ? orFilters : undefined,
      }) as { message: number };

      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch count for ${doctype}:`, error);
      throw error;
    }
  },
};