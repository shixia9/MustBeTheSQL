import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useLlmConfig } from '../contexts/LlmConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { api } from '../api/client';
import AgentExecutionView from '../components/agent/AgentExecutionView';
import WelcomePanel from '../components/chat/WelcomePanel';

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

  const [turns, setTurns] = useState<TurnData[]>([]);
  const [currentTurn, setCurrentTurn] = useState<TurnData | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hitlPending, setHitlPending] = useState<{ threadId: string; plan: any } | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [databases, setDatabases] = useState<{ id: number; name: string; dbType: string }[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // Load database connections on mount
  useEffect(() => {
    if (!user?.id) return;
    api.get<any[]>(`/database/list?userId=${user.id}`).then(d => {
      if (d.code === 200 && d.data) {
        const conns = Array.isArray(d.data) ? d.data : [];
        setDatabases(conns.map((c: any) => ({ id: c.id, name: c.name || c.dbName || `DB #${c.id}`, dbType: c.dbType || c.type || '' })));
        // Auto-select first if none selected
        if (conns.length > 0 && !activeConnectionId) {
          setActiveConnectionId(conns[0].id);
        }
      }
    }).catch(() => {});
  }, [user?.id]);

  const handleStream = useCallback(async (userInput: string) => {
    setIsStreaming(true);
    const turn: TurnData = { question: userInput, steps: [] };
    setCurrentTurn(turn);
    const controller = new AbortController();
    abortRef.current = controller;

    const llmConfigId = selectedConfig?.id ?? 0;
    const connectionId = activeConnectionId ?? 1;

    try {
      const response = await fetch('/api/v1/agentic/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          connectionId,
          llmConfigId,
          autoConfirm,
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
      setCurrentTurn(prev => {
        if (prev) setTurns(prevTurns => [...prevTurns, prev]);
        return null;
      });
    }
  }, [activeConnectionId, selectedConfig, autoConfirm]);

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

      {/* Floating input bar */}
      <div className="flex-shrink-0 px-4 pb-3 pt-2">
        <div
          className="max-w-2xl mx-auto flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: 'var(--color-content-bg)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
          }}
        >
          {/* Database selector */}
          <select
            value={activeConnectionId ?? ''}
            onChange={e => setActiveConnectionId(e.target.value ? Number(e.target.value) : null)}
            className="bg-transparent border-none outline-none flex-shrink-0"
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: activeConnectionId ? 'var(--color-ink)' : 'var(--color-ink-tertiary)',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              letterSpacing: '-0.01em',
              maxWidth: '130px',
            }}
            title={activeConnectionId ? `DB #${activeConnectionId}` : 'Select database'}
          >
            <option value="">-- db --</option>
            {databases.map(db => (
              <option key={db.id} value={db.id}>
                {db.name}{db.dbType ? ` [${db.dbType}]` : ''}
              </option>
            ))}
          </select>

          {/* Prompt indicator */}
          <span
            className="select-none flex-shrink-0"
            style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: '13.5px',
              fontWeight: 500,
              color: 'var(--color-ink-tertiary)',
            }}
          >
            $
          </span>

          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={hasContent ? "Follow up..." : "Ask anything about your data..."}
            disabled={isStreaming}
            className="flex-1 bg-transparent border-none outline-none"
            style={{
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--color-ink)',
              fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
              letterSpacing: '-0.01em',
            }}
          />

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setAutoConfirm(!autoConfirm)}
              className="select-none transition-colors px-2 py-0.5 rounded-md"
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: autoConfirm ? 'var(--color-ink-tertiary)' : 'var(--color-semantic-gate)',
                background: autoConfirm ? 'transparent' : 'var(--color-semantic-gate-soft)',
              }}
              title={autoConfirm ? 'Auto-confirm ON — click to disable' : 'Auto-confirm OFF — click to enable'}
            >
              {autoConfirm ? 'auto' : 'manual'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isStreaming || !inputValue.trim()}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150"
              style={{
                background: isStreaming || !inputValue.trim()
                  ? 'var(--color-border-subtle)'
                  : 'var(--color-ink)',
                color: isStreaming || !inputValue.trim()
                  ? 'var(--color-ink-tertiary)'
                  : 'var(--color-content-bg)',
                opacity: isStreaming || !inputValue.trim() ? 0.5 : 1,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
