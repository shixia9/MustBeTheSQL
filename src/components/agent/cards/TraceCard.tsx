import { Activity, Clock, Cpu, Zap, CheckCircle2, AlertCircle, CircleDot } from 'lucide-react';
import { formatDuration, nodeCategoryOf, messageCategoryForNode, CATEGORY_STYLES, type TraceStep, type NodeCategory } from '../../../types/agent';

const NODE_DISPLAY_NAMES: Record<string, string> = {
  EVIDENCE_RECALL: 'Knowledge Recall',
  SCHEMA_LINKING: 'Schema Linking',
  FEASIBILITY_ASSESSMENT: 'Feasibility Assessment',
  PLANNER: 'Planner',
  HITL_GATE: 'Review Gate',
  HITL: 'Human Review',
  PLAN_DISPATCH: 'Plan Dispatch',
  SQL_GENERATION: 'SQL Generation',
  SQL_EXECUTION: 'SQL Execution',
  SQL_FIXER: 'SQL Fixer',
  PYTHON_GENERATION: 'Python Generation',
  PYTHON_EXECUTION: 'Python Execution',
  PYTHON_ANALYSIS: 'Python Analysis',
  REPORT: 'Report',
};

const NODE_ICONS: Record<string, string> = {
  EVIDENCE_RECALL: '🔍',
  SCHEMA_LINKING: '🔗',
  FEASIBILITY_ASSESSMENT: '✅',
  PLANNER: '📋',
  HITL_GATE: '🚦',
  HITL: '👤',
  PLAN_DISPATCH: '🧭',
  SQL_GENERATION: '▷',
  SQL_EXECUTION: '▶',
  SQL_FIXER: '🔧',
  PYTHON_GENERATION: '🐍',
  PYTHON_EXECUTION: '▶',
  PYTHON_ANALYSIS: '📊',
  REPORT: '◉',
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  planning: 'Execution Detail',
  execution: 'Execution',
  gate: 'Gate',
  report: 'Report',
};

const CATEGORY_ORDER: NodeCategory[] = ['planning', 'execution', 'gate', 'report'];

interface Props {
  steps: TraceStep[];
  totalTokens?: number;
  totalDurationMs?: number;
  modelCalls?: number;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'SUCCESS') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'ERROR' || status === 'FAILED') return <AlertCircle size={14} className="text-error" />;
  return <CircleDot size={14} className="text-on-surface-variant/50" />;
}

