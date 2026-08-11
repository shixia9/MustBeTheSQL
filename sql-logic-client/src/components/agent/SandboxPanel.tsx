/**
 * SandboxPanel — renders the stacked sandbox executions for a SANDBOX step.
 *
 * Each execution (STARTED → stream* → FINISHED) becomes one TerminalRenderer card,
 * ordered oldest → newest. Supports an optional manual-execution launcher for
 * the "Run" button and an empty state.
 */
import TerminalRenderer, { type TerminalExecution } from './TerminalRenderer';

interface Props {
  /** The SANDBOX step's output.executions array (may be undefined for non-sandbox steps). */
  executions?: TerminalExecution[];
  /** Optional: render a manual "run code" launcher above the executions. */
  manualCode?: string;
  manualLanguage?: string;
  manualExecuting?: boolean;
  onManualRun?: () => void;
  manualResult?: TerminalExecution | null;
}

export default function SandboxPanel({
  executions,
  manualCode,
  manualLanguage,
  manualExecuting,
  onManualRun,
  manualResult,
}: Props) {
  const hasExecutions = executions && executions.length > 0;
  const showManual = manualCode && onManualRun;

  return (
    <div className="space-y-3">
      {/* Manual execution launcher (Task 11 Run button target) */}
      {showManual && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-ink-tertiary)' }}
            >
              Manual execution · {manualLanguage || 'python'}
            </span>
            <button
              onClick={onManualRun}
              disabled={manualExecuting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--color-primary-soft)',
                color: 'var(--color-primary)',
              }}
            >
              {manualExecuting ? 'Running…' : 'Run'}
            </button>
          </div>
          {manualResult && (
            <TerminalRenderer execution={manualResult} indexLabel="#manual" />
          )}
        </div>
      )}

      {/* Agent-driven executions */}
      {hasExecutions ? (
        <>
          <div className="flex items-center gap-1.5" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Sandbox executions</span>
            <span style={{ opacity: 0.6 }}>({executions!.length})</span>
          </div>
          {executions!.map((exec, i) => (
            <TerminalRenderer
              key={i}
              execution={exec}
              indexLabel={`#${i + 1}`}
            />
          ))}
        </>
      ) : !showManual ? (
        <div
          className="flex flex-col items-center justify-center h-32 gap-2"
          style={{ color: 'var(--color-ink-tertiary)', fontSize: '12px' }}
        >
          <span>No sandbox executions yet</span>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>
            Code runs by the agent will stream here in real time
          </span>
        </div>
      ) : null}
    </div>
  );
}
