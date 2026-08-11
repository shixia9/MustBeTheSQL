import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Shared conversation turn types.
 *
 * `TurnData` is the unit rendered in the chat timeline. It aggregates the
 * per-agent SSE steps for one user question, plus any context-compaction
 * events observed while that turn was streaming.
 */

export type StepStatus = 'pending' | 'running' | 'completed' | 'error';

/**
 * Lifecycle of the thinking-process panel attached to a step.
 * - `streaming`  — THINKING event received, typewriter animation in progress
 * - `done`       — thinking complete, panel auto-collapses
 * - `collapsed`  — user manually collapsed (or auto-collapsed + unread badge shown)
 */
export type ThinkingStatus = 'streaming' | 'done' | 'collapsed';

export interface StepData {
  nodeName: string;
  status: StepStatus;
  content?: string;
  output?: any;
  messageType?: string;
  /** Raw LLM reasoning text emitted by the backend THINKING SSE event. */
  thinking?: string;
  /** Current display state of the thinking panel for this step. */
  thinkingStatus?: ThinkingStatus;
}

/** A single context-compaction event emitted by the backend during a turn. */
export interface CompactionEvent {
  layer: string;        // L1 | L2 | L3 | L4
  layerName: string;    // 截断观察 | 丢弃旧轮 | LLM摘要 | 紧急压缩
  tokensBefore: number;
  tokensAfter: number;
  dropped: number;      // messages dropped/truncated
  preview?: string;     // short preview of compacted content
  ts: number;           // epoch ms
}

/** Status of a single plan step, mirrored from backend PlanStatus enum. */
export type PlanStepStatus = 'TODO' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/** A single step in the plan snapshot pushed by the backend PLAN_UPDATED SSE event. */
export interface PlanStepDto {
  serialNumber: number;
  agent: string;
  content: string;
  rely: string;
  status: PlanStepStatus;
  result?: string | null;
  retryTimes: number;
}

/** Full plan snapshot carried by a PLAN_UPDATED SSE event. */
export interface PlanSnapshot {
  steps: PlanStepDto[];
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
}

export interface TurnData {
  question: string;
  steps: StepData[];
  compactionEvents?: CompactionEvent[];
  plan?: PlanSnapshot;
}

interface ConversationState {
  /** Turns keyed by conversation id (string), persisted to localStorage. */
  turnsByConv: Record<string, TurnData[]>;
  setTurns: (convId: string, turns: TurnData[]) => void;
  getTurns: (convId: string) => TurnData[];
  appendTurn: (convId: string, turn: TurnData) => void;
  clearTurns: (convId: string) => void;
}

/**
 * Persisted store of rendered turns per conversation. Enables:
 *  - refresh resilience (turns restored instantly from localStorage)
 *  - sidebar history switching (rebuilt from API, cached here)
 */
export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      turnsByConv: {},
      setTurns: (convId, turns) =>
        set((s) => ({ turnsByConv: { ...s.turnsByConv, [convId]: turns } })),
      getTurns: (convId) => get().turnsByConv[convId] ?? [],
      appendTurn: (convId, turn) =>
        set((s) => ({
          turnsByConv: {
            ...s.turnsByConv,
            [convId]: [...(s.turnsByConv[convId] ?? []), turn],
          },
        })),
      clearTurns: (convId) =>
        set((s) => {
          const next = { ...s.turnsByConv };
          delete next[convId];
          return { turnsByConv: next };
        }),
    }),
    { name: 'sql-logic-conversation-turns' }
  )
);
