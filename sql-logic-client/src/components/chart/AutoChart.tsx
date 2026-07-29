/**
 * AutoChart — renders SQL execution results as interactive charts using recharts.
 *
 * Supports the backend vis-db-chart protocol:
 * ```vis-db-chart\n{ type, title, describe, sql, data, columns }\n```
 *
 * Features:
 * - LLM-recommended chart type with user-selectable override
 * - Statistical data validation (mimics @antv/ava)
 * - PNG download via canvas export
 */
import { useMemo, useState, useId } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  profileData,
  validateChartType,
  findLabelColumn,
  ChartTypeCode,
} from '../../utils/chartDataAnalyzer';
import { downloadChartAsPng } from '../../utils/exportReport';
import { type ParsedVisChart } from '../../utils/visContentParser';

interface Props {
  chart: ParsedVisChart;
  /** Show the chart type selector dropdown (default true) */
  showTypeSelector?: boolean;
  /** Height for the responsive container */
  height?: number;
}

const CHART_TYPE_OPTIONS: { value: ChartTypeCode; label: string }[] = [
  { value: 'response_bar_chart', label: 'Bar Chart' },
  { value: 'response_line_chart', label: 'Line Chart' },
  { value: 'response_pie_chart', label: 'Pie Chart' },
  { value: 'response_scatter_chart', label: 'Scatter' },
  { value: 'response_area_chart', label: 'Area Chart' },
  { value: 'response_table', label: 'Table' },
  { value: 'response_indicator', label: 'Indicator' },
];

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#9333ea'];

function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  return 0;
}

function getColumnNames(chart: ParsedVisChart): string[] {
  if (chart.columns && chart.columns.length > 0) {
    const first = chart.columns[0];
    if (typeof first === 'string') return chart.columns as string[];
    if (typeof first === 'object' && 'name' in first) {
      return (chart.columns as { name: string }[]).map(c => c.name);
    }
  }
  if (chart.data && chart.data.length > 0) {
    return Object.keys(chart.data[0]);
  }
  return [];
}

