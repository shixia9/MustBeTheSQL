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
  /** Trace fields (populated from history). */
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  nodeType?: string;
  rawStatus?: string;
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
  'MEMORY_RECALL',
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
  'MCP_TOOL_EXECUTOR',
  'MCP_TOOL_FIXER',
  'REPORT',
] as const;

/** Agent node names (subset of NODE_ORDER used for active tracking). */
export const AGENT_NODE = {
  MEMORY_RECALL: 'MEMORY_RECALL',
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
  MCP_TOOL_EXECUTOR: 'MCP_TOOL_EXECUTOR',
  MCP_TOOL_FIXER: 'MCP_TOOL_FIXER',
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
    case 'MCP_TOOL_EXECUTOR':
      return 'TOOL_CALL';
    case 'MCP_TOOL_FIXER':
      return 'THINKING';
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
    case 'MCP_TOOL_EXECUTOR':
      return 'execution';
    case 'MCP_TOOL_FIXER':
      return 'planning';
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
  | { type: 'ERROR'; code?: string; message: string }
  | { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string | object; repairCount: number; needsReview: boolean; hitlVersion?: number; reason?: string }
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

/**
 * Phase 4 (T6) — Unified tool discovery types.
 *
 * The backend `GET /api/v1/tools` endpoint aggregates builtin native tools,
 * MCP-connected tools, and DB-backed skills into a single flat list. The
 * frontend "/" command palette renders these uniformly and uses
 * `invocationMode` to decide how to dispatch a selection.
 */

/** Provenance kind of a {@link ToolItem}. */
export type ToolKind = 'builtin' | 'mcp' | 'skill';

/** How the frontend should dispatch a palette selection. */
export type InvocationMode = 'call_tool' | 'inject_prompt';

/** A single invocable entity surfaced by the discovery API. */
export interface ToolItem {
  /** One of "builtin" / "mcp" / "skill". */
  kind: ToolKind;
  /** Unique key (tool name for builtin/mcp, skill name for skill). */
  name: string;
  /** Human-readable label for the UI. */
  displayName?: string;
  /** One-line explanation of what the item does. */
  description?: string;
  /** JSON Schema string for builtin/mcp tools; null/absent for skills. */
  parametersSchema?: string | null;
  /** One of "call_tool" / "inject_prompt" — drives frontend dispatch. */
  invocationMode: InvocationMode;
  /** Provenance label: "BUILTIN" / "MCP" / "SKILL". */
  source: string;
}
