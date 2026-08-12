import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getIcon } from '../../assets/icons';
import { parseVisContent, stripVisContent, extractHtmlContent, looksLikeChartJson, buildChartSummary } from '../../utils/visContentParser';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { api } from '../../api/client';
import storageUtils from '../../utils/storageUtils';
import AutoChart from '../chart/AutoChart';
import DashboardGrid from '../dashboard/DashboardGrid';
import HtmlReportView from './HtmlReportView';
import SqlCodeBlock from './cards/SqlCodeBlock';
import SqlResultTable from './cards/SqlResultTable';
import SandboxPanel from './SandboxPanel';
import type { TerminalExecution } from './TerminalRenderer';

interface StepData { nodeName: string; status: string; content?: string; output?: any; messageType?: string }
interface TurnData { question: string; steps: StepData[] }

const outputTabs = [
  { key: 'report', label: 'Report', icon: 'report' },
  { key: 'code', label: 'SQL / Code', icon: 'code' },
  { key: 'terminal', label: 'Terminal', icon: 'code' },
  { key: 'table', label: 'Data', icon: 'table' },
  { key: 'chart', label: 'Chart', icon: 'chart' },
];

/** Parse chart JSON into ParsedVisChart-like items with only metadata (no data rows) */
function parseChartMetaJson(text: string): { title?: string; type: string; sql?: string; thought?: string }[] {
  try {
    const parsed = JSON.parse(text.trim());
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.map((item: any) => ({
      title: item.title || item.thought?.substring(0, 60),
      type: item.display_type || 'response_table',
      sql: item.sql,
      thought: item.thought,
    }));
  } catch { return []; }
}

/** Extract SQL execution result from step output (various shapes) */
function extractExecResult(output: any): { columns: string[]; rows: Record<string, any>[] } | null {
  if (!output) return null;
  // Direct result shape: { columns: [...], rows: [...] }
  if (output.columns && output.rows) {
    return {
      columns: output.columns.map((c: any) => typeof c === 'string' ? c : c.name || '?'),
      rows: output.rows,
    };
  }
  // sqlExecutionResult field
  if (output.sqlExecutionResult) {
    const r = output.sqlExecutionResult;
    if (r.columns && r.rows) {
      return {
        columns: r.columns.map((c: any) => typeof c === 'string' ? c : c.name || '?'),
        rows: r.rows,
      };
    }
    // It might be a raw JSON object that needs parsing
    if (typeof r === 'object') {
      const keys = Object.keys(r);
      if (keys.length > 0 && Array.isArray(r[keys[0]])) {
        return { columns: keys, rows: r[keys[0]].map((_: any, i: number) => {
          const row: Record<string, any> = {};
          for (const k of keys) row[k] = r[k][i];
          return row;
        })};
      }
    }
  }
  // content field with vis-db-chart
  if (output.content && typeof output.content === 'string') {
    const vis = parseVisContent(output.content);
    if (vis.length > 0 && vis[0].tag === 'vis-db-chart') {
      return {
        columns: getColumnNames(vis[0]),
        rows: vis[0].data,
      };
    }
  }
  return null;
}

