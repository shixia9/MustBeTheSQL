/** Mock data for management pages — replace with real API calls when backend is ready. */

export const mockKnowledgeSpaces = [
  { id: '1', name: 'sales_db', docCount: 12, vectorType: 'pgvector', status: 'active', description: 'Sales database knowledge base' },
  { id: '2', name: 'user_db', docCount: 5, vectorType: 'pgvector', status: 'active', description: 'User profile and behavior knowledge' },
  { id: '3', name: 'product_db', docCount: 8, vectorType: 'pgvector', status: 'syncing', description: 'Product catalog and inventory' },
];

export const mockDocuments = [
  { id: '1', name: 'sales_schema.md', spaceId: '1', size: '12KB', status: 'synced', chunks: 24, updatedAt: '2026-07-18' },
  { id: '2', name: 'revenue_definitions.md', spaceId: '1', size: '8KB', status: 'synced', chunks: 16, updatedAt: '2026-07-17' },
  { id: '3', name: 'user_segments.md', spaceId: '2', size: '6KB', status: 'pending', chunks: 0, updatedAt: '2026-07-18' },
];

export const mockSkills = [
  { id: '1', name: 'financial-report', description: '财报深度分析技能', version: '1.2.0', author: 'official', downloads: 1240, tags: ['finance', 'report'] },
  { id: '2', name: 'anomaly-detector', description: '异常数据检测与归因分析', version: '2.0.1', author: 'community', downloads: 890, tags: ['anomaly', 'monitoring'] },
  { id: '3', name: 'forecast-model', description: '时间序列预测建模', version: '1.0.0', author: 'official', downloads: 1560, tags: ['forecast', 'ml'] },
  { id: '4', name: 'data-cleaner', description: '数据清洗与标准化流水线', version: '1.1.0', author: 'community', downloads: 670, tags: ['cleaning', 'etl'] },
  { id: '5', name: 'text-summarizer', description: '文本数据摘要与情感分析', version: '0.9.0', author: 'community', downloads: 430, tags: ['nlp', 'summary'] },
  { id: '6', name: 'chart-builder', description: '自动图表类型选择与渲染', version: '1.3.0', author: 'official', downloads: 2100, tags: ['visualization', 'charts'] },
];

export const mockPrompts = [
  { id: '1', name: 'sql-generate', scene: 'NL2SQL', description: 'Generate SQL from natural language', variables: ['dialect', 'schema_info', 'question'], updatedAt: '2026-07-18' },
  { id: '2', name: 'sql-fix', scene: 'SQL Repair', description: 'Fix failed SQL with error context', variables: ['original_sql', 'error_message', 'schema_info'], updatedAt: '2026-07-17' },
  { id: '3', name: 'planner', scene: 'Planning', description: 'Decompose user input into plan steps', variables: ['agents', 'question'], updatedAt: '2026-07-16' },
  { id: '4', name: 'report', scene: 'Report', description: 'Generate analysis report from step results', variables: ['history_summary', 'question'], updatedAt: '2026-07-15' },
  { id: '5', name: 'feasibility', scene: 'Gate', description: 'Assess query feasibility and route', variables: ['question', 'schema_info'], updatedAt: '2026-07-14' },
];

export const mockConnectorTemplates = [
  { id: 'github', name: 'GitHub', description: 'Access GitHub issues, PRs, and repositories', category: 'Developer Tools', icon: 'gitBranch' },
  { id: 'slack', name: 'Slack', description: 'Send messages and query Slack channels', category: 'Communication', icon: 'messageSquare' },
  { id: 'dingtalk', name: 'DingTalk', description: 'DingTalk robot notifications', category: 'Communication', icon: 'messageSquare' },
  { id: 'yuque', name: 'Yuque', description: 'Access Yuque documents and knowledge base', category: 'Documentation', icon: 'bookOpen' },
  { id: 'feishu', name: 'Feishu', description: 'Feishu/Lark document and message integration', category: 'Communication', icon: 'messageSquare' },
  { id: 'weather', name: 'Weather API', description: 'Query real-time weather data', category: 'External API', icon: 'cloud' },
];

export const mockActiveConnectors = [
  { id: '1', name: 'GitHub Org Monitor', templateId: 'github', status: 'connected', activatedAt: '2026-07-15' },
  { id: '2', name: 'Slack Alert Channel', templateId: 'slack', status: 'connected', activatedAt: '2026-07-10' },
];

export const mockScheduledTasks = [
  { id: '1', name: 'Daily Sales Report', cron: '0 9 * * 1-5', status: 'active', lastRun: '2026-07-18 09:00', nextRun: '2026-07-19 09:00', description: 'Generate daily sales summary' },
  { id: '2', name: 'Weekly Anomaly Scan', cron: '0 8 * * 1', status: 'active', lastRun: '2026-07-13 08:00', nextRun: '2026-07-20 08:00', description: 'Scan for data anomalies weekly' },
  { id: '3', name: 'Monthly User Report', cron: '0 7 1 * *', status: 'paused', lastRun: '2026-07-01 07:00', nextRun: '—', description: 'Monthly user growth report' },
];

export const mockRecentConversations = [
  { id: 'conv-1', title: 'Q3 销售数据分析', user: 'analyst', timestamp: '2026-07-18 16:30', stepCount: 3 },
  { id: 'conv-2', title: '用户画像聚类', user: 'analyst', timestamp: '2026-07-18 14:15', stepCount: 4 },
  { id: 'conv-3', title: '库存周转率预测', user: 'admin', timestamp: '2026-07-18 11:00', stepCount: 2 },
  { id: 'conv-4', title: '渠道转化率对比', user: 'analyst', timestamp: '2026-07-17 17:45', stepCount: 3 },
  { id: 'conv-5', title: '退款用户特征分析', user: 'operator', timestamp: '2026-07-17 15:20', stepCount: 5 },
  { id: 'conv-6', title: '新品上市效果评估', user: 'admin', timestamp: '2026-07-17 10:00', stepCount: 2 },
  { id: 'conv-7', title: '季节性趋势检测', user: 'analyst', timestamp: '2026-07-16 16:00', stepCount: 3 },
];
