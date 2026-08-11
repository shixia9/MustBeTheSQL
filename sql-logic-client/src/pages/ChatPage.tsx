import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useLlmConfig } from '../contexts/LlmConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useConversationStore, type TurnData } from '../stores/conversationStore';
import { api, conversationApi } from '../api/client';
import { hasMultimodalContent } from '../utils/visContentParser';
import AgentExecutionView from '../components/agent/AgentExecutionView';
import WelcomePanel from '../components/chat/WelcomePanel';
import CommandPalette from '../components/agent/CommandPalette';
import { useCommandPaletteStore } from '../stores/commandPaletteStore';
import type { ToolItem } from '../types/agent';
import { Database, ChevronDown } from 'lucide-react';

/** Display names for the 4 progressive context-compaction layers. */
const CONTEXT_LAYER_NAMES: Record<string, string> = {
  L1: '截断观察',
  L2: '丢弃旧轮',
  L3: 'LLM 摘要',
  L4: '紧急压缩',
};

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { selectedConfig } = useLlmConfig();
  const { user } = useAuth();
  const activeConnectionId = useWorkspaceStore(s => s.activeConnectionId);
  const setActiveConnectionId = useWorkspaceStore(s => s.setActiveConnectionId);
  const activeSchema = useWorkspaceStore(s => s.activeSchema);
  const setActiveSchema = useWorkspaceStore(s => s.setActiveSchema);

  // Persisted conversation turns (localStorage via zustand persist). Enables
  // refresh resilience and sidebar history switching. Local `turns` state is
  // the render source; the store is the durable cache keyed by conversation id.
  const getStoreTurns = useConversationStore(s => s.getTurns);
  const setStoreTurns = useConversationStore(s => s.setTurns);
  const appendStoreTurn = useConversationStore(s => s.appendTurn);

  const [turns, setTurnsLocal] = useState<TurnData[]>([]);
  const [currentTurn, setCurrentTurn] = useState<TurnData | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hitlPending, setHitlPending] = useState<{ threadId: string; plan: any } | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [databases, setDatabases] = useState<{ id: number; name: string; dbType: string }[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [connPickerOpen, setConnPickerOpen] = useState(false);
  const [schemaPickerOpen, setSchemaPickerOpen] = useState(false);
  const [hasMultimodal, setHasMultimodal] = useState(false);

  // "/" command palette state.
  const tools = useCommandPaletteStore(s => s.tools);
  const fetchTools = useCommandPaletteStore(s => s.fetchTools);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [activeTool, setActiveTool] = useState<ToolItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Guard against duplicate turn finalization in dev StrictMode
  const turnFinalizedRef = useRef(false);
  // Resolved conversation id captured from the SSE COMPLETED event (set when the
  // backend creates a new conversation for the first message of a chat).
  const completedConvIdRef = useRef<string | null>(null);

  // Load database connections on mount
  useEffect(() => {
    if (!user?.id) return;
    api.get<any[]>(`/database/list?userId=${user.id}`).then(d => {
      if (d.code === 200 && d.data) {
        const conns = Array.isArray(d.data) ? d.data : [];
        setDatabases(conns.map((c: any) => ({ id: c.id, name: c.name || c.dbName || `DB #${c.id}`, dbType: c.dbType || c.type || '' })));
        if (conns.length > 0 && !activeConnectionId) {
          setActiveConnectionId(conns[0].id);
        }
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load schemas when connection changes
  useEffect(() => {
    if (!activeConnectionId) { setSchemas([]); return; }
    api.get<any[]>(`/schema/schemas?connectionId=${activeConnectionId}`).then(d => {
      if (d.code === 200 && d.data) {
        const names = (d.data as any[]).map((s: any) => s.name || s).filter(Boolean);
        setSchemas(names);
        if (names.length > 0 && !activeSchema) {
          setActiveSchema(names[0]);
        }
      }
    }).catch(() => setSchemas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnectionId]);

  // Click-outside closes dropdowns
  useEffect(() => {
    if (!connPickerOpen && !schemaPickerOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setConnPickerOpen(false);
        setSchemaPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [connPickerOpen, schemaPickerOpen]);

  // Abort stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Multi-turn history回填: when the conversation id changes (sidebar switch,
  // first-message URL sync, or refresh), rebuild the rendered turns. Prefer the
  // persisted store (instant, covers refresh); fall back to the API for
  // conversations not yet cached locally (e.g. created on another device).
  useEffect(() => {
    completedConvIdRef.current = conversationId || null;
    if (!conversationId) {
      setTurnsLocal([]);
      return;
    }
    const cached = getStoreTurns(conversationId);
    if (cached.length > 0) {
      setTurnsLocal(cached);
      return;
    }
    let cancelled = false;
    conversationApi.getDetails(Number(conversationId))
      .then(res => {
        if (cancelled) return;
        const rows = (res && res.data) ? res.data : [];
        const mapped: TurnData[] = (rows as any[]).map(d => ({
          question: d.userInput || '',
          steps: [{
            nodeName: 'DATA_SCIENTIST',
            status: 'completed' as const,
            content: d.sqlOutput || '',
            output: { sql: d.sqlOutput || '', sqlExecutionResult: d.executeResult || '' },
            messageType: 'TOOL_RESULT',
          }],
        }));
        setStoreTurns(conversationId, mapped);
        setTurnsLocal(mapped);
      })
      .catch(() => { if (!cancelled) setTurnsLocal([]); });
    return () => { cancelled = true; };
  }, [conversationId, getStoreTurns, setStoreTurns]);

  const handleStream = useCallback(async (userInput: string, opts?: { toolInvocation?: { toolName: string; args?: Record<string, any> } }) => {
    setIsStreaming(true);
    setHasMultimodal(false);
    turnFinalizedRef.current = false;
    completedConvIdRef.current = conversationId || null;
    const turn: TurnData = { question: userInput, steps: [] };
    setCurrentTurn(turn);
    const controller = new AbortController();
    abortRef.current = controller;

    const llmConfigId = selectedConfig?.id ?? 0;
    const connectionId = activeConnectionId ?? 1;
    const schemaName = activeSchema ?? '';

    try {
      const bodyObj: Record<string, any> = {
        userInput,
        connectionId,
        llmConfigId,
        autoConfirm,
        schemaContext: schemaName,
        conversationId: conversationId || undefined, // multi-turn: carry existing conversation id
      };
      // T7: when the user picks a call_tool item from the "/" palette, dispatch
      // a tool-invocation marker so ManagerAgent (T8) can route to the tool agent
      // without going through the regular planner analysis.
      if (opts?.toolInvocation) {
        bodyObj.toolInvocation = opts.toolInvocation;
      }
      const response = await fetch('/api/v1/agentic/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            setCurrentTurn(prev => {
              if (!prev) return prev;
              const updated = { ...prev };

              if (parsed.outputType === 'STARTED') {
                // New agent node started
                const nodeName = parsed.nodeName || 'UNKNOWN';
                // Hide the MANAGER (Orchestrator) entry card — it exposes the
                // underlying multi-agent architecture and has no user-facing
                // value. The "thinking..." indicator (StepTimeline) covers the
                // wait before the first worker node STARTED arrives.
                // AWAITING_CLARIFICATION is handled separately below and stays visible.
                if (nodeName === 'MANAGER') {
                  return { ...updated };
                }
                const existing = updated.steps.find(s => s.nodeName === nodeName);
                if (!existing) {
                  updated.steps = [...updated.steps, {
                    nodeName,
                    status: 'running' as const,
                    messageType: parsed.messageType,
                  }];
                } else {
                  updated.steps = updated.steps.map(s =>
                    s.nodeName === nodeName ? { ...s, status: 'running' as const } : s
                  );
                }
              } else if (parsed.outputType === 'FINISHED') {
                // Agent node completed with data
                const nodeName = parsed.nodeName || 'UNKNOWN';
                if (nodeName === 'MANAGER') {
                  return { ...updated };
                }
                const stepData = parsed.data || {};
                const existingIdx = updated.steps.findIndex(s => s.nodeName === nodeName);
                if (existingIdx >= 0) {
                  // Update the existing step in place
                  updated.steps = updated.steps.map(s =>
                    s.nodeName === nodeName
                      ? { ...s, status: 'completed' as const, content: JSON.stringify(stepData), output: stepData }
                      : s
                  );
                } else {
                  // No matching STARTED (e.g. MANAGER was filtered, or chitchat
                  // path emits DASHBOARD FINISHED directly). Create a completed
                  // step so the result is not lost and lastDashboardStep can
                  // pick it up for rendering.
                  updated.steps = [...updated.steps, {
                    nodeName,
                    status: 'completed' as const,
                    content: JSON.stringify(stepData),
                    output: stepData,
                    messageType: parsed.messageType,
                  }];
                }
              } else if (parsed.outputType === 'PLAN_UPDATED') {
                // Plan snapshot from ManagerAgent — render the TODO list.
                // Full snapshot replaces any prior plan (idempotent overwrite).
                if (parsed.data) {
                  updated.plan = parsed.data as any;
                }
              } else if (parsed.outputType === 'AWAITING_CLARIFICATION') {
                // ManagerAgent requests user clarification. MANAGER STARTED is
                // filtered above, so a step may not exist yet — create one if
                // missing so the clarification prompt is visible to the user.
                const nodeName = parsed.nodeName || 'MANAGER';
                const reason = parsed.data?.reason || '';
                const existingIdx = updated.steps.findIndex(s => s.nodeName === nodeName);
                if (existingIdx >= 0) {
                  updated.steps = updated.steps.map(s =>
                    s.nodeName === nodeName
                      ? { ...s, status: 'running' as const, content: `Clarification needed: ${reason}` }
                      : s
                  );
                } else {
                  updated.steps = [...updated.steps, {
                    nodeName,
                    status: 'running' as const,
                    content: `Clarification needed: ${reason}`,
                    messageType: parsed.messageType,
                  }];
                }
              } else if (parsed.nodeName === 'SANDBOX') {
                // ── Sandbox execution streaming protocol ──
                // A single SANDBOX step accumulates multiple serial executions in
                // output.executions[]. STARTED pushes a new entry, stream chunks
                // append to the last running entry (index 0 = new line), FINISHED
                // finalizes it with authoritative stdout/stderr/exitCode/timing.
                const data = parsed.data || {};
                const sbxIdx = updated.steps.findIndex(s => s.nodeName === 'SANDBOX');
                let executions: any[] = sbxIdx >= 0
                  ? [...(updated.steps[sbxIdx].output?.executions || [])]
                  : [];

                if (parsed.outputType === 'STARTED') {
                  executions = [...executions, {
                    language: data.language || 'python',
                    code: data.code || '',
                    stdout: '',
                    stderr: '',
                    isRunning: true,
                  }];
                } else if (parsed.outputType === 'stream') {
                  if (executions.length > 0) {
                    const last = { ...executions[executions.length - 1] };
                    const chunk = data.chunk ?? '';
                    const key = data.isError ? 'stderr' : 'stdout';
                    let acc = last[key] || '';
                    // index 0 starts a new line — prepend newline if mid-line.
                    if (data.index === 0 && acc.length > 0 && !acc.endsWith('\n')) {
                      acc += '\n';
                    }
                    acc += chunk;
                    last[key] = acc;
                    executions[executions.length - 1] = last;
                  }
                } else if (parsed.outputType === 'FINISHED') {
                  if (executions.length > 0) {
                    const last = { ...executions[executions.length - 1] };
                    // FINISHED carries the authoritative full output.
                    if (typeof data.output === 'string') last.stdout = data.output;
                    if (typeof data.error === 'string') last.stderr = data.error;
                    last.exitCode = data.exitCode;
                    last.durationMs = data.executionTimeMs;
                    last.status = data.status;
                    last.isRunning = false;
                    // Phase 2/3 enrichments — backward-compatible (undefined when absent).
                    if (data.guiUrl) last.guiUrl = data.guiUrl;
                    if (Array.isArray(data.files)) last.files = data.files;
                    if (Array.isArray(data.logs)) last.logs = data.logs;
                    executions[executions.length - 1] = last;
                  }
                }

                const sandboxStatus: 'completed' | 'running' =
                  parsed.outputType === 'FINISHED' ? 'completed' : 'running';
                const sandboxStep = {
                  nodeName: 'SANDBOX',
                  status: sandboxStatus,
                  output: { executions },
                  messageType: parsed.messageType,
                };
                if (sbxIdx >= 0) {
                  updated.steps = updated.steps.map(s =>
                    s.nodeName === 'SANDBOX' ? sandboxStep : s
                  );
                } else {
                  updated.steps = [...updated.steps, sandboxStep];
                }
              } else if (parsed.type === 'ERROR') {
                const nodeName = parsed.nodeName;
                if (nodeName) {
                  updated.steps = updated.steps.map(s =>
                    s.nodeName === nodeName
                      ? { ...s, status: 'error' as const, content: parsed.message || parsed.error }
                      : s
                  );
                }
              } else if (parsed.type === 'COMPLETED') {
                // Backend confirms the conversation id (newly created or existing).
                // Capture it so the finally block can persist turns under the right
                // key and so we can sync the URL for refresh-resilience.
                if (parsed.conversationId != null) {
                  completedConvIdRef.current = String(parsed.conversationId);
                }
              } else if (parsed.outputType === 'CONTEXT_COMPACT') {
                // Context compaction event — track for the dynamic panel.
                const ev = parsed.data || {};
                const compactionEvents = updated.compactionEvents || [];
                updated.compactionEvents = [...compactionEvents, {
                  layer: ev.layer || '',
                  layerName: ev.layerName || CONTEXT_LAYER_NAMES[ev.layer] || ev.layer || '',
                  tokensBefore: ev.tokensBefore ?? 0,
                  tokensAfter: ev.tokensAfter ?? 0,
                  dropped: ev.dropped ?? 0,
                  preview: ev.preview,
                  ts: Date.now(),
                }];
              }

              return { ...updated };
            });
          } catch { /* skip malformed JSON */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream error:', err);
        setCurrentTurn(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            steps: [...prev.steps, {
              nodeName: 'ERROR',
              status: 'error' as const,
              content: err.message,
            }],
          };
        });
      }
    } finally {
      setIsStreaming(false);
      // Move currentTurn → turns atomically, guarded against double-fire (dev StrictMode)
      if (!turnFinalizedRef.current) {
        turnFinalizedRef.current = true;
        setCurrentTurn(prev => {
          if (prev) {
            // Resolve the effective conversation id: prefer the one reported by
            // the backend COMPLETED event (covers the first-message case where a
            // new conversation is created), fall back to the URL param.
            const resolvedConvId = completedConvIdRef.current || conversationId || undefined;
            setTurnsLocal(prevTurns => [...prevTurns, prev]);
            if (resolvedConvId) {
              appendStoreTurn(resolvedConvId, prev);
            }
            // Sync the URL so a refresh restores the conversation. Use replace
            // to avoid polluting history with the parameter-less entry.
            if (completedConvIdRef.current && completedConvIdRef.current !== conversationId) {
              navigate(`/chat/${completedConvIdRef.current}`, { replace: true });
            }
            // Detect multimodal content in the latest completed turn
            if (hasMultimodalContent(prev.steps)) {
              setHasMultimodal(true);
            }
          }
          return null;
        });
      }
    }
  }, [activeConnectionId, activeSchema, selectedConfig, autoConfirm, conversationId, navigate, appendStoreTurn]);

  const handleSubmit = () => {
    if (isStreaming) return;
    const task = inputValue.trim();
    if (!task && !activeTool) return;

    let userInput = task;
    let toolInvocation: { toolName: string } | undefined;

    if (activeTool) {
      if (activeTool.kind === 'mcp') {
        // MCP tool: send toolInvocation so ManagerAgent short-circuits to
        // ToolAssistantAgent → McpToolAction. The user's typed task rides
        // along as userInput context for arg construction.
        toolInvocation = { toolName: activeTool.name };
        userInput = task || `调用工具 ${activeTool.name}`;
      } else {
        // Skill or builtin: prepend /name so the backend
        // SkillInvocationResolver (skill) can render the prompt template,
        // or the LLM receives a natural tool hint (builtin).
        userInput = `/${activeTool.name}${task ? ' ' + task : ''}`;
      }
      setActiveTool(null);
    }

    setInputValue('');
    handleStream(userInput, toolInvocation ? { toolInvocation } : undefined);
  };

  /** dispatch a "/" palette selection. */
  const handlePaletteSelect = (item: ToolItem) => {
    setPaletteOpen(false);
    setPaletteQuery('');
    // All tool types (builtin / mcp / skill) are unified: set the active
    // tool chip and let the user type their task. handleSubmit constructs the
    // appropriate userInput / toolInvocation per kind.
    setActiveTool(item);
    setInputValue('');
    // Focus the input so the user can immediately type their task.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleHITLConfirm = (approved: boolean, feedback?: string) => {
    if (!hitlPending) return;
    fetch('/api/v1/agentic/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: hitlPending.threadId, approved, feedback }),
      credentials: 'include',
    });
    setHitlPending(null);
  };

  /** Re-run the last completed turn's question. */
  const handleRerun = useCallback((question?: string) => {
    if (isStreaming) return;
    const q = question || turns[turns.length - 1]?.question;
    if (q) {
      handleStream(q);
    }
  }, [isStreaming, turns, handleStream]);

  const hasContent = turns.length > 0 || currentTurn !== null;

  return (
    <div className="flex flex-col h-full relative" style={{ background: 'var(--color-app-bg)' }}>
      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {hasContent ? (
          <AgentExecutionView
            turns={[...turns, ...(currentTurn ? [currentTurn] : [])]}
            isStreaming={isStreaming}
            hitlPending={hitlPending}
            onHitlConfirm={handleHITLConfirm}
            autoConfirm={autoConfirm}
            onAutoConfirmChange={setAutoConfirm}
            selectedDb={activeConnectionId}
            onDbChange={(id) => useWorkspaceStore.getState().setActiveConnectionId(id)}
            hasMultimodalContent={hasMultimodal}
            conversationId={conversationId}
            onRerun={handleRerun}
          />
        ) : (
          <WelcomePanel
            onSuggestionClick={(prompt) => {
              setInputValue(prompt);
            }}
          />
        )}
      </div>

      {/* Unified input card */}
      <div className="flex-shrink-0 px-4 pb-3 pt-1">
        <div
          className="relative max-w-2xl mx-auto rounded-xl"
          style={{
            background: 'var(--color-content-bg)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          {paletteOpen && (
            <CommandPalette
              items={tools}
              query={paletteQuery}
              onSelect={handlePaletteSelect}
              onClose={() => { setPaletteOpen(false); setPaletteQuery(''); }}
            />
          )}
          {/* Selector pills row — top of card */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 flex-wrap"
            style={{ borderBottom: hasContent ? '0.5px solid var(--color-border-subtle)' : 'none' }}>
            {/* Connection pill */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => { setConnPickerOpen(!connPickerOpen); setSchemaPickerOpen(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                style={{
                  fontSize: '11.5px', fontWeight: 500,
                  background: connPickerOpen ? 'var(--color-primary-soft)' : 'transparent',
                  color: activeConnectionId ? 'var(--color-ink)' : 'var(--color-ink-tertiary)',
                  border: '1px solid var(--color-border-subtle)',
                  fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.01em',
                }}
              >
                <Database size={12} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
                <span className="max-w-[130px] truncate">
                  {activeConnectionId ? databases.find(d => d.id === activeConnectionId)?.name ?? `DB #${activeConnectionId}` : 'Select DB'}
                </span>
                <ChevronDown size={10} style={{ color: 'var(--color-ink-tertiary)', transition: 'transform 150ms', transform: connPickerOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {connPickerOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg z-50 overflow-hidden"
                  style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-default)', boxShadow: '0 -4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {databases.length === 0 && (
                      <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>No connections</div>
                    )}
                    {databases.map(db => (
                      <button key={db.id}
                        onClick={() => { setActiveConnectionId(db.id); setConnPickerOpen(false); }}
                        className="w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors"
                        style={{
                          fontSize: '12px', fontWeight: 500,
                          color: db.id === activeConnectionId ? 'var(--color-primary)' : 'var(--color-ink)',
                          background: db.id === activeConnectionId ? 'var(--color-primary-soft)' : 'transparent',
                          fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
                        }}
                      >
                        <span className="truncate flex-1">{db.name}</span>
                        {db.dbType && (
                          <span className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'var(--color-border-subtle)', color: 'var(--color-ink-tertiary)' }}>{db.dbType}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Schema pill */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => { setSchemaPickerOpen(!schemaPickerOpen); setConnPickerOpen(false); }}
                disabled={!activeConnectionId || schemas.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors"
                style={{
                  fontSize: '11.5px', fontWeight: 500,
                  background: schemaPickerOpen ? 'var(--color-primary-soft)' : 'transparent',
                  color: activeSchema ? 'var(--color-ink)' : 'var(--color-ink-tertiary)',
                  border: '1px solid var(--color-border-subtle)',
                  fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.01em',
                  opacity: !activeConnectionId || schemas.length === 0 ? 0.5 : 1,
                }}
              >
                <span className="max-w-[110px] truncate">{activeSchema || 'All schemas'}</span>
                <ChevronDown size={10} style={{ color: 'var(--color-ink-tertiary)', transition: 'transform 150ms', transform: schemaPickerOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {schemaPickerOpen && schemas.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg z-50 overflow-hidden"
                  style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-default)', boxShadow: '0 -4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                  <div className="max-h-48 overflow-y-auto py-1">
                    <button
                      onClick={() => { setActiveSchema(null); setSchemaPickerOpen(false); }}
                      className="w-full text-left px-3 py-1.5 transition-colors"
                      style={{
                        fontSize: '12px', fontWeight: 500,
                        color: !activeSchema ? 'var(--color-primary)' : 'var(--color-ink)',
                        background: !activeSchema ? 'var(--color-primary-soft)' : 'transparent',
                        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
                      }}
                    >All schemas</button>
                    {schemas.map(s => (
                      <button key={s}
                        onClick={() => { setActiveSchema(s); setSchemaPickerOpen(false); }}
                        className="w-full text-left px-3 py-1.5 transition-colors"
                        style={{
                          fontSize: '12px', fontWeight: 500,
                          color: s === activeSchema ? 'var(--color-primary)' : 'var(--color-ink)',
                          background: s === activeSchema ? 'var(--color-primary-soft)' : 'transparent',
                          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        }}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Auto-confirm toggle — pushed right */}
            <button
              onClick={() => setAutoConfirm(!autoConfirm)}
              className="select-none ml-auto px-2.5 py-1 rounded-md transition-colors"
              style={{
                fontSize: '10.5px', fontWeight: 600,
                color: autoConfirm ? 'var(--color-ink-tertiary)' : 'var(--color-semantic-gate)',
                background: autoConfirm ? 'transparent' : 'rgba(240, 160, 64, 0.10)',
                border: '0.5px solid var(--color-border-subtle)',
                fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
                letterSpacing: '0.02em',
              }}
            >{autoConfirm ? 'auto' : 'manual'}</button>
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="select-none flex-shrink-0" style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: '13px', fontWeight: 500, color: 'var(--color-ink-tertiary)', marginLeft: '2px' }}>$</span>
            {activeTool && (
              <span
                className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md flex-shrink-0 select-none"
                style={{
                  background: 'var(--color-primary-soft)',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  letterSpacing: '-0.01em',
                  lineHeight: '1.4',
                }}
              >
                /{activeTool.name}
                <button
                  onClick={() => { setActiveTool(null); inputRef.current?.focus(); }}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded hover:opacity-60 transition-opacity"
                  style={{ color: 'var(--color-primary)', opacity: 0.5, fontSize: '14px', lineHeight: '1' }}
                  title="移除工具"
                >×</button>
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => {
                const v = e.target.value;
                // When a tool chip is active, the input holds only the task
                // text — never re-trigger the "/" palette.
                if (activeTool) {
                  setInputValue(v);
                  return;
                }
                if (v.startsWith('/')) {
                  setPaletteOpen(true);
                  setPaletteQuery(v.slice(1));
                  fetchTools();
                } else {
                  setPaletteOpen(false);
                  setPaletteQuery('');
                }
                setInputValue(v);
              }}
              onKeyDown={e => {
                // While the palette is open, let CommandPalette's window listener
                // own the nav keys (Enter would otherwise submit a half-typed
                // slash command).
                if (paletteOpen && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Escape')) {
                  e.preventDefault();
                  return;
                }
                // Backspace on an empty input with an active chip removes the
                // chip (standard chat-UX behavior).
                if (e.key === 'Backspace' && !inputValue && activeTool) {
                  e.preventDefault();
                  setActiveTool(null);
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder={activeTool ? '输入任务描述...' : (hasContent ? 'Follow up...' : 'Ask anything about your data...')}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none outline-none min-w-0"
              style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-ink)', fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
            />
            <button
              onClick={handleSubmit}
              disabled={isStreaming || (!inputValue.trim() && !activeTool)}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 flex-shrink-0"
              style={{
                background: isStreaming || (!inputValue.trim() && !activeTool) ? 'var(--color-border-subtle)' : 'var(--color-ink)',
                color: isStreaming || (!inputValue.trim() && !activeTool) ? 'var(--color-ink-tertiary)' : 'var(--color-content-bg)',
                opacity: isStreaming || (!inputValue.trim() && !activeTool) ? 0.5 : 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
