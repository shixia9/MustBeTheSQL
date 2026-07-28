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
  list: async () => {
    const r = await api.get<any[]>('/llm-config/list');
    return unwrap<any[]>(r);
  },
  create: async (body: any) => {
    const r = await api.post<any>('/llm-config/create', body);
    return unwrap<any>(r);
  },
  update: async (configId: number, body: any) => {
    const r = await api.put<any>(`/llm-config/update`, { configId, ...body });
    return unwrap<any>(r);
  },
  delete: (configId: number) => api.delete<void>(`/llm-config/${configId}`),
  test: (configId: number) =>
    api.post<{ success: boolean; latencyMs: number; message?: string }>(`/llm-config/${configId}/test`, {}),
  setDefault: (configId: number) => api.post<void>(`/llm-config/${configId}/setDefault`, {}),
  getMetrics: async (configId: number) => {
    const r = await api.get<any>(`/llm-config/${configId}/metrics`);
    return unwrap<any>(r);
  },
};

/** Business knowledge (glossary + few-shot QA) CRUD scoped to a database connection. */
export interface BusinessKnowledgeItem {
  id: number;
  connectionId: number;
  vectorType: string; // GLOSSARY_KNOWLEDGE | QUESTION_KNOWLEDGE
  term?: string;
  description?: string;
  synonyms?: string;
  question?: string;
  answer?: string;
  status?: number;
  createTime?: string;
  updateTime?: string;
}
export const businessKnowledgeApi = {
  list: async (connectionId: number): Promise<BusinessKnowledgeItem[]> => {
    const r = await api.get<BusinessKnowledgeItem[]>(`/business-knowledge/list?connectionId=${connectionId}`);
    return unwrap<BusinessKnowledgeItem[]>(r);
  },
  create: (body: Partial<BusinessKnowledgeItem>) =>
    api.post<BusinessKnowledgeItem>('/business-knowledge/create', body),
  update: (body: Partial<BusinessKnowledgeItem> & { id: number }) =>
    api.put<BusinessKnowledgeItem>('/business-knowledge/update', body),
  delete: (knowledgeId: number) => api.delete<void>(`/business-knowledge/${knowledgeId}`),
};

/** Prompt template CRUD. */
export interface PromptTemplate {
  id: number;
  name: string;
  content: string;
  description?: string;
  status?: number;
  createTime?: string;
  updateTime?: string;
}
export const promptApi = {
  list: async (): Promise<PromptTemplate[]> => {
    const r = await api.get<PromptTemplate[]>('/prompts/list');
    return unwrap<PromptTemplate[]>(r);
  },
  create: (body: { name: string; content: string; description?: string }) =>
    api.post<PromptTemplate>('/prompts/create', body),
  update: (body: Partial<PromptTemplate> & { id: number }) =>
    api.put<PromptTemplate>('/prompts/update', body),
  delete: (id: number) => api.delete<void>(`/prompts/${id}`),
};

/** Connector templates + active connectors CRUD. */
export interface ConnectorTemplate {
  id: number;
  name: string;
  connectorType: string;
  config?: string;
  description?: string;
  status?: number;
  createTime?: string;
  updateTime?: string;
}
export interface ActiveConnector {
  id: number;
  templateId?: number;
  connectionId?: number;
  name: string;
  status?: number;
  createTime?: string;
  updateTime?: string;
}
export const connectorApi = {
  listTemplates: async (): Promise<ConnectorTemplate[]> => {
    const r = await api.get<ConnectorTemplate[]>('/connectors/templates');
    return unwrap<ConnectorTemplate[]>(r);
  },
  createTemplate: (body: { name: string; connectorType: string; config?: string; description?: string }) =>
    api.post<ConnectorTemplate>('/connectors/templates', body),
  updateTemplate: (body: Partial<ConnectorTemplate> & { id: number }) =>
    api.put<ConnectorTemplate>('/connectors/templates', body),
  deleteTemplate: (id: number) => api.delete<void>(`/connectors/templates/${id}`),
  listActive: async (): Promise<ActiveConnector[]> => {
    const r = await api.get<ActiveConnector[]>('/connectors/active');
    return unwrap<ActiveConnector[]>(r);
  },
  createActive: (body: { name: string; templateId?: number; connectionId?: number }) =>
    api.post<ActiveConnector>('/connectors/active', body),
  deleteActive: (id: number) => api.delete<void>(`/connectors/active/${id}`),
};

