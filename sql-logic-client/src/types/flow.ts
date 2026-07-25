/**
 * TypeScript types matching the backend JSON Workflow DSL.
 * Mirrors WorkflowDefinition, WorkflowNode, WorkflowEdge from domain/agentic/workflow/
 */

export interface FlowNodeData {
  title: string;
  agentName?: string;
  inputsValues: Record<string, any>;
}

export interface FlowNodeJSON {
  id: string;
  type: 'agent' | 'start' | 'end' | 'condition' | 'parallel' | 'resource';
  position: { x: number; y: number };
  data: FlowNodeData;
  selected?: boolean;
}

export interface FlowEdgeJSON {
  sourceNodeId: string;
  targetNodeId: string;
  condition?: string;
}

export interface FlowVariable {
  name: string;
  type: string;
  defaultValue?: string;
}

export interface FlowDocumentJSON {
  version: string;
  name: string;
  description?: string;
  variables: FlowVariable[];
  nodes: FlowNodeJSON[];
  edges: FlowEdgeJSON[];
}

/** Available node type metadata for the canvas side panel */
export interface NodeTypeMeta {
  type: string;
  label: string;
  description: string;
  category: string;
  defaults: Record<string, any>;
}

/** Workflow list item from API */
export interface WorkflowListItem {
  id: string;
  name: string;
}

/** Execution status for debug panel */
export type NodeExecStatus = 'idle' | 'running' | 'success' | 'fail';
