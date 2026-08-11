/**
 * DashboardGrid — renders a multi-chart dashboard from the vis-dashboard protocol.
 *
 * Backend format:
 * ```vis-dashboard\n{ data: [{ title, type, sql, describe, data, error }], chart_count, title }\n```
 *
 * Features:
 * - Responsive grid layout (1/2/3 columns based on chart count)
 * - Mixed chart types per grid cell
 * - Error state display per chart
 * - Full dashboard PNG/PDF export
 */
import { useMemo } from 'react';
import AutoChart from '../chart/AutoChart';
import { type ParsedVisDashboard } from '../../utils/visContentParser';
import { downloadDashboardAsPng, downloadDashboardAsPdf } from '../../utils/exportReport';

interface Props {
  dashboard: ParsedVisDashboard;
}

export default function DashboardGrid({ dashboard }: Props) {
  const charts = useMemo(() => dashboard.data || [], [dashboard.data]);

  const gridCols = charts.length <= 1 ? 'grid-cols-1'
    : charts.length <= 2 ? 'grid-cols-1 lg:grid-cols-2'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  const handleDownloadPng = () => {
    const el = document.getElementById('dashboard-grid');
    if (el) downloadDashboardAsPng(el, dashboard.title || 'dashboard');
  };

  const handleDownloadPdf = () => {
    const el = document.getElementById('dashboard-grid');
    if (el) downloadDashboardAsPdf(el, dashboard.title || 'dashboard');
  };

  if (charts.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center" style={{
        borderColor: 'var(--color-border-subtle)',
        background: 'var(--color-panel-bg)',
      }}>
        <span className="text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
          No charts in dashboard
        </span>
      </div>
    );
  }

  return (
    <div className="dashboard-container rounded-xl border p-4" style={{
      borderColor: 'var(--color-border-subtle)',
      background: 'var(--color-panel-bg)',
    }}>
      {/* Dashboard header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {dashboard.title && (
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
              {dashboard.title}
            </h3>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>
              {charts.length} chart{charts.length !== 1 ? 's' : ''}
            </span>
            {dashboard.display_strategy && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                background: 'var(--color-semantic-report-soft)',
                color: 'var(--color-semantic-report)',
              }}>
                {dashboard.display_strategy}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownloadPng}
            className="text-[11px] px-2.5 py-1 rounded-md border transition-colors hover:border-primary/30"
            style={{
              color: 'var(--color-ink-secondary)',
              borderColor: 'var(--color-border-subtle)',
              background: 'var(--color-app-bg)',
            }}
          >
            Export PNG
          </button>
          <button
            onClick={handleDownloadPdf}
            className="text-[11px] px-2.5 py-1 rounded-md border transition-colors hover:border-primary/30"
            style={{
              color: 'var(--color-ink-secondary)',
              borderColor: 'var(--color-border-subtle)',
              background: 'var(--color-app-bg)',
            }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Chart grid */}
      <div id="dashboard-grid" className={`grid ${gridCols} gap-3`}>
        {charts.map((item, i) => (
          <div key={i} className="rounded-lg border p-3" style={{
            borderColor: 'var(--color-border-subtle)',
            background: 'var(--color-app-bg)',
          }}>
            {item.error ? (
              <div className="rounded-md p-3" style={{
                background: 'var(--color-error-soft)',
                border: '1px solid rgba(217, 69, 69, 0.15)',
              }}>
                <div className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                  {item.title || `Chart ${i + 1}`}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>
                  {item.error}
                </div>
              </div>
            ) : item.data && item.data.length > 0 ? (
              <AutoChart
                chart={{
                  tag: 'vis-db-chart' as const,
                  type: item.type || 'response_table',
                  title: item.title,
                  describe: item.describe,
                  sql: item.sql,
                  data: item.data,
                }}
                height={220}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-1">
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                  {item.title || `Chart ${i + 1}`}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
                  No data available
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-[10px] mt-3 text-right" style={{ color: 'var(--color-ink-tertiary)' }}>
        Generated at {new Date().toLocaleString()}
      </div>
    </div>
  );
}
