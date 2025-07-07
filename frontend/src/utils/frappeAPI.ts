/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import { PermissionError } from "../types/interview"

// Base configuration for Frappe API calls
const API_BASE = window.location.origin

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Frappe-CSRF-Token": (window as any).csrf_token,
  },
})

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403) {
      if (!error.config._retry) {
        error.config._retry = true
        return apiClient.request(error.config)
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

// Frappe specific API functions
export const FrappeAPI = {
  // Get a single document
  getDocument: async (doctype: string, name: string, fields?: string[]): Promise<any> => {
    const fieldsQuery = fields ? `&fields=${JSON.stringify(fields)}` : ""
    const response = await apiClient.get(`/api/resource/${doctype}/${name}?${fieldsQuery}`)
    return response.data.data
    
  },

  // Get list of documents
  getDocumentList: async (
    doctype: string,
    options: {
      fields?: string[]
      filters?: Record<string, any>
      orFilters?: any[]
      limit?: number
      limitStart?: number
      orderBy?: string
    } = {},
  ): Promise<{ data: any[]; totalCount?: number }> => {
    const params = new URLSearchParams()

    if (options.fields) {
      params.append("fields", JSON.stringify(options.fields))
    }
    if (options.filters) {
      params.append("filters", JSON.stringify(options.filters))
    }
    if (options.orFilters) {
      params.append("or_filters", JSON.stringify(options.orFilters))
    }
    if (options.limit) {
      params.append("limit_page_length", options.limit.toString())
    }
    if (options.limitStart) {
      params.append("limit_start", options.limitStart.toString())
    }
    if (options.orderBy) {
      params.append("order_by", options.orderBy)
    }

    const response = await apiClient.get(`/api/resource/${doctype}?${params.toString()}`)
    return {
      data: response.data.data,
      totalCount: response.data.total_count,
    }
  },

  // Call a custom API method
  callMethod: async (method: string, args: Record<string, any> = {}): Promise<any> => {
    const response = await apiClient.post(`/api/method/${method}`, args)
    return response.data.message
  },

  // Get document schema/meta
  getDocMeta: async (doctype: string) => {
    const response = await apiClient.get(`/api/method/frappe.desk.form.meta.get_meta?doctype=${doctype}`)
    return response.data.message
  },

  // Get document count
  getDocumentCount: async (doctype: string, filters?: Record<string, any>): Promise<number> => {
    const response = await apiClient.get(
      `/api/method/frappe.client.get_count?doctype=${doctype}&filters=${JSON.stringify(filters || {})}`,
    )
    return response.data.message
  },
}

export default FrappeAPI
