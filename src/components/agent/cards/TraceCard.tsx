import { Clock, Cpu, Zap } from 'lucide-react';
import { formatDuration } from '../../../types/agent';

interface TraceStep {
  nodeName: string;
  sequenceNo: number;
  status: string;
  durationMs?: number;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  nodeType?: string;
}

interface Props {
  steps: TraceStep[];
  totalTokens?: number;
  totalDurationMs?: number;
  modelCalls?: number;
}

const NODE_LABELS: Record<string, string> = {
  EVIDENCE_RECALL: 'Evidence Recall',
  SCHEMA_LINKING: 'Schema Linking',
  FEASIBILITY_ASSESSMENT: 'Feasibility',
  PLANNER: 'Planner',
  HITL_GATE: 'HITL Gate',
  HITL: 'HITL',
  PLAN_DISPATCH: 'Dispatch',
  SQL_GENERATION: 'SQL Gen',
  SQL_EXECUTION: 'SQL Exec',
  SQL_FIXER: 'SQL Fixer',
  PYTHON_GENERATION: 'Python Gen',
  PYTHON_EXECUTION: 'Python Exec',
  PYTHON_ANALYSIS: 'Python Analyze',
  REPORT: 'Report',
};

export default function TraceCard({ steps, totalTokens, totalDurationMs, modelCalls }: Props) {
  const maxLatency = Math.max(1, ...steps.map(s => Number(s.latencyMs ?? s.durationMs ?? 0)));
  const totalDur = totalDurationMs ?? 0;

  return (
    <div className="border border-outline-variant/30 rounded p-4 bg-surface-container-low">
      {/* Aggregate stats */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-primary/70" />
          <span className="text-on-surface-variant">Tokens</span>
          <span className="text-on-surface font-semibold">{totalTokens ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-amber-400" />
          <span className="text-on-surface-variant">Model calls</span>
          <span className="text-on-surface font-semibold">{modelCalls ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-emerald-400" />
          <span className="text-on-surface-variant">Total</span>
          <span className="text-on-surface font-semibold">{formatDuration(totalDur)}</span>
        </div>
      </div>

      {/* Timing waterfall */}
      <div className="space-y-1.5">
        {steps.length === 0 && (
          <div className="text-xs text-on-surface-variant/60 py-4 text-center">No trace steps recorded.</div>
        )}
        {steps.map((s, i) => {
          const lat = Number(s.latencyMs ?? s.durationMs ?? 0);
          const widthPct = Math.max(2, Math.round((lat / maxLatency) * 100));
          const tokens = (s.inputTokens ?? 0) + (s.outputTokens ?? 0);
          return (
            <div key={`${s.nodeName}-${i}`} className="flex items-center gap-2 text-[11px]">
              <span className="w-28 text-on-surface-variant truncate">{NODE_LABELS[s.nodeName] || s.nodeName}</span>
              <div className="flex-1 h-4 bg-surface-container rounded overflow-hidden relative">
                <div className="h-full bg-primary/30" style={{ width: `${widthPct}%` }} />
              </div>
              <span className="w-14 text-right text-on-surface-variant/70">{formatDuration(lat)}</span>
              {tokens > 0 && <span className="w-12 text-right text-primary/70">{tokens}tk</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
