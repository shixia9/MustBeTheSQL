/**
 * AgentFlowPanel — terminal/CLI-style Agent timeline.
 * Streams SSE events and displays progressive per-node results as they arrive.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Database, Table2, BarChart2, History, Search, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentStep, StepStatus } from '../../types/agent';
import { nodeCategoryOf, CATEGORY_STYLES, messageCategoryForNode, formatDuration } from '../../types/agent';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useI18n } from '../../i18n';
import { conversationApi } from '../../api/client';
import SqlCodeBlock from './cards/SqlCodeBlock';
import EvidenceRecallCard from './cards/EvidenceRecallCard';
import FeasibilityCard from './cards/FeasibilityCard';
import type { TraceStep } from '../../types/agent';
import TraceCard from './cards/TraceCard';
import ResultChart from './cards/ResultChart';
import ThinkingSection from './cards/ThinkingSection';
import ConfirmDialog from '../ConfirmDialog';

interface AgentFlowPanelProps {
  user: any;
  connections: any[];
  selectedConnId: number | '';
  selectedConfigId: number | null;
  onConnectionChange: (connId: number) => void;
}

/** Phase 4 active nodes — the full set wired into the graph. */
const ACTIVE_NODES = [
  'MEMORY_RECALL',
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
  MEMORY_RECALL: '🧠',
  EVIDENCE_RECALL: '🔍', SCHEMA_LINKING: '🔗', FEASIBILITY_ASSESSMENT: '✅',
  PLANNER: '📋', HITL_GATE: '🚦', HITL: '👤', PLAN_DISPATCH: '🧭',
  SQL_GENERATION: '▷', SQL_EXECUTION: '▶', SQL_FIXER: '🔧',
  PYTHON_GENERATION: '🐍', PYTHON_EXECUTION: '⚙', PYTHON_ANALYSIS: '📊',
  REPORT: '◉',
};
const NODE_LABELS: Record<string, string> = {
  MEMORY_RECALL: 'Memory Recall',
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
  const { t } = useI18n();
  const statusChar =
    step.status === 'success' ? '✓' : step.status === 'running' ? '◉' :
    step.status === 'error' ? '✗' : '○';
  const icon = NODE_ICONS[step.name] || '•';
  const label = NODE_LABELS[step.name] || step.name;
  const category = nodeCategoryOf(step.name);
  const catStyle = CATEGORY_STYLES[category];
  const msgType = messageCategoryForNode(step.name);

  return (
    <div className={`font-mono border-l-2 ${catStyle.border} ${step.status === 'running' ? catStyle.tint : ''} pl-2 -ml-2 rounded-r transition-colors`}>
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
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catStyle.badge}`}>{msgType}</span>
        {step.durationMs != null && step.status === 'success' && (
          <span className="text-on-surface-variant/50 text-xs ml-2">({formatDuration(step.durationMs)})</span>
        )}
        {step.status === 'running' && (
          <span className="text-primary/60 text-xs ml-2 animate-pulse">running…</span>
        )}
      </div>

      {step.status === 'success' && (
        <div className="ml-14 pb-2">
          {step.data?.feasibilityResult && (
            <FeasibilityCard result={String(step.data.feasibilityResult)} />
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
          <span className="text-on-surface-variant/50 text-xs animate-pulse">{t('chat.processing')}</span>
        </div>
      )}
    </div>
  );
}

function ConnectorLine() {
  return <div className="ml-[17px] w-px h-4 bg-outline-variant/30" />;
}

/** Composite identity for a card: looped nodes are keyed by name#step, others by name. */
const cardId = (nodeName: string, stepNo: number | null, seqNo?: number) =>
  LOOPED_NODES.has(nodeName) && stepNo != null
    ? seqNo != null ? `${nodeName}#${stepNo}-${seqNo}` : `${nodeName}#${stepNo}`
    : nodeName;
/** Sort key: (ACTIVE_NODES order, step number, sequenceNo) — keeps looped cards chronological. */
const cardSortKey = (nodeName: string, stepNo: number | null, seqNo?: number): [number, number, number] => {
  const base = ACTIVE_NODES.indexOf(nodeName);
  return [base < 0 ? 9999 : base, stepNo ?? 0, seqNo ?? 0];
};

export default function AgentFlowPanel({
  user, connections, selectedConnId, selectedConfigId, onConnectionChange,
}: AgentFlowPanelProps) {
  const { t } = useI18n();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [sentQuery, setSentQuery] = useState('');
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>('');
  const [dbConnected, setDbConnected] = useState(false);
  // Multi-turn conversation id. Null on a fresh chat; the backend
  // creates a conversation on the first turn and returns its id in the COMPLETED
  // event, which we echo on follow-up turns so prior context is injected.
  // Persisted to localStorage so it survives component remounts and works
  // even if the SSE COMPLETED event's conversationId field is not received.
  const STORAGE_KEY = `agent_conv_id_${user?.id ?? 'default'}`;
  const conversationIdRef = useRef<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : null;
  });
  // Sync ref with the initial state value (restored from localStorage if available).
  if (conversationIdRef.current === null && conversationId != null) {
    conversationIdRef.current = conversationId;
  }
  const handleSetConversationId = useCallback((id: number | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
    if (id != null) {
      localStorage.setItem(STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [STORAGE_KEY]);
  // Turn counter — each send() increments it so card IDs are unique across turns.
  const turnRef = useRef(0);
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
  // Phase A3: trace view toggle + aggregate trace stats from a loaded historical run.
  const [showTraceView, setShowTraceView] = useState(false);
  const [traceMeta, setTraceMeta] = useState<{ totalTokens?: number; totalDurationMs?: number; modelCalls?: number } | null>(null);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySize, setHistorySize] = useState(8);
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Composite identity for a card: turn-prefixed so cards from different
   *  conversation turns never collide. Looped nodes additionally carry step/seq. */
  const cardId = (nodeName: string, stepNo: number | null, seqNo?: number) => {
    const prefix = `turn-${turnRef.current}-`;
    if (LOOPED_NODES.has(nodeName) && stepNo != null) {
      return seqNo != null ? `${prefix}${nodeName}#${stepNo}-${seqNo}` : `${prefix}${nodeName}#${stepNo}`;
    }
    return `${prefix}${nodeName}`;
  };
  /** Sort key: (turn, ACTIVE_NODES order, step number, seqNo) — groups turns chronologically. */
  const cardSortKey = (nodeName: string, stepNo: number | null, seqNo?: number, turn?: number): [number, number, number, number] => {
    const base = ACTIVE_NODES.indexOf(nodeName);
    return [turn ?? turnRef.current, base < 0 ? 9999 : base, stepNo ?? 0, seqNo ?? 0];
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [steps, error]);
  useEffect(() => { setDbConnected(selectedConnId !== '' && selectedConnId !== null); }, [selectedConnId]);

  // Proactively create a conversation on mount so the first message already
  // carries a valid conversationId. Follows the AgentX pattern where sessions
  // are created before the first chat message.
  useEffect(() => {
    if (!user?.id || conversationIdRef.current != null) return;
    let cancelled = false;
    conversationApi.create()
      .then((res: any) => {
        if (cancelled || !res?.data?.id) return;
        handleSetConversationId(res.data.id);
      })
      .catch(() => {}); // best-effort — fallback to backend auto-creation on first stream
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Fetch available schemas when connection changes
  useEffect(() => {
    if (!selectedConnId) { setSchemas([]); setSelectedSchema(''); return; }
    setLoadingSchema(true);
    fetch(`/api/v1/schema/schemas?connectionId=${selectedConnId}`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: any) => { if (d.code === 200 && Array.isArray(d.data)) { const names = d.data.map((s: any) => s.name); setSchemas(names); if (names.length > 0 && !selectedSchema) setSelectedSchema(names[0]); } })
      .catch(() => {})
      .finally(() => setLoadingSchema(false));
  }, [selectedConnId]);

  // Fetch history as conversation list — each conversation contains multiple
  // agent-execution turns. Grouped by conversation for multi-turn coherence.
  const fetchHistory = useCallback((page: number, kw: string) => {
    setLoadingHistory(true);
    if (!user?.id) { setLoadingHistory(false); return; }
    conversationApi.list(user.id)
      .then((res: any) => {
        if (res?.code === 200 && Array.isArray(res.data)) {
          let conversations = res.data;
          // Filter by keyword on the client side (title match)
          if (kw.trim()) {
            const lower = kw.trim().toLowerCase();
            conversations = conversations.filter((c: any) =>
              (c.title || '').toLowerCase().includes(lower));
          }
          setHistoryList(conversations.map((c: any) => ({
            id: c.id,
            conversationId: c.id,
            summary: c.title || 'Conversation',
            input: '',
            timestamp: c.updateTime || c.createTime,
            status: 'CONVERSATION',
            turnCount: null, // lazy-loaded when expanded
          })));
          setHistoryTotal(conversations.length);
          setHistoryPage(1);
        } else {
          setHistoryList([]); setHistoryTotal(0);
        }
      })
      .catch(() => { setHistoryList([]); setHistoryTotal(0); })
      .finally(() => setLoadingHistory(false));
  }, [user?.id]);

  // Fetch history when the modal is toggled open
  useEffect(() => {
    if (!showHistory || !user?.id) return;
    setHistorySearchInput(historyKeyword);
    fetchHistory(1, historyKeyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, user?.id]);

  // Close the history modal on Escape
  useEffect(() => {
    if (!showHistory) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowHistory(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showHistory]);

  const startNewConversation = () => {
    conversationIdRef.current = null;
    setConversationId(null);
    localStorage.removeItem(STORAGE_KEY);
    turnRef.current = 0;
    setSteps([]);
    setQuery('');
    setSentQuery('');
    setError('');
    setAwaitingConfirmation(false);
    setPendingThreadId(null);
    setPendingPlan('');
    setRepairCount(1);
    setConfirmationFeedback('');
    setShowTraceView(false);
    setTraceMeta(null);
    // Proactively create a new conversation for the fresh chat.
    conversationApi.create()
      .then((res: any) => {
        if (res?.data?.id) handleSetConversationId(res.data.id);
      })
      .catch(() => {});
  };

  const handleSend = async () => {
    if (!query.trim() || !selectedConnId) return;
    turnRef.current += 1;
    const currentTurn = turnRef.current;
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

    const now = Date.now();
    const stepStartTime = Date.now();

    // Prepend the current set of completed steps (previous turns) with a
    // turn separator, then add a user-message card followed by the first
    // node's running indicator for the new turn.
    if (conversationIdRef.current != null) {
      setSteps(prev => [...prev,
        { id: `turn-${currentTurn}-sep`, name: 'SEPARATOR', content: '', status: 'success' as StepStatus },
        { id: `turn-${currentTurn}-USER_MESSAGE`, name: 'USER_MESSAGE', content: sentText, status: 'success' as StepStatus },
        { id: cardId(ACTIVE_NODES[0], null, 0), name: ACTIVE_NODES[0], content: '', status: 'running' as StepStatus },
      ]);
    } else {
      setSteps([
        { id: `turn-${currentTurn}-USER_MESSAGE`, name: 'USER_MESSAGE', content: sentText, status: 'success' as StepStatus },
        { id: cardId(ACTIVE_NODES[0], null, 0), name: ACTIVE_NODES[0], content: '', status: 'running' as StepStatus },
      ]);
    }

    try {
      const response = await fetch('/api/v1/agent/sql/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id || 1,
          userInput: sentText,
          connectionId: String(selectedConnId) !== '' ? Number(selectedConnId) : null,
          tableNames: [],
          llmConfigId: selectedConfigId,
          autoConfirm,
          schemaContext: selectedSchema || '',
          workspaceId: selectedWorkspaceId,
          conversationId: conversationIdRef.current,
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
          | { type: 'COMPLETED'; conversationId: number | null }
          | { type: 'ERROR'; message: string }
          | { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number }
          | { type: 'NODE'; nodeName: string; nodeIdx: number; data: any; stepNo: number | null; sequenceNo: number }
          | { type: 'NODE_STARTED'; nodeName: string; nodeIdx: number };

        const batch: BatchItem[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:+/, '').trim();
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr);

            if (event.type === 'COMPLETED') {
              const convId = event.conversationId != null ? Number(event.conversationId) : null;
              batch.push({ type: 'COMPLETED', conversationId: convId });
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

            // Per-node STARTED events (Phase B): mark the node as running before it finishes.
            if (event.outputType === 'STARTED') {
              const snName = event.nodeName;
              if (snName && ACTIVE_NODES.includes(snName)) {
                batch.push({ type: 'NODE_STARTED', nodeName: snName, nodeIdx: ACTIVE_NODES.indexOf(snName) });
              }
              continue;
            }

            // Per-node completion events
            const nodeName = event.nodeName;
            if (!nodeName || !ACTIVE_NODES.includes(nodeName)) continue;
            const nodeIdx = ACTIVE_NODES.indexOf(nodeName);
            const stepNo = event.data?.step != null ? Number(event.data.step) : null;
            const sequenceNo = event.sequenceNo != null ? Number(event.sequenceNo) : 0;

            batch.push({ type: 'NODE', nodeName, nodeIdx, data: event.data, stepNo, sequenceNo });
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
          let completedConvId: number | null = null;
          setSteps(prev => {
            // Manually chain updates — prev is stable for this updater call
            let current = prev;

            for (const update of batch) {
              if (update.type === 'NODE_STARTED') {
                // Remove the generic processing indicator when any real node starts
                if (current.some(s => s.id === '__processing__')) {
                  current = current.filter(s => s.id !== '__processing__');
                }
                // For looped nodes, create a step-less placeholder running card;
                // the FINISHED event will replace it with the real step-numbered card.
                if (LOOPED_NODES.has(update.nodeName)) {
                  const placeholderId = cardId(update.nodeName, null, 0);
                  if (!current.some(st => st.id === placeholderId)) {
                    current = [...current, {
                      id: placeholderId,
                      name: update.nodeName,
                      content: '',
                      status: 'running' as StepStatus,
                      step: undefined,
                      sequenceNo: 0,
                    } as AgentStep];
                  }
                  continue;
                }
                // Ensure a running placeholder card exists for this node.
                const id = cardId(update.nodeName, null, 0);
                if (!current.some(st => st.id === id)) {
                  const [oi, os, oq] = cardSortKey(update.nodeName, null, 0);
                  let targetPos = 0;
                  for (let i = 0; i < current.length; i++) {
                    const [ci, cs, cq] = cardSortKey(current[i].name, current[i].step ?? null, current[i].sequenceNo ?? 0);
                    if (ci < oi || (ci === oi && cs < os) || (ci === oi && cs === os && cq <= oq)) targetPos = i + 1;
                  }
                  current = [
                    ...current.slice(0, targetPos),
                    {
                      id,
                      name: update.nodeName,
                      content: '',
                      status: 'running' as StepStatus,
                      step: undefined,
                      sequenceNo: 0,
                    } as AgentStep,
                    ...current.slice(targetPos),
                  ];
                } else {
                  current = current.map(st => st.id === id && st.status !== 'success'
                    ? { ...st, status: 'running' as StepStatus } : st);
                }
                continue;
              }
              if (update.type === 'NODE') {
                const id = cardId(update.nodeName, update.stepNo, update.sequenceNo);
                // Ensure this card exists — insert in (order, step) position.
                if (!current.some(s => s.id === id)) {
                  const [oi, os, oq] = cardSortKey(update.nodeName, update.stepNo, update.sequenceNo);
                  let targetPos = 0;
                  for (let i = 0; i < current.length; i++) {
                    const [ci, cs, cq] = cardSortKey(current[i].name, current[i].step ?? null, current[i].sequenceNo ?? 0);
                    if (ci < oi || (ci === oi && cs < os) || (ci === oi && cs === os && cq <= oq)) targetPos = i + 1;
                  }
                  current = [
                    ...current.slice(0, targetPos),
                    {
                      id,
                      name: update.nodeName,
                      content: '',
                      status: 'running' as StepStatus,
                      step: LOOPED_NODES.has(update.nodeName) ? update.stepNo ?? 1 : undefined, sequenceNo: update.sequenceNo,
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
                // Remove any pre-inserted placeholder card with the same name but
                // different id (the one without a step number). Loop: from the end
                // so splice indices stay valid.
                if (update.stepNo != null) {
                  for (let i = current.length - 1; i >= 0; i--) {
                    const c = current[i];
                    if (c.name === update.nodeName && c.id !== id && c.status === 'running' && c.step == null) {
                      current.splice(i, 1);
                    }
                  }
                }
              } else if (update.type === 'AWAITING_CONFIRMATION') {
                // Set any lingering running cards to success (the stream paused normally).
                current = current.map(s =>
                  s.status === 'running'
                    ? { ...s, status: 'success' as StepStatus, durationMs: Math.round(Date.now() - stepStartTime) }
                    : s
                );
                // Insert a HITL card carrying the pending confirmation.
                const hitlId = cardId('HITL', null, 0);
                if (!current.some(s => s.id === hitlId)) {
                  current = [...current, {
                    id: hitlId,
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
                  current = current.map(s => s.id === hitlId
                    ? { ...s, status: 'success' as StepStatus, data: { ...s.data, needsReview: true, awaitingConfirmation: true, plan: update.plan, repairCount: update.repairCount } }
                    : s);
                }
              } else if (update.type === 'COMPLETED') {
                hasCompleted = true;
                completedConvId = update.conversationId;
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
            // Preserve insertion order (SSE arrival order) for the timeline,
            // so node cards appear in the sequence they were received.
            return current;
          });
          if (hasCompleted) {
            if (completedConvId != null) handleSetConversationId(completedConvId);
            setIsStreaming(false);
          }
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
          | { type: 'COMPLETED'; conversationId: number | null }
          | { type: 'ERROR'; message: string }
          | { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number }
          | { type: 'NODE'; nodeName: string; nodeIdx: number; data: any; stepNo: number | null; sequenceNo: number };
        const batch: BatchItem[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:+/, '').trim();
          if (!dataStr) continue;
          try {
            const event = JSON.parse(dataStr);
            if (event.type === 'COMPLETED') { batch.push({ type: 'COMPLETED', conversationId: event.conversationId != null ? Number(event.conversationId) : null }); continue; }
            if (event.type === 'ERROR') { batch.push({ type: 'ERROR', message: event.message || 'Resume failed' }); continue; }
            if (event.type === 'AWAITING_CONFIRMATION') {
              batch.push({ type: 'AWAITING_CONFIRMATION', threadId: String(event.threadId ?? ''), plan: String(event.plan ?? ''), repairCount: Number(event.repairCount ?? 1) });
              continue;
            }
            const nodeName = event.nodeName;
            if (!nodeName || !ACTIVE_NODES.includes(nodeName)) continue;
            const nodeIdx = ACTIVE_NODES.indexOf(nodeName);
            const stepNo = event.data?.step != null && LOOPED_NODES.has(nodeName) ? Number(event.data.step) : null;
            const seqNo = event.sequenceNo != null ? Number(event.sequenceNo) : 0;
            batch.push({ type: 'NODE', nodeName, nodeIdx, data: event.data, stepNo, sequenceNo: seqNo });
          } catch { /* ignore */ }
        }

        if (batch.length > 0) {
          const awaitingBatch = batch.find(e => e.type === 'AWAITING_CONFIRMATION') as
            { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number } | undefined;
          let hasCompleted = false;
          let hasError = false;
          let errorMsg = '';
          let completedConvId: number | null = null;
          setSteps(prev => {
            let current = prev;
            for (const update of batch) {
              if (update.type === 'NODE') {
                const id = cardId(update.nodeName, update.stepNo, update.sequenceNo);
                if (!current.some(s => s.id === id)) {
                  current = [...current, {
                    id, name: update.nodeName, content: '',
                    status: 'running' as StepStatus,
                    step: LOOPED_NODES.has(update.nodeName) ? update.stepNo ?? 1 : undefined, sequenceNo: update.sequenceNo,
                  } as AgentStep];
                }
                current = current.map(step =>
                  step.id === id
                    ? { ...step, status: 'success' as StepStatus, data: update.data, step: LOOPED_NODES.has(update.nodeName) ? update.stepNo ?? step.step : step.step, durationMs: Math.round(Date.now() - stepStartTime) }
                    : step
                );
              } else if (update.type === 'COMPLETED') {
                hasCompleted = true;
                completedConvId = update.conversationId;
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
            if (completedConvId != null) handleSetConversationId(completedConvId);
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
      setAwaitingConfirmation(false);
    } finally {
      setConfirming(false);
      abortRef.current = null;
    }
  };

  /** Load a historical agent session or conversation into the timeline. */
  const loadHistory = async (conversationId: number) => {
    setShowHistory(false);
    setError('');
    setAwaitingConfirmation(false);
    setPendingThreadId(null);
    turnRef.current = 0;
    try {
      // Load all executions for this conversation
      const qs = new URLSearchParams({ page: '1', size: '50', conversationId: String(conversationId) });
      const listRes = await fetch(`/api/v1/agent/history?${qs.toString()}`, { credentials: 'include' });
      const listJson = await listRes.json();
      if (listJson.code !== 200 || !listJson.data) { setError('Failed to load history'); return; }
      const executions: any[] = listJson.data.records || [];
      if (executions.length === 0) { setError('No turns in this conversation'); return; }

      // Build timeline: one turn per execution, with SEPARATOR + USER_MESSAGE + steps
      const allSteps: AgentStep[] = [];
      for (let t = 0; t < executions.length; t++) {
        const exec = executions[t];
        const currentTurn = t + 1;
        turnRef.current = currentTurn;

        // Separator between turns (not before the first)
        if (t > 0) {
          allSteps.push({
            id: `turn-${currentTurn}-sep`, name: 'SEPARATOR', content: '', status: 'success' as StepStatus,
          });
        }
        // User message for this turn
        allSteps.push({
          id: `turn-${currentTurn}-USER_MESSAGE`, name: 'USER_MESSAGE', content: exec.input || '', status: 'success' as StepStatus,
        });

        // Fetch steps for this execution
        try {
          const stepsRes = await fetch(`/api/v1/agent/history/${exec.id}/steps`, { credentials: 'include' });
          const stepsJson = await stepsRes.json();
          const execSteps: any[] = stepsJson.data || [];
          for (const step of execSteps) {
            let data: any = {};
            try { if (step.outputData) data = JSON.parse(step.outputData); } catch {}
            const nodeName = step.nodeName;
            const sId = LOOPED_NODES.has(nodeName) && data?.step != null
              ? `turn-${currentTurn}-${nodeName}#${data.step}-${step.sequenceNo}`
              : `turn-${currentTurn}-${nodeName}`;
            allSteps.push({
              id: sId,
              name: nodeName,
              content: '',
              status: (step.status === 'SUCCESS' ? 'success' : 'error') as StepStatus,
              data,
              step: data?.step != null ? data.step : undefined,
              durationMs: step.durationMs,
              sequenceNo: step.sequenceNo,
              latencyMs: step.latencyMs,
              inputTokens: step.inputTokens,
              outputTokens: step.outputTokens,
              nodeType: step.nodeType,
              rawStatus: step.status,
            });
          }
        } catch { /* best-effort per execution */ }
      }

      setSteps(allSteps);
      setSentQuery(executions[executions.length - 1]?.input || '');
      setIsStreaming(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load history');
    }
  };

  /** Delete a historical session (and its steps) permanently. */
  const deleteHistory = async (historyId: number) => {
    setConfirmDeleteId(null);
    const kw = historyKeyword;
    const prevPage = historyPage;
    try {
      const res = await fetch(`/api/v1/agent/history/${historyId}`, {
        method: 'DELETE', credentials: 'include',
      });
      const j = await res.json();
      if (j.code !== 200) { setError(j.message || 'Failed to delete'); return; }
      // Refresh the current view; if we deleted the last item on a page >1, step back.
      let pageToFetch = prevPage;
      const remainingEstimate = historyTotal - 1;
      const lastPage = Math.max(1, Math.ceil(remainingEstimate / historySize));
      if (pageToFetch > lastPage) pageToFetch = lastPage;
      fetchHistory(pageToFetch, kw);
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-surface-container-low border-b border-outline-variant flex-shrink-0">
        {/* Left: controls — Auto-confirm, database, schema */}
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <label
            className="flex items-center gap-1.5 cursor-pointer select-none"
            title={autoConfirm
              ? t('chat.autoConfirmOnTitle')
              : t('chat.autoConfirmOffTitle')}
          >
            <span className="text-[10px] text-on-surface-variant/70 font-mono uppercase tracking-wider">{t('chat.autoConfirm')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoConfirm}
              onClick={() => toggleAutoConfirm(!autoConfirm)}
              className={`relative w-7 h-3.5 transition-colors ${autoConfirm ? 'bg-primary' : 'bg-outline-variant/50'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-surface transition-transform ${autoConfirm ? 'translate-x-3.5' : ''}`} />
            </button>
          </label>
          <span className="w-px h-4 bg-outline-variant/30" />
          <div className="flex items-center gap-1.5">
            <Database size={14} className={dbConnected ? 'text-primary' : 'text-on-surface-variant/40'} />
            <select
              className="bg-surface-container-high text-xs font-mono text-on-surface border border-outline-variant px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
              value={selectedConnId}
              onChange={(e) => onConnectionChange(e.target.value ? Number(e.target.value) : 0)}
            >
              <option value="">{t('chat.selectDatabase')}</option>
              {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              className="bg-surface-container-high text-xs font-mono text-on-surface border border-outline-variant px-3 py-1.5 w-40 outline-none focus:border-primary cursor-pointer"
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              disabled={!selectedConnId}
            >
              <option value="">{loadingSchema ? t('chat.loading') : t('chat.schema')}</option>
              {schemas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={'w-1.5 h-1.5 ' + (dbConnected ? 'bg-primary' : 'bg-outline-variant/50')}
            title={dbConnected ? t('chat.connected') : t('chat.notConnected')} />
        </div>

        {/* Right: new conversation + history buttons — grouped tight */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 border border-outline-variant hover:border-primary/40 transition-colors"
            title="Start a new conversation"
            disabled={isStreaming}
          >
            <Plus size={13} />
            <span className="hidden sm:inline uppercase tracking-wider">New</span>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 border border-outline-variant hover:border-primary/40 transition-colors"
            title="Agent history"
          >
            <History size={13} />
            <span className="hidden sm:inline uppercase tracking-wider">History</span>
          </button>
        </div>
      </div>

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false); }}
        >
          <div className="w-[640px] max-w-[92vw] max-h-[80vh] flex flex-col bg-surface border border-outline-variant/40 rounded-lg shadow-2xl font-mono overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 bg-surface-container-low">
              <div className="flex items-center gap-2">
                <History size={14} className="text-primary" />
                <span className="text-sm text-on-surface font-semibold uppercase tracking-wider">{t('chat.sessionHistory')}</span>
                <span className="text-[10px] text-on-surface-variant/50">({historyTotal} session{historyTotal === 1 ? '' : 's'})</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-on-surface-variant/60 hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-container-highest"
                title="Close (Esc)"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-4 py-2.5 border-b border-outline-variant/10 bg-surface">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input
                  type="text"
                  value={historySearchInput}
                  onChange={(e) => setHistorySearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setHistoryKeyword(historySearchInput);
                      fetchHistory(1, historySearchInput);
                    }
                  }}
                  placeholder={t('chat.searchSessions')}
                  className="w-full bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 rounded pl-8 pr-3 py-1.5 outline-none focus:border-primary placeholder-on-surface-variant/40"
                />
              </div>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loadingHistory ? (
                <div className="px-4 py-6 text-center text-on-surface-variant/50 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              ) : historyList.length === 0 ? (
                <div className="px-4 py-10 text-center text-on-surface-variant/50 text-xs">
                  {t('chat.noHistory')}<span className="text-on-surface-variant/30">.</span>
                </div>
              ) : historyList.map((h: any) => (
                <div
                  key={h.id}
                  className="group w-full text-left px-4 py-2.5 hover:bg-primary/5 border-b border-outline-variant/10 last:border-0 transition-colors flex items-start gap-2"
                >
                  <span className="text-primary/50 flex-shrink-0 mt-0.5 cursor-pointer" onClick={() => loadHistory(h.conversationId ?? h.id)}>❯</span>
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => loadHistory(h.conversationId ?? h.id)}>
                    <div className="flex items-center gap-2">
                      {h.status && (
                        <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${h.status === 'CONVERSATION' ? 'bg-primary' : h.status === 'COMPLETED' ? 'bg-[#16a34a]' : 'bg-amber-500'}`} />
                      )}
                      <span className="text-on-surface text-xs truncate group-hover:text-primary transition-colors">{h.summary}</span>
                    </div>
                    <div className="text-[10px] text-on-surface-variant/40 mt-0.5">{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-outline-variant/20 bg-surface-container-low">
              <span className="text-[10px] text-on-surface-variant/50">
                Page {historyPage} of {Math.max(1, Math.ceil(historyTotal / historySize))}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { const p = Math.max(1, historyPage - 1); fetchHistory(p, historyKeyword); }}
                  disabled={historyPage <= 1 || loadingHistory}
                  className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 border border-outline-variant/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => { const last = Math.ceil(historyTotal / historySize); const p = Math.min(last, historyPage + 1); fetchHistory(p, historyKeyword); }}
                  disabled={historyPage >= Math.ceil(historyTotal / historySize) || loadingHistory}
                  className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 border border-outline-variant/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-4 font-mono text-sm leading-relaxed" style={{ scrollBehavior: 'smooth' }}>
        {steps.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
            <div className="text-4xl mb-4">⎈</div>
            <p className="text-sm mb-1 text-on-surface">{t('chat.terminalTitle')}</p>
            <p className="text-xs text-on-surface-variant">{t('chat.terminalSubtitle')}</p>
            <div className="mt-6 text-xs text-on-surface-variant/50">
              <span className="text-primary/50">❯</span> {t('chat.terminalPrompt')}
            </div>
          </div>
        )}

        {sentQuery && steps.length > 0 && (
          <div className="mb-3 pb-3 border-b border-outline-variant/20">
            <div className="flex items-start gap-2">
              <span className="text-primary w-5 flex-shrink-0">❯</span>
              <span className="text-on-surface text-sm">{sentQuery}</span>
              {/* Phase A3: trace view toggle (only meaningful for loaded historical runs). */}
              {!isStreaming && (
                <button
                  onClick={() => setShowTraceView(v => !v)}
                  className={`ml-auto text-[10px] px-2 py-0.5 rounded border transition-colors
                    ${showTraceView ? 'bg-primary/10 text-primary border-primary/30' : 'text-on-surface-variant/60 border-outline-variant/40 hover:text-on-surface-variant'}`}
                  title="Toggle trace view"
                >
                  {showTraceView ? 'Timeline' : 'Trace'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Trace view — shows token/timing breakdown per node. */}
        {showTraceView && steps.length > 0 ? (
          <TraceCard
            steps={steps as unknown as TraceStep[]}
            totalTokens={traceMeta?.totalTokens}
            totalDurationMs={traceMeta?.totalDurationMs}
            modelCalls={traceMeta?.modelCalls}
          />
        ) : (
          steps.map((step, idx) => {
            // SEPARATOR = visual divider between conversation turns
            if (step.name === 'SEPARATOR') {
              return (
                <div key={step.id} className="relative py-2">
                  <div className="border-t border-dashed border-outline-variant/20" />
                </div>
              );
            }
            // USER_MESSAGE = the user's question displayed as a chat-style card
            if (step.name === 'USER_MESSAGE') {
              return (
                <div key={step.id} className="mb-2">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono text-sm pt-0.5 flex-shrink-0">❯</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-on-surface-variant/50 font-mono uppercase tracking-wider mb-0.5">You</div>
                      <p className="text-on-surface text-sm leading-relaxed whitespace-pre-wrap break-words">{step.content}</p>
                    </div>
                  </div>
                </div>
              );
            }
            // PROCESSING = generic loading indicator (no named node card shown)
            if (step.name === 'PROCESSING') {
              return (
                <div key={step.id} className="flex items-center justify-center gap-2 py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/60" />
                  <span className="text-[10px] text-primary/60 animate-pulse">{t('chat.processing')}</span>
                </div>
              );
            }
            const showConnector = idx < steps.length - 1 && steps[idx + 1]?.name !== 'SEPARATOR';
            return (
              <div key={step.id}>
                <StepLine step={step} order={idx + 1} isPausedAtHitl={awaitingConfirmation} />
                {showConnector && <ConnectorLine />}
              </div>
            );
          })
        )}

        {awaitingConfirmation && pendingThreadId && (
          <div className="mt-3 p-3 rounded border border-amber-500/40 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600">👤</span>
              <span className="text-on-surface text-sm font-semibold">{t('chat.humanReviewRequired')}</span>
              {repairCount > 1 && <span className="text-[10px] text-on-surface-variant/60">(repair #{repairCount})</span>}
            </div>
            {pendingPlan && <PlanView plan={pendingPlan} />}
            <textarea
              value={confirmationFeedback}
              onChange={(e) => setConfirmationFeedback(e.target.value)}
              placeholder={t('chat.feedbackPlaceholder')}
              rows={2}
              className="w-full mt-2 text-xs font-mono bg-surface text-on-surface border border-outline-variant/30 rounded px-2 py-1 outline-none focus:border-primary resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleConfirm(true)}
                disabled={confirming}
                className="text-xs font-mono px-3 py-1.5 rounded text-[#16a34a] bg-[#16a34a]/10 border border-[#16a34a]/30 hover:bg-[#16a34a]/20 disabled:opacity-40 flex items-center gap-1"
              >
                {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓'} {t('chat.confirmContinue')}
              </button>
              <button
                onClick={() => handleConfirm(false)}
                disabled={confirming}
                className="text-xs font-mono px-3 py-1.5 rounded text-error bg-error/10 border border-error/30 hover:bg-error/20 disabled:opacity-40 flex items-center gap-1"
              >
                {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✗'} {t('chat.rejectReplan')}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 text-error text-xs"><span>✗</span><span>{error}</span></div>
        )}

        {confirming && (
          <div className="flex items-center gap-2 text-on-surface-variant/50 text-xs animate-pulse mt-2">
            <Loader2 className="w-3 h-3 animate-spin" />{t('chat.resuming')}
          </div>
        )}

        {isStreaming && steps.length === 0 && (
          <div className="flex items-center gap-2 text-on-surface-variant/50 text-xs animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />{t('chat.initializing')}
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
              placeholder={t('chat.placeholder')}
              rows={2}
              disabled={isStreaming || awaitingConfirmation || confirming}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isStreaming || awaitingConfirmation || confirming || !query.trim() || !dbConnected}
            className="text-xs font-mono px-3 py-1.5 rounded text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors mt-1 flex-shrink-0"
          >
            {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('chat.run')}
          </button>
        </div>
        {!dbConnected && (
          <p className="px-4 pb-2 text-[10px] text-error font-mono">{t('chat.selectDbFirst')}</p>
        )}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmDialog
          title={t('chat.deleteSession')}
          message={t('chat.deleteSessionMsg')}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => deleteHistory(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}