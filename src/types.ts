export type Page = 'login' | 'dashboard' | 'workspace' | 'history' | 'database' | 'settings' | 'profile';

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
