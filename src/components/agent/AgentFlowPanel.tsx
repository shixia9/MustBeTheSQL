/**
 * AgentFlowPanel — terminal/CLI-style Agent timeline.
 * Streams SSE events and displays progressive per-node results as they arrive.
 */
import { useState, useRef, useEffect } from 'react';
import { Loader2, Database, Table2, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentStep, StepStatus } from '../../types/agent';
import SqlCodeBlock from './cards/SqlCodeBlock';
import EvidenceRecallCard from './cards/EvidenceRecallCard';
import ResultChart from './cards/ResultChart';
import ThinkingSection from './cards/ThinkingSection';

interface AgentFlowPanelProps {
  user: any;
  connections: any[];
  selectedConnId: number | '';
  selectedConfigId: number | null;
  onConnectionChange: (connId: number) => void;
}

/** Phase 4 active nodes — the full set wired into the graph. */
const ACTIVE_NODES = [
  'EVIDENCE_RECALL', 'SCHEMA_LINKING', 'FEASIBILITY_ASSESSMENT',
  'PLANNER', 'HITL_GATE', 'HITL', 'PLAN_DISPATCH',
  'SQL_GENERATION', 'SQL_EXECUTION', 'SQL_FIXER',
  'PYTHON_GENERATION', 'PYTHON_EXECUTION', 'PYTHON_ANALYSIS',
  'REPORT',
];

/** Nodes that the PLAN_DISPATCH loop may trigger more than once per session.
 *  These are keyed by (name, step) on the timeline; all others by name alone. */
const LOOPED_NODES = new Set([
  'SQL_GENERATION', 'SQL_EXECUTION', 'SQL_FIXER',
  'PYTHON_GENERATION', 'PYTHON_EXECUTION', 'PYTHON_ANALYSIS',
]);

