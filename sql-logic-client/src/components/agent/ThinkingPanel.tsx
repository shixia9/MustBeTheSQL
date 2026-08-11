import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, ChevronDown, Loader2, Check } from 'lucide-react';
import type { ThinkingStatus } from '../../stores/conversationStore';

interface ThinkingPanelProps {
  /** Full LLM reasoning text from the THINKING SSE event. */
  content: string;
  /** Current display state: streaming | done | collapsed. */
  status: ThinkingStatus;
  /** Request a status change (e.g. auto-collapse or user toggle). */
  onStatusChange: (status: ThinkingStatus) => void;
}

/**
 * Dedicated, collapsible panel that renders an agent's LLM reasoning ("thinking
 * process") separately from its final output.
 *
 * Visual & behavioural contract (per product spec):
 *  - Typewriter effect: the full text is revealed incrementally at ~60 fps to
 *    simulate streaming, even though the backend sends it in one THINKING event.
 *  - Bottom-up flow: the scroll container auto-scrolls to the bottom as new
 *    characters appear, giving a terminal-like "text flows upward" feel.
 *  - Auto-collapse: once the typewriter finishes, the panel collapses after a
 *    short delay (800 ms). A ref guard ensures this fires only once per content
 *    change — the user's subsequent expand/collapse clicks are never overridden.
 *  - Unread badge: when collapsed and the user has not yet expanded manually, a
 *    small indigo dot signals "unviewed thinking content".
 *  - Status indicator: a spinning Loader2 while streaming, a green Check when
 *    the thinking is complete and the panel is expanded.
 *
 * The panel is intentionally compact (max-height 200 px, 11 px monospace) so it
 * sits cleanly above the step's final output without dominating the timeline.
 */
export default function ThinkingPanel({ content, status, onStatusChange }: ThinkingPanelProps) {
  const fullText = content || '';

  // --- Typewriter state ---
  const [displayedLen, setDisplayedLen] = useState(0);

  // --- Guards (persist across re-renders, reset only on content change) ---
  const autoCollapsedRef = useRef(false);
  const userViewedRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset typewriter + guards when the underlying content changes (e.g. a
  // retry produces a new THINKING event with different reasoning).
  useEffect(() => {
    setDisplayedLen(0);
    autoCollapsedRef.current = false;
    userViewedRef.current = false;
  }, [fullText]);

  // Typewriter effect: reveal `fullText` incrementally at ~3 chars/tick.
  useEffect(() => {
    if (fullText.length === 0) return;
    if (displayedLen >= fullText.length) return;

    const charsPerTick = 3;
    const interval = setInterval(() => {
      setDisplayedLen(prev => {
        const next = Math.min(prev + charsPerTick, fullText.length);
        return next;
      });
    }, 16); // ≈60 fps

    return () => clearInterval(interval);
  }, [fullText, displayedLen]);

  // Auto-scroll to bottom as text appears (bottom-up terminal feel).
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayedLen]);

  const typewriterDone = displayedLen >= fullText.length;

  // Auto-collapse: fires once, after the typewriter finishes and a short
  // delay. Skipped if the user already collapsed manually or if the panel
  // is already collapsed.
  useEffect(() => {
    if (!typewriterDone) return;
    if (autoCollapsedRef.current) return;
    if (status === 'collapsed') return;

    const timer = setTimeout(() => {
      autoCollapsedRef.current = true;
      onStatusChange('collapsed');
    }, 800);

    return () => clearTimeout(timer);
  }, [typewriterDone, status, onStatusChange]);

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
  const isStreaming = status === 'streaming' || !typewriterDone;
  const showUnread = isCollapsed && !userViewedRef.current;
  const displayedText = fullText.slice(0, displayedLen);

  return (
    <div className="mb-1.5">
      {/* ── Header / toggle bar ── */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left py-1 px-2 rounded transition-colors hover:opacity-80"
        style={{
          background: 'rgba(129, 140, 248, 0.08)',
          color: 'var(--color-ink-secondary)',
        }}
      >
        <Brain size={11} style={{ color: '#818cf8', flexShrink: 0 }} />
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}
        >
          思考过程
        </span>

        {/* Status indicator */}
        {isStreaming ? (
          <Loader2 size={10} className="animate-spin" style={{ color: '#818cf8' }} />
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
              background: '#818cf8',
              display: 'inline-block',
              flexShrink: 0,
              boxShadow: '0 0 4px rgba(129, 140, 248, 0.5)',
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
            background: 'var(--color-app-bg)',
            border: '1px solid var(--color-border-subtle)',
            borderLeft: '2px solid #818cf8',
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: '11px',
            lineHeight: 1.6,
            color: 'var(--color-ink-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {displayedText}
          {/* Blinking cursor while the typewriter is still running */}
          {!typewriterDone && (
            <span
              className="animate-pulse"
              style={{ color: '#818cf8', fontWeight: 600 }}
            >
              ▊
            </span>
          )}
        </div>
      )}
    </div>
  );
}
