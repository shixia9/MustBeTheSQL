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

/** Terminal SSE event types emitted by the agent controller */
export type AgentEventType =
  | { type: 'COMPLETED' }
  | { type: 'ERROR'; message: string }
  | { type: 'AWAITING_CONFIRMATION'; threadId: string; plan: string; repairCount: number; needsReview: boolean }
  | { type: 'NODE'; nodeName: string; data: Record<string, any>; stepNo: number | null };