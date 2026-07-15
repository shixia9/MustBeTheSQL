export type Page = 'login' | 'dashboard' | 'schema-browser' | 'workspace-manage' | 'history' | 'database' | 'settings' | 'profile' | 'invite' | 'agent-studio' | 'memory' | 'mcp-servers' | 'admin';

export interface QueryRecord {
  id: string;
  prompt: string;
  sql: string;
  model: string;
  database: string;
  connectionId?: number;
  timestamp: string;
  latency: string;
  tokens: number;
  rows: number;
  cost: number;
  parentId?: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  status: 'active' | 'inactive' | 'error';
  type: 'PostgreSQL' | 'MySQL' | 'Redis' | 'Snowflake' | 'BigQuery';
}

export interface LlmConfig {
  id: number;
  configName: string;
  providerType: 'OPENAI_COMPATIBLE' | 'ANTHROPIC';
  baseUrl: string | null;
  apiKeyMasked: string;
  modelName: string | null;
  isDefault: boolean;
  status: number;
  // Phase B: high-availability fields (optional — older rows may omit them).
  strategyType?: string | null;
  fallbackChain?: string | null;
  circuitState?: string | null;
  createTime: string;
  updateTime: string;
}

/** Agent Studio entity — one user-managed Agent configuration. */
export interface AgentEntity {
  id: number;
  userId?: number;
  workspaceId?: number | null;
  name: string;
  description?: string | null;
  avatar?: string | null;
  systemPrompt?: string | null;
  welcomeMessage?: string | null;
  toolsConfig?: string | null;
  ragConfig?: string | null;
  memoryEnabled?: boolean;
  isDefault?: boolean;
  status?: number;
  enabledTools?: string[];
  createTime?: string;
  updateTime?: string;
}

/** Per-instance LLM health metrics returned by GET /llm-config/{id}/metrics. */
export interface LlmConfigMetrics {
  successRate?: number;
  avgLatencyMs?: number;
  circuitState?: string;
  totalRequests?: number;
}

/** Tool definition as returned by GET /api/v1/tools */
export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  type: 'BUILTIN' | 'MCP_SSE' | 'MCP_STDIO' | 'DOCKER_PYTHON';
  parametersSchema: string | null;
}

/** MCP server configuration from GET /api/v1/mcp-servers */
export interface McpServerConfig {
  id: number;
  userId: number;
  name: string;
  transportType: string;
  endpoint: string;
  envVars: string | null;
  status: number;
  createTime: string;
  updateTime: string;
}
