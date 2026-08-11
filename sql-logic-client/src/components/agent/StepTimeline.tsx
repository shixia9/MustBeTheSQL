import { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown } from 'lucide-react';
import { getIcon } from '../../assets/icons';
import type { CompactionEvent, PlanSnapshot, ThinkingStatus } from '../../stores/conversationStore';
import CompactionPanel from './CompactionPanel';
import PlanTodoList from './PlanTodoList';
import TurnActionBar from './TurnActionBar';
import ThinkingPanel from './ThinkingPanel';
import { stripVisContent, parseVisContent, looksLikeChartJson, buildChartSummary, splitDashboardContent } from '../../utils/visContentParser';

interface StepData {
  nodeName: string;
  status: string;
  content?: string;
  output?: any;
  messageType?: string;
  /** Raw LLM reasoning text from the THINKING SSE event. */
  thinking?: string;
  /** Display state of the thinking panel for this step. */
  thinkingStatus?: ThinkingStatus;
}

interface TurnData {
  question: string;
  steps: StepData[];
  /** Context-compaction events captured while this turn was streaming (L1–L4). */
  compactionEvents?: CompactionEvent[];
  /** Plan snapshot pushed by the backend PLAN_UPDATED event (ManagerAgent). */
  plan?: PlanSnapshot;
}

const NODE_LABELS: Record<string, string> = {
  MANAGER: 'Orchestrator',
  PLANNER: 'Planner',
  DATA_SCIENTIST: 'Data Scientist',
  DATASCIENTIST: 'Data Scientist',
  CODE_ASSISTANT: 'Code Assistant',
  CODEASSISTANT: 'Code Assistant',
  DASHBOARD: 'Dashboard',
  DASHBOARDASSISTANT: 'Dashboard',
  TOOL_ASSISTANT: 'Tool Assistant',
  TOOLASSISTANT: 'Tool Assistant',
};

const MSG_COLORS: Record<string, string> = {
  THINKING: '#818cf8',
  STATUS: '#64748b',
  TOOL_CALL: '#38bdf8',
  TOOL_RESULT: '#a3e635',
  REPORT: '#f59e0b',
};

function extractSummary(step: StepData): string | null {
  const o = step.output;
  if (!o) return null;
  if (o.errorMsg) return `Error: ${String(o.errorMsg).slice(0, 300)}`;
  if (o.report) return `Report: ${String(o.report).slice(0, 200)}`;
  if (o.sql) return `SQL: ${String(o.sql).slice(0, 300)}`;
  if (o.plan) return `Plan: ${String(o.plan).slice(0, 200)}`;
  if (o.pythonCode) return `Python: ${String(o.pythonCode).slice(0, 200)}`;
  if (o.toolName) return `Tool: ${o.toolName} → ${String(o.toolResult || '').slice(0, 150)}`;
  if (o.nextNode) return `Routing → ${o.nextNode}`;
  if (o.sqlExecutionResult) return `Result: ${JSON.stringify(o.sqlExecutionResult).slice(0, 200)}`;
  if (o.content) return String(o.content).slice(0, 300);
  if (o.agentSuccess === false) return 'Agent execution failed — check backend logs for details';
  return null;
}

function turnReplyText(turn: TurnData): string {
  const steps = turn.steps;
  for (let i = steps.length - 1; i >= 0; i--) {
    const o = steps[i].output;
    if (o) {
      if (o.report) return String(o.report);
      if (o.content) return String(o.content);
      if (o.sql) return String(o.sql);
      if (o.toolResult != null) return String(o.toolResult);
    }
  }
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].content) return String(steps[i].content);
  }
  return turn.question || '';
}

