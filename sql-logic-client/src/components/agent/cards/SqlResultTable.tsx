/**
 * SqlResultTable — renders SQL execution results as a styled HTML table.
 * Theme-aware (light/dark), handles NULL values, column alignment,
 * row count display, and overflow scrolling.
 */
import { useMemo } from 'react';

interface Props {
  columns: string[];
  rows: Record<string, any>[];
  maxHeight?: number;
  maxRows?: number;
  emptyText?: string;
}

function isNumeric(v: any): boolean {
  if (v == null) return false;
  if (typeof v === 'number') return !isNaN(v);
  if (typeof v === 'string') return !isNaN(parseFloat(v)) && v.trim() !== '';
  return false;
}

export default function SqlResultTable({
  columns, rows, maxHeight = 320, maxRows = 200, emptyText = 'No data returned',
}: Props) {
  const numericCols = useMemo(() => {
    if (!columns.length || !rows.length) return new Set<string>();
    const set = new Set<string>();
    for (const col of columns) {
      const sample = rows.slice(0, 10).map(r => r[col]);
      const numCount = sample.filter(isNumeric).length;
      if (numCount >= sample.length * 0.6) set.add(col);
    }
    return set;
  }, [columns, rows]);

  if (!columns.length) {
    return (
      <div className="flex items-center justify-center py-8 text-xs"
        style={{ color: 'var(--color-ink-tertiary)' }}>
        {emptyText}
      </div>
    );
  }

  const displayRows = rows.slice(0, maxRows);
  const truncated = rows.length > maxRows;

  return (
    <div className="sql-result-table">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-ink-tertiary)' }}>
          {rows.length} row{rows.length !== 1 ? 's' : ''} × {columns.length} column{columns.length !== 1 ? 's' : ''}
        </span>
        {truncated && (
          <span className="text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
            showing first {maxRows}
          </span>
        )}
      </div>
      <div className="overflow-auto rounded-md border" style={{
        maxHeight,
        borderColor: 'var(--color-border-subtle)',
      }}>
        <table className="w-full text-xs border-collapse" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <thead>
            <tr style={{ background: 'var(--color-app-bg-alt)' }}>
              <th className="sticky left-0 z-10 px-2 py-1.5 text-left font-semibold border-b"
                style={{
                  background: 'var(--color-app-bg-alt)',
                  color: 'var(--color-ink)',
                  borderColor: 'var(--color-border-subtle)',
                  minWidth: '36px',
                  width: '36px',
                }}>
                #
              </th>
              {columns.map(col => (
                <th key={col} className="px-3 py-1.5 text-left font-semibold border-b whitespace-nowrap"
                  style={{
                    color: 'var(--color-ink)',
                    borderColor: 'var(--color-border-subtle)',
                    textAlign: numericCols.has(col) ? 'right' : 'left',
                  }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center"
                  style={{ color: 'var(--color-ink-tertiary)' }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              displayRows.map((row, ri) => (
                <tr key={ri} className="transition-colors hover:bg-opacity-50"
                  style={{
                    background: ri % 2 === 0 ? 'transparent' : 'var(--color-app-bg)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-soft)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = ri % 2 === 0 ? 'transparent' : 'var(--color-app-bg)';
                  }}>
                  <td className="sticky left-0 px-2 py-1 border-b text-right select-none"
                    style={{
                      color: 'var(--color-ink-tertiary)',
                      borderColor: 'var(--color-border-subtle)',
                      background: ri % 2 === 0 ? 'var(--color-content-bg)' : 'var(--color-app-bg)',
                      fontSize: '10px',
                    }}>
                    {ri + 1}
                  </td>
                  {columns.map(col => (
                    <td key={col} className="px-3 py-1 border-b whitespace-nowrap"
                      style={{
                        color: row[col] == null ? 'var(--color-ink-tertiary)' : 'var(--color-ink-secondary)',
                        borderColor: 'var(--color-border-subtle)',
                        textAlign: numericCols.has(col) ? 'right' : 'left',
                        fontStyle: row[col] == null ? 'italic' : 'normal',
                        maxWidth: '320px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                      {row[col] == null
                        ? <span style={{ opacity: 0.4 }}>NULL</span>
                        : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
