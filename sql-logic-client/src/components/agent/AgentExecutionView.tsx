import { useState, useCallback } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import StepTimeline from './StepTimeline';
import OutputPanel from './OutputPanel';

interface TurnData { question: string; steps: StepData[] }
interface StepData { nodeName: string; status: string; content?: string; output?: any; messageType?: string }

export default function AgentExecutionView({
  turns, isStreaming, hitlPending, onHitlConfirm,
  autoConfirm, onAutoConfirmChange,
}: {
  turns: TurnData[];
  isStreaming: boolean;
  hitlPending: any;
  onHitlConfirm: (approved: boolean, feedback?: string) => void;
  autoConfirm: boolean;
  onAutoConfirmChange: (v: boolean) => void;
  selectedDb: number | null;
  onDbChange: (v: number) => void;
}) {
  const { rightPanelWidth, setRightPanelWidth } = useLayout();
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(700, startWidth - (ev.clientX - startX)));
      setRightPanelWidth(newWidth);
    };
    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rightPanelWidth, setRightPanelWidth]);

  // Collect all outputs from the latest turn
  const allSteps: StepData[] = turns.length > 0
    ? turns.flatMap(t => t.steps)
    : [];
  const latestOutput = [...allSteps].reverse().find(s => s.output)?.output;

  return (
    <div className="flex-1 flex overflow-hidden" style={{ userSelect: isDragging ? 'none' : undefined }}>
      {/* Left: Step Timeline */}
      <div className="flex-1 overflow-auto" style={{ minWidth: '320px' }}>
        <StepTimeline turns={turns} isStreaming={isStreaming} />
      </div>

      {/* Resizable Divider */}
      <div
        className="flex-shrink-0 cursor-col-resize relative group"
        style={{ width: '4px', background: 'transparent' }}
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors duration-150"
          style={{ background: isDragging ? 'var(--color-primary)' : 'var(--color-border-subtle)' }}
        />
      </div>

      {/* Right: Output Panel */}
      <div className="overflow-hidden flex-shrink-0 h-full" style={{ width: rightPanelWidth }}>
        <OutputPanel output={latestOutput} steps={allSteps} turns={turns} />
      </div>

      {/* HITL Confirm */}
      {hitlPending && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl"
          style={{
            background: 'var(--color-content-bg)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            maxWidth: '420px',
            width: '90%',
          }}
        >
          <div
            className="mb-2"
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-semantic-gate)',
            }}
          >
            Agent needs your confirmation
          </div>
          <pre
            className="mb-3 max-h-40 overflow-auto rounded-md p-2"
            style={{
              fontSize: '11px',
              color: 'var(--color-ink-secondary)',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              background: 'var(--color-app-bg)',
              lineHeight: 1.5,
            }}
          >
            {typeof hitlPending.plan === 'string' ? hitlPending.plan : JSON.stringify(hitlPending.plan, null, 2)}
          </pre>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onHitlConfirm(false, 'User rejected')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                color: 'var(--color-ink-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              Reject
            </button>
            <button
              onClick={() => onHitlConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: 'var(--color-ink)',
                color: 'var(--color-content-bg)',
              }}
            >
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
