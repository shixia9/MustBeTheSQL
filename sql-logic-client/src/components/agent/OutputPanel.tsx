import { useState } from 'react';
import { getIcon } from '../../assets/icons';

interface StepData { nodeName: string; status: string; content?: string; output?: any }
interface TurnData { question: string; steps: StepData[] }

const outputTabs = [
  { key: 'chart', label: 'Chart', icon: 'chart' },
  { key: 'table', label: 'Table', icon: 'table' },
  { key: 'report', label: 'Report', icon: 'report' },
  { key: 'code', label: 'Code', icon: 'code' },
];

export default function OutputPanel({ output, steps, turns }: {
  output: any;
  steps: StepData[];
  turns: TurnData[];
}) {
  const [activeTab, setActiveTab] = useState('report');

  const latestCompleted = [...steps].reverse().find(s => s.status === 'completed');
  const reportSteps = steps.filter(s => s.nodeName === 'REPORT' || s.nodeName === 'DASHBOARD');
  const sqlSteps = steps.filter(s =>
    s.nodeName === 'SQL_GENERATION' || s.nodeName === 'SQL_EXECUTION' || s.nodeName === 'DATA_SCIENTIST'
  );

  return (
    <div className="flex flex-col h-full border-l border-outline-variant bg-surface">
      {/* Tab bar */}
      <div className="flex border-b border-outline-variant bg-surface-container-low px-2">
        {outputTabs.map(tab => {
          const Icon = getIcon(tab.icon);
          return (
            <button
              key={tab.key}
              className={`tab-item flex items-center gap-1`}
              onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? { borderBottomColor: '#38bdf8', color: '#38bdf8' } : {}}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'report' && (
          <div className="font-sans text-sm text-on-surface leading-relaxed">
            {reportSteps.length > 0 ? (
              reportSteps.map((s, i) => (
                <div key={i} className="mb-4 whitespace-pre-wrap">{s.content || 'Report content pending...'}</div>
              ))
            ) : latestCompleted ? (
              <div className="whitespace-pre-wrap">{latestCompleted.content || 'Processing...'}</div>
            ) : (
              <div className="text-on-surface-variant/40 font-mono text-xs flex items-center justify-center h-32">
                &gt; awaiting agent execution...
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="font-mono text-xs">
            {sqlSteps.length > 0 ? (
              sqlSteps.map((s, i) => (
                <div key={i} className="mb-3">
                  <div className="text-[10px] text-on-surface-variant mb-1">{s.nodeName}</div>
                  <pre className="p-3 bg-[#090d13] rounded overflow-auto text-[#a3e635] text-[11px]">
                    {s.content || '-- no SQL generated'}
                  </pre>
                </div>
              ))
            ) : (
              <div className="text-on-surface-variant/40 flex items-center justify-center h-32">
                &gt; no code output yet
              </div>
            )}
          </div>
        )}

        {activeTab === 'table' && (
          <div className="text-on-surface-variant/40 font-mono text-xs flex items-center justify-center h-32">
            &gt; table view — pending
          </div>
        )}

        {activeTab === 'chart' && (
          <div className="text-on-surface-variant/40 font-mono text-xs flex items-center justify-center h-32">
            &gt; chart view — pending
          </div>
        )}
      </div>
    </div>
  );
}
