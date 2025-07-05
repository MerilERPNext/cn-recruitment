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

  // Get list of documents
  getDocumentList: async <T>(
    doctype: string, 
    options: {
      fields?: string[];
      filters?: Record<string, any>;
      limit?: number;
      orderBy?: string;
    } = {}
  ): Promise<T[]> => {
    const params = new URLSearchParams();
    
    if (options.fields) {
      params.append('fields', JSON.stringify(options.fields));
    }
    if (options.filters) {
      params.append('filters', JSON.stringify(options.filters));
    }
    if (options.limit) {
      params.append('limit_page_length', options.limit.toString());
    }
    if (options.orderBy) {
      params.append('order_by', options.orderBy);
    }

    const response = await apiClient.get(`/api/resource/${doctype}?${params.toString()}`);
    return response.data.data;
  },

  // Call a custom API method
  callMethod: async <T>(method: string, args: Record<string, any> = {}): Promise<T> => {
    const response = await apiClient.post(`/api/method/${method}`, args);
    return response.data.message;
  },

  // Get document schema/meta
  getDocMeta: async (doctype: string) => {
    const response = await apiClient.get(`/api/method/frappe.desk.form.meta.get_meta?doctype=${doctype}`);
    return response.data.message;
  }
};

export default FrappeAPI; 