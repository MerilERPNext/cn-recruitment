import axios, { AxiosRequestConfig } from "axios"
import { PermissionError } from "../types/interview"
import { FilterCondition } from "../types/frappe";

// Base configuration for Frappe API calls
const API_BASE = window.location.origin
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
}
declare global {
  interface Window {
    csrf_token: string;
  }
}

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Frappe-CSRF-Token": window.csrf_token, // ✅ Now TypeScript understands
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as CustomAxiosRequestConfig

    if (error.response?.status === 403) {
      if (!config._retry) {
        config._retry = true
        return apiClient.request(config)
      }
      throw new PermissionError(
        "You don't have permission to access this resource. Please contact your administrator.",
        403,
      )
    }

    if (error.response?.status === 401) {
      window.location.href = "/login"
      throw new Error("Your session has expired. Please refresh the page and try again.")
    }

    return Promise.reject(error)
  },
)

export const FrappeAPI = {
  getDocument: async (doctype: string, name: string, fields?: string[]): Promise<unknown> => {
    const fieldsQuery = fields ? `&fields=${JSON.stringify(fields)}` : ""
    const response = await apiClient.get(`/api/resource/${doctype}/${name}?${fieldsQuery}`)
    return response.data.data
  },
  

  getDocumentList: async (
    doctype: string,
    options: {
      fields?: string[];
      filters?: FilterCondition[]; // <- यहाँ ये टाइप होनी चाहिए
      orFilters?: FilterCondition[];
      limit?: number;
      limitStart?: number;
      orderBy?: string;
    } = {},
  ): Promise<{ data: unknown[]; totalCount?: number }> => {
    const params = new URLSearchParams()

    if (options.fields) params.append("fields", JSON.stringify(options.fields))
    if (options.filters) params.append("filters", JSON.stringify(options.filters))
    if (options.orFilters) params.append("or_filters", JSON.stringify(options.orFilters))
    if (options.limit) params.append("limit_page_length", options.limit.toString())
    if (options.limitStart) params.append("limit_start", options.limitStart.toString())
    if (options.orderBy) params.append("order_by", options.orderBy)

    const url = `/api/resource/${doctype}?${params.toString()}`

    const response = await apiClient.get(url)

    return {
      data: response.data.data,
      totalCount: response.data.total_count,
    }
  },

  callMethod: async (method: string, args: Record<string, unknown> = {}): Promise<unknown> => {
    const response = await apiClient.post(`/api/method/${method}`, args)
    return response.data.message
  },

  getDocMeta: async (doctype: string) => {
    const response = await apiClient.get(`/api/v2/doctype/${doctype}/meta`)
    return response.data.message
  },

  getDocumentCount: async (doctype: string, filters?: Record<string, unknown>): Promise<number> => {
    const response = await apiClient.get(
      `/api/method/frappe.client.get_count?doctype=${doctype}&filters=${JSON.stringify(filters || {})}`,
    )
    return response.data.message
  },
}

export default FrappeAPI
