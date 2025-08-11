import axios, { AxiosRequestConfig } from "axios";
import { PermissionError } from "../types/interview";
import { FilterCondition } from "../types/frappe";
import { refreshCsrfToken } from "./csrf";

// Base configuration for Frappe API calls
const API_BASE = window.location.origin;
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
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
    ...(import.meta.env.DEV
      ? {
          Authorization: "token " + import.meta.env.VITE_DEV_FRAPPE_API_TOKEN,
        }
      : {}),
    "X-Frappe-CSRF-Token": window.csrf_token, // ✅ Now TypeScript understands
  },
});

// Request interceptor to add CSRF token dynamically
apiClient.interceptors.request.use(
  async (config) => {
    if (
      typeof window !== "undefined" &&
      window.csrf_token &&
      window.csrf_token !== "{{ csrf_token }}"
    ) {
      config.headers["X-Frappe-CSRF-Token"] = window.csrf_token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as CustomAxiosRequestConfig;

    // Handle CSRF token refresh on 400 errors
    if (error.response?.status === 400 && !config._retry) {
      try {
        config._retry = true;
        const csrfToken = await refreshCsrfToken();

        // Update global CSRF token, ensuring csrfToken is a string
        if (csrfToken) {
          window.csrf_token = csrfToken;
          if (config.headers) {
            config.headers["X-Frappe-CSRF-Token"] = csrfToken;
          }
        }

        return apiClient.request(config);
      } catch (refreshError) {
        console.error("Failed to refresh CSRF token:", refreshError);
        throw refreshError;
      }
    }

    if (error.response?.status === 403) {
      if (!config._retry) {
        config._retry = true;
        return apiClient.request(config);
      }
      throw new PermissionError(
        "You don't have permission to access this resource. Please contact your administrator.",
        403
      );
    }

    if (error.response?.status === 401) {
      window.location.href = "/login";
      throw new Error(
        "Your session has expired. Please refresh the page and try again."
      );
    }

    return Promise.reject(error);
  }
);

export const FrappeAPI = {
  getDocument: async (
    doctype: string,
    name: string,
    fields?: string[]
  ): Promise<unknown> => {
    const fieldsQuery = fields ? `&fields=${JSON.stringify(fields)}` : "";
    const response = await apiClient.get(
      `/api/resource/${doctype}/${name}?${fieldsQuery}`
    );
    return response.data.data;
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
    } = {}
  ): Promise<{ data: unknown[]; totalCount?: number }> => {
    const params = new URLSearchParams();

    if (options.fields) params.append("fields", JSON.stringify(options.fields));
    if (options.filters)
      params.append("filters", JSON.stringify(options.filters));
    if (options.orFilters)
      params.append("or_filters", JSON.stringify(options.orFilters));
    if (options.limit)
      params.append("limit_page_length", options.limit.toString());
    if (options.limitStart)
      params.append("limit_start", options.limitStart.toString());
    if (options.orderBy) params.append("order_by", options.orderBy);

    const url = `/api/resource/${doctype}?${params.toString()}`;

    const response = await apiClient.get(url);

    return {
      data: response.data.data,
      totalCount: response.data.total_count,
    };
  },

  callMethod: async (
    method: string,
    args: Record<string, unknown> = {}
  ): Promise<unknown> => {
    const response = await apiClient.post(`/api/method/${method}`, args);
    return response.data.message;
  },

  getDocMeta: async (doctype: string) => {
    const response = await apiClient.get(`/api/v2/doctype/${doctype}/meta`);
    return response.data.message;
  },

  getDocumentCount: async (
    doctype: string,
    filters?: Record<string, unknown>
  ): Promise<number> => {
    const response = await apiClient.get(
      `/api/method/frappe.client.get_count?doctype=${doctype}&filters=${JSON.stringify(
        filters || {}
      )}`
    );
    return response.data.message;
  },

  updateDocument: async (
    doctype: string,
    name: string,
    data: Record<string, unknown>
  ): Promise<unknown> => {
    const response = await apiClient.put(
      `/api/resource/${doctype}/${name}`,
      data
    );
    return response.data.data;
  },

  createDocument: async (
    doctype: string,
    data: Record<string, unknown>
  ): Promise<unknown> => {
    const response = await apiClient.post(`/api/resource/${doctype}`, data);
    return response.data.data;
  },

  deleteDocument: async (doctype: string, name: string): Promise<unknown> => {
    const response = await apiClient.delete(`/api/resource/${doctype}/${name}`);
    return response.data.data;
  },

  uploadFile: async (
    file: File,
    _file_name?: string,
    _docname?: string,
    _doctype?: string,
    _folder?: string,
    _is_private?: string
  ): Promise<unknown> => {
    const formData = new FormData();
    formData.append("file", file);
    if (_file_name) formData.append("file_name", _file_name);
    if (_is_private) formData.append("is_private", _is_private);
    if (_doctype) formData.append("doctype", _doctype);
    if (_folder) formData.append("folder", _folder);
    if (_docname) formData.append("docname", _docname);
    const response = await apiClient.post(`/api/method/upload_file`, formData);
    return response.data.data;
  },
};

export default FrappeAPI;
