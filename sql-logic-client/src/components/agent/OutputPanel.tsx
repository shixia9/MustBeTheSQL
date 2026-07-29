import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getIcon } from '../../assets/icons';
import { parseVisContent, stripVisContent } from '../../utils/visContentParser';
import AutoChart from '../chart/AutoChart';
import DashboardGrid from '../dashboard/DashboardGrid';

interface StepData { nodeName: string; status: string; content?: string; output?: any; messageType?: string }
interface TurnData { question: string; steps: StepData[] }

const outputTabs = [
  { key: 'report', label: 'Report', icon: 'report' },
  { key: 'code', label: 'SQL / Code', icon: 'code' },
  { key: 'table', label: 'Data', icon: 'table' },
  { key: 'chart', label: 'Chart', icon: 'chart' },
];

export default function OutputPanel({ output: _output, steps, turns: _turns }: {
  output: any;
  steps: StepData[];
  turns: TurnData[];
}) {
  const [activeTab, setActiveTab] = useState('report');

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

  const allCode = [...sqlSteps, ...codeSteps];

  return (
    <div className="flex flex-col h-full" style={{
      borderLeft: '1px solid var(--color-border-subtle)',
      background: 'var(--color-content-bg)',
    }}>
      {/* Tab bar */}
      <div className="flex px-1.5 pt-1.5 pb-0 gap-0.5" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
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
        {/* Report tab */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            {planSteps.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span style={{ color: '#64748b' }}>Plan</span>
                </div>
                {planSteps.map((s, i) => (
                  <div key={i} className="mb-1">
                    {s.output?.plan && (
                      <pre className="p-2 rounded text-xs overflow-auto" style={{
                        background: 'var(--color-app-bg)',
                        color: 'var(--color-ink-secondary)',
                        fontFamily: '"JetBrains Mono", monospace',
                        maxHeight: '200px',
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
                const raw = s.output?.report || s.content || 'Report content pending...';
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
                  {/* Render vis charts/dashboards extracted from the markdown */}
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

        {/* Code tab */}
        {activeTab === 'code' && (
          <div className="space-y-3">
            {allCode.length > 0 ? (
              allCode.map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-ink-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.nodeName.replace('_', ' ')}
                  </div>
                  {s.output?.sql && (
                    <pre className="p-3 rounded-lg text-xs overflow-auto" style={{
                      background: '#0d1117',
                      color: '#a3e635',
                      fontFamily: '"JetBrains Mono", monospace',
                      lineHeight: 1.6,
                      maxHeight: '300px',
                    }}>
                      {s.output.sql}
                    </pre>
                  )}
                  {s.output?.pythonCode && (
                    <pre className="p-3 rounded-lg text-xs overflow-auto" style={{
                      background: '#0d1117',
                      color: '#38bdf8',
                      fontFamily: '"JetBrains Mono", monospace',
                      lineHeight: 1.6,
                      maxHeight: '300px',
                    }}>
                      {s.output.pythonCode}
                    </pre>
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

        {/* Data / Table tab */}
        {activeTab === 'table' && (
          <div className="space-y-3">
            {sqlSteps.filter(s => s.output?.sqlExecutionResult).length > 0 ? (
              sqlSteps.filter(s => s.output?.sqlExecutionResult).map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-ink-tertiary)', marginBottom: '4px' }}>
                    Query Result
                  </div>
                  <pre className="p-3 rounded-lg text-xs overflow-auto" style={{
                    background: 'var(--color-app-bg)',
                    color: 'var(--color-ink)',
                    fontFamily: '"JetBrains Mono", monospace',
                    lineHeight: 1.6,
                    maxHeight: '300px',
                  }}>
                    {JSON.stringify(s.output.sqlExecutionResult, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-32" style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>
                Execution results will appear here
              </div>
            )}
          </div>
        )}

        {/* Chart tab */}
        {activeTab === 'chart' && (
          <div className="space-y-3">
            {(() => {
              const allContent = steps
                .map(s => s.output?.report || s.content || '')
                .filter(Boolean);
              const allVis = allContent.flatMap(c => parseVisContent(c));
              return allVis.length > 0 ? (
                allVis.map((vis, i) =>
                  vis.tag === 'vis-dashboard' ? (
                    <DashboardGrid key={i} dashboard={vis} />
                  ) : (
                    <AutoChart key={i} chart={vis} height={260} />
                  )
                )
              ) : (
                <div className="flex items-center justify-center h-32" style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>
                  Charts will appear here when data is visualized
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
