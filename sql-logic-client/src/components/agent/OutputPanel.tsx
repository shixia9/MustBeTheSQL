import { useState } from 'react';
import { getIcon } from '../../assets/icons';

interface StepData { nodeName: string; status: string; content?: string; output?: any; messageType?: string }
interface TurnData { question: string; steps: StepData[] }

const outputTabs = [
  { key: 'report', label: 'Report', icon: 'report' },
  { key: 'code', label: 'SQL / Code', icon: 'code' },
  { key: 'table', label: 'Data', icon: 'table' },
  { key: 'chart', label: 'Chart', icon: 'chart' },
];

export default function OutputPanel({ output, steps, turns }: {
  output: any;
  steps: StepData[];
  turns: TurnData[];
}) {
  const [activeTab, setActiveTab] = useState('report');

  const reportSteps = steps.filter(s =>
    s.nodeName === 'REPORT' || s.nodeName === 'DASHBOARD'
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
              reportSteps.map((s, i) => (
                <div key={i} className="whitespace-pre-wrap" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--color-ink)' }}>
                  {s.output?.report || s.content || 'Report content pending...'}
                </div>
              ))
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
          <div className="flex items-center justify-center h-32" style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>
            Chart view — pending visualization integration
          </div>
        )}
      </div>
    </div>
  );
}
