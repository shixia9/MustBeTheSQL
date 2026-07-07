import { Activity, Cpu, Zap, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { formatDuration, nodeCategoryOf, CATEGORY_STYLES, type TraceStep } from '../../../types/agent';

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

interface Props {
  steps: TraceStep[];
  totalTokens?: number;
  totalDurationMs?: number;
  modelCalls?: number;
}

function StatusDot({ status }: { status: string }) {
  if (status === 'SUCCESS') return <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />;
  if (status === 'ERROR' || status === 'FAILED') return <AlertCircle size={13} className="text-error flex-shrink-0" />;
  return <Circle size={13} className="text-on-surface-variant/40 flex-shrink-0" />;
}

function StatTile({ icon: Icon, label, value, tint }: {
  icon: typeof Cpu; label: string; value: string | number; tint: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/10 px-2.5 py-1.5 rounded">
      <Icon size={13} className={tint} />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold">{label}</span>
        <span className="font-mono text-xs font-bold text-on-surface tabular-nums">{value}</span>
      </div>
    </div>
  );
}

export default function TraceCard({ steps, totalTokens, totalDurationMs, modelCalls }: Props) {
  const totalDur = totalDurationMs ?? 0;
  const totalLat = steps.reduce((a, s) => a + Number(s.latencyMs ?? s.durationMs ?? 0), 0);
  const denom = Math.max(1, totalLat || totalDur);
  const totalIn = steps.reduce((a, s) => a + (s.inputTokens ?? 0), 0);
  const totalOut = steps.reduce((a, s) => a + (s.outputTokens ?? 0), 0);

  return (
    <div className="border border-outline-variant/30 rounded p-3 bg-surface-container-low">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <Activity size={12} className="text-primary/70" />
        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-bold">Execution Trace</span>
      </div>

      {/* Aggregate stat tiles */}
      <div className="flex gap-2 mb-3">
        <StatTile icon={Cpu} label="Tokens" value={totalTokens ?? (totalIn + totalOut)} tint="text-primary/70" />
        <StatTile icon={Zap} label="Model Calls" value={modelCalls ?? 0} tint="text-amber-400" />
        <StatTile icon={Clock} label="Total" value={formatDuration(totalDur)} tint="text-emerald-400" />
      </div>

      {/* Per-step cards */}
      <div className="space-y-1.5">
        {steps.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-6 text-on-surface-variant/50">
            <Activity size={18} className="opacity-40" />
            <span className="text-xs">No trace steps recorded.</span>
          </div>
        )}
        {steps.map((s, i) => {
          const lat = Number(s.durationMs ?? s.latencyMs ?? 0);
          const widthPct = Math.max(2, Math.round((lat / denom) * 100));
          const inTok = s.inputTokens ?? 0;
          const outTok = s.outputTokens ?? 0;
          const tokTotal = inTok + outTok;
          const inPct = tokTotal > 0 ? (inTok / tokTotal) * 100 : 0;
          const outPct = tokTotal > 0 ? (outTok / tokTotal) * 100 : 0;
          const cat = nodeCategoryOf(s.nodeName);
          const style = CATEGORY_STYLES[cat];
          const label = NODE_LABELS[s.nodeName] || s.nodeName;
          return (
            <div
              key={`${s.nodeName}-${i}`}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border border-outline-variant/10 border-l-2 ${style.border} ${style.tint} hover:bg-primary/5 transition-colors`}
            >
              <StatusDot status={s.status} />
              <span className="w-32 text-on-surface-variant truncate text-[11px] font-mono">{label}</span>

              {/* Two-tone token bar (input + output) */}
              <div className="flex-1 h-2 bg-surface-container rounded overflow-hidden relative">
                <div className="h-full bg-primary/40 transition-all" style={{ width: `${inPct}%` }} />
                <div className="h-full bg-primary/75 transition-all" style={{ width: `${outPct}%`, marginLeft: '0' }} />
                {!tokTotal && (
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] text-on-surface-variant/40 font-mono">
                    no tokens
                  </div>
                )}
              </div>

              {/* Latency proportional indicator */}
              <div className="w-16 flex items-center gap-1">
                <div className="flex-1 h-1 rounded-full bg-outline-variant/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${widthPct}%`, backgroundColor: 'hsl(' + Math.min(120, widthPct * 1.2) + ', 55%, 50%)' }}
                  />
                </div>
              </div>

              <span className="w-12 text-right text-on-surface-variant/70 text-[10px] font-mono tabular-nums">
                {formatDuration(lat)}
              </span>
              {tokTotal > 0 && (
                <span className="w-16 text-right text-primary/70 text-[10px] font-mono tabular-nums">
                  {inTok}<span className="text-on-surface-variant/40">/</span>{outTok}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}