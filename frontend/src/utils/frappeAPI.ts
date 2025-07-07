import axios from 'axios';

// Base configuration for Frappe API calls
const API_BASE = window.location.origin;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Frappe-CSRF-Token': window.csrf_token
  }
});

// TypeScript interfaces
interface DoctypeField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
}

export interface DoctypeSchema {
  data: {
  fields: DoctypeField[];
  }
}

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 403) { 
      if (!error.config._retry) {
        error.config._retry = true;
        return apiClient.request(error.config);
      }
      
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Frappe specific API functions
export const FrappeAPI = {
  // Get a single document
  getDocument: async <T>(doctype: string, name: string, fields?: string[]): Promise<T> => {
    const fieldsQuery = fields ? `&fields=${JSON.stringify(fields)}` : '';
    const response = await apiClient.get(`/api/resource/${doctype}/${name}?${fieldsQuery}`);
    return response.data.data;
  },

  // Call a custom API method
  callMethod: async <T>(method: string, args: Record<string, any> = {}): Promise<T> => {
    const response = await apiClient.post(`/api/method/${method}`, args);
    return response.data.message;
  },

  getDoctypeSchema: async (doctype: string): Promise<DoctypeSchema> => {
    try {
      const response = await fetch(`/api/v2/doctype/${doctype}/meta`);
      
      // Handle non-ok responses first
      if (!response.ok) {
        await handleApiError(response, `doctype schema for ${doctype}`);
      }
      
      // Parse response JSON
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw a generic error
        throw new Error(`Failed to parse response from ${doctype} schema API`);
      }
      
      // Check for Frappe-specific error responses in the JSON
      if (result.error) {
        if (result.error.includes('permission') || result.error.includes('403')) {
          throw new PermissionError(
            `You don't have permission to access the ${doctype} doctype. Please contact your administrator for access.`,
            403
          );
        }
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to load doctype schema: ${errorMessage}`);
    }
  },
};

// Custom error class for permission errors
export class PermissionError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'PermissionError';
  }
}

// Error handler utility
export const handleApiError = async (response: Response, context: string): Promise<never> => {
  if (response.status === 403) {
    throw new PermissionError(
      `You don't have permission to access ${context}. Please contact your administrator for access.`,
      403
    );
  } else if (response.status === 401) {
    throw new Error('Your session has expired. Please refresh the page and try again.');
  } else if (response.status === 404) {
    throw new Error(`${context} not found.`);
  } else if (response.status >= 500) {
    throw new Error('Server error. Please try again later.');
  } else {
    // Try to parse error response, but don't fail if it's not JSON
    let errorMessage = `Failed to load ${context}. Please try again.`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (parseError) {
      // If we can't parse the response as JSON, use a generic message
      errorMessage = `Failed to load ${context} (Status: ${response.status}). Please try again.`;
    }
    throw new Error(errorMessage);
  }
};

export default FrappeAPI; 