import axios, { AxiosRequestConfig } from "axios";
import { PermissionError } from "../types/interview";
import { FilterCondition } from "../types/frappe";
import { refreshCsrfToken } from "./csrf";

// Base configuration for Frappe API calls
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

if (!API_BASE) {
  console.warn(
    "⚠️ API_BASE is empty! Please set VITE_API_BASE_URL in your .env file"
  );
}
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  // Opt out of the sticky X-Target-Employee-Id header for calls that already
  // name the employee they want (backends prefer the header over the payload).
  skipTargetEmployee?: boolean;
}
declare global {
  interface Window {
    csrf_token: string;
  }
}

// Module-level variable to track the target employee ID
let currentTargetEmployeeId: string | null = null;

// Setter function to be called by ViewedUserContext
export const setTargetEmployeeId = (employeeId: string | null) => {
  currentTargetEmployeeId = employeeId;
};

// Getter function for external access
export const getTargetEmployeeId = () => currentTargetEmployeeId;

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
    // ✅ Safe check for csrf_token
    "X-Frappe-CSRF-Token":
      typeof window !== "undefined" && window.csrf_token
        ? window.csrf_token
        : "",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    if (
      typeof window !== "undefined" &&
      window.csrf_token &&
      window.csrf_token !== "{{ csrf_token }}"
    ) {
      config.headers["X-Frappe-CSRF-Token"] = window.csrf_token;
    }

    // Inject target employee ID header if set
    if (
      currentTargetEmployeeId &&
      !(config as CustomAxiosRequestConfig).skipTargetEmployee
    ) {
      config.headers["X-Target-Employee-Id"] = currentTargetEmployeeId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as CustomAxiosRequestConfig;

    // Handle CSRF token refresh on 400 or 500 errors
    if (
      (error.response?.status === 400 || error.response?.status === 500) &&
      !config._retry
    ) {
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

    // Handle 417 Expectation Failed errors (typically from device ID setting issues)
    if (error.response?.status === 417) {
      console.warn(
        "🚨 API returned 417 Expectation Failed - this is typically due to device ID setting issues"
      );
      // Don't block the application, but log the warning
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
    if (options.limit !== undefined)
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

  getMethod: async (
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> => {
    const response = await apiClient.get(`/api/method/${method}`, { params });
    return response.data.message;
  },

  callMethod: async (
    method: string,
    args: Record<string, unknown> = {},
    options: { skipTargetEmployee?: boolean } = {}
  ): Promise<unknown> => {
    try {
      const response = await apiClient.post(`/api/method/${method}`, args, {
        skipTargetEmployee: options.skipTargetEmployee,
      } as CustomAxiosRequestConfig);
      return response.data.message;
    } catch (error) {
      // Log detailed error information for debugging
      console.error(`🚨 API method ${method} failed:`, error);

      // Handle 417 errors specifically for attendance-related methods
      if (error && typeof error === "object" && "response" in error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosError = error as any;
        if (axiosError.response?.status === 417) {
          console.warn(
            `⚠️ Method ${method} returned 417 Expectation Failed - likely device ID or attendance API issue`
          );

          // For read-only attendance/event methods, return empty data instead of throwing
          if (
            method.includes("get_events") ||
            method.includes("get_attendance") ||
            method.includes("device_id")
          ) {
            console.warn(
              `🔄 Returning empty result for ${method} due to 417 error`
            );
            return []; // Return empty array for attendance data
          }
        }
      }

      throw error;
    }
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
    _is_private = "1",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ file_url: string; name: string;[key: string]: any }> => {
    const formData = new FormData();
    formData.append("file", file, _file_name || file.name);
    formData.append("is_private", _is_private);
    if (_file_name) formData.append("file_name", _file_name);
    if (_doctype) formData.append("doctype", _doctype);
    if (_folder) formData.append("folder", _folder);
    if (_docname) formData.append("docname", _docname);

    const response = await apiClient.post(`/api/method/upload_file`, formData, {
      headers: { "Content-Type": "multipart/form-data" }, // IMPORTANT
    });

    return response.data.message;
  },

  attachFileToDocument: async (
    file_url: string,
    doctype: string,
    docname: string,
  ): Promise<unknown> => {
    const response = await apiClient.post(`/api/resource/File`, {
      file_url,
      attached_to_doctype: doctype,
      attached_to_name: docname,
    });
    return response.data.data;
  },
};

export default FrappeAPI;
export { apiClient };
