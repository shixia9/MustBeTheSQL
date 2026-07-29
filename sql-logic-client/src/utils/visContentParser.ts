/**
 * Parses vis-db-chart and vis-dashboard code fences from agent output text.
 * Used by the ChatPage to detect and render chart/dashboard content inline.
 */
export interface ParsedVisChart {
  tag: 'vis-db-chart';
  type: string;
  title?: string;
  describe?: string;
  sql?: string;
  data: Record<string, any>[];
  columns?: { name: string }[] | string[];
}

export interface ParsedVisDashboard {
  tag: 'vis-dashboard';
  data: {
    title?: string;
    type: string;
    sql?: string;
    describe?: string;
    data?: Record<string, any>[];
    error?: string;
  }[];
  chart_count: number;
  title?: string;
  display_strategy?: string;
  style?: string;
}

export type ParsedVisContent = ParsedVisChart | ParsedVisDashboard;

/**
 * Extract vis code fence content from text.
 * Looks for ```vis-db-chart\n{...}\n``` and ```vis-dashboard\n{...}\n``` blocks.
 */
export function parseVisContent(text: string): ParsedVisContent[] {
  if (!text) return [];

  const results: ParsedVisContent[] = [];
  const fenceRegex = /```(vis-db-chart|vis-dashboard)\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = fenceRegex.exec(text)) !== null) {
    const tag = match[1];
    const json = match[2].trim();
    try {
      const parsed = JSON.parse(json);
      if (tag === 'vis-db-chart') {
        results.push({
          tag: 'vis-db-chart',
          type: parsed.type || 'response_table',
          title: parsed.title,
          describe: parsed.describe,
          sql: parsed.sql,
          data: parsed.data || [],
          columns: parsed.columns,
        });
      } else if (tag === 'vis-dashboard') {
        results.push({
          tag: 'vis-dashboard',
          data: parsed.data || [],
          chart_count: parsed.chart_count || 0,
          title: parsed.title,
          display_strategy: parsed.display_strategy,
          style: parsed.style,
        });
      }
    } catch (e) {
      console.warn('Failed to parse vis content:', e);
    }
  }

  return results;
}

/**
 * Remove vis code fence blocks from text, leaving only the remaining Markdown.
 * This allows the text to be rendered by react-markdown without the raw JSON.
 */
export function stripVisContent(text: string): string {
  if (!text) return '';
  return text.replace(/```(?:vis-db-chart|vis-dashboard)\s*\n[\s\S]*?```/g, '').trim();
}