/** Scheduled task CRUD + toggle. */
export interface ScheduledTask {
  id: number;
  name: string;
  cronExpr: string;
  taskType?: string;
  payload?: string;
  status?: number; // 0 = paused, 1 = running
  lastRunTime?: string;
  nextRunTime?: string;
  createTime?: string;
  updateTime?: string;
}
export const scheduledTaskApi = {
  list: async (): Promise<ScheduledTask[]> => {
    const r = await api.get<ScheduledTask[]>('/scheduled-tasks/list');
    return unwrap<ScheduledTask[]>(r);
  },
  create: (body: { name: string; cronExpr: string; taskType?: string; payload?: string }) =>
    api.post<ScheduledTask>('/scheduled-tasks/create', body),
  update: (body: Partial<ScheduledTask> & { id: number }) =>
    api.put<ScheduledTask>('/scheduled-tasks/update', body),
  delete: (id: number) => api.delete<void>(`/scheduled-tasks/${id}`),
  toggle: (id: number) => api.put<ScheduledTask>(`/scheduled-tasks/${id}/toggle`),
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
  update: (id: number, body: { name: string; transportType: string; endpoint: string; env?: Record<string, string> }) =>
    api.put<{ id: number; connected: boolean }>(`/mcp-servers/${id}`, body),
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

/** Workflow CRUD + execution. */
export const workflowApi = {
  listNodes: async () => {
    const r = await api.get<any>('/workflows/nodes');
    return unwrap<any[]>(r);
  },
  list: async () => {
    const r = await api.get<any>('/workflows');
    return unwrap<any[]>(r);
  },
  get: async (id: string) => {
    const r = await api.get<any>(`/workflows/${id}`);
    return unwrap<any>(r);
  },
  create: async (body: any) => {
    const r = await api.post<{id:string;name:string}>('/workflows', body);
    return unwrap<{id:string;name:string}>(r);
  },
  update: async (id: string, body: any) => {
    const r = await api.put<{id:string;name:string}>(`/workflows/${id}`, body);
    return unwrap<{id:string;name:string}>(r);
  },
  delete: (id: string) => api.delete<void>(`/workflows/${id}`),
  /** Execute a workflow and stream SSE events via ReadableStream. */
  executeStream: (id: string, body?: any): Promise<ReadableStream<Uint8Array> | null> =>
    fetch(`${BASE_URL}/workflows/${id}/execute`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(res => {
      if (!res.ok) throw new Error(`Workflow execute failed: ${res.status}`);
      return res.body;
    }),
};

/** Saved database connection (subset of DbConnectionConf relevant to the UI). */
interface DbConnectionMeta {
  id: number;
  name: string;
  dbType?: string;
  host?: string;
  port?: number;
  dbName?: string;
}
interface SchemaMeta { name: string; }
interface TableMeta { name: string; type?: string; comment?: string; }

/** Database connection management + table listing. */
export const databaseApi = {
  listConnections: async (): Promise<DbConnectionMeta[]> => {
    const r = await api.get<DbConnectionMeta[]>('/database/list');
    return unwrap(r);
  },
  listTables: async (connectionId: number): Promise<string[]> => {
    const r = await api.get<string[]>(`/database/${connectionId}/tables`);
    return unwrap(r);
  },
};

/** Schema browser — schemas / tables under a given connection. */
export const schemaApi = {
  listSchemas: async (connectionId: number): Promise<SchemaMeta[]> => {
    const r = await api.get<SchemaMeta[]>(`/schema/schemas?connectionId=${connectionId}`);
    return unwrap(r);
  },
  listTables: async (connectionId: number, schemaName?: string): Promise<TableMeta[]> => {
    const params = new URLSearchParams({ connectionId: String(connectionId) });
    if (schemaName) params.set('schemaName', schemaName);
    const r = await api.get<TableMeta[]>(`/schema/tables?${params.toString()}`);
    return unwrap(r);
  },
};

/** Unwrap API response: handle both { code, message, data } wrapper and raw data. */
function unwrap<T>(r: any): T {
  if (r && typeof r === 'object' && 'data' in r) return r.data as T;
  return r as T;
}

/** Skill CRUD + Hub. */
export const skillApi = {
  list: () => api.get<any[]>('/skills'),
  get: (name: string) => api.get<any>(`/skills/${name}`),
  create: (body: any) => api.post<any>('/skills', body),
  update: (name: string, body: any) => api.put<any>(`/skills/${name}`, body),
  delete: (name: string) => api.delete<void>(`/skills/${name}`),
  hubBrowse: (category?: string, tag?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    return api.get<any[]>(`/hub/skills?${params.toString()}`);
  },
  hubInstall: (name: string) => api.post<any>(`/hub/skills/${name}/install`),
};