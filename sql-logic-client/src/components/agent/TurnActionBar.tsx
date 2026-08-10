import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ThumbsUp, Copy, Check, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import ContextProgressRing from '../ui/ContextProgressRing';
import CompactContextModal from './CompactContextModal';

/**
 * Post-response action bar rendered below the agent's report content.
 *
 * Layout (per spec):
 * <pre>
 *   ─────────────────────────────────────────────  ← horizontal divider
 *   ✓ 执行完成  ⊙70%                 👍  ⧉  ↻
 *   └─ left: done badge + context ring   └─ right: like / copy / re-execute
 * </pre>
 *
 * All glyphs are Lucide UI icons (no emoji) to keep a native, professional
 * feel. The context ring shows the live context-window usage fetched from
 * GET /api/v1/agentic/context/budget; clicking it opens
 * {@link CompactContextModal} to manually trigger compaction.
 */
export default function TurnActionBar({
  conversationId,
  threadId,
  reportText,
  onRerun,
}: {
  conversationId?: string | number;
  threadId?: string;
  reportText?: string;
  onRerun?: () => void;
}) {
  const [usagePercent, setUsagePercent] = useState(0);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);

  // Fetch the live context-window usage for the ring.
  const refreshBudget = useCallback(async () => {
    if (!conversationId) {
      setLoadingBudget(false);
      return;
    }
    setLoadingBudget(true);
    try {
      const res = await api.get<any>(`/api/v1/agentic/context/budget?conversationId=${conversationId}`);
      if (res.code === 200 && res.data) {
        setUsagePercent(Number(res.data.usagePercent ?? 0));
      }
    } catch {
      /* best-effort — ring stays at 0 */
    } finally {
      setLoadingBudget(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refreshBudget();
  }, [refreshBudget]);

  const handleCopy = useCallback(async () => {
    const text = reportText || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }, [reportText]);

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 24,
    padding: '0 7px',
    borderRadius: 6,
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--color-ink-tertiary)',
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'background 120ms, color 120ms, border-color 120ms',
    fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="mt-3"
    >
      {/* Horizontal divider */}
      <div style={{ height: 1, background: 'var(--color-border-subtle)', margin: '2px 0 8px' }} />

      {/* Left / right layout */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left: done badge + context ring */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1 flex-shrink-0">
            <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--color-ink-secondary)',
                letterSpacing: '-0.01em',
              }}
            >
              执行完成
            </span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <ContextProgressRing
              percent={usagePercent}
              size={30}
              strokeWidth={3.5}
              loading={loadingBudget}
              onClick={() => setCompactOpen(true)}
              title={`上下文使用 ${Math.round(usagePercent)}% — 点击手动压缩`}
            />
            <span
              className="hidden sm:inline"
              style={{
                fontSize: '10.5px',
                color: 'var(--color-ink-tertiary)',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              }}
            >
              上下文
            </span>
          </span>
        </div>

        {/* Right: like / copy / re-execute */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            title="点赞"
            aria-label="点赞"
            style={{
              ...btnBase,
              color: liked ? 'var(--color-primary)' : 'var(--color-ink-tertiary)',
            }}
            onMouseEnter={(e) => { if (!liked) e.currentTarget.style.color = 'var(--color-ink-secondary)'; }}
            onMouseLeave={(e) => { if (!liked) e.currentTarget.style.color = 'var(--color-ink-tertiary)'; }}
          >
            <ThumbsUp size={12} fill={liked ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">点赞</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            title="复制"
            aria-label="复制"
            style={btnBase}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-ink-tertiary)'; }}
          >
            {copied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
            <span className="hidden sm:inline">{copied ? '已复制' : '复制'}</span>
          </button>

          <button
            type="button"
            onClick={onRerun}
            disabled={!onRerun}
            title="重新执行"
            aria-label="重新执行"
            style={{
              ...btnBase,
              opacity: onRerun ? 1 : 0.4,
              cursor: onRerun ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => { if (onRerun) e.currentTarget.style.color = 'var(--color-ink-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-ink-tertiary)'; }}
          >
            <RefreshCw size={12} />
            <span className="hidden sm:inline">重新执行</span>
          </button>
        </div>
      </div>

      {/* Manual compaction modal */}
      <CompactContextModal
        open={compactOpen}
        onClose={() => setCompactOpen(false)}
        conversationId={conversationId}
        threadId={threadId}
        currentPercent={usagePercent}
        onCompacted={() => refreshBudget()}
      />
    </motion.div>
  );
}
