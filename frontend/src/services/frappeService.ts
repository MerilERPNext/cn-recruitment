// services/frappeService.ts
import FrappeAPI from "../utils/frappeAPI";
import type {
  DoctypeSchema,
  GetDocumentsParams,
  FrappePageResponse,
  FilterOperator,
  DocumentItem,
  GetCountParams,
} from "../types/frappe";

type FilterCondition = [string, FilterOperator, unknown];

export const frappeService = {
  getDoctypeSchema: async (doctype: string): Promise<DoctypeSchema> => {
    try {
      const result = await FrappeAPI.getDocMeta(doctype);
      return { data: result };
    } catch (error) {
      console.error(`❌ Failed to load doctype schema for ${doctype}:`, error);
      throw error;
    }
  },

  getDocument: async (
    doctype: string,
    name: string,
    fields?: string[]
  ): Promise<unknown> => {
    try {
      const response = await FrappeAPI.getDocument(doctype, name, fields);
      return response;
    } catch (error) {
      console.error(`❌ Failed to load document for ${doctype}:`, error);
      throw error;
    }
  },
  getDocumentList: async (
    doctype: string,
    options?: Record<string, unknown>
  ): Promise<unknown> => {
    try {
      const response = await FrappeAPI.getDocumentList(doctype, options);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to load document for ${doctype}:`, error);
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
    orderBy,
  }: GetDocumentsParams): Promise<FrappePageResponse> => {
    try {

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
            if (
              Array.isArray(value) &&
              value.length === 2 &&
              typeof value[0] === "string"
            ) {
              return [key, value[0] as FilterOperator, value[1]];
            }
            return [key, "=", value];
          });

        apiFilters.push(...filterArray);
      }


      const result = (await FrappeAPI.getDocumentList(doctype, {
        fields,
        filters: apiFilters.length > 0 ? apiFilters : undefined,
        orFilters: orFilters.length > 0 ? orFilters : undefined,
        limit: pageSize,
        limitStart: pageParam,
        orderBy: orderBy,
      })) as { data: DocumentItem[]; totalCount?: number };

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
  getDocumentCount: async ({
    doctype,
    searchTerm,
    filters,
  }: GetCountParams): Promise<number> => {
    try {

      const apiFilters: FilterCondition[] = filters || [];

      // Add search term as OR filters if provided
      const orFilters: FilterCondition[] = [];
      if (searchTerm?.trim()) {
        // Assuming searchFields are not provided in GetCountParams; adjust if needed
        orFilters.push(["name", "like", `%${searchTerm}%`]);
      }

      const result = (await FrappeAPI.callMethod("frappe.client.get_count", {
        doctype,
        filters: apiFilters.length > 0 ? apiFilters : undefined,
        or_filters: orFilters.length > 0 ? orFilters : undefined,
      })) as number;

      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch count for ${doctype}:`, error);
      throw error;
    }
  },

  createDocument: async (
    doctype: string,
    data: Record<string, unknown>
  ): Promise<DocumentItem> => {
    try {
      const result = await FrappeAPI.createDocument(doctype, data);
      return result as DocumentItem;
    } catch (error) {
      console.error(`❌ Failed to create document in ${doctype}:`, error);
      throw error;
    }
  },

  updateDocument: async (
    doctype: string,
    name: string,
    data: Record<string, unknown>
  ): Promise<DocumentItem> => {
    try {
      const result = await FrappeAPI.updateDocument(doctype, name, data);
      return result as DocumentItem;
    } catch (error) {
      console.error(
        `❌ Failed to update document ${name} in ${doctype}:`,
        error
      );
      throw error;
    }
  },

  deleteDocument: async (doctype: string, name: string): Promise<void> => {
    try {
      await FrappeAPI.deleteDocument(doctype, name);
    } catch (error) {
      console.error(
        `❌ Failed to delete document ${name} from ${doctype}:`,
        error
      );
      throw error;
    }
  },

  callMethod: async (
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown> => {
    try {
      const result = await FrappeAPI.callMethod(method, params);
      return result;
    } catch (error) {
      console.error(`❌ Failed to call method ${method}:`, error);
      throw error;
    }
  },

  attachFileToDocument: async (
    file_url: string,
    doctype: string,
    docname: string
  ): Promise<unknown> => {
    try {
      const result = await FrappeAPI.attachFileToDocument(file_url, doctype, docname);
      return result;
    } catch (error) {
      console.error(`❌ Failed to attach file to ${doctype} ${docname}:`, error);
      throw error;
    }
  },
};
