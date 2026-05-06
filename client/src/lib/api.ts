import axios, { AxiosInstance, AxiosResponse } from "axios";

// Determine API base URL
const isProd = import.meta.env.PROD;
const baseURL = isProd 
  ? (import.meta.env.VITE_API_URL || "/api") 
  : "http://localhost:5000/api";

/**
 * Custom Axios instance that returns response.data directly via interceptors.
 * We cast it to any then back to a custom interface to satisfy TypeScript
 * that the return type of get/post/etc. is the data directly.
 */
const instance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for tokens
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for data extraction and error handling
instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    const message = error.response?.data?.error || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  }
);

// Force TypeScript to recognize that we return the data directly
interface ApiInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch'> {
  get<T = any, R = T, D = any>(url: string, config?: any): Promise<R>;
  post<T = any, R = T, D = any>(url: string, data?: D, config?: any): Promise<R>;
  put<T = any, R = T, D = any>(url: string, data?: D, config?: any): Promise<R>;
  delete<T = any, R = T, D = any>(url: string, config?: any): Promise<R>;
  patch<T = any, R = T, D = any>(url: string, data?: D, config?: any): Promise<R>;
}

const api = instance as unknown as ApiInstance;

export default api;
