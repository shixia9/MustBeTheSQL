import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useLlmConfig } from '../contexts/LlmConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { api } from '../api/client';
import AgentExecutionView from '../components/agent/AgentExecutionView';
import WelcomePanel from '../components/chat/WelcomePanel';
import { Database, ChevronDown } from 'lucide-react';

interface StepData {
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  content?: string;
  output?: any;
  messageType?: string;
}

interface TurnData {
  question: string;
  steps: StepData[];
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const { t } = useI18n();
  const { selectedConfig } = useLlmConfig();
  const { user } = useAuth();
  const activeConnectionId = useWorkspaceStore(s => s.activeConnectionId);
  const setActiveConnectionId = useWorkspaceStore(s => s.setActiveConnectionId);
  const activeSchema = useWorkspaceStore(s => s.activeSchema);
  const setActiveSchema = useWorkspaceStore(s => s.setActiveSchema);

  const [turns, setTurns] = useState<TurnData[]>([]);
  const [currentTurn, setCurrentTurn] = useState<TurnData | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hitlPending, setHitlPending] = useState<{ threadId: string; plan: any } | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [databases, setDatabases] = useState<{ id: number; name: string; dbType: string }[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [connPickerOpen, setConnPickerOpen] = useState(false);
  const [schemaPickerOpen, setSchemaPickerOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  // Guard against duplicate turn finalization in dev StrictMode
  const turnFinalizedRef = useRef(false);

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

  const handleStream = useCallback(async (userInput: string) => {
    setIsStreaming(true);
    turnFinalizedRef.current = false;
    const turn: TurnData = { question: userInput, steps: [] };
    setCurrentTurn(turn);
    const controller = new AbortController();
    abortRef.current = controller;

    const llmConfigId = selectedConfig?.id ?? 0;
    const connectionId = activeConnectionId ?? 1;
    const schemaName = activeSchema ?? '';

    try {
      const response = await fetch('/api/v1/agentic/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          connectionId,
          llmConfigId,
          autoConfirm,
          schemaContext: schemaName,
        }),
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
                const stepData = parsed.data || {};
                updated.steps = updated.steps.map(s =>
                  s.nodeName === nodeName
                    ? { ...s, status: 'completed' as const, content: JSON.stringify(stepData), output: stepData }
                    : s
                );
              } else if (parsed.outputType === 'AWAITING_CLARIFICATION') {
                // ManagerAgent requests user clarification
                const nodeName = parsed.nodeName || 'MANAGER';
                const reason = parsed.data?.reason || '';
                updated.steps = updated.steps.map(s =>
                  s.nodeName === nodeName
                    ? { ...s, status: 'running' as const, content: `Clarification needed: ${reason}` }
                    : s
                );
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
                // final completion — handled on stream end
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
      // Move currentTurn → turns atomically, guarded against double-fire
      if (!turnFinalizedRef.current) {
        turnFinalizedRef.current = true;
        setCurrentTurn(prev => {
          if (prev) {
            setTurns(prevTurns => [...prevTurns, prev]);
          }
          return null;
        });
      }
    }
  }, [activeConnectionId, activeSchema, selectedConfig, autoConfirm]);

  const handleSubmit = () => {
    if (!inputValue.trim() || isStreaming) return;
    const q = inputValue.trim();
    setInputValue('');
    handleStream(q);
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
          className="max-w-2xl mx-auto rounded-xl"
          style={{
            background: 'var(--color-content-bg)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
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
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={hasContent ? "Follow up..." : "Ask anything about your data..."}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none outline-none"
              style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-ink)', fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
            />
            <button
              onClick={handleSubmit}
              disabled={isStreaming || !inputValue.trim()}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 flex-shrink-0"
              style={{
                background: isStreaming || !inputValue.trim() ? 'var(--color-border-subtle)' : 'var(--color-ink)',
                color: isStreaming || !inputValue.trim() ? 'var(--color-ink-tertiary)' : 'var(--color-content-bg)',
                opacity: isStreaming || !inputValue.trim() ? 0.5 : 1,
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