export default function AutoChart({ chart, showTypeSelector = true, height = 260 }: Props) {
  const chartId = useId();
  const columns = useMemo(() => getColumnNames(chart), [chart]);
  const profile = useMemo(() => profileData(columns, chart.data), [columns, chart.data]);

  const [selectedType, setSelectedType] = useState<ChartTypeCode>(() => {
    const result = validateChartType(chart.type as ChartTypeCode, profile);
    return result.type;
  });

  const validation = useMemo(
    () => validateChartType(selectedType, profile),
    [selectedType, profile]
  );

  const labelCol = useMemo(() => findLabelColumn(profile), [profile]);
  const metricCols = profile.numericCols;

  const chartData = useMemo(() => {
    return chart.data.map((r, i) => {
      const entry: Record<string, any> = {};
      if (labelCol) {
        entry[labelCol] = r[labelCol] == null ? `#${i + 1}` : String(r[labelCol]).substring(0, 30);
      }
      for (const mc of metricCols) {
        entry[mc] = toNum(r[mc]);
      }
      return entry;
    });
  }, [chart.data, labelCol, metricCols]);

  if (!chart.data || chart.data.length === 0) {
    return <div className="text-sm text-on-surface-variant/60 p-4">No data to display</div>;
  }

  const handleTypeChange = (newType: ChartTypeCode) => {
    const result = validateChartType(newType, profile);
    setSelectedType(result.type);
  };

  const handleDownload = () => {
    const chartEl = document.getElementById(chartId);
    if (chartEl) {
      downloadChartAsPng(chartEl, chart.title || 'chart');
    }
  };

  const renderChart = () => {
    const effectiveType = validation.type;

    if (effectiveType === 'response_table') {
      return (
        <div className="overflow-x-auto max-h-64">
          <table className="min-w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-surface-variant/30">
                {columns.map(col => (
                  <th key={col} className="px-2 py-1 text-left border border-outline-variant/20">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.data.slice(0, 50).map((row, i) => (
                <tr key={i} className="hover:bg-surface-variant/10">
                  {columns.map(col => (
                    <td key={col} className="px-2 py-0.5 border border-outline-variant/10">
                      {row[col] == null ? <span className="text-on-surface-variant/30">NULL</span> : String(row[col]).substring(0, 100)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (effectiveType === 'response_indicator' && metricCols.length > 0) {
      const val = chart.data[0]?.[metricCols[0]];
      return (
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{toNum(val).toLocaleString()}</div>
            <div className="text-sm text-on-surface-variant/60 mt-1">{metricCols[0]}</div>
          </div>
        </div>
      );
    }

    if (!labelCol && effectiveType !== 'response_pie_chart' && effectiveType !== 'response_donut_chart') {
      return <div className="text-sm text-on-surface-variant/60 p-4">Cannot render {effectiveType}: no label column found</div>;
    }

    if (metricCols.length === 0) {
      return <div className="text-sm text-on-surface-variant/60 p-4">No numeric data for chart</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        {effectiveType === 'response_bar_chart' ? (
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--outline-variant) / 0.2)" />
            {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} interval="preserveStartEnd" />}
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} />
            <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            {metricCols.length <= 3 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {metricCols.map((mc, i) => (
              <Bar key={mc} dataKey={mc} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        ) : effectiveType === 'response_line_chart' || effectiveType === 'response_area_chart' ? (
          effectiveType === 'response_area_chart' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--outline-variant) / 0.2)" />
              {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} interval="preserveStartEnd" />}
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} />
              <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
              {metricCols.length <= 3 && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {metricCols.map((mc, i) => (
                <Area key={mc} type="monotone" dataKey={mc} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.2} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--outline-variant) / 0.2)" />
              {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} interval="preserveStartEnd" />}
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} />
              <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
              {metricCols.length <= 3 && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {metricCols.map((mc, i) => (
                <Line key={mc} type="monotone" dataKey={mc} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          )
        ) : effectiveType === 'response_pie_chart' || effectiveType === 'response_donut_chart' ? (
          (() => {
            const pieLabel = labelCol || columns[0];
            const pieMetric = metricCols[0];
            const pieData = chart.data.slice(0, 12).map(r => ({
              name: String(r[pieLabel] ?? '').substring(0, 20),
              value: toNum(r[pieMetric]),
            }));
            return (
              <PieChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <Pie
                  data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  innerRadius={effectiveType === 'response_donut_chart' ? 45 : 0}
                  label={({ name, percent }: any) => `${name ?? ''} ${((percent as number) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
              </PieChart>
            );
          })()
        ) : effectiveType === 'response_scatter_chart' ? (
          <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--outline-variant) / 0.2)" />
            {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} />}
            <YAxis dataKey={metricCols[0]} tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} />
            <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chartData} fill={COLORS[0]} />
          </ScatterChart>
        ) : (
          <div className="text-sm text-on-surface-variant/60 p-4">Unsupported chart type: {effectiveType}</div>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <div id={chartId} className="chart-container rounded border border-outline-variant/20 bg-surface p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          {chart.title && <div className="text-sm font-medium">{chart.title}</div>}
          {chart.describe && <div className="text-xs text-on-surface-variant/60 mt-0.5">{chart.describe}</div>}
        </div>
        <div className="flex items-center gap-1">
          {showTypeSelector && (
            <select
              value={selectedType}
              onChange={e => handleTypeChange(e.target.value as ChartTypeCode)}
              className="text-xs bg-surface-variant/30 border border-outline-variant/20 rounded px-1.5 py-0.5"
            >
              {CHART_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleDownload}
            className="text-xs px-1.5 py-0.5 rounded hover:bg-surface-variant/30"
            title="Download as PNG"
          >
            PNG
          </button>
        </div>
      </div>

      {/* Validation feedback */}
      {validation.reason && (
        <div className="text-xs text-amber-500 mb-1">{validation.reason}</div>
      )}

      {/* Chart body */}
      {renderChart()}

      {/* Data summary */}
      <div className="text-xs text-on-surface-variant/40 mt-1">
        {chart.data.length} rows · {columns.length} columns
        {chart.sql && <span className="ml-2 font-mono opacity-50">{chart.sql.substring(0, 40)}...</span>}
      </div>
    </div>
  );
}
