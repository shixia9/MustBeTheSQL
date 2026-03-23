import { DatabaseConnection, QueryRecord } from './types';

export const MOCK_QUERIES: QueryRecord[] = [
  {
    id: 'Q-X921-23',
    prompt: 'Show me all revenue from Q3 2023 filtered by region, excluding the APAC office results but keeping EMEA and US.',
    sql: `SELECT\n  region,\n  SUM(revenue) as total_revenue\nFROM sales_data\nWHERE period = '2023-Q3'\n  AND region NOT IN ('APAC')\nGROUP BY region\nORDER BY total_revenue DESC;`,
    model: 'GPT-4o',
    database: 'PRODUCTION_DB',
    timestamp: 'Oct 12, 2023 14:45:22',
    latency: '1,245ms',
    tokens: 428,
    rows: 12,
    cost: 0.0084,
  },
  {
    id: 'Q-Y442-23',
    prompt: 'List active users who haven\'t logged in for 30 days',
    sql: `SELECT user_id, last_login FROM users WHERE last_login < CURRENT_DATE - INTERVAL '30 days' AND status = 'active';`,
    model: 'Claude 3.5',
    database: 'USER_ANALYTICS',
    timestamp: 'Oct 11, 2023 09:12:05',
    latency: '840ms',
    tokens: 312,
    rows: 450,
    cost: 0.0052,
  },
  {
    id: 'Q-Z102-23',
    prompt: 'Average transaction size per customer in the last 6 months',
    sql: `WITH monthly_stats AS (SELECT customer_id, AVG(amount) as avg_size FROM transactions WHERE date > CURRENT_DATE - INTERVAL '6 months' GROUP BY customer_id) SELECT * FROM monthly_stats;`,
    model: 'GPT-4o',
    database: 'SNOWFLAKE_WH',
    timestamp: 'Oct 10, 2023 17:30:44',
    latency: '2.4s',
    tokens: 512,
    rows: 1284,
    cost: 0.012,
  }
];

export const MOCK_CONNECTIONS: DatabaseConnection[] = [
  {
    id: '1',
    name: 'Production PostgreSQL',
    host: 'pg-db-01.aws.internal',
    port: 5432,
    user: 'admin_logic_root',
    status: 'active',
    type: 'PostgreSQL',
  },
  {
    id: '2',
    name: 'Test MySQL Cluster',
    host: 'localhost',
    port: 3306,
    user: 'dev_user',
    status: 'active',
    type: 'MySQL',
  },
  {
    id: '3',
    name: 'Staging Redis',
    host: 'redis-stg-01',
    port: 6379,
    user: 'cache_mgr',
    status: 'inactive',
    type: 'Redis',
  }
];
