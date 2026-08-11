import { useState, useCallback, useEffect } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import type { TurnData, StepData } from '../../stores/conversationStore';
import StepTimeline from './StepTimeline';
import OutputPanel from './OutputPanel';
import RightPanelToggle from './RightPanelToggle';

export default function AgentExecutionView({
  turns, isStreaming, hitlPending, onHitlConfirm,
  autoConfirm, onAutoConfirmChange,
  hasMultimodalContent,
  conversationId, onRerun,
}: {
  turns: TurnData[];
  isStreaming: boolean;
  hitlPending: any;
  onHitlConfirm: (approved: boolean, feedback?: string) => void;
  autoConfirm: boolean;
  onAutoConfirmChange: (v: boolean) => void;
  selectedDb: number | null;
  onDbChange: (v: number) => void;
  hasMultimodalContent: boolean;
  conversationId?: string | number;
  /** Re-run a specific turn's question; falls back to the last turn when omitted. */
  onRerun?: (question?: string) => void;  
}) {
  const {
    rightPanelWidth, setRightPanelWidth,
    rightPanelExpanded, setRightPanelExpanded,
    rightPanelVisible, setRightPanelVisible,
  } = useLayout();
  const [isDragging, setIsDragging] = useState(false);

  // When streaming starts, show the toggle (collapsed). When streaming stops
  // and multimodal content exists, auto-expand the right panel.
  const [wasStreaming, setWasStreaming] = useState(false);

  useEffect(() => {
    if (isStreaming && !wasStreaming) {
      // Stream just started
      setRightPanelVisible(true);
      setRightPanelExpanded(false);
    }
    if (!isStreaming && wasStreaming) {
      // Stream just ended
      if (hasMultimodalContent) {
        setRightPanelExpanded(true);
      }
    }
    setWasStreaming(isStreaming);
  }, [isStreaming, wasStreaming, hasMultimodalContent, setRightPanelVisible, setRightPanelExpanded]);

  const handleTogglePanel = useCallback(() => {
    setRightPanelExpanded(!rightPanelExpanded);
  }, [setRightPanelExpanded, rightPanelExpanded]);

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

  // Collect all outputs from all turns
  const allSteps: StepData[] = turns.length > 0
    ? turns.flatMap(t => t.steps)
    : [];
  const latestOutput = [...allSteps].reverse().find(s => s.output)?.output;

  return (
    <div className="flex-1 flex overflow-hidden" style={{ userSelect: isDragging ? 'none' : undefined }}>
      {/* Left: Step Timeline — always visible */}
      <div className="flex-1 overflow-auto" style={{ minWidth: '320px' }}>
        <StepTimeline
          turns={turns}
          isStreaming={isStreaming}
          onViewVisualizations={() => setRightPanelExpanded(true)}
          conversationId={conversationId}
          onRerun={onRerun}
        />
      </div>

      {/* Right panel: three states */}
      {rightPanelVisible && !rightPanelExpanded && (
        /* State 2: Collapsed — only the toggle bookmark */
        <RightPanelToggle expanded={false} onClick={handleTogglePanel} visible={true} />
      )}

      {rightPanelVisible && rightPanelExpanded && (
        /* State 3: Expanded — full panel with resizable divider */
        <>
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

          {/* Output Panel */}
          <div
            className="overflow-hidden flex-shrink-0 h-full"
            style={{ width: rightPanelWidth, transition: 'width 200ms var(--ease-out-fast)' }}
          >
            <OutputPanel output={latestOutput} steps={allSteps} turns={turns} />
          </div>

          {/* Toggle to collapse */}
          <RightPanelToggle expanded={true} onClick={handleTogglePanel} visible={true} />
        </>
      )}

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
