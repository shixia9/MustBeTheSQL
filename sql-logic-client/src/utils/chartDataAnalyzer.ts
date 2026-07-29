/**
 * Lightweight chart data analyzer — mimics @antv/ava's statistical data validation
 * to verify LLM-recommended chart types are compatible with the actual data.
 */
export type ChartTypeCode =
  | 'response_table'
  | 'response_bar_chart'
  | 'response_line_chart'
  | 'response_pie_chart'
  | 'response_scatter_chart'
  | 'response_area_chart'
  | 'response_heatmap'
  | 'response_donut_chart'
  | 'response_bubble_chart'
  | 'response_indicator';

export interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'temporal' | 'unknown';
  distinctCount: number;
  nullRatio: number;
}

export interface DataProfile {
  columns: ColumnAnalysis[];
  rowCount: number;
  numericCols: string[];
  categoricalCols: string[];
  temporalCols: string[];
}

/**
 * Analyze a data column to determine its type and characteristics.
 */
function analyzeColumn(name: string, values: any[]): ColumnAnalysis {
  const nonNull = values.filter(v => v != null);
  const nullRatio = values.length > 0 ? 1 - nonNull.length / values.length : 0;
  const distinct = new Set(nonNull.map(v => String(v)));

  // Check temporal
  const temporalPatterns = [
    /^\d{4}-\d{2}-\d{2}/, /^\d{2}\/\d{2}\/\d{4}/, /^\d{4}\/\d{2}\/\d{2}/,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
    /^(January|February|March|April|May|June|July|August|September|October|November|December)/i,
  ];
  const temporalCount = nonNull.filter(v =>
    temporalPatterns.some(p => p.test(String(v)))
  ).length;

  // Check numeric
  const numericCount = nonNull.filter(v => {
    if (typeof v === 'number') return !isNaN(v);
    if (typeof v === 'string') return !isNaN(parseFloat(v)) && v.trim() !== '';
    return false;
  }).length;

  const total = nonNull.length || 1;
  if (temporalCount / total > 0.5) return { name, type: 'temporal', distinctCount: distinct.size, nullRatio };
  if (numericCount / total > 0.5) return { name, type: 'numeric', distinctCount: distinct.size, nullRatio };
  return { name, type: 'categorical', distinctCount: distinct.size, nullRatio };
}

/**
 * Profile a dataset — returns column analyses and summary statistics.
 */
export function profileData(columns: string[], rows: Record<string, any>[]): DataProfile {
  const colAnalyses = columns.map(col => {
    const values = rows.map(r => r[col]);
    return analyzeColumn(col, values);
  });

  return {
    columns: colAnalyses,
    rowCount: rows.length,
    numericCols: colAnalyses.filter(c => c.type === 'numeric').map(c => c.name),
    categoricalCols: colAnalyses.filter(c => c.type === 'categorical').map(c => c.name),
    temporalCols: colAnalyses.filter(c => c.type === 'temporal').map(c => c.name),
  };
}

/**
 * Validate whether a chart type is compatible with the data profile.
 * Returns an adjusted chart type if the original is unsuitable.
 */
export function validateChartType(
  requestedType: ChartTypeCode,
  profile: DataProfile
): { type: ChartTypeCode; reason?: string } {
  const { numericCols, categoricalCols, temporalCols, rowCount } = profile;

  // Table: always valid
  if (requestedType === 'response_table' || requestedType === 'response_indicator') {
    return { type: requestedType };
  }

  // Need at least 1 row
  if (rowCount === 0) {
    return { type: 'response_table', reason: 'No data rows' };
  }

  // Need at least 1 numeric column for any chart
  if (numericCols.length === 0) {
    return { type: 'response_table', reason: 'No numeric columns found — showing table instead' };
  }

  // Pie/Donut: need 1 numeric + 1 categorical, <= 12 categories
  if (requestedType === 'response_pie_chart' || requestedType === 'response_donut_chart') {
    if (categoricalCols.length === 0 && temporalCols.length === 0) {
      return { type: 'response_bar_chart', reason: 'No category column for pie chart — using bar chart' };
    }
    const labelCol = categoricalCols[0] || temporalCols[0];
    const catAnalysis = profile.columns.find(c => c.name === labelCol);
    if (catAnalysis && catAnalysis.distinctCount > 12) {
      return { type: 'response_bar_chart', reason: `Too many categories (${catAnalysis.distinctCount}) for pie — using bar chart` };
    }
    return { type: requestedType };
  }

  // Scatter/Bubble: need >= 2 numeric columns
  if (requestedType === 'response_scatter_chart' || requestedType === 'response_bubble_chart') {
    if (numericCols.length < 2) {
      return { type: 'response_bar_chart', reason: 'Need at least 2 numeric columns for scatter — using bar chart' };
    }
    return { type: requestedType };
  }

  // Line/Area: prefer temporal labels, fall back to categorical
  if (requestedType === 'response_line_chart' || requestedType === 'response_area_chart') {
    return { type: requestedType };
  }

  // Bar/Heatmap: always valid with data
  return { type: requestedType };
}

/**
 * Determine the best label column (X-axis) for a chart.
 * Prefers temporal → short categorical → first categorical → first column.
 */
export function findLabelColumn(profile: DataProfile): string | null {
  if (profile.temporalCols.length > 0) return profile.temporalCols[0];
  if (profile.categoricalCols.length > 0) {
    // Prefer shorter distinct counts
    const sorted = [...profile.categoricalCols].sort((a, b) => {
      const ca = profile.columns.find(c => c.name === a);
      const cb = profile.columns.find(c => c.name === b);
      return (ca?.distinctCount ?? 999) - (cb?.distinctCount ?? 999);
    });
    return sorted[0];
  }
  return profile.columns[0]?.name ?? null;
}

/**
 * Build friendly chart title from metadata.
 */
export function buildChartTitle(
  chartType: ChartTypeCode,
  columns: string[],
  rows: Record<string, any>[]
): string {
  const profile = profileData(columns, rows);
  const label = findLabelColumn(profile);
  const metric = profile.numericCols[0] || 'value';

  switch (chartType) {
    case 'response_bar_chart': return `${metric} by ${label || 'category'}`;
    case 'response_line_chart': return `${metric} trend over ${label || 'time'}`;
    case 'response_pie_chart': return `Distribution of ${metric}`;
    case 'response_scatter_chart': return `${profile.numericCols[1] || 'Y'} vs ${profile.numericCols[0] || 'X'}`;
    case 'response_area_chart': return `${metric} area over ${label || 'time'}`;
    case 'response_heatmap': return `Heatmap of ${metric}`;
    case 'response_indicator': return `${metric}: ${rows[0]?.[metric] ?? 'N/A'}`;
    default: return 'Data View';
  }
}
