import axios from 'axios';

// Base configuration for Frappe API calls
const API_BASE = window.location.origin;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// CSRF token cache
let csrfToken: string | null = null;

// Function to fetch CSRF token from Frappe
const fetchCSRFToken = async (): Promise<string | null> => {
  try {
    // Use a separate axios instance to avoid infinite recursion with interceptors
    const response = await axios.create({ baseURL: API_BASE }).get('/api/method/frappe.sessions.get_csrf_token');
    return response.data.message;
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error);
    return null;
  }
};

// Function to get CSRF token (with caching)
const getCSRFToken = async (): Promise<string | null> => {
  if (csrfToken) {
    return csrfToken;
  }

  // Try to get from meta tag first
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (metaToken) {
    csrfToken = metaToken;
    return csrfToken;
  }

  // Try to get from cookie
  const cookieToken = getCookie('csrf_token');
  if (cookieToken) {
    csrfToken = cookieToken;
    return csrfToken;
  }

  // Fetch from API as last resort
  csrfToken = await fetchCSRFToken();
  return csrfToken;
};

// Add request interceptor to include CSRF token
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await getCSRFToken();
    if (token) {
      config.headers['X-Frappe-CSRF-Token'] = token;
    }
  } catch (error) {
    console.warn('Could not set CSRF token:', error);
  }
  return config;
});

// Function to clear cached CSRF token
const clearCSRFToken = () => {
  csrfToken = null;
};

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 403) {
      console.warn('CSRF token may be invalid, clearing cache and retrying...');
      clearCSRFToken();
      
      // Try to retry the request once with a fresh token
      if (!error.config._retry) {
        error.config._retry = true;
        try {
          const token = await getCSRFToken();
          if (token) {
            error.config.headers['X-Frappe-CSRF-Token'] = token;
            return apiClient.request(error.config);
          }
        } catch (retryError) {
          console.error('Failed to retry request with fresh CSRF token:', retryError);
        }
      }
      
      console.error('Authentication error. Please login again.');
      // Optionally redirect to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Generic API request function
export const apiRequest = async <T>(config: any): Promise<T> => {
  const response = await apiClient.request(config);
  return response.data;
};

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

// Initialize CSRF token (call this on app startup)
export const initializeCSRF = async (): Promise<void> => {
  try {
    await getCSRFToken();
    console.log('CSRF token initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize CSRF token:', error);
  }
};

export default FrappeAPI; 