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
  showTypeSelector?: boolean;
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
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-1" style={{ color: 'var(--color-ink-tertiary)' }}>
        <span className="text-sm">No data to display</span>
        {chart.sql && <span className="text-[10px] font-mono opacity-40">{chart.sql.substring(0, 60)}...</span>}
      </div>
    );
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

  const effectiveType = validation.type;
  const typeLabel = effectiveType.replace('response_', '').replace('_chart', '').replace(/_/g, ' ');

  const renderChart = () => {
    if (effectiveType === 'response_table') {
      return (
        <div className="overflow-x-auto max-h-72 rounded-md border" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <table className="min-w-full text-xs font-mono border-collapse">
            <thead>
              <tr style={{ background: 'var(--color-app-bg-alt)' }}>
                {columns.map(col => (
                  <th key={col} className="px-3 py-1.5 text-left font-semibold border-b" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-ink)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.data.slice(0, 50).map((row, i) => (
                <tr key={i} className="transition-colors" style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-app-bg)' }}>
                  {columns.map(col => (
                    <td key={col} className="px-3 py-1 border-b" style={{ borderColor: 'var(--color-border-subtle)', color: row[col] == null ? 'var(--color-ink-tertiary)' : 'var(--color-ink-secondary)' }}>
                      {row[col] == null ? <span className="italic opacity-30">NULL</span> : String(row[col]).substring(0, 100)}
                    </td>
                  ))}
                </tr>
              ))}
              {chart.data.length > 50 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-1 text-center" style={{ color: 'var(--color-ink-tertiary)', fontSize: '11px' }}>
                    ... {chart.data.length - 50} more rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (effectiveType === 'response_indicator' && metricCols.length > 0) {
      const val = chart.data[0]?.[metricCols[0]];
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
              {toNum(val).toLocaleString()}
            </div>
            <div className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-ink-tertiary)' }}>
              {chart.title || metricCols[0]}
            </div>
          </div>
        </div>
      );
    }

    if (!labelCol && effectiveType !== 'response_pie_chart' && effectiveType !== 'response_donut_chart') {
      return (
        <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
          Cannot render {typeLabel}: no suitable label column found
        </div>
      );
    }

    if (metricCols.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
          No numeric data available for chart
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        {effectiveType === 'response_bar_chart' ? (
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} interval="preserveStartEnd" />}
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} />
            <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }} />
            {metricCols.length <= 3 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {metricCols.map((mc, i) => (
              <Bar key={mc} dataKey={mc} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : effectiveType === 'response_line_chart' || effectiveType === 'response_area_chart' ? (
          effectiveType === 'response_area_chart' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} interval="preserveStartEnd" />}
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} />
              <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }} />
              {metricCols.length <= 3 && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {metricCols.map((mc, i) => (
                <Area key={mc} type="monotone" dataKey={mc} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.15} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} interval="preserveStartEnd" />}
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} />
              <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }} />
              {metricCols.length <= 3 && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {metricCols.map((mc, i) => (
                <Line key={mc} type="monotone" dataKey={mc} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
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
                  outerRadius={90}
                  innerRadius={effectiveType === 'response_donut_chart' ? 50 : 0}
                  label={({ name, percent }: any) => `${name ?? ''} ${((percent as number) * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1, stroke: 'var(--color-border-default)' }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }} />
              </PieChart>
            );
          })()
        ) : effectiveType === 'response_scatter_chart' ? (
          <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            {labelCol && <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} />}
            <YAxis dataKey={metricCols[0]} tick={{ fontSize: 9, fill: 'var(--color-ink-tertiary)' }} />
            <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chartData} fill={COLORS[0]} />
          </ScatterChart>
        ) : (
          <div className="flex items-center justify-center py-8 text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
            Unsupported chart type: {effectiveType}
          </div>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <div id={chartId} className="chart-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{
            background: 'var(--color-primary-soft)',
            color: 'var(--color-primary)',
          }}>
            {typeLabel}
          </span>
          {chart.title && (
            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)' }}>
              {chart.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showTypeSelector && (
            <select
              value={selectedType}
              onChange={e => handleTypeChange(e.target.value as ChartTypeCode)}
              className="text-[11px] rounded-md px-2 py-1 border outline-none cursor-pointer transition-colors"
              style={{
                background: 'var(--color-app-bg)',
                color: 'var(--color-ink-secondary)',
                borderColor: 'var(--color-border-subtle)',
                fontFamily: 'inherit',
              }}
            >
              {CHART_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleDownload}
            className="text-[11px] px-2 py-1 rounded-md border transition-colors hover:border-primary/30"
            style={{
              color: 'var(--color-ink-secondary)',
              borderColor: 'var(--color-border-subtle)',
              background: 'var(--color-app-bg)',
            }}
            title="Download as PNG"
          >
            PNG
          </button>
        </div>
      </div>

      {/* Description */}
      {chart.describe && (
        <div className="text-[11px] mb-2 leading-relaxed" style={{ color: 'var(--color-ink-tertiary)' }}>
          {chart.describe}
        </div>
      )}

      {/* Validation feedback */}
      {validation.reason && (
        <div className="flex items-center gap-1 text-[11px] mb-2 px-2 py-1 rounded" style={{
          background: 'rgba(240, 160, 64, 0.08)',
          color: '#d97706',
        }}>
          <span>{validation.reason}</span>
        </div>
      )}

      {/* Chart body */}
      <div className="rounded-lg p-2" style={{ background: 'var(--color-app-bg)' }}>
        {renderChart()}
      </div>

      {/* Data summary footer */}
      <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
        <span>{chart.data.length} rows</span>
        <span>{columns.length} columns</span>
        {metricCols.length > 0 && <span>{metricCols.length} metric{metricCols.length !== 1 ? 's' : ''}</span>}
        {chart.sql && (
          <span className="font-mono truncate hidden sm:inline" style={{ opacity: 0.4 }}>
            {chart.sql.substring(0, 50)}...
          </span>
        )}
      </div>
    </div>
  );
}
