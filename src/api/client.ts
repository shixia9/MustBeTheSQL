/**
 * Centralized API client for the frontend.
 * Provides consistent configuration for all API calls:
 * - Base URL prefix (/api/v1)
 * - Credentials (cookies) included for Sa-Token session management
 * - Error handling for auth failures (401 redirects to login)
 * - Type-safe response parsing
 *
 * Usage:
 *   import { api } from '../api/client';
 *   const data = await api.get('/user/info');
 *   const data = await api.post('/sql/execute', body);
 */

const BASE_URL = '/api/v1';

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ code: number; message: string; data: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',  // Always include cookies (Sa-Token)
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Session expired or invalid — clear local data and redirect to login
    localStorage.removeItem('user_key');
    window.location.href = '/';
    throw new Error('Session expired');
  }

  return res.json();
}

export const api = {
  get: <T = any>(path: string) =>
    apiFetch<T>(path, { method: 'GET' }),

  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  put: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  delete: <T = any>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};