/** Reusable ReactMarkdown components for the Process Summary section. */
const summaryMdComponents = {
  h1: ({ children }: any) => <h1 className="text-sm font-bold mt-3 mb-1" style={{ color: 'var(--color-ink)' }}>{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xs font-bold mt-2 mb-1" style={{ color: 'var(--color-ink)' }}>{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-xs font-semibold mt-1 mb-0.5" style={{ color: 'var(--color-ink)' }}>{children}</h3>,
  p: ({ children }: any) => <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</p>,
  ul: ({ children }: any) => <ul className="text-xs list-disc ml-4 mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</ul>,
  ol: ({ children }: any) => <ol className="text-xs list-decimal ml-4 mb-1" style={{ color: 'var(--color-ink-secondary)' }}>{children}</ol>,
  li: ({ children }: any) => <li className="text-xs mb-0.5" style={{ color: 'var(--color-ink-secondary)' }}>{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold" style={{ color: 'var(--color-ink)' }}>{children}</strong>,
  code: ({ children }: any) => <code className="text-[10px] px-1 py-0.5 rounded font-mono" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{children}</code>,
  table: ({ children }: any) => <table className="text-[10px] w-full border-collapse my-1 rounded" style={{ border: '1px solid var(--color-border-subtle)' }}>{children}</table>,
  th: ({ children }: any) => <th className="px-2 py-1 text-left font-semibold border-b" style={{ color: 'var(--color-ink)', background: 'var(--color-app-bg)', borderColor: 'var(--color-border-subtle)' }}>{children}</th>,
  td: ({ children }: any) => <td className="px-2 py-1 border-b" style={{ color: 'var(--color-ink-secondary)', borderColor: 'var(--color-border-subtle)' }}>{children}</td>,
};

/** A small collapsible section with a header row and animated expand/collapse. */
function CollapsibleSection({ title, count, defaultOpen, children }: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full text-left py-0.5 transition-colors"
        style={{ color: 'var(--color-ink-tertiary)' }}
      >
        <ChevronDown size={10} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 150ms' }} />
        <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          {title}{count != null ? ` (${count})` : ''}
        </span>
      </button>
      {open && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

/**
 * Wraps {@link ThinkingPanel} for a single step, managing the thinking panel's
 * expand/collapse state locally so it doesn't need to round-trip through the
 * parent store. The initial status is seeded from {@link StepData.thinkingStatus}
 * (set by ChatPage when the THINKING / FINISHED SSE events arrive), and the
 * wrapper syncs when the backend transitions the status from `streaming` →
 * `done`. User toggles thereafter are purely local.
 *
 * Extracted as a component because hooks cannot be called inside the
 * `turn.steps.map()` callback in the parent.
 */
function StepThinkingWrapper({ step }: { step: StepData }) {
  const [localStatus, setLocalStatus] = useState<ThinkingStatus>(
    step.thinkingStatus || 'streaming'
  );

  // Sync from prop: when the backend FINISHED event sets thinkingStatus to
  // 'done' while we're still 'streaming', transition locally so the
  // auto-collapse timer in ThinkingPanel can fire.
  useEffect(() => {
    if (step.thinkingStatus === 'done' && localStatus === 'streaming') {
      setLocalStatus('done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.thinkingStatus]);

  const handleStatusChange = useCallback((s: ThinkingStatus) => {
    setLocalStatus(s);
  }, []);

  if (!step.thinking) return null;

  return (
    <ThinkingPanel
      content={step.thinking}
      status={localStatus}
      onStatusChange={handleStatusChange}
    />
  );
}

export default function StepTimeline({
  turns, isStreaming, onViewVisualizations,
  conversationId, onRerun,
}: {
  turns: TurnData[];
  isStreaming: boolean;
  onViewVisualizations?: () => void;
  conversationId?: string | number;
  /** Re-run a specific turn's question. When omitted, falls back to the last turn. */
  onRerun?: (question?: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const allSteps: { turnIdx: number; question: string; step: StepData; stepIdx: number }[] = [];
  for (let ti = 0; ti < turns.length; ti++) {
    for (let si = 0; si < turns[ti].steps.length; si++) {
      allSteps.push({ turnIdx: ti, question: turns[ti].question, step: turns[ti].steps[si], stepIdx: si });
    }
  }

  // Find the latest DASHBOARD step with report content (for process summary)
  const lastDashboardStep = [...allSteps].reverse().find(
    s => (s.step.nodeName === 'DASHBOARD' || s.step.nodeName === 'DASHBOARDASSISTANT')
      && (s.step.output?.report || s.step.output?.content)
  );

  if (allSteps.length === 0) {
    // While streaming with no steps yet (MANAGER STARTED is filtered), show
    // the "thinking..." state instead of the empty placeholder so the user
    // gets immediate feedback after sending a message.
    if (isStreaming && turns.length > 0) {
      return (
        <div className="px-4 py-3" style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
          {turns.map((turn, ti) => (
            <div key={ti} className="mb-4">
              <div
                className="flex items-start gap-2 mb-3 pb-2"
                style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
              >
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  $
                </span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.4 }}>
                  {turn.question}
                </span>
              </div>
              {ti === turns.length - 1 && (
                <div
                  className="flex items-center gap-2 py-2 px-3 mb-1"
                  style={{ color: 'var(--color-ink-tertiary)' }}
                >
                  <div
                    className="animate-spin rounded-full"
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid var(--color-border-subtle)',
                      borderTopColor: 'var(--color-primary)',
                    }}
                  />
                  <span
                    className="animate-pulse"
                    style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '-0.01em' }}
                  >
                    thinking...
                  </span>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-ink-tertiary)' }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', color: 'var(--color-primary)' }}>$</span>
        <span style={{ fontSize: '13px', fontWeight: 400 }}>Agent execution timeline will appear here</span>
        <span style={{ fontSize: '11px', opacity: 0.5 }}>Send a query to start the Multi-Agent pipeline</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-3" style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      {turns.map((turn, ti) => (
        <div key={ti} className="mb-4">
          {/* Turn question header */}
          <div
            className="flex items-start gap-2 mb-3 pb-2"
            style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
          >
            <span
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              $
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.4 }}>
              {turn.question}
            </span>
            {ti === turns.length - 1 && isStreaming && (
              <span
                className="ml-auto flex-shrink-0"
                style={{
                  fontSize: '11px',
                  color: 'var(--color-primary)',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                <span className="inline-block animate-pulse">running</span>
              </span>
            )}
          </div>

          {/* Plan TODO list — rendered when the backend has pushed a PLAN_UPDATED snapshot */}
          {turn.plan && turn.plan.steps && turn.plan.steps.length > 0 && (
            <PlanTodoList
              plan={turn.plan}
              isStreaming={isStreaming}
              isCurrentTurn={ti === turns.length - 1}
            />
          )}

          {/* "thinking..." indicator — shown while the last turn is streaming
              but no worker node has reported yet (MANAGER STARTED is filtered,
              so steps stay empty during complexity assessment and the chitchat
              direct-answer LLM call). Replaced automatically by node cards as
              soon as the first non-MANAGER STARTED event arrives. */}
          {ti === turns.length - 1 && isStreaming && turn.steps.length === 0 && (
            <div
              className="flex items-center gap-2 py-2 px-3 mb-1"
              style={{ color: 'var(--color-ink-tertiary)' }}
            >
              <div
                className="animate-spin rounded-full"
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid var(--color-border-subtle)',
                  borderTopColor: 'var(--color-primary)',
                }}
              />
              <span
                className="animate-pulse"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                }}
              >
                thinking...
              </span>
            </div>
          )}

          {/* Steps */}
          {turn.steps.map((step, si) => {
            const isRunning = step.status === 'running';
            const isError = step.status === 'error';
            const isCompleted = step.status === 'completed';
            const msgColor = MSG_COLORS[step.messageType || ''] || MSG_COLORS.STATUS;
            const summary = extractSummary(step);
            const label = NODE_LABELS[step.nodeName] || step.nodeName;

            // Chitchat DASHBOARD steps carry a direct LLM answer (route=chitchat)
            // rather than a data-analysis report. Render as a clean text bubble
            // without the agent-node chrome (label, status badge, dot).
            const isChitchat = step.nodeName === 'DASHBOARD'
              && step.output?.route === 'chitchat';

            if (isChitchat) {
              const answerText = step.output?.content || summary || '';
              return (
                <div key={`${ti}-${si}`} className="py-2 px-3 mb-1">
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'var(--color-ink)',
                      lineHeight: 1.65,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {answerText}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${ti}-${si}`}
                className="flex gap-3 py-2 px-3 rounded-lg mb-1 transition-colors duration-150"
                style={{
                  background: isRunning
                    ? `linear-gradient(135deg, ${msgColor}0a, transparent)`
                    : 'transparent',
                  borderLeft: `2px solid ${isRunning ? msgColor : isError ? '#ef4444' : 'transparent'}`,
                }}
              >
                {/* Status dot */}
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: '16px', marginTop: '2px' }}>
                  {isRunning && (
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: msgColor }}
                    />
                  )}
                  {isCompleted && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: msgColor }}
                    />
                  )}
                  {isError && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#ef4444' }}
                    />
                  )}
                  {si < turn.steps.length - 1 && (
                    <div className="flex-1 w-px mt-1" style={{ background: 'var(--color-border-subtle)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: msgColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {step.messageType?.replace('_', ' ') || step.status}
                    </span>
                    {isRunning && (
                      <span style={{ fontSize: '11px', color: 'var(--color-ink-tertiary)' }}>
                        executing...
                      </span>
                    )}
                  </div>

                  {/* ── Thinking process (collapsible, above the output) ──
                      Renders only when the step has a `thinking` payload from
                      a THINKING SSE event. Worker agents (DataScientist,
                      CodeAssistant, etc.) emit this; ManagerAgent does not. */}
                  <StepThinkingWrapper step={step} />

                  {/* ── Final output (below the thinking panel) ── */}
                  {summary && (
                    <div
                      className="mt-1"
                      style={{
                        fontSize: '12px',
                        fontWeight: 400,
                        color: 'var(--color-ink-secondary)',
                        lineHeight: 1.5,
                        letterSpacing: '-0.01em',
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        wordBreak: 'break-all',
                        maxHeight: '150px',
                        overflow: 'auto',
                      }}
                    >
                      {summary}
                    </div>
                  )}
                  {isError && step.content && (
                    <div
                      className="mt-1 px-2 py-1 rounded"
                      style={{
                        fontSize: '11px',
                        color: '#ef4444',
                        background: 'rgba(239,68,68,0.06)',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      {step.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Context-compaction events observed during this turn (L1–L4) */}
          {turn.compactionEvents && turn.compactionEvents.length > 0 && (
            <CompactionPanel events={turn.compactionEvents} />
          )}

          {/* Per-turn action bar for HISTORICAL turns (not the latest).
              The latest turn's bar renders after the Process Summary below,
              so we skip it here to avoid duplicates. Historical turns are
              always complete, so the bar shows unconditionally. */}
          {ti < turns.length - 1 && (
            <TurnActionBar
              conversationId={conversationId}
              reportText={turnReplyText(turn)}
              onRerun={() => onRerun?.(turn.question)}
            />
          )}
        </div>
      ))}

      {/* ── Process Summary (after last turn) ── */}
      {/* Skip for chitchat */}
      {lastDashboardStep && !isStreaming && lastDashboardStep.step.output?.route !== 'chitchat' && (() => {
        const raw = lastDashboardStep.step.output?.report
          || lastDashboardStep.step.output?.content || '';

        // If pure chart JSON (no markdown body), use the existing summary builder
        if (looksLikeChartJson(raw) && !/```html/i.test(raw)) {
          const summary = buildChartSummary(raw);
          if (summary) {
            return (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>Process Summary</span>
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={summaryMdComponents}>
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }
        }

        // Split DASHBOARD content: JSON chart items + Markdown + HTML
        const { chartJson, markdownBody, htmlContent } = splitDashboardContent(raw);
        const hasChartJson = chartJson && chartJson.length > 0;
        const hasHtml = htmlContent && htmlContent.length > 0;
        const hasMarkdown = markdownBody && markdownBody.length > 0;

        if (!hasMarkdown && !hasChartJson && !hasHtml) {
          return <span style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}>Report content pending...</span>;
        }

        return (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>Process Summary</span>
            </div>

            {/* Collapsible JSON chart definitions */}
            {hasChartJson && (
              <CollapsibleSection title="Chart Definitions" count={(() => {
                try { return JSON.parse(chartJson).length; } catch { return 0; }
              })()} defaultOpen={false}>
                <pre className="text-[10px] leading-relaxed overflow-auto max-h-32 p-2 rounded font-mono"
                  style={{ background: 'var(--color-app-bg)', color: 'var(--color-ink-tertiary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {chartJson.length > 800 ? chartJson.substring(0, 800) + '\n...' : chartJson}
                </pre>
              </CollapsibleSection>
            )}

            {/* Markdown text summary */}
            {hasMarkdown && (
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={summaryMdComponents}>
                  {markdownBody}
                </ReactMarkdown>
              </div>
            )}

            {/* Collapsible HTML report */}
            {hasHtml && (
              <CollapsibleSection title="HTML Report" defaultOpen={false}>
                <pre className="text-[10px] leading-relaxed overflow-auto max-h-40 p-2 rounded font-mono"
                  style={{ background: 'var(--color-app-bg)', color: 'var(--color-ink-tertiary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {htmlContent.length > 600 ? htmlContent.substring(0, 600) + '\n<!-- ...truncated... -->' : htmlContent}
                </pre>
              </CollapsibleSection>
            )}

            {/* No clean markdown but has other content */}
            {!hasMarkdown && (hasChartJson || hasHtml) && (
              <span style={{ color: 'var(--color-ink-tertiary)', fontSize: '11px' }}>
                Report content is in the collapsible sections above.
              </span>
            )}
          </div>
        );
      })()}

      {/* ── Latest turn's action bar ──
          Rendered once streaming ends, regardless of reply type (dashboard
          report, chitchat, clarification, error, tool/MCP, SQL, code). When a
          Process Summary exists it appears directly below it; otherwise
          directly below the last turn's step cards. Historical turns get
          their own bar inside the map above. */}
      {!isStreaming && turns.length > 0 && (() => {
        const lastTurn = turns[turns.length - 1];
        return (
          <TurnActionBar
            conversationId={conversationId}
            reportText={turnReplyText(lastTurn)}
            onRerun={() => onRerun?.(lastTurn.question)}
          />
        );
      })()}

      <div ref={bottomRef} />
    </div>
  );
}
