import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// const API_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5000/api'; //local
const API_URL = import.meta.env.VITE_API_URL || 'https://finance-tracker-backend-production-1cb3.up.railway.app/api';

// Helper to ensure all paths are properly formatted
const normalizePath = (path: string): string => {
  // If path already starts with a slash, use it as is
  // Otherwise, prepend a slash
  return path.startsWith('/') ? path : `/${path}`;
};

const createApiClient = (): AxiosInstance => {
  const config: AxiosRequestConfig = {
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  console.log('API Client created with baseURL:', config.baseURL);

  const instance = axios.create(config);

  // Add request logging interceptor
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('financeTrackerToken');
      if (token && config.headers) {
        console.log('Adding token to request:', config.url, token.slice(0, 10) + '...');
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Log full request URL for debugging
      console.log('Full request URL:', `${config.baseURL}${config.url}`);
      
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        console.log('401 response for URL:', error.config.url, 'Skip redirect:', error.config.headers['X-Skip-Redirect']);
        // Log the error to identify the source
        console.log('401 error details:', error.response?.data, 'Config:', error.config);
        // Comment out clearing for testing
        /*
        if (error.config.url !== '/protected' && error.config.headers['X-Skip-Redirect'] !== 'true') {
          console.log('Clearing localStorage due to 401');
          localStorage.removeItem('financeTrackerToken');
          localStorage.removeItem('financeTrackerUser');
          window.location.href = '/login';
        }
        */
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const apiClient = createApiClient();

export const apiHelpers = {
  get: async <T>(url: string, params?: any): Promise<T> => {
    console.log('GET request:', url, 'Params:', params);
    const response = await apiClient.get<T>(normalizePath(url), { params });
    return response.data;
  },
  post: async <T>(url: string, data?: any): Promise<T> => {
    console.log('POST request:', url, 'Data:', data);
    const response = await apiClient.post<T>(normalizePath(url), data);
    return response.data;
  },
  put: async <T>(url: string, data?: any): Promise<T> => {
    console.log('PUT request:', url, 'Data:', data);
    const response = await apiClient.put<T>(normalizePath(url), data);
    return response.data;
  },
  delete: async <T>(url: string): Promise<T> => {
    console.log('DELETE request:', url);
    const response = await apiClient.delete<T>(normalizePath(url));
    return response.data;
  },
};