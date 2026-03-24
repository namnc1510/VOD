import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('movie_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('movie_token');
      // If we are not already on login, redirect
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function unwrap(response) {
  return response?.data?.data;
}

export function getApiErrorMessage(error, fallback = 'Request failed') {
  const status = error?.response?.status;
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (!error?.response) {
    return 'Network error. Please check backend connection.';
  }
  return error?.response?.data?.error?.message || fallback;
}

