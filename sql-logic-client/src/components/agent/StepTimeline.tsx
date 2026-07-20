import { useRef, useEffect } from 'react';
import { getIcon } from '../../assets/icons';

interface StepData {
  nodeName: string;
  status: string;
  content?: string;
  output?: any;
  messageType?: string;
}

interface TurnData {
  question: string;
  steps: StepData[];
}

const NODE_LABELS: Record<string, string> = {
  MANAGER: 'Orchestrator',
  PLANNER: 'Planner',
  DATA_SCIENTIST: 'Data Scientist',
  CODE_ASSISTANT: 'Code Assistant',
  DASHBOARD: 'Dashboard',
  TOOL_ASSISTANT: 'Tool Assistant',
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
  if (o.report) return `Report: ${String(o.report).slice(0, 200)}`;
  if (o.sql) return `SQL: ${String(o.sql).slice(0, 300)}`;
  if (o.plan) return `Plan: ${String(o.plan).slice(0, 200)}`;
  if (o.pythonCode) return `Python: ${String(o.pythonCode).slice(0, 200)}`;
  if (o.toolName) return `Tool: ${o.toolName} → ${String(o.toolResult || '').slice(0, 150)}`;
  if (o.nextNode) return `Routing → ${o.nextNode}`;
  if (o.sqlExecutionResult) return `Result: ${JSON.stringify(o.sqlExecutionResult).slice(0, 200)}`;
  return null;
}

export default function StepTimeline({ turns, isStreaming }: {
  turns: TurnData[];
  isStreaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Flatten all steps from all turns with turn context
  const allSteps: { turnIdx: number; question: string; step: StepData; stepIdx: number }[] = [];
  for (let ti = 0; ti < turns.length; ti++) {
    for (let si = 0; si < turns[ti].steps.length; si++) {
      allSteps.push({ turnIdx: ti, question: turns[ti].question, step: turns[ti].steps[si], stepIdx: si });
    }
  }

  if (allSteps.length === 0) {
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

          {/* Steps */}
          {turn.steps.map((step, si) => {
            const isRunning = step.status === 'running';
            const isError = step.status === 'error';
            const isCompleted = step.status === 'completed';
            const msgColor = MSG_COLORS[step.messageType || ''] || MSG_COLORS.STATUS;
            const summary = extractSummary(step);
            const label = NODE_LABELS[step.nodeName] || step.nodeName;

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
                  {/* Connector line to next step */}
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
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
