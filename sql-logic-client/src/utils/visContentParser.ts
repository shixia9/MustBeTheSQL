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

/**
 * Check if any step output contains multimodal vis content or HTML report.
 */
export function hasMultimodalContent(steps: { output?: any; content?: string }[]): boolean {
  for (const step of steps) {
    const raw = step.output?.report || step.output?.content || step.content || '';
    if (parseVisContent(raw).length > 0) return true;
    if (/```html[\s\S]*?```/.test(raw)) return true;
  }
  return false;
}

/**
 * Extract HTML content from a ```html code fence in text.
 * Returns the inner HTML string, or null if no HTML fence is found.
 */
export function extractHtmlContent(text: string): string | null {
  if (!text) return null;
  const match = /```html\s*\n?([\s\S]*?)```/i.exec(text);
  return match ? match[1].trim() : null;
}

/**
 * Detect if text is raw JSON containing chart definitions from DataScientistAgent.
 */
export function looksLikeChartJson(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.length > 0 && parsed.some((item: any) => item.display_type && item.sql);
    }
    return !!(parsed.display_type && parsed.sql);
  } catch { return false; }
}

/**
 * Build a readable markdown summary from chart JSON metadata.
 */
export function buildChartSummary(text: string): string {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text.trim());
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const lines = items.map((item: any, i: number) => {
      const title = item.title || `Chart ${i + 1}`;
      const typeName = String(item.display_type || 'table')
        .replace('response_', '').replace('_chart', '').replace(/_/g, ' ');
      const thought = item.thought ? ` — ${item.thought}` : '';
      return `- **${title}** (${typeName})${thought}`;
    });
    return `### Chart Analysis\n\nGenerated ${items.length} chart query plan(s):\n\n${lines.join('\n')}`;
  } catch { return ''; }
}

/**
 * Split DASHBOARD agent output into three parts:
 * - chartJson: leading JSON array of chart definitions (or null)
 * - markdownBody: the Markdown text summary (no JSON, no HTML fence)
 * - htmlContent: the inner HTML from a trailing ```html fence (or null)
 */
export function splitDashboardContent(text: string): {
  chartJson: string | null;
  markdownBody: string;
  htmlContent: string | null;
} {
  if (!text) return { chartJson: null, markdownBody: '', htmlContent: null };

  let remaining = text.trim();

  // 1. Extract trailing ```html ... ``` fence
  let htmlContent: string | null = null;
  const htmlMatch = /```html\s*\n?([\s\S]*?)```$/i.exec(remaining);
  if (htmlMatch) {
    htmlContent = htmlMatch[1].trim();
    remaining = remaining.substring(0, htmlMatch.index).trim();
  }

  // 2. Extract leading JSON array [...]
  let chartJson: string | null = null;
  if (remaining.startsWith('[')) {
    // Find matching closing bracket
    let depth = 0;
    let end = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] === '[') depth++;
      else if (remaining[i] === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end > 0) {
      const candidate = remaining.substring(0, end).trim();
      try {
        JSON.parse(candidate);
        chartJson = candidate;
        remaining = remaining.substring(end).trim();
        // Strip leading separator (---, newlines)
        remaining = remaining.replace(/^[-—\s]+/, '').trim();
      } catch { /* not valid JSON, keep as part of markdown */ }
    }
  }

  return { chartJson, markdownBody: remaining, htmlContent };
}