function TokenDisplay({ inTok, outTok }: { inTok: number; outTok: number }) {
  const total = inTok + outTok;
  if (total === 0) return null;

  const inPct = total > 0 ? (inTok / total) * 100 : 0;
  const outPct = total > 0 ? (outTok / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3.5 bg-surface-container-highest rounded overflow-hidden flex">
        {inTok > 0 && (
          <div className="h-full bg-blue-400/60 transition-all" style={{ width: `${Math.max(inPct, 4)}%` }} />
        )}
        {outTok > 0 && (
          <div className="h-full bg-primary/70 transition-all" style={{ width: `${Math.max(outPct, 4)}%` }} />
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums whitespace-nowrap">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-sm bg-blue-400/60 inline-block" />
          <span className="text-blue-500/80">{inTok.toLocaleString()}</span>
          <span className="text-on-surface-variant/40">in</span>
        </span>
        <span className="text-on-surface-variant/20">|</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-sm bg-primary/70 inline-block" />
          <span className="text-primary/80">{outTok.toLocaleString()}</span>
          <span className="text-on-surface-variant/40">out</span>
        </span>
      </div>
    </div>
  );
}

export default function TraceCard({ steps, totalTokens, totalDurationMs, modelCalls }: Props) {
  const totalIn = steps.reduce((a, s) => a + (s.inputTokens ?? 0), 0);
  const totalOut = steps.reduce((a, s) => a + (s.outputTokens ?? 0), 0);

  const grouped = new Map<NodeCategory, TraceStep[]>();
  for (const step of steps) {
    const cat = nodeCategoryOf(step.nodeName);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(step);
  }

  return (
    <div className="space-y-3">
      {/* Aggregate stats */}
      <div className="border border-outline-variant/30 rounded bg-surface-container-low p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={13} className="text-primary/70" />
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-bold">Execution Trace</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/10 px-2.5 py-2 rounded">
            <Cpu size={14} className="text-primary/70" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Tokens</span>
              <span className="font-mono text-sm font-bold text-on-surface tabular-nums">
                {(totalTokens ?? (totalIn + totalOut)).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/10 px-2.5 py-2 rounded">
            <Zap size={14} className="text-amber-400" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Model Calls</span>
              <span className="font-mono text-sm font-bold text-on-surface tabular-nums">{modelCalls ?? 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/10 px-2.5 py-2 rounded">
            <Clock size={14} className="text-emerald-400" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/60 font-bold">Duration</span>
              <span className="font-mono text-sm font-bold text-on-surface tabular-nums">{formatDuration(totalDurationMs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-category sections */}
      {steps.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-8 text-on-surface-variant/50 border border-outline-variant/30 rounded bg-surface-container-low">
          <Activity size={20} className="opacity-40" />
          <span className="text-xs">No trace steps recorded.</span>
        </div>
      )}

      {CATEGORY_ORDER.map(cat => {
        const catSteps = grouped.get(cat) ?? [];
        if (catSteps.length === 0) return null;
        const style = CATEGORY_STYLES[cat];
        return (
          <div key={cat} className="border border-outline-variant/30 rounded bg-surface-container-low overflow-hidden">
            <div className={`px-3 py-2 border-b border-outline-variant/20 ${style.tint}`}>
              <span className={`text-[10px] uppercase tracking-wider font-bold ${style.badge}`}>
                {CATEGORY_LABELS[cat]}
              </span>
              <span className="text-[10px] text-on-surface-variant/40 ml-1 font-mono">
                {catSteps.length} step{catSteps.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {catSteps.map((s, i) => {
                const lat = Number(s.durationMs ?? s.latencyMs ?? 0);
                const maxLat = Math.max(...catSteps.map(x => Number(x.durationMs ?? x.latencyMs ?? 0)));
                const latPct = maxLat > 0 ? Math.max(2, (lat / maxLat) * 100) : 0;
                const inTok = s.inputTokens ?? 0;
                const outTok = s.outputTokens ?? 0;
                const msgType = messageCategoryForNode(s.nodeName);
                const displayName = NODE_DISPLAY_NAMES[s.nodeName] || s.nodeName;
                const icon = NODE_ICONS[s.nodeName] || '•';
                return (
                  <div
                    key={`${s.nodeName}-${i}`}
                    className="px-3 py-2.5 hover:bg-primary/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        <StatusIcon status={s.status} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Friendly display name as the primary title */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm leading-none">{icon}</span>
                          <span className="text-sm font-bold text-on-surface tracking-tight">
                            {displayName}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded leading-none font-medium ${style.badge}`}>
                            {msgType}
                          </span>
                        </div>
                        {/* Technical node name as a secondary mono label */}
                        <div className="text-[10px] text-on-surface-variant/50 font-mono">
                          {s.nodeName}
                        </div>
                        {/* Latency */}
                        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant/70">
                          <Clock size={11} className="text-on-surface-variant/50" />
                          <span className="font-mono tabular-nums">{formatDuration(lat)}</span>
                        </div>
                        {/* Latency bar */}
                        {lat > 0 && maxLat > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-outline-variant/20 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${latPct}%`,
                                  backgroundColor: `hsl(${Math.min(120, latPct * 1.2)}, 50%, 45%)`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Token consumption */}
                        {(inTok > 0 || outTok > 0) && (
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-on-surface-variant/40 font-bold mb-1">
                              Token Consumption
                            </div>
                            <TokenDisplay inTok={inTok} outTok={outTok} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
