/**
 * ResultChart — renders a bar/line chart from SQL execution result columns + rows.
 * Auto-detects: first numeric column as Y-axis, first non-numeric as X-axis labels.
 * Falls back to no output if fewer than 2 numeric columns are present.
 */
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  columns: string[];
  /** Each row is an object keyed by column name, values are plain JSON scalars. */
  rows: any[];
}

function isNumeric(v: any): boolean {
  if (v == null) return false;
  if (typeof v === 'number') return !isNaN(v);
  if (typeof v === 'string') return !isNaN(parseFloat(v)) && v.trim() !== '';
  return false;
}

function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  return 0;
}

export default function ResultChart({ columns, rows }: Props) {
  // Sort columns into index columns (non-numeric) and metric columns (numeric).
  const { labelCol, metricCols } = useMemo(() => {
    if (!columns.length || !rows.length) return { labelCol: null, metricCols: [] as string[] };
    // Determine which columns are numeric by scanning up to 5 rows
    const numericSet: Set<number> = new Set();
    const nonNumericSet: Set<number> = new Set();
    for (let i = 0; i < columns.length; i++) {
      const sample = rows.slice(0, 5).map(r => r[columns[i]]);
      const numCount = sample.filter(isNumeric).length;
      if (numCount >= sample.length * 0.5) numericSet.add(i);
      else nonNumericSet.add(i);
    }
    // First non-numeric column becomes label
    const labelIdx = [...nonNumericSet].sort((a, b) => a - b)[0];
    const label = labelIdx != null ? columns[labelIdx] : null;
    // All numeric columns as metrics
    const metrics = [...numericSet].sort((a, b) => a - b).map(i => columns[i]);
    return { labelCol: label, metricCols: metrics };
  }, [columns, rows]);

  if (!labelCol || metricCols.length === 0) return null;

  // Build Recharts-friendly data: one entry per row
  const data = rows.map((r, i) => {
    const entry: Record<string, any> = {};
    entry[labelCol] = r[labelCol] == null ? `#${i + 1}` : String(r[labelCol]).substring(0, 30);
    for (const mc of metricCols) {
      entry[mc] = toNum(r[mc]);
    }
    return entry;
  });

  const COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2'];

  return (
    <div className="mt-2 p-2 rounded border border-outline-variant/20 bg-surface">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--outline-variant) / 0.2)" />
          <XAxis dataKey={labelCol} tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant) / 0.6)' }} />
          <Tooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
          {metricCols.length <= 2 && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {metricCols.map((mc, i) => (
            <Bar key={mc} dataKey={mc} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}