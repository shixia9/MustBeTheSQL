const BASE_URL = '/api/v1';

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<{ code: number; message: string; data: T }> {
  const headers: Record<string, string> = options.headers
    ? { ...(options.headers as Record<string, string>) }
    : { 'Content-Type': 'application/json' };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401) {
    window.location.href = '/';
    throw new Error('Session expired');
  }

  return res.json();
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
