import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../api/client';
import AgentExecutionView from '../components/agent/AgentExecutionView';
import WelcomePanel from '../components/chat/WelcomePanel';

interface StepData {
  nodeName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  content?: string;
  output?: any;
  durationMs?: number;
  tokensUsed?: number;
}

interface TurnData {
  question: string;
  steps: StepData[];
  reportResult?: string;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const { t } = useI18n();
  const [turns, setTurns] = useState<TurnData[]>([]);
  const [currentTurn, setCurrentTurn] = useState<TurnData | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [hitlPending, setHitlPending] = useState<{ threadId: string; plan: any } | null>(null);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [selectedDb, setSelectedDb] = useState<number | null>(null);

  const currentThreadRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleStream = useCallback(async (userInput: string) => {
    setIsStreaming(true);
    const turn: TurnData = { question: userInput, steps: [] };
    setCurrentTurn(turn);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/v1/agentic/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          connectionId: selectedDb || 1,
          llmConfigId: 1,
          autoConfirm,
        }),
        signal: controller.signal,
        credentials: 'include',
      });

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
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            setCurrentTurn(prev => {
              if (!prev) return prev;
              const updated = { ...prev };

              if (parsed.type === 'NODE_STARTED') {
                updated.steps = [...updated.steps, {
                  nodeName: parsed.node || 'UNKNOWN',
                  status: 'running' as const,
                }];
              } else if (parsed.type === 'NODE') {
                const idx = updated.steps.findIndex(s => s.nodeName === parsed.node);
                if (idx >= 0) {
                  updated.steps = updated.steps.map((s, i) =>
                    i === idx ? { ...s, status: 'completed' as const, content: parsed.content, output: parsed.output } : s
                  );
                }
              } else if (parsed.type === 'ERROR') {
                const idx = updated.steps.findIndex(s => s.nodeName === parsed.node);
                if (idx >= 0) {
                  updated.steps = updated.steps.map((s, i) =>
                    i === idx ? { ...s, status: 'error' as const, content: parsed.error } : s
                  );
                }
              } else if (parsed.type === 'COMPLETED') {
                // final completion
              }

              return { ...updated };
            });
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream error:', err);
      }
    } finally {
      setIsStreaming(false);
      setCurrentTurn(prev => {
        if (prev) setTurns(prevTurns => [...prevTurns, prev]);
        return null;
      });
    }
  }, [selectedDb, autoConfirm]);

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

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
    handleStream(prompt);
  };

  const hasContent = turns.length > 0 || currentTurn !== null || conversationId;

  return (
    <div className="flex flex-col h-full">
      {hasContent ? (
        <AgentExecutionView
          turns={[...turns, ...(currentTurn ? [currentTurn] : [])]}
          isStreaming={isStreaming}
          hitlPending={hitlPending}
          onHitlConfirm={handleHITLConfirm}
          autoConfirm={autoConfirm}
          onAutoConfirmChange={setAutoConfirm}
          selectedDb={selectedDb}
          onDbChange={setSelectedDb}
        />
      ) : (
        <WelcomePanel onSuggestionClick={(prompt) => {
          setInputValue(prompt);
          handleStream(prompt);
        }} />
      )}

      {/* Input bar */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          background: 'var(--color-content-bg)',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5 max-w-3xl mx-auto">
          {/* Prompt indicator */}
          <span
            className="select-none flex-shrink-0"
            style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: '13px',
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
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="Ask anything about your data..."
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

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Auto-confirm toggle */}
            <button
              onClick={() => setAutoConfirm(!autoConfirm)}
              className="select-none transition-colors"
              style={{
                fontSize: '10.5px',
                fontWeight: 500,
                color: autoConfirm ? 'var(--color-ink-tertiary)' : 'var(--color-semantic-gate)',
                letterSpacing: '-0.01em',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: autoConfirm ? 'transparent' : 'var(--color-semantic-gate-soft)',
              }}
              title="Auto-confirm execution plans"
            >
              auto
            </button>

            <button
              onClick={handleSubmit}
              disabled={isStreaming || !inputValue.trim()}
              className="btn-primary"
            >
              Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
