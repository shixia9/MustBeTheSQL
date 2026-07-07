/**
 * Agent flow types for the SQL Agent timeline UI.
 */

/** Status of an agent step */
export type StepStatus = 'pending' | 'running' | 'success' | 'error';

/** A single step in the agent timeline */
export interface AgentStep {
  id: string;
  name: string;
  content: string;
  status: StepStatus;
  data?: Record<string, any>;
  durationMs?: number;
  /** Plan-step cursor for looped nodes (SQL_GENERATION / SQL_EXECUTION / SQL_FIXER).
   *  Same node name + different step = a distinct card. */
  step?: number;
  sequenceNo?: number;
}

/** A per-step trace row (latency/tokens/type) used by the Trace view.
 *  Populated from the agent_execution_step DB row when loading history. */
export interface TraceStep {
  nodeName: string;
  sequenceNo: number;
  status: string;
  durationMs?: number;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  nodeType?: string;
}

/** The order in which nodes appear in the timeline */
export const NODE_ORDER = [
  'EVIDENCE_RECALL',
  'SCHEMA_LINKING',
  'FEASIBILITY_ASSESSMENT',
  'PLANNER',
  'HITL_GATE',
  'HITL',
  'PLAN_DISPATCH',
  'SQL_GENERATION',
  'SQL_EXECUTION',
  'SQL_FIXER',
  'PYTHON_GENERATION',
  'PYTHON_EXECUTION',
  'PYTHON_ANALYSIS',
  'REPORT',
] as const;

/** Agent node names (subset of NODE_ORDER used for active tracking). */
export const AGENT_NODE = {
  EVIDENCE_RECALL: 'EVIDENCE_RECALL',
  SCHEMA_LINKING: 'SCHEMA_LINKING',
  FEASIBILITY_ASSESSMENT: 'FEASIBILITY_ASSESSMENT',
  PLANNER: 'PLANNER',
  HITL_GATE: 'HITL_GATE',
  HITL: 'HITL',
  PLAN_DISPATCH: 'PLAN_DISPATCH',
  SQL_GENERATION: 'SQL_GENERATION',
  SQL_EXECUTION: 'SQL_EXECUTION',
  SQL_FIXER: 'SQL_FIXER',
  PYTHON_GENERATION: 'PYTHON_GENERATION',
  PYTHON_EXECUTION: 'PYTHON_EXECUTION',
  PYTHON_ANALYSIS: 'PYTHON_ANALYSIS',
  REPORT: 'REPORT',
} as const;

/** Message categories for visual differentiation of SSE events. */
export type MessageType = 'THINKING' | 'TOOL_CALL' | 'TOOL_RESULT' | 'REPORT' | 'STATUS';

/** Node category for tint colors and left-border accent. */
export type NodeCategory = 'planning' | 'execution' | 'gate' | 'report';

/** Map a node name to its message type (matches backend messageTypeForNode). */
export function messageCategoryForNode(nodeName: string): MessageType {
  switch (nodeName) {
    case 'SQL_GENERATION':
    case 'PYTHON_GENERATION':
      return 'TOOL_CALL';
    case 'SQL_EXECUTION':
    case 'PYTHON_EXECUTION':
      return 'TOOL_RESULT';
    case 'REPORT':
      return 'REPORT';
    case 'HITL_GATE':
    case 'HITL':
    case 'PLAN_DISPATCH':
      return 'STATUS';
    default:
      return 'THINKING';
  }
}

/** Map a node name to its visual category for tint colors. */
export function nodeCategoryOf(nodeName: string): NodeCategory {
  switch (nodeName) {
    case 'EVIDENCE_RECALL':
    case 'SCHEMA_LINKING':
    case 'FEASIBILITY_ASSESSMENT':
    case 'PLANNER':
    case 'SQL_FIXER':
    case 'PYTHON_ANALYSIS':
      return 'planning';
    case 'SQL_GENERATION':
    case 'SQL_EXECUTION':
    case 'PYTHON_GENERATION':
    case 'PYTHON_EXECUTION':
      return 'execution';
    case 'HITL_GATE':
    case 'HITL':
    case 'PLAN_DISPATCH':
      return 'gate';
    case 'REPORT':
      return 'report';
    default:
      return 'planning';
  }
}

/** Tailwind class fragments per node category. */
export const CATEGORY_STYLES: Record<NodeCategory, { tint: string; border: string; badge: string }> = {
  planning: { tint: 'bg-blue-500/5', border: 'border-l-blue-500/50', badge: 'text-blue-400 bg-blue-400/10' },
  execution: { tint: 'bg-emerald-500/5', border: 'border-l-emerald-500/50', badge: 'text-emerald-400 bg-emerald-400/10' },
  gate: { tint: 'bg-amber-500/5', border: 'border-l-amber-500/50', badge: 'text-amber-400 bg-amber-400/10' },
  report: { tint: 'bg-primary/5', border: 'border-l-primary/50', badge: 'text-primary bg-primary/10' },
};

/** Format a duration in ms as a human string. */
export function formatDuration(ms?: number): string {
  if (ms == null || ms <= 0) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Terminal SSE event types emitted by the agent controller */
export type AgentEventType =
  | { type: 'COMPLETED' }
  | { type: 'ERROR'; message: string }
  | { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number; needsReview: boolean }
  | { type: 'NODE'; nodeName: string; data: Record<string, any>; stepNo: number | null };

/** Glossary entry recalled by RAG */
export interface EvidenceEntry {
  term: string;
  description?: string;
  synonyms?: string;
  score: number;
}

/** Few-shot FAQ entry recalled by RAG */
export interface FaqEntry {
  question: string;
  answer: string;
  score: number;
}

/** Column descriptor for SQL execution result tables. */
export interface ResultColumn {
  name: string;
  type?: string;
}