export type Page = 'login' | 'dashboard' | 'schema-browser' | 'workspace-manage' | 'history' | 'database' | 'settings' | 'profile' | 'invite';

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
  createTime: string;
  updateTime: string;
}
