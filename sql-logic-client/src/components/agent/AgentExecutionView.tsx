import { useState, useCallback } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import StepTimeline from './StepTimeline';
import OutputPanel from './OutputPanel';
import { getIcon } from '../../assets/icons';

interface TurnsData { question: string; steps: StepData[] }
interface StepData { nodeName: string; status: string; content?: string; output?: any }

export default function AgentExecutionView({
  turns, isStreaming, hitlPending, onHitlConfirm,
  autoConfirm, onAutoConfirmChange, selectedDb, onDbChange,
}: {
  turns: TurnsData[];
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
      const newWidth = Math.max(280, Math.min(800, startWidth - (ev.clientX - startX)));
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

  const latestSteps: StepData[] = turns.length > 0 ? turns[turns.length - 1].steps : [];
  const latestOutput = latestSteps.find(s => s.output)?.output;

  return (
    <div className="flex-1 flex overflow-hidden" style={{ userSelect: isDragging ? 'none' : undefined }}>
      {/* Left: Step Timeline */}
      <div className="flex-1 overflow-auto min-w-[300px]">
        <StepTimeline turns={turns} isStreaming={isStreaming} />
      </div>

      {/* Resizable Divider */}
      <div className="resize-handle" onMouseDown={handleMouseDown} />

      {/* Right: Output Panel */}
      <div className="overflow-auto flex-shrink-0" style={{ width: rightPanelWidth }}>
        <OutputPanel output={latestOutput} steps={latestSteps} turns={turns} />
      </div>

      {/* HITL Confirm Panel */}
      {hitlPending && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 panel p-4 shadow-lg max-w-md">
          <div className="text-sm font-mono text-[#f59e0b] mb-2">Agent needs your confirmation</div>
          <pre className="text-[11px] text-on-surface-variant mb-3 max-h-40 overflow-auto">
            {JSON.stringify(hitlPending.plan, null, 2)}
          </pre>
          <div className="flex gap-2">
            <button onClick={() => onHitlConfirm(true)} className="btn-primary">Approve</button>
            <button onClick={() => onHitlConfirm(false, 'User rejected')} className="btn-danger">Reject</button>
          </div>
        </div>
      )}
    </div>
  );
}
