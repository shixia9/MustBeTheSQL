import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers, Loader } from 'lucide-react';
import { api } from '../../api/client';
import ContextProgressRing, { levelFor } from '../ui/ContextProgressRing';

/**
 * Manual context-compaction dialog.
 *
 * Opened by clicking the circular progress ring in {@link TurnActionBar}.
 * Shows the live context-window usage, lets the user confirm a manual
 * compaction pass (POST /api/v1/agentic/context/compact), and reports the
 * before → after token reduction. On success the parent is notified so it can
 * refresh the ring.
 */
interface CompactResult {
  budget: number;
  tokensBefore: number;
  tokensAfter: number;
  usagePercentBefore: number;
  usagePercentAfter: number;
  applied: boolean;
  reduced: number;
}

export default function CompactContextModal({
  open,
  onClose,
  conversationId,
  threadId,
  currentPercent,
  onCompacted,
}: {
  open: boolean;
  onClose: () => void;
  conversationId?: string | number;
  threadId?: string;
  currentPercent: number;
  onCompacted?: (result: CompactResult) => void;
}) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<CompactResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCompact = async () => {
    if (!conversationId) {
      setErrorMsg('当前会话无法定位上下文，请先发送一条消息。');
      setState('error');
      return;
    }
    setState('running');
    setErrorMsg('');
    try {
      const res = await api.post<any>('/agentic/context/compact', {
        conversationId: Number(conversationId),
        threadId: threadId || undefined,
      });
      if (res.code === 200 && res.data) {
        const r: CompactResult = {
          budget: res.data.budget ?? 0,
          tokensBefore: res.data.tokensBefore ?? 0,
          tokensAfter: res.data.tokensAfter ?? 0,
          usagePercentBefore: res.data.usagePercentBefore ?? 0,
          usagePercentAfter: res.data.usagePercentAfter ?? 0,
          applied: Boolean(res.data.applied),
          reduced: res.data.reduced ?? 0,
        };
        setResult(r);
        setState('done');
        onCompacted?.(r);
      } else {
        setErrorMsg(res.message || '上下文压缩失败');
        setState('error');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || '网络错误');
      setState('error');
    }
  };

  const handleClose = () => {
    setState('idle');
    setResult(null);
    setErrorMsg('');
    onClose();
  };

  const displayPercent = result ? result.usagePercentAfter : currentPercent;
  const reducePct = result && result.tokensBefore > 0
    ? Math.round((result.reduced / result.tokensBefore) * 100)
    : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl shadow-2xl w-[90vw] max-w-md flex flex-col overflow-hidden"
            style={{
              background: 'var(--color-panel-bg)',
              border: '1px solid var(--color-border-subtle)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Layers size={14} style={{ color: 'var(--color-semantic-gate)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
                  压缩上下文
                </span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--color-ink-tertiary)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-4 flex flex-col items-center gap-3">
              {/* Ring + usage summary */}
              <ContextProgressRing percent={displayPercent} size={64} strokeWidth={6} loading={state === 'running'} />
              <div className="text-center">
                <div style={{ fontSize: '11.5px', color: 'var(--color-ink-secondary)', fontWeight: 500 }}>
                  上下文窗口使用率
                </div>
                <div
                  className="mt-0.5"
                  style={{
                    fontSize: '11px',
                    color: LEVEL_TEXT_COLORS[levelFor(displayPercent)],
                    fontWeight: 600,
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  }}
                >
                  {Math.round(displayPercent)}%
                </div>
              </div>

              {/* Result / status line */}
              <div className="w-full text-center" style={{ minHeight: 18 }}>
                {state === 'idle' && (
                  <span style={{ fontSize: '11px', color: 'var(--color-ink-tertiary)' }}>
                    手动触发渐进式压缩（L1 截断 / L2 丢弃旧轮 / L3 LLM 摘要）
                  </span>
                )}
                {state === 'running' && (
                  <span className="flex items-center justify-center gap-1.5" style={{ fontSize: '11px', color: 'var(--color-ink-tertiary)' }}>
                    <Loader size={11} className="animate-spin" />
                    正在压缩…
                  </span>
                )}
                {state === 'done' && result && (
                  <span style={{ fontSize: '11px', color: 'var(--color-ink-secondary)' }}>
                    {result.applied ? (
                      <>
                        {result.tokensBefore} → {result.tokensAfter} tokens
                        <span style={{ color: 'var(--color-semantic-execution)', fontWeight: 600, marginLeft: 6 }}>
                          −{reducePct}%
                        </span>
                      </>
                    ) : (
                      '上下文健康，无需压缩'
                    )}
                  </span>
                )}
                {state === 'error' && (
                  <span style={{ fontSize: '11px', color: 'var(--color-error, #ef4444)' }}>{errorMsg}</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-4 py-3 border-t" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-app-bg)' }}>
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: 'var(--color-ink-secondary)', border: '1px solid var(--color-border-subtle)' }}
              >
                关闭
              </button>
              <button
                onClick={handleCompact}
                disabled={state === 'running'}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: state === 'running' ? 'var(--color-border-subtle)' : 'var(--color-ink)',
                  color: 'var(--color-content-bg)',
                  opacity: state === 'running' ? 0.6 : 1,
                }}
              >
                {state === 'running' ? '压缩中…' : state === 'done' ? '再次压缩' : '确认压缩'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const LEVEL_TEXT_COLORS: Record<string, string> = {
  safe: 'var(--color-success)',
  warn: 'var(--color-semantic-gate)',
  danger: 'var(--color-error, #ef4444)',
};
