/**
 * AgentFlowPanel — terminal/CLI-style Agent timeline.
 * Uses project CSS variables for seamless dual-theme support.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Database } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import type { AgentStep, StepStatus } from '../../types/agent';
import { NODE_ORDER } from '../../types/agent';

interface AgentFlowPanelProps {
  user: any;
  connections: any[];
  selectedConnId: number | '';
  selectedConfigId: number | null;
  onConnectionChange: (connId: number) => void;
}

const NODE_ICONS: Record<string, string> = {
  EVIDENCE_RECALL: '🔍', SCHEMA_LINKING: '🔗', FEASIBILITY_ASSESSMENT: '✅',
  PLANNER: '📋', HITL: '👤', SQL_GENERATION: '▷', SQL_EXECUTION: '▶', REPORT: '◉',
};
const NODE_LABELS: Record<string, string> = {
  EVIDENCE_RECALL: 'Knowledge Recall', SCHEMA_LINKING: 'Schema Linking',
  FEASIBILITY_ASSESSMENT: 'Feasibility Assessment', PLANNER: 'Planning',
  HITL: 'Human Review', SQL_GENERATION: 'SQL Generation', SQL_EXECUTION: 'SQL Execution',
  REPORT: 'Report',
};

function StepLine({ step, order }: { step: AgentStep; order: number }) {
  const statusChar =
    step.status === 'success' ? '✓' : step.status === 'running' ? '◉' :
    step.status === 'error' ? '✗' : '○';
  const icon = NODE_ICONS[step.name] || '•';
  const label = NODE_LABELS[step.name] || step.name;

  return (
    <div className="font-mono">
      <div className="flex items-start gap-2 py-1">
        <span className={`w-5 flex-shrink-0 text-sm ${
          step.status === 'success' ? 'text-[#16a34a]' :
          step.status === 'running' ? 'text-primary' :
          step.status === 'error' ? 'text-error' : 'text-on-surface-variant/50'
        }`}>
          {step.status === 'running'
            ? <Loader2 className="w-3.5 h-3.5 inline animate-spin" />
            : statusChar}
        </span>
        <span className="text-on-surface-variant/60 text-xs w-6 flex-shrink-0">[{order}]</span>
        <span className="text-on-surface text-sm">{icon} {label}</span>
        {step.durationMs != null && step.status === 'success' && (
          <span className="text-on-surface-variant/50 text-xs ml-2">({step.durationMs}ms)</span>
        )}
      </div>

      {step.status === 'success' && (
        <div className="ml-14 pb-2">
          {step.data?.rewriteQuery && (
            <div className="text-on-surface-variant/70 text-xs mb-1">
              <span className="text-primary">$</span> {step.data.rewriteQuery}
            </div>
          )}
          {step.data?.sql && (
            <pre className="text-xs text-on-surface bg-surface-container-low rounded px-3 py-2 mt-1 overflow-x-auto border-l-2 border-primary/30 whitespace-pre-wrap">
              <code>{step.data.sql}</code>
            </pre>
          )}
          {step.data?.evidence && step.data.evidence !== '' && step.data.evidence !== '无' && (
            <div className="text-on-surface-variant/60 text-xs mt-1 italic">{step.data.evidence}</div>
          )}
          {step.data?.report && (
            <div className="text-on-surface text-xs mt-1 leading-relaxed whitespace-pre-wrap">{step.data.report}</div>
          )}
        </div>
      )}

      {step.status === 'running' && (
        <div className="ml-14 pb-2">
          <span className="text-on-surface-variant/50 text-xs animate-pulse">Processing...</span>
        </div>
      )}
    </div>
  );
}

function ConnectorLine() {
  return <div className="ml-[17px] w-px h-4 bg-outline-variant/30" />;
}

export default function AgentFlowPanel({
  user, connections, selectedConnId, selectedConfigId, onConnectionChange,
}: AgentFlowPanelProps) {
  const { theme } = useSettings();
  const [query, setQuery] = useState('');
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [dbConnected, setDbConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [steps, error]);
  useEffect(() => { setDbConnected(selectedConnId !== '' && selectedConnId !== null); }, [selectedConnId]);

  const handleSend = async () => {
    if (!query.trim() || !selectedConnId) return;
    setSteps([]); setError(''); setIsStreaming(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/agent/sql/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        credentials: 'include',
        body: JSON.stringify({ userId: user?.id || 1, userInput: query,
          connectionId: selectedConnId || null, tableNames: [], llmConfigId: selectedConfigId }),
        signal: abortRef.current.signal,
      });
      if (!response.body) throw new Error('No readable stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = '';
      const stepStartTimes: Record<string, number> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = (partial + chunk).split('\n');
        partial = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          let dataStr = trimmed.replace(/^data:+/, '').trim();
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr);
            if (event.type === 'COMPLETED') { setIsStreaming(false); continue; }
            if (event.type === 'ERROR') { setError(event.message || 'Agent execution failed'); setIsStreaming(false); continue; }
            const nodeName = event.nodeName;
            if (!nodeName) continue;
            if (!stepStartTimes[nodeName]) stepStartTimes[nodeName] = Date.now();

            const newSteps: AgentStep[] = [];
            let foundCurrent = false;
            for (const n of NODE_ORDER) {
              if (n === nodeName) {
                newSteps.push({ id: n, name: n, content: '', status: 'success', data: event.data,
                  durationMs: Math.round(Date.now() - (stepStartTimes[n] || Date.now())) });
                foundCurrent = true;
              } else if (!foundCurrent) {
                newSteps.push({ id: n, name: n, content: '', status: 'pending' });
              }
            }
            setSteps(newSteps);
          } catch (e) { /* ignore */ }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err.message || 'Connection error');
    } finally { setIsStreaming(false); abortRef.current = null; }
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low border-b border-outline-variant/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-primary font-bold text-sm font-mono">SQL Agent</span>
          <span className="text-on-surface-variant/40 text-xs font-mono">v1.0</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Database size={12} className={dbConnected ? 'text-primary' : 'text-on-surface-variant/40'} />
            <select
              className="bg-transparent text-xs font-mono text-on-surface-variant border border-outline-variant/30 rounded px-2 py-0.5 outline-none focus:border-outline-variant"
              value={selectedConnId}
              onChange={(e) => onConnectionChange(e.target.value ? Number(e.target.value) : 0)}
            >
              <option value="">Select Database</option>
              {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-primary' : 'bg-outline-variant'}`} />
        </div>
      </div>

      {/* Main output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed" style={{ scrollBehavior: 'smooth' }}>
        {steps.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
            <div className="text-4xl mb-4">⎈</div>
            <p className="text-sm mb-1 text-on-surface">SQL Agent Terminal</p>
            <p className="text-xs text-on-surface-variant">Ask a question in natural language to generate SQL</p>
            <div className="mt-6 text-xs text-on-surface-variant/50">
              <span className="text-primary/50">❯</span> Type your query below and press Enter
            </div>
          </div>
        )}

        {query && steps.length > 0 && (
          <div className="mb-3 pb-3 border-b border-outline-variant/20">
            <div className="flex items-start gap-2">
              <span className="text-primary w-5 flex-shrink-0">❯</span>
              <span className="text-on-surface text-sm">{query}</span>
            </div>
          </div>
        )}

        {steps.map((step, idx) => (
          <div key={step.id}>
            <StepLine step={step} order={idx + 1} />
            {idx < steps.length - 1 && <ConnectorLine />}
          </div>
        ))}

        {error && (
          <div className="mt-3 flex items-start gap-2 text-error text-xs"><span>✗</span><span>{error}</span></div>
        )}

        {isStreaming && steps.length === 0 && (
          <div className="flex items-center gap-2 text-on-surface-variant/50 text-xs animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />Initializing agent...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-outline-variant/20 bg-surface">
        <div className="flex items-start px-4 py-3 gap-3">
          <span className="text-primary font-mono text-sm pt-2 flex-shrink-0">❯</span>
          <div className="flex-1 relative">
            <textarea
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (query.trim() && !isStreaming) handleSend(); } }}
              className="w-full bg-transparent text-on-surface text-sm font-mono resize-none outline-none pt-2 placeholder-on-surface-variant/40"
              placeholder="Ask a question to generate SQL..." rows={2} disabled={isStreaming}
            />
          </div>
          <button onClick={handleSend} disabled={isStreaming || !query.trim() || !dbConnected}
            className="text-xs font-mono px-3 py-1.5 rounded text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors mt-1 flex-shrink-0">
            {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Run'}
          </button>
        </div>
        {!dbConnected && (
          <p className="px-4 pb-2 text-[10px] text-error font-mono">Select a database connection before running queries.</p>
        )}
      </div>
    </div>
  );
}