import { create } from 'zustand';
import { toolApi } from '../api/client';
import type { ToolItem } from '../types/agent';

/**
 * Command-palette cache (Phase 5 / T7.1).
 *
 * Holds the flat {@link ToolItem} list surfaced by `GET /api/v1/tools` for the
 * "/" command palette. The list is stable per session (it only changes when the
 * user connects/disconnects an MCP server or edits a skill), so we cache it
 * in-memory with a 5-minute TTL — `fetchTools()` is a no-op within the window
 * unless `force` is passed. No persistence: the cache is cheap to rebuild and
 * we don't want stale tool lists surviving a refresh.
 */

/** Cache validity window (5 minutes). */
const TTL_MS = 5 * 60 * 1000;

interface CommandPaletteState {
  /** Discovered tools (builtin + mcp + skill), unfiltered. */
  tools: ToolItem[];
  /** Epoch ms of the last successful fetch. */
  lastFetchAt: number;
  /** True while a fetch is in flight (drives palette skeleton/empty state). */
  loading: boolean;
  /** Last fetch error message, if any (cleared on success). */
  error?: string;

  /**
   * Fetch the tool list from `/api/v1/tools`. Skips the network call when the
   * cache is fresh (within {@link TTL_MS} and non-empty) unless `force` is set.
   */
  fetchTools: (force?: boolean) => Promise<void>;
  /** Drop the cache (e.g. on logout). */
  clear: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  tools: [],
  lastFetchAt: 0,
  loading: false,
  error: undefined,

  fetchTools: async (force?: boolean) => {
    const { lastFetchAt, tools, loading } = get();
    if (!force && !loading && tools.length > 0 && Date.now() - lastFetchAt < TTL_MS) {
      return;
    }
    set({ loading: true, error: undefined });
    try {
      const items = await toolApi.discover();
      set({ tools: items ?? [], lastFetchAt: Date.now(), loading: false });
    } catch (err: any) {
      set({ loading: false, error: err?.message ?? String(err) });
    }
  },

  clear: () => set({ tools: [], lastFetchAt: 0, loading: false, error: undefined }),
}));
