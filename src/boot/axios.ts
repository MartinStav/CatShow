import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance } from 'axios';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

const DEFAULT_API_URL = 'http://localhost:3333/api/v1';

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return fromEnv.trim();
  return DEFAULT_API_URL;
}

const api = axios.create({ baseURL: resolveApiBaseUrl() });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url as string | undefined;
    const isAuthRequest = requestUrl?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      const hadToken = localStorage.getItem('auth_token') !== null;
      if (hadToken) {
        localStorage.removeItem('auth_token');
        if (window.location.pathname !== '/' && window.location.pathname !== '') {
          window.location.href = '/';
        }
      }
    }
    if (
      error.response?.status === 403 &&
      (error.response?.data as { code?: string } | undefined)?.code === 'MUST_CHANGE_PASSWORD'
    ) {
      window.dispatchEvent(new Event('auth:must-change-password'));
    }
    return Promise.reject(error as Error);
  }
);

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
