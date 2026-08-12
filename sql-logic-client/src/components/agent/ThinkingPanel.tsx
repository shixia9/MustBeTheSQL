import { useEffect, useRef, useCallback } from 'react';
import { Brain, ChevronDown, Loader2, Check } from 'lucide-react';
import type { ThinkingStatus } from '../../stores/conversationStore';

interface ThinkingPanelProps {
  /** LLM reasoning text accumulated from streaming THINKING SSE chunks. */
  content: string;
  /** Current display state: streaming | done | collapsed. */
  status: ThinkingStatus;
  /** Request a status change (e.g. auto-collapse or user toggle). */
  onStatusChange: (status: ThinkingStatus) => void;
}

export default function ThinkingPanel({ content, status, onStatusChange }: ThinkingPanelProps) {
  const fullText = content || '';

  // --- Guards (persist across re-renders) ---
  const autoCollapsedRef = useRef(false);
  const userViewedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new streaming chunks arrive.
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [fullText]);

  // Auto-collapse: fires once, after streaming completes and a short delay.
  // Skipped if the user already collapsed manually.
  useEffect(() => {
    if (status !== 'done') return;
    if (autoCollapsedRef.current) return;

    const timer = setTimeout(() => {
      autoCollapsedRef.current = true;
      onStatusChange('collapsed');
    }, 800);

    return () => clearTimeout(timer);
  }, [status, onStatusChange]);

  // Reset guards when content is cleared (e.g. new turn starts).
  useEffect(() => {
    if (!fullText) {
      autoCollapsedRef.current = false;
      userViewedRef.current = false;
    }
  }, [fullText]);

  const handleToggle = useCallback(() => {
    if (status === 'collapsed') {
      userViewedRef.current = true;
      onStatusChange('done');
    } else {
      onStatusChange('collapsed');
    }
  }, [status, onStatusChange]);

  // Don't render when there is no thinking content at all.
  if (!fullText) return null;

  const isCollapsed = status === 'collapsed';
  const isStreaming = status === 'streaming';
  const showUnread = isCollapsed && !userViewedRef.current;

  return (
    <div className="mb-1.5">
      {/* ── Header / toggle bar ── */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left py-1 px-2 rounded transition-colors hover:opacity-80"
        style={{
          background: 'rgba(156, 163, 175, 0.08)',
          color: 'var(--color-ink-secondary)',
        }}
      >
        <Brain size={11} style={{ color: '#9ca3af', flexShrink: 0 }} />
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}
        >
          Thinking
        </span>

        {/* Status indicator */}
        {isStreaming ? (
          <Loader2 size={10} className="animate-spin" style={{ color: '#9ca3af' }} />
        ) : (
          !isCollapsed && (
            <Check size={10} style={{ color: 'var(--color-success, #22c55e)' }} />
          )
        )}

        {/* Unread badge */}
        {showUnread && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#9ca3af',
              display: 'inline-block',
              flexShrink: 0,
              boxShadow: '0 0 4px rgba(156, 163, 175, 0.5)',
            }}
          />
        )}

        <ChevronDown
          size={10}
          className="ml-auto"
          style={{
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Content area (only when expanded) ── */}
      {!isCollapsed && (
        <div
          ref={contentRef}
          className="mt-1 px-3 py-2 rounded overflow-auto"
          style={{
            maxHeight: '200px',
            background: 'var(--color-surface-container-low)',
            border: '1px solid var(--color-border-subtle)',
            borderLeft: '2px solid #9ca3af',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: '11px',
            lineHeight: 1.6,
            color: 'var(--color-ink-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {fullText}
          {/* Blinking cursor while streaming */}
          {isStreaming && (
            <span
              className="animate-pulse"
              style={{ color: '#9ca3af', fontWeight: 600 }}
            >
              ▊
            </span>
          )}
        </div>
      )}
    </div>
  );
}