function getColumnNames(chart: any): string[] {
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

export default function OutputPanel({ output: _output, steps, turns: _turns }: {
  output: any;
  steps: StepData[];
  turns: TurnData[];
}) {
  const [activeTab, setActiveTab] = useState('report');
  const [executingSql, setExecutingSql] = useState<string | null>(null);
  const [executeResult, setExecuteResult] = useState<{ columns: string[]; rows: Record<string, any>[]; sql: string } | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  // Manual sandbox execution — one pending run at a time.
  const [manualCode, setManualCode] = useState<string>('');
  const [manualLanguage, setManualLanguage] = useState<string>('python');
  const [manualExecuting, setManualExecuting] = useState(false);
  const [manualResult, setManualResult] = useState<TerminalExecution | null>(null);
  const activeConnectionId = useWorkspaceStore(state => state.activeConnectionId);

  const reportSteps = steps.filter(s =>
    s.nodeName === 'REPORT' || s.nodeName === 'DASHBOARD'
    || s.nodeName === 'DASHBOARD_ASSISTANT'
  );
  const sqlSteps = steps.filter(s =>
    s.nodeName === 'SQL_GENERATION' || s.nodeName === 'SQL_EXECUTION'
    || s.nodeName === 'SQL_FIXER' || s.nodeName === 'DATA_SCIENTIST'
  );
  const codeSteps = steps.filter(s =>
    s.nodeName === 'PYTHON_GENERATION' || s.nodeName === 'PYTHON_EXECUTION'
    || s.nodeName === 'CODE_ASSISTANT'
  );
  const planSteps = steps.filter(s => s.nodeName === 'PLANNER' || s.nodeName === 'MANAGER');
  // Agent-driven sandbox executions (streamed via SANDBOX SSE events).
  const sandboxSteps = steps.filter(s => s.nodeName === 'SANDBOX');
  const sandboxExecutions: TerminalExecution[] = sandboxSteps.length > 0
    ? (sandboxSteps[sandboxSteps.length - 1].output?.executions || [])
    : [];

  const allCode = [...sqlSteps, ...codeSteps];

  // Collect all execution results for the Data tab
  const allExecResults = steps
    .map(s => ({ nodeName: s.nodeName, result: extractExecResult(s.output) }))
    .filter(e => e.result !== null);

  const handleExecuteSql = useCallback(async (sql: string) => {
    if (!activeConnectionId) {
      setExecuteError('No database connection selected');
      return;
    }
    setExecutingSql(sql);
    setExecuteError(null);
    setExecuteResult(null);
    try {
      const user = storageUtils.getUser();
      const userId = user?.id ?? 1;
      const res = await api.post<any>('/sql/execute', {
        userId,
        connectionId: activeConnectionId,
        sql,
        confirmed: true,
      });
      if (res.code === 200 && res.data) {
        const cols: string[] = res.data.columns || [];
        const rows: Record<string, any>[] = res.data.rows || [];
        setExecuteResult({ columns: cols, rows, sql });
      } else {
        setExecuteError(res.message || 'Execution failed');
      }
    } catch (e: any) {
      setExecuteError(e.message || 'Network error');
    } finally {
      setExecutingSql(null);
    }
  }, [activeConnectionId]);

  /** Manually run Python/shell code in the sandbox via the one-shot /run endpoint. 
   * Switches to the Terminal tab and renders the result inline. */
  const handleRunCode = useCallback(async (code: string, language: string = 'python') => {
    if (!code || code.trim().length === 0) return;
    setManualCode(code);
    setManualLanguage(language);
    setManualExecuting(true);
    setManualResult({
      language, code, stdout: '', stderr: '', isRunning: true,
    });
    setActiveTab('terminal');
    try {
      const res = await api.post<any>('/sandbox/run', { language, code });
      if (res.code === 200 && res.data) {
        const d = res.data;
        const disp = d.displayResult || {};
        setManualResult({
          language,
          code,
          stdout: d.stdout ?? disp.output ?? '',
          stderr: d.stderr ?? disp.error ?? '',
          exitCode: d.exitCode,
          durationMs: d.durationMs,
          status: d.status?.value || d.status || (disp.status),
          isRunning: false,
        });
      } else {
        setManualResult({
          language, code, stdout: '', stderr: res.message || 'Execution failed',
          exitCode: -1, status: 'error', isRunning: false,
        });
      }
    } catch (e: any) {
      setManualResult({
        language, code, stdout: '', stderr: e?.message || 'Network error',
        exitCode: -1, status: 'error', isRunning: false,
      });
    } finally {
      setManualExecuting(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-full" style={{
      borderLeft: '1px solid var(--color-border-subtle)',
      background: 'var(--color-content-bg)',
    }}>
      {/* Tab bar */}
      <div className="flex px-1.5 pt-1.5 pb-0 gap-0.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        {outputTabs.map(tab => {
          const Icon = getIcon(tab.icon);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors duration-100"
              style={{
                color: activeTab === tab.key ? 'var(--color-ink)' : 'var(--color-ink-tertiary)',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* ── Report tab ── */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            {planSteps.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Plan</span>
                </div>
                {planSteps.map((s, i) => (
                  <div key={i} className="mb-1">
                    {s.output?.plan && (
                      <pre className="p-2 rounded text-xs overflow-auto" style={{
                        background: 'var(--color-app-bg)',
                        color: 'var(--color-ink-secondary)',
                        fontFamily: '"JetBrains Mono", monospace',
                        maxHeight: '400px',
                      }}>
                        {s.output.plan}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
            {reportSteps.length > 0 ? (
              reportSteps.map((s, i) => {
                const raw = s.output?.report || s.output?.content || s.content || '';

                // HTML report: the backend extracts HTML into a dedicated
                // `htmlContent` field (stripped from `report`). Check it first,
                // then fall back to scanning the raw text for ```html fences.
                const htmlContent = s.output?.htmlContent || extractHtmlContent(raw);
                if (htmlContent) {
                  const cleanMarkdown = stripVisContent(raw.replace(/```html[\s\S]*?```/gi, ''));
                  return (
                    <div key={i} className="space-y-3">
                      <HtmlReportView htmlContent={htmlContent} title="Analysis Report" />
                      {cleanMarkdown && (
                        <details className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
                          <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-ink-tertiary)' }}>
                            Text Summary
                          </summary>
                          <div className="mt-2 leading-relaxed">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h3: ({ children }) => <h3 className="text-xs font-semibold mt-1 mb-1" style={{ color: 'var(--color-ink)' }}>{children}</h3>,
                                p: ({ children }) => <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</p>,
                                li: ({ children }) => <li className="text-xs mb-0.5" style={{ color: 'var(--color-ink-secondary)' }}>{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--color-ink)' }}>{children}</strong>,
                                ul: ({ children }) => <ul className="text-xs list-disc ml-4 mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</ul>,
                              }}
                            >
                              {cleanMarkdown}
                            </ReactMarkdown>
                          </div>
                        </details>
                      )}
                    </div>
                  );
                }

                // If the raw content looks like chart JSON, render chart cards + summary
                if (looksLikeChartJson(raw)) {
                  const chartMetas = parseChartMetaJson(raw);
                  const summary = buildChartSummary(raw);
                  const visItems = parseVisContent(raw);

                  return (
                    <div key={i} className="space-y-3">
                      {/* Generated summary */}
                      {summary && (
                        <div className="text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h3: ({ children }) => <h3 className="text-xs font-semibold mt-1 mb-1" style={{ color: 'var(--color-ink)' }}>{children}</h3>,
                              p: ({ children }) => <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</p>,
                              li: ({ children }) => <li className="text-xs mb-0.5" style={{ color: 'var(--color-ink-secondary)' }}>{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--color-ink)' }}>{children}</strong>,
                              ul: ({ children }) => <ul className="text-xs list-disc ml-4 mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</ul>,
                            }}
                          >
                            {summary}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Chart preview cards */}
                      {chartMetas.length > 0 && (
                        <div className="space-y-2">
                          {chartMetas.map((meta, mi) => (
                            <div key={mi} className="rounded-lg border p-3" style={{
                              borderColor: 'var(--color-border-subtle)',
                              background: 'var(--color-panel-bg)',
                            }}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                                  background: 'var(--color-primary-soft)',
                                  color: 'var(--color-primary)',
                                }}>
                                  {meta.type.replace('response_', '').replace('_chart', '').replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>
                                  {meta.title || `Chart ${mi + 1}`}
                                </span>
                              </div>
                              {meta.sql && (
                                <SqlCodeBlock code={meta.sql} language="sql" onExecute={() => handleExecuteSql(meta.sql!)} executing={executingSql === meta.sql} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Vis fences if any */}
                      {visItems.length > 0 && (
                        <div className="space-y-3">
                          {visItems.map((vis, vi) =>
                            vis.tag === 'vis-dashboard' ? (
                              <DashboardGrid key={vi} dashboard={vis} />
                            ) : (
                              <AutoChart key={vi} chart={vis} height={240} />
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                // Normal markdown report
                const cleanMarkdown = stripVisContent(raw);
                const visItems = parseVisContent(raw);
                return (
                  <div key={i} className="text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h1 className="text-sm font-bold mt-3 mb-1" style={{ color: 'var(--color-ink)' }}>{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xs font-bold mt-2 mb-1" style={{ color: 'var(--color-ink)' }}>{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs font-semibold mt-1 mb-0.5" style={{ color: 'var(--color-ink)' }}>{children}</h3>,
                        p: ({ children }) => <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</p>,
                        ul: ({ children }) => <ul className="text-xs list-disc ml-4 mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</ul>,
                        ol: ({ children }) => <ol className="text-xs list-decimal ml-4 mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</ol>,
                        li: ({ children }) => <li className="text-xs mb-0.5" style={{ color: 'var(--color-ink-secondary)' }}>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--color-ink)' }}>{children}</strong>,
                        code: ({ className, children, ...props }: any) => {
                          const isBlock = Boolean(className) || (typeof children === 'string' && children.includes('\n'));
                          return isBlock ? (
                            <pre className="text-[10px] p-2 rounded overflow-x-auto max-h-32 font-mono whitespace-pre-wrap my-1" style={{ background: 'var(--color-app-bg)', color: 'var(--color-ink-secondary)', borderLeft: '2px solid var(--color-primary)' }}>
                              <code className={className} {...props}>{children}</code>
                            </pre>
                          ) : (
                            <code className="text-[10px] px-1 py-0.5 rounded font-mono" style={{ background: 'var(--color-primary-soft, rgba(56,189,248,0.1))', color: 'var(--color-primary)' }} {...props}>{children}</code>
                          );
                        },
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-3 my-1 text-xs italic" style={{ color: 'var(--color-ink-tertiary)' }}>{children}</blockquote>,
                        table: ({ children }) => <table className="text-[10px] w-full border-collapse my-1 rounded" style={{ border: '1px solid var(--color-border-subtle)' }}>{children}</table>,
                        th: ({ children }) => <th className="px-2 py-1 text-left font-semibold border-b" style={{ color: 'var(--color-ink)', background: 'var(--color-app-bg)', borderColor: 'var(--color-border-subtle)' }}>{children}</th>,
                        td: ({ children }) => <td className="px-2 py-1 border-b" style={{ color: 'var(--color-ink-secondary)', borderColor: 'var(--color-border-subtle)' }}>{children}</td>,
                        hr: () => <hr className="my-2" style={{ borderColor: 'var(--color-border-subtle)' }} />,
                      }}
                    >
                      {cleanMarkdown}
                    </ReactMarkdown>
                    {visItems.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {visItems.map((vis, vi) =>
                          vis.tag === 'vis-dashboard' ? (
                            <DashboardGrid key={vi} dashboard={vis} />
                          ) : (
                            <AutoChart key={vi} chart={vis} height={240} />
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-32" style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>
                Awaiting agent execution...
              </div>
            )}
          </div>
        )}

        {/* ── Code tab ── */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            {allCode.length > 0 ? (
              allCode.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {s.nodeName.replace(/_/g, ' ')}
                    </span>
                    {s.status === 'completed' && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                    )}
                  </div>
                  {s.output?.sql && (
                    <SqlCodeBlock
                      code={s.output.sql}
                      language="sql"
                      onExecute={() => handleExecuteSql(s.output.sql)}
                      executing={executingSql === s.output.sql}
                    />
                  )}
                  {s.output?.pythonCode && (
                    <SqlCodeBlock
                      code={s.output.pythonCode}
                      language="python"
                      onExecute={() => handleRunCode(s.output.pythonCode, 'python')}
                      executing={manualExecuting && manualCode === s.output.pythonCode}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-32" style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>
                No code output yet
              </div>
            )}
          </div>
        )}

        {/* ── Terminal tab ── */}
        {activeTab === 'terminal' && (
          <SandboxPanel
            executions={sandboxExecutions}
            manualCode={manualCode}
            manualLanguage={manualLanguage}
            manualExecuting={manualExecuting}
            onManualRun={manualCode ? () => handleRunCode(manualCode, manualLanguage) : undefined}
            manualResult={manualResult}
          />
        )}

        {/* ── Data / Table tab ── */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            {allExecResults.length > 0 ? (
              allExecResults.map((er, i) => (
                <div key={i} className="rounded-lg border p-3" style={{
                  borderColor: 'var(--color-border-subtle)',
                  background: 'var(--color-panel-bg)',
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{
                      background: 'var(--color-semantic-execution-soft)',
                      color: 'var(--color-semantic-execution)',
                    }}>
                      {er.nodeName.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <SqlResultTable columns={er.result!.columns} rows={er.result!.rows} />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>
                <span>Execution results will appear here</span>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>
                  Run a query to see structured table output
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Chart tab ── */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            {(() => {
              const allContent = steps
                .map(s => s.output?.report || s.output?.content || s.content || '')
                .filter(Boolean);
              const allVis = allContent.flatMap(c => parseVisContent(c));

              // Also extract chart JSON from report steps for preview
              const chartJsonContent = reportSteps
                .map(s => s.output?.report || s.output?.content || s.content || '')
                .filter(c => looksLikeChartJson(c));

              if (allVis.length > 0) {
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--color-ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {allVis.length} visualization{allVis.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {allVis.map((vis, i) =>
                      vis.tag === 'vis-dashboard' ? (
                        <DashboardGrid key={i} dashboard={vis} />
                      ) : (
                        <div key={i} className="rounded-lg border p-3" style={{
                          borderColor: 'var(--color-border-subtle)',
                          background: 'var(--color-panel-bg)',
                        }}>
                          <AutoChart chart={vis} height={280} />
                        </div>
                      )
                    )}
                  </div>
                );
              }

              if (chartJsonContent.length > 0) {
                const allMetas = chartJsonContent.flatMap(c => parseChartMetaJson(c));
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--color-ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {allMetas.length} chart plan{allMetas.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--color-ink-tertiary)' }}>
                        (awaiting execution)
                      </span>
                    </div>
                    {allMetas.map((meta, mi) => (
                      <div key={mi} className="rounded-lg border p-3" style={{
                        borderColor: 'var(--color-border-subtle)',
                        background: 'var(--color-panel-bg)',
                      }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                            background: 'var(--color-primary-soft)',
                            color: 'var(--color-primary)',
                          }}>
                            {meta.type.replace('response_', '').replace('_chart', '').replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>
                            {meta.title || `Chart ${mi + 1}`}
                          </span>
                        </div>
                        {meta.sql && (
                          <SqlCodeBlock code={meta.sql} language="sql" onExecute={() => handleExecuteSql(meta.sql!)} executing={executingSql === meta.sql} />
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>
                  <span>Charts will appear here when data is visualized</span>
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>
                    Ask a chart question like "bar chart of sales by month"
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Execute result modal ── */}
        {(executeResult || executeError) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => { setExecuteResult(null); setExecuteError(null); }}>
            <div className="rounded-xl shadow-2xl max-w-3xl w-[90vw] max-h-[80vh] flex flex-col"
              style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
                    SQL Execution Result
                  </span>
                  {executeResult && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                      background: 'var(--color-success-soft)',
                      color: 'var(--color-success)',
                    }}>
                      {executeResult.rows.length} rows
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setExecuteResult(null); setExecuteError(null); }}
                  className="p-1 rounded hover:bg-surface-variant/20 transition-colors"
                  style={{ color: 'var(--color-ink-tertiary)' }}
                >
                  ✕
                </button>
              </div>
              {/* SQL */}
              <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-app-bg)' }}>
                <SqlCodeBlock
                  code={executeResult?.sql || ''}
                  language="sql"
                />
              </div>
              {/* Body */}
              <div className="flex-1 overflow-auto p-4">
                {executeError ? (
                  <div className="p-3 rounded border text-xs" style={{
                    borderColor: 'rgba(217, 69, 69, 0.2)',
                    background: 'var(--color-error-soft)',
                    color: 'var(--color-error)',
                  }}>
                    {executeError}
                  </div>
                ) : executeResult ? (
                  <SqlResultTable columns={executeResult.columns} rows={executeResult.rows} maxHeight={400} />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
