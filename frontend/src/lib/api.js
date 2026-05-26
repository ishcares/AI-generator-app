import axios from 'axios';

// Get base URL and ensure it always ends with a trailing slash for subpath resolution
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const normalizedBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token and normalize relative URLs (strip leading slashes to preserve subpath)
api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/')) {
    config.url = config.url.substring(1);
  }
  
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response interceptor — normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
