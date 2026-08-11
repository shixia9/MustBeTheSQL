import { useState } from 'react';
import { Database, Code2, Wrench, LayoutDashboard, HelpCircle, ChevronDown, RotateCw } from 'lucide-react';
import type { PlanSnapshot, PlanStepDto, PlanStepStatus } from '../../stores/conversationStore';

const AGENT_ICON: Record<string, typeof Database> = {
  DataScientist: Database,
  DATASCIENTIST: Database,
  CodeAssistant: Code2,
  CODEASSISTANT: Code2,
  ToolAssistant: Wrench,
  TOOLASSISTANT: Wrench,
  DashboardAssistant: LayoutDashboard,
  DASHBOARDASSISTANT: LayoutDashboard,
  Dashboard: LayoutDashboard,
  CLARIFY: HelpCircle,
};

const STATUS_LABEL: Record<PlanStepStatus, string> = {
  TODO: '待执行',
  RUNNING: '执行中…',
  COMPLETED: '已完成',
  FAILED: '失败',
};

export default function PlanTodoList({
  plan,
  isStreaming,
  isCurrentTurn,
}: {
  plan: PlanSnapshot;
  isStreaming: boolean;
  isCurrentTurn: boolean;
}) {
  const total = plan.totalSteps || plan.steps.length;
  const completed = plan.completedSteps ?? plan.steps.filter(s => s.status === 'COMPLETED').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className="mb-3 rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-content-bg)',
      }}
    >
      {/* Header: title + progress */}
      <div className="px-3 pt-2.5 pb-2" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Execution Plan
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: completed === total && total > 0 ? 'var(--color-sig-green)' : 'var(--color-ink-tertiary)',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            }}
          >
            {completed} / {total}
          </span>
        </div>
        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '4px', background: 'var(--color-border-subtle)' }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--color-sig-green)',
              transition: 'width 300ms ease-out',
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="py-1">
        {plan.steps.map((step, i) => (
          <PlanStepRow
            key={`${step.serialNumber}-${i}`}
            step={step}
            isLast={i === plan.steps.length - 1}
            isCurrentTurn={isCurrentTurn}
          />
        ))}
      </div>
    </div>
  );
}

function PlanStepRow({
  step,
  isLast,
  isCurrentTurn,
}: {
  step: PlanStepDto;
  isLast: boolean;
  isCurrentTurn: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = AGENT_ICON[step.agent] || HelpCircle;
  const relyNums = step.rely && step.rely.trim() ? step.rely.split(',').map(r => r.trim()).filter(Boolean) : [];

  const status = step.status;
  const isRunning = status === 'RUNNING';
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  let badgeColor = 'var(--color-ink-tertiary)';
  if (isRunning) badgeColor = 'var(--color-primary)';
  else if (isCompleted) badgeColor = 'var(--color-sig-green)';
  else if (isFailed) badgeColor = 'var(--color-sig-red)';

  const hasResult = !!step.result && step.result.length > 0;

  return (
    <div
      className="flex gap-2.5 px-3 py-1.5 transition-colors"
      style={{
        background: isRunning ? 'rgba(99,102,241,0.04)' : 'transparent',
      }}
    >
      {/* Status badge + connector line */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: '14px', marginTop: '2px' }}>
        <StatusBadge status={status} color={badgeColor} />
        {!isLast && (
          <div className="flex-1 w-px mt-1" style={{ background: 'var(--color-border-subtle)' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="flex-shrink-0"
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: 'var(--color-ink-tertiary)',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            }}
          >
            #{step.serialNumber}
          </span>
          <Icon size={12} style={{ color: 'var(--color-ink-tertiary)', flexShrink: 0 }} strokeWidth={1.8} />
          <span
            className="truncate"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-ink)',
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
              letterSpacing: '-0.01em',
              minWidth: 0,
            }}
          >
            {step.content}
          </span>
          {step.retryTimes > 0 && (
            <span
              className="flex items-center gap-0.5 flex-shrink-0 px-1 rounded"
              style={{
                fontSize: '9.5px',
                fontWeight: 600,
                color: 'var(--color-sig-amber)',
                background: 'rgba(240,160,64,0.10)',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              }}
              title={`已重试 ${step.retryTimes} 次`}
            >
              <RotateCw size={9} /> ×{step.retryTimes}
            </span>
          )}
          <span
            className="flex-shrink-0 ml-auto"
            style={{
              fontSize: '9.5px',
              fontWeight: 500,
              color: badgeColor,
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Dependency chip */}
        {relyNums.length > 0 && (
          <div className="mt-0.5">
            <span
              style={{
                fontSize: '9.5px',
                color: 'var(--color-ink-tertiary)',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              }}
            >
              依赖 #{relyNums.join(',#')}
            </span>
          </div>
        )}

        {/* Collapsible result */}
        {hasResult && (
          <div className="mt-0.5">
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 transition-opacity"
              style={{ color: 'var(--color-ink-tertiary)', opacity: 0.8 }}
            >
              <ChevronDown
                size={9}
                style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 150ms' }}
              />
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 500,
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                }}
              >
                {expanded ? '收起结果' : '查看结果'}
              </span>
            </button>
            {expanded && (
              <pre
                className="mt-1 p-2 rounded overflow-auto max-h-32"
                style={{
                  fontSize: '10px',
                  lineHeight: 1.5,
                  color: 'var(--color-ink-secondary)',
                  background: 'var(--color-app-bg)',
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {step.result}
              </pre>
            )}
          </div>
        )}

        {/* Error highlight */}
        {isFailed && hasResult && !expanded && (
          <div
            className="mt-0.5 px-2 py-0.5 rounded truncate"
            style={{
              fontSize: '10px',
              color: 'var(--color-sig-red)',
              background: 'rgba(239,68,68,0.06)',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            }}
          >
            {step.result}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, color }: { status: PlanStepStatus; color: string }) {
  if (status === 'RUNNING') {
    return (
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: color }}
      />
    );
  }
  if (status === 'COMPLETED') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === 'FAILED') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  // TODO — hollow square
  return (
    <div
      className="w-2 h-2 rounded-sm"
      style={{ border: `1.5px solid ${color}` }}
    />
  );
}
