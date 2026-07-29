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
      <div className="p-4 text-sm text-on-surface-variant/60">
        No charts in dashboard
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          {dashboard.title && (
            <h3 className="text-base font-semibold">{dashboard.title}</h3>
          )}
          <div className="text-xs text-on-surface-variant/50">
            {charts.length} chart{charts.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownloadPng}
            className="text-xs px-2 py-1 rounded border border-outline-variant/30 hover:bg-surface-variant/20"
          >
            Export PNG
          </button>
          <button
            onClick={handleDownloadPdf}
            className="text-xs px-2 py-1 rounded border border-outline-variant/30 hover:bg-surface-variant/20"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Chart grid */}
      <div id="dashboard-grid" className={`grid ${gridCols} gap-3 bg-white p-2 rounded`}>
        {charts.map((item, i) => (
          <div key={i} className="dashboard-chart-cell">
            {item.error ? (
              <div className="rounded border border-red-300/30 bg-red-50/10 p-3">
                <div className="text-sm font-medium text-red-600">{item.title || `Chart ${i + 1}`}</div>
                <div className="text-xs text-red-500 mt-1">{item.error}</div>
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
              <div className="rounded border border-outline-variant/20 bg-surface p-3">
                <div className="text-sm font-medium">{item.title || `Chart ${i + 1}`}</div>
                <div className="text-xs text-on-surface-variant/40 mt-1">No data available</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-on-surface-variant/30 mt-2 text-right">
        Generated at {new Date().toLocaleString()}
      </div>
    </div>
  );
}
