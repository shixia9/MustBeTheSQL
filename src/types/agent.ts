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
}

/** The order in which nodes appear in the timeline */
export const NODE_ORDER = [
  'EVIDENCE_RECALL',
  'SCHEMA_LINKING',
  'FEASIBILITY_ASSESSMENT',
  'PLANNER',
  'HITL',
  'SQL_GENERATION',
  'SQL_EXECUTION',
  'REPORT',
] as const;