const NODE_ICONS: Record<string, string> = {
  EVIDENCE_RECALL: '🔍', SCHEMA_LINKING: '🔗', FEASIBILITY_ASSESSMENT: '✅',
  PLANNER: '📋', HITL_GATE: '🚦', HITL: '👤', PLAN_DISPATCH: '🧭',
  SQL_GENERATION: '▷', SQL_EXECUTION: '▶', SQL_FIXER: '🔧',
  PYTHON_GENERATION: '🐍', PYTHON_EXECUTION: '⚙', PYTHON_ANALYSIS: '📊',
  REPORT: '◉',
};
const NODE_LABELS: Record<string, string> = {
  EVIDENCE_RECALL: 'Knowledge Recall', SCHEMA_LINKING: 'Schema Linking',
  FEASIBILITY_ASSESSMENT: 'Feasibility Assessment', PLANNER: 'Planning',
  HITL_GATE: 'Review Gate', HITL: 'Human Review', PLAN_DISPATCH: 'Plan Dispatch',
  SQL_GENERATION: 'SQL Generation', SQL_EXECUTION: 'SQL Execution',
  SQL_FIXER: 'SQL Repair',
  PYTHON_GENERATION: 'Python Generation', PYTHON_EXECUTION: 'Python Execution',
  PYTHON_ANALYSIS: 'Python Analysis', REPORT: 'Report',
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

/** Render the Planner's multi-step plan: thought_process (collapsible) + step list. */
function PlanView({ plan }: { plan: string }) {
  let parsed: any = null;
  try { parsed = JSON.parse(plan); } catch { /* not JSON */ }
  if (!parsed) {
    return <pre className="text-[10px] text-on-surface-variant/60 mt-1 p-2 bg-surface-container-low rounded overflow-x-auto whitespace-pre-wrap max-h-40">{plan}</pre>;
  }
  const steps: any[] = Array.isArray(parsed.execution_plan) ? parsed.execution_plan : [];
  return (
    <div className="mt-1 text-xs">
      {parsed.thought_process && (
        <ThinkingSection summary="Thought process" defaultOpen={true}>
          <p className="text-on-surface-variant/70 mt-1 whitespace-pre-wrap">{parsed.thought_process}</p>
        </ThinkingSection>
      )}
      <div className="mt-1 space-y-0.5">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-primary flex-shrink-0">{s.step ?? i + 1}.</span>
            <div>
              <span className="text-[10px] px-1 rounded bg-primary/10 text-primary border border-primary/20">{s.tool_to_use}</span>
              <span className="text-on-surface-variant/80 ml-1">{s.tool_parameters?.instruction || s.tool_parameters?.summary_and_recommendations || ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Render an SQL execution result as a small table (first 8 rows + count) with optional chart toggle. */
function SqlResultView({ raw }: { raw: string }) {
  let parsed: any = null;
  try { parsed = JSON.parse(raw); } catch { /* leave null */ }
  const [showChart, setShowChart] = useState(false);
  if (!parsed) return null;
  const columns: string[] = Array.isArray(parsed.columns) ? parsed.columns : [];
  const rows: any[] = Array.isArray(parsed.rows) ? parsed.rows : [];
  const rowCount: number = typeof parsed.rowCount === 'number' ? parsed.rowCount : rows.length;
  const showRows = rows.slice(0, 8);
  if (parsed.errorMsg) {
    return <div className="text-xs text-error mt-1">✗ {String(parsed.errorMsg)}</div>;
  }
  if (parsed.skipped) {
    return <div className="text-xs text-on-surface-variant/60 mt-1 italic">Step skipped (SQL could not be repaired).</div>;
  }
  if (columns.length === 0) {
    return <div className="text-xs text-on-surface-variant/60 mt-1 italic">No result set.</div>;
  }
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[10px] text-on-surface-variant/60">{rowCount} row{rowCount === 1 ? '' : 's'}</div>
        <button
          type="button"
          onClick={() => setShowChart(v => !v)}
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            showChart
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-outline-variant/30 text-on-surface-variant/60 hover:text-on-surface-variant'
          }`}
        >
          {showChart
            ? <><Table2 size={10} /> Table</>
            : <><BarChart2 size={10} /> Chart</>
          }
        </button>
      </div>
      {showChart ? (
        <ResultChart columns={columns} rows={rows} />
      ) : (
        <div className="overflow-x-auto border border-outline-variant/20 rounded">
          <table className="text-[10px] w-full border-collapse">
            <thead>
              <tr>{columns.map(c => <th key={c} className="px-2 py-1 text-left text-on-surface font-semibold bg-surface-container-low whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody>
              {showRows.map((r, ri) => (
                <tr key={ri} className="even:bg-surface-container-low/40">
                  {columns.map(c => <td key={c} className="px-2 py-1 text-on-surface-variant whitespace-nowrap">{r[c] == null ? '—' : String(r[c])}</td>)}
                </tr>
              ))}
              {rows.length > showRows.length && (
                <tr><td colSpan={columns.length} className="px-2 py-1 text-on-surface-variant/50 italic">… {rows.length - showRows.length} more row(s)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StepLine({ step, order, isPausedAtHitl }: { step: AgentStep; order: number; isPausedAtHitl: boolean }) {
  const statusChar =
    step.status === 'success' ? '✓' : step.status === 'running' ? '◉' :
    step.status === 'error' ? '✗' : '○';
  const icon = NODE_ICONS[step.name] || '•';
  const label = NODE_LABELS[step.name] || step.name;
  const isAnalysis = String(step.data?.feasibilityResult || '').includes('《数据分析》');

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
        <span className="text-on-surface text-sm">{icon} {label}{step.step != null ? ` #${step.step}` : ''}</span>
        {step.durationMs != null && step.status === 'success' && (
          <span className="text-on-surface-variant/50 text-xs ml-2">({step.durationMs}ms)</span>
        )}
      </div>

      {step.status === 'success' && (
        <div className="ml-14 pb-2">
          {step.data?.feasibilityResult && (
            <div className={`text-xs mt-1 px-2 py-1 rounded border ${
              isAnalysis
                ? 'bg-[#16a34a]/10 border-[#16a34a]/30 text-[#16a34a]'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{step.data.feasibilityResult}</pre>
            </div>
          )}
          {step.data?.plan && (
            <PlanView plan={step.data.plan} />
          )}
          {step.name === 'HITL_GATE' && (() => {
            const needs = Boolean(step.data?.needsReview);
            const reason = String(step.data?.reason ?? '').trim();
            const repair = step.data?.repairCount;
            return (
              <div className={`text-xs mt-1 px-2 py-1 rounded border ${
                needs
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                  : 'bg-[#16a34a]/10 border-[#16a34a]/30 text-[#16a34a]'
              }`}>
                {needs ? '⚠ Plan flagged for human review' : '✓ Auto-confirmed, no review needed'}
                {repair != null && <span className="text-on-surface-variant/60"> (repair {repair})</span>}
                {reason && <><br/><span className="text-on-surface-variant/70">{reason}</span></>}
              </div>
            );
          })()}
          {step.name === 'HITL' && isPausedAtHitl && (
            <div className="mt-1 text-xs px-2 py-1.5 rounded border border-amber-500/30 bg-amber-500/5">
              <div className="text-amber-600">⏸ Awaiting your confirmation — review the plan below</div>
            </div>
          )}
          {step.data?.pythonCode != null && (
            <ThinkingSection summary="Generated Python" summaryExtra={<span className="text-[9px] text-on-surface-variant/50">{step.data.pythonCode.split('\n').length} lines</span>}>
              <SqlCodeBlock code={step.data.pythonCode} language="python" />
            </ThinkingSection>
          )}
          {step.data?.pythonResult != null && (() => {
            let r: any = null;
            try { r = typeof step.data.pythonResult === 'string' ? JSON.parse(step.data.pythonResult) : step.data.pythonResult; } catch { /* not json */ }
            if (!r) {
              return <div className="text-xs text-on-surface-variant/60 mt-1 italic">Python executed.</div>;
            }
            const ok = Boolean(r.success);
            return (
              <div className={`text-xs mt-1 p-2 rounded border ${ok ? 'border-primary/30 bg-primary/5' : 'border-error/30 bg-error/10'}`}>
                <span className={ok ? 'text-[#16a34a]' : 'text-error'}>{ok ? '✓ Python succeeded' : '✗ Python failed'}</span>
                {r.output && (
                  <pre className="text-[10px] text-on-surface-variant mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">{String(r.output)}</pre>
                )}
                {r.error && (
                  <pre className="text-[10px] text-error/80 mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto">{String(r.error)}</pre>
                )}
              </div>
            );
          })()}
          {step.data?.analysis != null && (
            <div className="text-xs text-on-surface-variant mt-1 whitespace-pre-wrap">{String(step.data.analysis)}</div>
          )}
          {step.data?.nextNode && step.name === 'PLAN_DISPATCH' && (
            <div className="text-xs text-on-surface-variant/70 mt-1">
              <span className="text-on-surface-variant/50">dispatch →</span>{' '}
              <span className="text-primary">{step.data.step != null ? `step ${step.data.step} ` : ''}{step.data.nextNode}</span>
            </div>
          )}
          {step.data?.rewriteQuery != null && (
            <EvidenceRecallCard
              rewriteQuery={step.data.rewriteQuery}
              evidence={step.data.evidence}
              evidenceGlossary={step.data.evidenceGlossary}
              evidenceFaq={step.data.evidenceFaq}
            />
          )}
          {step.data?.sql && (
            <SqlCodeBlock code={step.data.sql} language="sql" />
          )}
          {step.data?.sqlExecutionResult && (
            <SqlResultView raw={step.data.sqlExecutionResult} />
          )}
          {step.data?.errorMsg && (
            <div className="text-xs text-error mt-1 p-2 rounded bg-error/10 border border-error/30 whitespace-pre-wrap">
              <span className="font-semibold">✗ SQL error</span>
              {step.data.fixAttemptCount != null && (
                <span className="text-on-surface-variant/60"> (repair attempt {step.data.fixAttemptCount})</span>
              )}
              {'\n'}{step.data.errorMsg}
            </div>
          )}
          {step.data?.evidence && step.data.evidence !== '' && step.data.evidence !== '无' && !step.data?.rewriteQuery && (
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
            <ThinkingSection summary="Schema Context">
              <pre className="text-[10px] text-on-surface-variant/60 mt-1 p-2 bg-surface-container-low rounded overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                {step.data.tableRelation}
              </pre>
            </ThinkingSection>
          )}
          {(() => {
            // Report content — try both 'report' (controller-mapped) and 'reportResult' (raw state key)
            const reportText = step.data?.report ?? step.data?.reportResult ?? '';
            if (reportText) {
              return <ReportMarkdown content={reportText} />;
            }
            // step.data exists with unknown keys — dump as JSON for debugging (skip the known keys handled above)
            if (step.data && Object.keys(step.data).length > 0
                && !step.data?.sql && !step.data?.rewriteQuery && !step.data?.evidence
                && !step.data?.tableRelation && !step.data?.filteredTables
                && !step.data?.feasibilityResult && !step.data?.plan
                && !step.data?.sqlExecutionResult && !step.data?.errorMsg
                && !step.data?.nextNode && !step.data?.needsReview
                && !step.data?.pythonCode && !step.data?.pythonResult
                && !step.data?.analysis) {
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

/** Composite identity for a card: looped nodes are keyed by name#step, others by name. */
const cardId = (nodeName: string, stepNo: number | null) =>
  LOOPED_NODES.has(nodeName) && stepNo != null ? `${nodeName}#${stepNo}` : nodeName;
/** Sort key: (ACTIVE_NODES order, step number) — keeps looped cards chronological. */
const cardSortKey = (nodeName: string, stepNo: number | null): [number, number] => {
  const base = ACTIVE_NODES.indexOf(nodeName);
  return [base < 0 ? 9999 : base, stepNo ?? 0];
};

export default function AgentFlowPanel({
  user, connections, selectedConnId, selectedConfigId, onConnectionChange,
}: AgentFlowPanelProps) {
  const [query, setQuery] = useState('');
  const [sentQuery, setSentQuery] = useState('');
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [dbConnected, setDbConnected] = useState(false);
  // Phase 4 HITL state
  const autoConfirmKey = `agent_autoconfirm_${user?.id ?? 'default'}`;
  const [autoConfirm, setAutoConfirm] = useState<boolean>(() => {
    const saved = localStorage.getItem(autoConfirmKey);
    return saved == null ? true : saved === 'true';
  });
  const toggleAutoConfirm = (v: boolean) => {
    setAutoConfirm(v);
    try { localStorage.setItem(autoConfirmKey, String(v)); } catch { /* ignore */ }
  };
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string>('');
  const [repairCount, setRepairCount] = useState<number>(1);
  const [confirmationFeedback, setConfirmationFeedback] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Composite identity for a card: looped nodes are keyed by name#step, other nodes by name alone. */
  const cardId = (nodeName: string, stepNo: number | null) =>
    LOOPED_NODES.has(nodeName) && stepNo != null ? `${nodeName}#${stepNo}` : nodeName;
  /** Sort key: (ACTIVE_NODES order, step number) — keeps looped cards in chronological order.
   *  (Defined here to be shared by handleSend and handleConfirm.) */
  const cardSortKey = (nodeName: string, stepNo: number | null): [number, number] => {
    const base = ACTIVE_NODES.indexOf(nodeName);
    return [base < 0 ? 9999 : base, stepNo ?? 0];
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [steps, error]);
  useEffect(() => { setDbConnected(selectedConnId !== '' && selectedConnId !== null); }, [selectedConnId]);

  const handleSend = async () => {
    if (!query.trim() || !selectedConnId) return;
    setSentQuery(query);
    setError('');
    setIsStreaming(true);
    setAwaitingConfirmation(false);
    setPendingThreadId(null);
    setPendingPlan('');
    setRepairCount(1);
    setConfirmationFeedback('');
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
          autoConfirm,
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
          | { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number }
          | { type: 'NODE'; nodeName: string; nodeIdx: number; data: any; stepNo: number | null };

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
            if (event.type === 'AWAITING_CONFIRMATION') {
              batch.push({
                type: 'AWAITING_CONFIRMATION',
                threadId: String(event.threadId ?? ''),
                plan: String(event.plan ?? ''),
                repairCount: Number(event.repairCount ?? 1),
              });
              continue;
            }

            // Per-node completion events
            const nodeName = event.nodeName;
            if (!nodeName || !ACTIVE_NODES.includes(nodeName)) continue;
            const nodeIdx = ACTIVE_NODES.indexOf(nodeName);
            const stepNo = event.data?.step != null ? Number(event.data.step) : null;

            batch.push({ type: 'NODE', nodeName, nodeIdx, data: event.data, stepNo });
          } catch (_) { /* ignore malformed JSON */ }
        }

        // Apply all batched updates in a SINGLE setSteps call
        if (batch.length > 0) {
          // Pull AWAITING_CONFIRMATION out of setSteps to avoid TS closure inference issues.
          const awaitingBatch = batch.find(e => e.type === 'AWAITING_CONFIRMATION') as
            { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number } | undefined;
          const hasAwaiting = !!awaitingBatch;

          let hasCompleted = false;
          let hasError = false;
          let errorMsg = '';
          setSteps(prev => {
            // Manually chain updates — prev is stable for this updater call
            let current = prev;

            for (const update of batch) {
              if (update.type === 'NODE') {
                const id = cardId(update.nodeName, update.stepNo);
                // Ensure this card exists — insert in (order, step) position.
                if (!current.some(s => s.id === id)) {
                  const [oi, os] = cardSortKey(update.nodeName, update.stepNo);
                  let targetPos = 0;
                  for (let i = 0; i < current.length; i++) {
                    const [ci, cs] = cardSortKey(current[i].name, current[i].step ?? null);
                    if (ci < oi || (ci === oi && cs <= os)) targetPos = i + 1;
                  }
                  current = [
                    ...current.slice(0, targetPos),
                    {
                      id,
                      name: update.nodeName,
                      content: '',
                      status: 'running' as StepStatus,
                      step: LOOPED_NODES.has(update.nodeName) ? update.stepNo ?? 1 : undefined,
                    } as AgentStep,
                    ...current.slice(targetPos),
                  ];
                }
                // Update the matching card with completion data
                current = current.map(step =>
                  step.id === id
                    ? {
                        ...step,
                        status: 'success' as StepStatus,
                        data: update.data,
                        step: LOOPED_NODES.has(update.nodeName) ? update.stepNo ?? step.step : step.step,
                        durationMs: Math.round(Date.now() - stepStartTime),
                      }
                    : step
                );
                // Pre-append the next expected node so a running indicator appears,
                // unless it's a looped node or HITL (HITL only appears when the graph actually
                // pauses at the interrupt — never pre-insert a fake HITL card).
                const nextIdx = update.nodeIdx + 1;
                const nextName = nextIdx < ACTIVE_NODES.length ? ACTIVE_NODES[nextIdx] : null;
                if (nextName && nextName !== 'HITL' && !LOOPED_NODES.has(nextName) && !current.some(s => s.name === nextName)) {
                  current = [...current, {
                    id: nextName,
                    name: nextName,
                    content: '',
                    status: 'running' as StepStatus,
                  }];
                }
              } else if (update.type === 'AWAITING_CONFIRMATION') {
                // Set any lingering running cards to success (the stream paused normally).
                current = current.map(s =>
                  s.status === 'running'
                    ? { ...s, status: 'success' as StepStatus, durationMs: Math.round(Date.now() - stepStartTime) }
                    : s
                );
                // Insert a HITL card carrying the pending confirmation, keyed by name 'HITL'.
                if (!current.some(s => s.name === 'HITL')) {
                  current = [...current, {
                    id: 'HITL',
                    name: 'HITL',
                    content: '',
                    status: 'success' as StepStatus,
                    data: {
                      needsReview: true,
                      awaitingConfirmation: true,
                      plan: update.plan,
                      repairCount: update.repairCount,
                    },
                  } as AgentStep];
                } else {
                  current = current.map(s => s.name === 'HITL'
                    ? { ...s, status: 'success' as StepStatus, data: { ...s.data, needsReview: true, awaitingConfirmation: true, plan: update.plan, repairCount: update.repairCount } }
                    : s);
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
            // Always re-sort by (ACTIVE_NODES order, step) so display is correct
            // regardless of SSE event arrival order
            current.sort((a, b) => {
              const [ai, as_] = cardSortKey(a.name, a.step ?? null);
              const [bi, bs] = cardSortKey(b.name, b.step ?? null);
              return ai - bi || as_ - bs;
            });
            return current;
          });
          if (hasCompleted) setIsStreaming(false);
          if (hasAwaiting && awaitingBatch) {
            setPendingThreadId(awaitingBatch.threadId);
            setPendingPlan(awaitingBatch.plan);
            setRepairCount(awaitingBatch.repairCount);
            setAwaitingConfirmation(true);
            setIsStreaming(false);
          }
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

  /** Phase 4 HITL: submit the human decision and resume the paused run.
   *  keepSteps=true — existing timeline cards are preserved, resumed events appended. */
  const handleConfirm = async (approved: boolean) => {
    if (!pendingThreadId) return;
    setError('');
    setConfirming(true);
    setAwaitingConfirmation(false);
    // Insert a running indicator for the first downstream node so the user sees
    // the graph resuming. Only the next node, not everything downstream.
    const resumeNextId = 'PLAN_DISPATCH';
    setSteps(prev => {
      if (prev.some(s => s.name === resumeNextId)) return prev;
      return [...prev, { id: resumeNextId, name: resumeNextId, content: '', status: 'running' as StepStatus }];
    });
    const feedback = (confirmationFeedback || '').trim() || (approved ? '用户确认继续执行' : '用户取消本次执行');
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const stepStartTime = Date.now();

    try {
      const response = await fetch('/api/v1/agent/sql/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        credentials: 'include',
        body: JSON.stringify({
          threadId: pendingThreadId,
          approved,
          feedback,
          userId: user?.id || 1,
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

        type BatchItem =
          | { type: 'COMPLETED' }
          | { type: 'ERROR'; message: string }
          | { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number }
          | { type: 'NODE'; nodeName: string; nodeIdx: number; data: any; stepNo: number | null };
        const batch: BatchItem[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:+/, '').trim();
          if (!dataStr) continue;
          try {
            const event = JSON.parse(dataStr);
            if (event.type === 'COMPLETED') { batch.push({ type: 'COMPLETED' }); continue; }
            if (event.type === 'ERROR') { batch.push({ type: 'ERROR', message: event.message || 'Resume failed' }); continue; }
            if (event.type === 'AWAITING_CONFIRMATION') {
              batch.push({ type: 'AWAITING_CONFIRMATION', threadId: String(event.threadId ?? ''), plan: String(event.plan ?? ''), repairCount: Number(event.repairCount ?? 1) });
              continue;
            }
            const nodeName = event.nodeName;
            if (!nodeName || !ACTIVE_NODES.includes(nodeName)) continue;
            const nodeIdx = ACTIVE_NODES.indexOf(nodeName);
            const stepNo = event.data?.step != null && LOOPED_NODES.has(nodeName) ? Number(event.data.step) : null;
            batch.push({ type: 'NODE', nodeName, nodeIdx, data: event.data, stepNo });
          } catch { /* ignore */ }
        }

        if (batch.length > 0) {
          const awaitingBatch = batch.find(e => e.type === 'AWAITING_CONFIRMATION') as
            { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number } | undefined;
          let hasCompleted = false;
          let hasError = false;
          let errorMsg = '';
          setSteps(prev => {
            let current = prev;
            for (const update of batch) {
              if (update.type === 'NODE') {
                const id = cardId(update.nodeName, update.stepNo);
                if (!current.some(s => s.id === id)) {
                  current = [...current, {
                    id, name: update.nodeName, content: '',
                    status: 'running' as StepStatus,
                    step: LOOPED_NODES.has(update.nodeName) ? update.stepNo ?? 1 : undefined,
                  } as AgentStep];
                }
                current = current.map(step =>
                  step.id === id
                    ? { ...step, status: 'success' as StepStatus, data: update.data, step: LOOPED_NODES.has(update.nodeName) ? update.stepNo ?? step.step : step.step, durationMs: Math.round(Date.now() - stepStartTime) }
                    : step
                );
              } else if (update.type === 'COMPLETED') {
                hasCompleted = true;
                current = current.map(s => s.status === 'running' ? { ...s, status: 'success' as StepStatus, durationMs: Math.round(Date.now() - stepStartTime) } : s);
              } else if (update.type === 'AWAITING_CONFIRMATION') {
                current = current.map(s => s.status === 'running' ? { ...s, status: 'success' as StepStatus, durationMs: Math.round(Date.now() - stepStartTime) } : s);
                current = current.map(s => s.name === 'HITL'
                  ? { ...s, status: 'success' as StepStatus, data: { ...s.data, needsReview: true, awaitingConfirmation: true, plan: update.plan, repairCount: update.repairCount } }
                  : s);
              } else if (update.type === 'ERROR') {
                hasError = true;
                errorMsg = update.message || '';
                current = current.map(s => s.status === 'running' ? { ...s, status: 'error' as StepStatus } : s);
              }
            }
            current.sort((a, b) => {
              const [ai, as_] = cardSortKey(a.name, a.step ?? null);
              const [bi, bs] = cardSortKey(b.name, b.step ?? null);
              return ai - bi || as_ - bs;
            });
            return current;
          });
          if (awaitingBatch) {
            setPendingPlan(awaitingBatch.plan);
            setRepairCount(awaitingBatch.repairCount);
            setAwaitingConfirmation(true);
            setIsStreaming(false);
          }
          if (hasCompleted) {
            setAwaitingConfirmation(false);
            setIsStreaming(false);
          }
          if (hasError) { setError(errorMsg); }
        }
      }
      setConfirmationFeedback('');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' as StepStatus } : s));
      setError(err.message || 'Connection error');
    } finally {
      setConfirming(false);
      setAwaitingConfirmation(false);
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
          <label
            className="flex items-center gap-1.5 cursor-pointer select-none"
            title={autoConfirm
              ? 'Auto-confirm ON: plans skip the review gate and execute automatically.'
              : 'Auto-confirm OFF: the LLM gate decides whether a plan needs your approval before execution.'}
          >
            <span className="text-[10px] text-on-surface-variant/70 font-mono">Auto-confirm</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoConfirm}
              onClick={() => toggleAutoConfirm(!autoConfirm)}
              className={`relative w-8 h-4 rounded-full transition-colors ${autoConfirm ? 'bg-primary' : 'bg-outline-variant/50'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-surface transition-transform ${autoConfirm ? 'translate-x-4' : ''}`} />
            </button>
          </label>
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
            <StepLine step={step} order={idx + 1} isPausedAtHitl={awaitingConfirmation} />
            {idx < steps.length - 1 && <ConnectorLine />}
          </div>
        ))}

        {awaitingConfirmation && pendingThreadId && (
          <div className="mt-3 p-3 rounded border border-amber-500/40 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600">👤</span>
              <span className="text-on-surface text-sm font-semibold">Human Review Required</span>
              {repairCount > 1 && <span className="text-[10px] text-on-surface-variant/60">(repair #{repairCount})</span>}
            </div>
            {pendingPlan && <PlanView plan={pendingPlan} />}
            <textarea
              value={confirmationFeedback}
              onChange={(e) => setConfirmationFeedback(e.target.value)}
              placeholder="Modification feedback (optional when approving; describe changes when rejecting)"
              rows={2}
              className="w-full mt-2 text-xs font-mono bg-surface text-on-surface border border-outline-variant/30 rounded px-2 py-1 outline-none focus:border-primary resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleConfirm(true)}
                disabled={confirming}
                className="text-xs font-mono px-3 py-1.5 rounded text-[#16a34a] bg-[#16a34a]/10 border border-[#16a34a]/30 hover:bg-[#16a34a]/20 disabled:opacity-40 flex items-center gap-1"
              >
                {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓'} Confirm & Continue
              </button>
              <button
                onClick={() => handleConfirm(false)}
                disabled={confirming}
                className="text-xs font-mono px-3 py-1.5 rounded text-error bg-error/10 border border-error/30 hover:bg-error/20 disabled:opacity-40 flex items-center gap-1"
              >
                {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✗'} Reject & Re-plan
              </button>
            </div>
          </div>
        )}

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
                  if (query.trim() && !isStreaming && !awaitingConfirmation && !confirming) handleSend();
                }
              }}
              className="w-full bg-transparent text-on-surface text-sm font-mono resize-none outline-none pt-2 placeholder-on-surface-variant/40"
              placeholder="Ask a question to generate SQL..."
              rows={2}
              disabled={isStreaming || awaitingConfirmation || confirming}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isStreaming || awaitingConfirmation || confirming || !query.trim() || !dbConnected}
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