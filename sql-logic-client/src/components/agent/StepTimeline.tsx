import { useRef, useEffect } from 'react';
import { getIcon } from '../../assets/icons';

interface StepData { nodeName: string; status: string; content?: string; output?: any }
interface TurnData { question: string; steps: StepData[] }

const STATUS_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  pending:   { icon: 'pending', color: '#64748b', bg: 'transparent' },
  running:   { icon: 'running', color: '#38bdf8', bg: 'rgba(56,189,248,0.06)' },
  completed: { icon: 'success', color: '#a3e635', bg: 'rgba(163,230,53,0.04)' },
  error:     { icon: 'error', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
};

export default function StepTimeline({ turns, isStreaming }: {
  turns: TurnData[];
  isStreaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  return (
    <div className="px-4 py-3 font-mono text-xs">
      {turns.map((turn, ti) => (
        <div key={ti} className="mb-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-outline-variant/50">
            <span className="text-[#a3e635] text-sm">$</span>
            <span className="text-sm text-on-surface">{turn.question}</span>
            {ti === turns.length - 1 && isStreaming && (
              <span className="ml-auto text-[11px] text-[#38bdf8] animate-pulse">running...</span>
            )}
          </div>

          {turn.steps.map((step, si) => {
            const status = STATUS_MAP[step.status] || STATUS_MAP.pending;
            const Icon = getIcon(status.icon);

            return (
              <div
                key={`${ti}-${si}`}
                className="flex gap-2 py-1.5 px-2 border-l-2 border-l-outline-variant hover:bg-surface-container-high transition-colors"
                style={{ background: status.bg, borderLeftColor: status.color }}
              >
                <Icon size={12} className={`mt-0.5 flex-shrink-0 ${step.status === 'running' ? 'animate-spin' : ''}`} style={{ color: status.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-on-surface">{step.nodeName}</span>
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: status.color }}>{step.status}</span>
                  </div>
                  {step.content && (
                    <div className="text-on-surface-variant whitespace-pre-wrap break-all text-[11px] leading-relaxed max-h-[200px] overflow-auto">
                      {step.content.length > 500 ? step.content.slice(0, 500) + '...' : step.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {ti < turns.length - 1 && <div className="hr my-3" />}
        </div>
      ))}

      {turns.length === 0 && (
        <div className="flex items-center justify-center h-full text-on-surface-variant/40 text-sm">
          <span className="text-[#a3e635] mr-2">$</span>
          Waiting for your analysis request...
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
