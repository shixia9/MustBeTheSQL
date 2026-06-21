/**
 * AgentFlowPanel — terminal/CLI-style Agent timeline.
 * Streams SSE events and displays progressive per-node results as they arrive.
 */
import { useState, useRef, useEffect } from 'react';
import { Loader2, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentStep, StepStatus } from '../../types/agent';

interface AgentFlowPanelProps {
  user: any;
  connections: any[];
  selectedConnId: number | '';
  selectedConfigId: number | null;
  onConnectionChange: (connId: number) => void;
}

/** Phase 2 active nodes — subset of NODE_ORDER actually wired in the graph. */
const ACTIVE_NODES = ['EVIDENCE_RECALL', 'SCHEMA_LINKING', 'SQL_GENERATION', 'REPORT'];

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

/** Strip ```markdown ... ``` wrapper if present */
function stripMdCodeBlock(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:markdown)?\s*\n([\s\S]*?)\n?```$/);
  return m ? m[1] : text;
}

/** Render report markdown with project-consistent styling */
function ReportMarkdown({ content }: { content: string }) {
  return (
    <div className="text-xs text-on-surface-variant leading-relaxed mt-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-sm font-bold text-on-surface mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xs font-bold text-on-surface mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-semibold text-on-surface mt-1 mb-0.5">{children}</h3>,
          p: ({ children }) => <p className="text-xs text-on-surface-variant leading-relaxed mb-1">{children}</p>,
          ul: ({ children }) => <ul className="text-xs text-on-surface-variant list-disc ml-4 mb-1">{children}</ul>,
          ol: ({ children }) => <ol className="text-xs text-on-surface-variant list-decimal ml-4 mb-1">{children}</ol>,
          li: ({ children }) => <li className="text-xs text-on-surface-variant mb-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-on-surface">{children}</strong>,
          code: ({ className, children, ...props }: any) => {
            const isBlock = Boolean(className) || (typeof children === 'string' && children.includes('\n'));
            return isBlock ? (
              <pre className="text-[10px] p-2 bg-surface-container-low rounded overflow-x-auto max-h-32 font-mono border-l-2 border-primary/30 whitespace-pre-wrap my-1">
                <code className={className} {...props}>{children}</code>
              </pre>
            ) : (
              <code className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary font-mono" {...props}>{children}</code>
            );
          },
          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-3 my-1 text-xs text-on-surface-variant/70 italic">{children}</blockquote>,
          table: ({ children }) => <table className="text-[10px] w-full border-collapse my-1 border border-outline-variant/20 rounded">{children}</table>,
          th: ({ children }) => <th className="px-2 py-1 text-left text-on-surface font-semibold bg-surface-container-low border-b border-outline-variant/20">{children}</th>,
          td: ({ children }) => <td className="px-2 py-1 border-b border-outline-variant/10 text-on-surface-variant">{children}</td>,
          hr: () => <hr className="border-outline-variant/20 my-2" />,
        }}
      >
        {stripMdCodeBlock(content)}
      </ReactMarkdown>
    </div>
  );
}

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
          {step.data?.filteredTables && Array.isArray(step.data.filteredTables) && step.data.filteredTables.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {step.data.filteredTables.map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{t}</span>
              ))}
            </div>
          )}
          {step.data?.tableRelation && (
            <details className="mt-1">
              <summary className="text-xs text-on-surface-variant/70 cursor-pointer select-none">
                Schema Context (click to expand)
              </summary>
              <pre className="text-[10px] text-on-surface-variant/60 mt-1 p-2 bg-surface-container-low rounded overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                {step.data.tableRelation}
              </pre>
            </details>
          )}
          {(() => {
            // Report content — try both 'report' (controller-mapped) and 'reportResult' (raw state key)
            const reportText = step.data?.report ?? step.data?.reportResult ?? '';
            if (reportText) {
              return <ReportMarkdown content={reportText} />;
            }
            // step.data exists with unknown keys — dump as JSON for debugging
            if (step.data && Object.keys(step.data).length > 0 && !step.data?.sql && !step.data?.rewriteQuery && !step.data?.evidence && !step.data?.tableRelation && !step.data?.filteredTables) {
              return <pre className="text-xs text-on-surface-variant/60 mt-1 p-2 bg-surface-container-low rounded overflow-x-auto max-h-48">{JSON.stringify(step.data, null, 2)}</pre>;
            }
            // REPORT step completed but no data found — show a minimal indicator
            if (step.name === 'REPORT') {
              return <div className="text-on-surface-variant/40 text-xs mt-1 italic">Report generated</div>;
            }
            return null;
          })()}
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
  const [query, setQuery] = useState('');
  const [sentQuery, setSentQuery] = useState('');
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
    setSentQuery(query);
    setError('');
    setIsStreaming(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const sentText = query;
    setQuery('');

    // Initialize only the first node — others appear dynamically as they start
    const stepStartTime = Date.now();
    setSteps([{
      id: ACTIVE_NODES[0],
      name: ACTIVE_NODES[0],
      content: '',
      status: 'running' as StepStatus,
    }]);

    try {
      const response = await fetch('/api/v1/agent/sql/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id || 1,
          userInput: sentText,
          connectionId: selectedConnId || null,
          tableNames: [],
          llmConfigId: selectedConfigId,
        }),
        signal: abortRef.current.signal,
      });
      if (!response.body) throw new Error('No readable stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partial = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = (partial + chunk).split('\n');
        partial = lines.pop() || '';

        // Collect all events in this chunk, then process in a SINGLE setSteps update
        // to avoid React batching issues where function updaters see stale state.
        type BatchItem =
          | { type: 'COMPLETED' }
          | { type: 'ERROR'; message: string }
          | { type: 'NODE'; nodeName: string; nodeIdx: number; data: any };

        const batch: BatchItem[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:+/, '').trim();
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr);

            if (event.type === 'COMPLETED') {
              batch.push({ type: 'COMPLETED' });
              continue;
            }
            if (event.type === 'ERROR') {
              batch.push({ type: 'ERROR', message: event.message || 'Agent execution failed' });
              continue;
            }

            // Per-node completion events
            const nodeName = event.nodeName;
            if (!nodeName || !ACTIVE_NODES.includes(nodeName)) continue;
            const nodeIdx = ACTIVE_NODES.indexOf(nodeName);

            batch.push({ type: 'NODE', nodeName, nodeIdx, data: event.data });
          } catch (_) { /* ignore malformed JSON */ }
        }

        // Apply all batched updates in a SINGLE setSteps call
        if (batch.length > 0) {
          let hasCompleted = false;
          let hasError = false;
          let errorMsg = '';
          setSteps(prev => {
            // Manually chain updates — prev is stable for this updater call
            let current = prev;

            for (const update of batch) {
              if (update.type === 'NODE') {
                // Ensure this step exists — SSE events may arrive out of order,
                // so a node that hasn't been pre-appended yet must be inserted.
                if (!current.some(s => s.name === update.nodeName)) {
                  // Insert in ACTIVE_NODES order: find the right position
                  const insertIdx = ACTIVE_NODES.indexOf(update.nodeName);
                  // Place after the highest-ordered step that already exists
                  let targetPos = 0;
                  for (let i = 0; i < current.length; i++) {
                    const existingIdx = ACTIVE_NODES.indexOf(current[i].name);
                    if (existingIdx < insertIdx) targetPos = i + 1;
                  }
                  current = [
                    ...current.slice(0, targetPos),
                    { id: update.nodeName, name: update.nodeName, content: '', status: 'running' as StepStatus },
                    ...current.slice(targetPos),
                  ];
                }
                // Update the matching step with completion data
                current = current.map(step =>
                  step.name === update.nodeName
                    ? { ...step, status: 'success' as StepStatus, data: update.data, durationMs: Math.round(Date.now() - stepStartTime) }
                    : step
                );
                // Pre-append the next expected node so a running indicator appears
                const nextIdx = update.nodeIdx + 1;
                const nextName = nextIdx < ACTIVE_NODES.length ? ACTIVE_NODES[nextIdx] : null;
                if (nextName && !current.some(s => s.name === nextName)) {
                  current = [...current, {
                    id: nextName,
                    name: nextName,
                    content: '',
                    status: 'running' as StepStatus,
                  }];
                }
              } else if (update.type === 'COMPLETED') {
                hasCompleted = true;
                current = current.map(s =>
                  s.status === 'running'
                    ? { ...s, status: 'success' as StepStatus, durationMs: Math.round(Date.now() - stepStartTime) }
                    : s
                );
              } else if (update.type === 'ERROR') {
                hasError = true;
                errorMsg = update.message || '';
                current = current.map(s =>
                  s.status === 'running' ? { ...s, status: 'error' as StepStatus } : s
                );
              }
            }
            // Always re-sort by ACTIVE_NODES order so display is correct
            // regardless of SSE event arrival order
            current.sort((a, b) => {
              const ai = ACTIVE_NODES.indexOf(a.name);
              const bi = ACTIVE_NODES.indexOf(b.name);
              return ai - bi;
            });
            return current;
          });
          if (hasCompleted) setIsStreaming(false);
          if (hasError) {
            setError(errorMsg);
            setIsStreaming(false);
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setSteps(prev => prev.map(s =>
        s.status === 'running' ? { ...s, status: 'error' as StepStatus } : s
      ));
      setError(err.message || 'Connection error');
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low border-b border-outline-variant/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-primary font-bold text-sm font-mono">SQL Agent</span>
          <span className="text-on-surface-variant/40 text-xs font-mono">v2.0</span>
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-4 font-mono text-sm leading-relaxed" style={{ scrollBehavior: 'smooth' }}>
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

        {sentQuery && steps.length > 0 && (
          <div className="mb-3 pb-3 border-b border-outline-variant/20">
            <div className="flex items-start gap-2">
              <span className="text-primary w-5 flex-shrink-0">❯</span>
              <span className="text-on-surface text-sm">{sentQuery}</span>
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

      <div className="flex-shrink-0 border-t border-outline-variant/20 bg-surface">
        <div className="flex items-start px-4 py-3 gap-3">
          <span className="text-primary font-mono text-sm pt-2 flex-shrink-0">❯</span>
          <div className="flex-1 relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (query.trim() && !isStreaming) handleSend();
                }
              }}
              className="w-full bg-transparent text-on-surface text-sm font-mono resize-none outline-none pt-2 placeholder-on-surface-variant/40"
              placeholder="Ask a question to generate SQL..."
              rows={2}
              disabled={isStreaming}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isStreaming || !query.trim() || !dbConnected}
            className="text-xs font-mono px-3 py-1.5 rounded text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors mt-1 flex-shrink-0"
          >
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