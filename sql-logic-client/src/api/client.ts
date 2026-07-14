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
 *
 * For file uploads (FormData) or SSE streaming, use apiFetch directly:
 *   import { apiFetch } from '../api/client';
 *   const res = await apiFetch('/user/uploadAvatar', { method: 'POST', body: formData });
 *   // Note: for FormData, clear Content-Type to let the browser set it:
 *   const res = await apiFetch('/user/uploadAvatar', {
 *     method: 'POST',
 *     body: formData,
 *     headers: {}  // override default Content-Type
 *   });
 */

const BASE_URL = '/api/v1';

interface WorkspaceMeta {
  id: number; name: string; description?: string; ownerId: number;
  role: 'OWNER'|'ADMIN'|'MEMBER'|'VIEWER'; memberCount: number;
}
interface WorkspaceMemberMeta {
  id: number; workspaceId: number; userId: number; role: string; createTime: string;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ code: number; message: string; data: T }> {
  // If the caller explicitly sets headers (possibly to override Content-Type),
  // respect their headers. Otherwise default to JSON content type.
  const hasExplicitHeaders = options.headers !== undefined;
  const headers: Record<string, string> = hasExplicitHeaders
    ? { ...(options.headers as Record<string, string>) }
    : { 'Content-Type': 'application/json' };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',  // Always include cookies (Sa-Token)
    headers,
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

interface InvitationMeta {
  id: number; workspaceId: number; workspaceName?: string; creatorId: number; creatorName?: string;
  token: string; role: string; expiresAt: string; maxUses: number | null; useCount: number;
  isActive: boolean; link?: string; createTime: string;
}

export const workspaceApi = {
  list: () =>
    api.get<WorkspaceMeta[]>('/workspaces'),
  create: (data: { name: string; description?: string }) =>
    api.post<WorkspaceMeta>('/workspaces', data),
  update: (id: number, data: { name: string; description?: string }) =>
    api.put<WorkspaceMeta>(`/workspaces/${id}`, data),
  delete: (id: number) =>
    api.delete<void>(`/workspaces/${id}`),
  listMembers: (id: number) =>
    api.get<WorkspaceMemberMeta[]>(`/workspaces/${id}/members`),
  addMember: (id: number, data: { userId: number; role: string }) =>
    api.post<void>(`/workspaces/${id}/members`, data),
  updateMember: (id: number, memberUserId: number, data: { role: string }) =>
    api.put<void>(`/workspaces/${id}/members/${memberUserId}`, data),
  removeMember: (id: number, memberUserId: number) =>
    api.delete<void>(`/workspaces/${id}/members/${memberUserId}`),
  createInvitation: (id: number, data: { role: string; expiresInHours: number }) =>
    api.post<InvitationMeta>(`/workspaces/${id}/invitations`, data),
  listInvitations: (id: number) =>
    api.get<InvitationMeta[]>(`/workspaces/${id}/invitations`),
  revokeInvitation: (id: number, invitationId: number) =>
    api.delete<void>(`/workspaces/${id}/invitations/${invitationId}`),
  getInvitationByToken: (token: string) =>
    api.get<InvitationMeta>(`/workspaces/invitations/${token}`),
  acceptInvitation: (token: string) =>
    api.post<void>(`/workspaces/invitations/${token}/accept`),
};

/** LLM provider test connection helper. */
export const llmConfigApi = {
  test: (configId: number) =>
    api.post<{ success: boolean; latencyMs: number; message?: string }>(`/llm-config/${configId}/test`, {}),
};

/** LLM HA strategy + metrics. */
export const llmStrategyApi = {
  updateStrategy: (configId: number, body: { strategyType: string; fallbackChain?: number[] }) =>
    api.put(`/llm-config/${configId}/strategy`, body),
  getMetrics: (configId: number) =>
    api.get<{ successRate?: number; avgLatencyMs?: number; circuitState?: string; totalRequests?: number }>(`/llm-config/${configId}/metrics`),
};

/** Agent Studio CRUD. */
export const agentEntityApi = {
  list: () => api.get<any[]>('/agent-entity/list'),
  get: (id: number) => api.get<any>(`/agent-entity/${id}`),
  create: (body: any) => api.post<any>('/agent-entity', body),
  update: (id: number, body: any) => api.put<any>(`/agent-entity/${id}`, body),
  setDefault: (id: number) => api.put<void>(`/agent-entity/${id}/default`, {}),
  delete: (id: number) => api.delete<void>(`/agent-entity/${id}`),
  /** Agent version management. */
  publish: (id: number) =>
    api.post<{ id: number; versionNumber: number; publishTime: string }>(`/agent-entity/${id}/publish`),
  listVersions: (id: number) =>
    api.get<any[]>(`/agent-entity/${id}/versions`),
  getVersionSnapshot: (id: number, versionId: number) =>
    api.get<string>(`/agent-entity/${id}/versions/${versionId}`),
  revertToVersion: (id: number, versionId: number) =>
    api.post<void>(`/agent-entity/${id}/versions/${versionId}/revert`),
  deleteVersion: (id: number, versionId: number) =>
    api.delete<void>(`/agent-entity/${id}/versions/${versionId}`),
};

/** Memory management + manual extraction trigger. */
export const memoryApi = {
  list: (type?: string) => api.get<any[]>(`/memory/list${type ? `?type=${type}` : ''}`),
  create: (body: { type: string; content: string; importance?: number; tags?: string[] }) =>
    api.post<any>('/memory', body),
  delete: (id: number) => api.delete<void>(`/memory/${id}`),
  extract: (body: { userInput: string; summary: string; threadId?: string }) =>
    api.post<void>('/memory/extract', body),
  counts: () => api.get<Record<string, number>>('/memory/counts'),
};

/** Tool discovery — list all registered tools from ToolRegistry. */
export const toolsApi = {
  list: () => api.get<any[]>('/tools'),
};

/** MCP server management CRUD + connect/disconnect/status. */
export const mcpServerApi = {
  list: () => api.get<any[]>('/mcp-servers'),
  create: (body: { name: string; transportType: string; endpoint: string; env?: Record<string, string> }) =>
    api.post<{ id: number; connected: boolean }>('/mcp-servers', body),
  delete: (id: number) => api.delete<void>(`/mcp-servers/${id}`),
  connect: (id: number) => api.post<{ connected: boolean }>(`/mcp-servers/${id}/connect`),
  disconnect: (id: number) => api.post<{ connected: boolean }>(`/mcp-servers/${id}/disconnect`),
  status: (id: number) => api.get<{ connected: boolean }>(`/mcp-servers/${id}/status`),
};

/** Conversation CRUD — proactive conversation creation before first chat message. */
export const conversationApi = {
  create: (title?: string, llmStrategyId?: number) =>
    api.post<any>('/conversations', { title: title || 'New Conversation', llmStrategyId: llmStrategyId || 1 }),
  list: (userId: number, page?: number, size?: number, keyword?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ page: String(page || 1), size: String(size || 20) });
    if (keyword) params.set('keyword', keyword);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return api.get<any>(`/conversations/user/${userId}?${params.toString()}`);
  },
  listSummaries: (userId: number, page?: number, size?: number, keyword?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ page: String(page || 1), size: String(size || 20) });
    if (keyword) params.set('keyword', keyword);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return api.get<any>(`/conversations/user/${userId}/summaries?${params.toString()}`);
  },
  getDetails: (conversationId: number) => api.get<any[]>(`/conversations/${conversationId}/details`),
  delete: (id: number) => api.delete<void>(`/conversations/${id}`),
};