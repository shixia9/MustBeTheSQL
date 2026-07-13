export type Page = 'login' | 'dashboard' | 'schema-browser' | 'workspace-manage' | 'history' | 'database' | 'settings' | 'profile' | 'invite' | 'agent-studio' | 'memory' | 'admin';

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

/** Phase B (B4): Agent Studio entity — one user-managed Agent configuration. */
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

/** Phase B: per-instance LLM health metrics returned by GET /llm-config/{id}/metrics. */
export interface LlmConfigMetrics {
  successRate?: number;
  avgLatencyMs?: number;
  circuitState?: string;
  totalRequests?: number;
}
