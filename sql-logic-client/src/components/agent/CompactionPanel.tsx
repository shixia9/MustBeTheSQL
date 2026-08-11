import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Layers } from 'lucide-react';
import type { CompactionEvent } from '../../stores/conversationStore';

/**
 * Live context-compaction visualization.
 *
 * Renders the CONTEXT_COMPACT SSE events captured during a turn (one event per
 * applied compaction layer, L1–L4). Shows a per-layer token-reduction bar with
 * an animated width transition, a coloured layer badge graded by aggressiveness,
 * and a short preview of the retained context.
 *
 * Entry animation (opacity 0→1, y 10→0, 280ms ease-out) matches the
 * ExecutionTimelineModal convention so compaction cards feel consistent with
 * the rest of the agent timeline.
 */

/** Layer → accent colour, graded from mild (amber) to emergency (red). */
const LAYER_COLORS: Record<string, string> = {
  L1: 'var(--color-semantic-gate)',      // 截断观察 — mild warning
  L2: 'var(--color-semantic-gate)',      // 丢弃旧轮 — moderate warning
  L3: 'var(--color-semantic-execution)', // LLM 摘要 — smart summarization
  L4: '#ef4444',                          // 紧急压缩 — last-resort emergency
};

const ENTRY_TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
};

export default function CompactionPanel({ events }: { events?: CompactionEvent[] }) {
  const [open, setOpen] = useState(true);

  if (!events || events.length === 0) return null;

  // Aggregate token reduction across all layers for the header summary.
  const first = events[0];
  const last = events[events.length - 1];
  const totalBefore = first?.tokensBefore ?? 0;
  const totalAfter = last?.tokensAfter ?? 0;
  const reduced = Math.max(0, totalBefore - totalAfter);
  const reducePct = totalBefore > 0 ? Math.round((reduced / totalBefore) * 100) : 0;
  const totalDropped = events.reduce((s, e) => s + (e.dropped || 0), 0);

  return (
    <motion.div
      {...ENTRY_TRANSITION}
      className="mb-2 rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-app-bg)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 transition-colors"
        style={{ background: 'transparent' }}
      >
        <Layers size={13} style={{ color: 'var(--color-semantic-gate)' }} />
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            color: 'var(--color-ink-secondary)',
            letterSpacing: '-0.01em',
          }}
        >
          上下文压缩
        </span>
        <span
          className="px-1.5 py-0.5 rounded"
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-semantic-gate)',
            background: 'var(--color-semantic-gate-soft)',
          }}
        >
          {events.length} 层
        </span>
        <span
          className="ml-auto flex items-center gap-1.5"
          style={{ fontSize: '11px', color: 'var(--color-ink-tertiary)', fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
        >
          {totalBefore} → {totalAfter}
          <span style={{ color: 'var(--color-semantic-execution)', fontWeight: 600 }}>
            −{reducePct}%
          </span>
          {totalDropped > 0 && <span style={{ opacity: 0.7 }}>· {totalDropped} dropped</span>}
        </span>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--color-ink-tertiary)',
            transition: 'transform 150ms',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {/* Layer details */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 pt-0.5 flex flex-col gap-2">
              {events.map((ev, i) => {
                const color = LAYER_COLORS[ev.layer] || 'var(--color-semantic-gate)';
                const pct = ev.tokensBefore > 0
                  ? Math.round(((ev.tokensBefore - ev.tokensAfter) / ev.tokensBefore) * 100)
                  : 0;
                // Width of the "after" portion relative to "before" — animates
                // from 100% (full bar) down to the post-compaction ratio.
                const afterRatio = ev.tokensBefore > 0
                  ? Math.max(4, Math.round((ev.tokensAfter / ev.tokensBefore) * 100))
                  : 100;
                return (
                  <motion.div
                    key={`${ev.layer}-${ev.ts}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut', delay: i * 0.04 }}
                    className="rounded-md px-2.5 py-2"
                    style={{ background: 'var(--color-content-bg)', border: '0.5px solid var(--color-border-subtle)' }}
                  >
                    {/* Layer row: badge + token delta */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                        style={{
                          fontSize: '10px',
                          color,
                          background: `${color}1a`,
                          border: `0.5px solid ${color}55`,
                          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        }}
                      >
                        {ev.layer}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-ink)' }}>
                        {ev.layerName}
                      </span>
                      <span
                        className="ml-auto"
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--color-ink-tertiary)',
                          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        }}
                      >
                        {ev.tokensBefore} → {ev.tokensAfter}
                        <span style={{ color: 'var(--color-semantic-execution)', fontWeight: 600, marginLeft: 4 }}>
                          −{pct}%
                        </span>
                      </span>
                    </div>

                    {/* Token-reduction bar: animated width from 100% → afterRatio */}
                    <div
                      className="relative h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--color-border-subtle)' }}
                    >
                      <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: `${afterRatio}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 + i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: color, opacity: 0.85 }}
                      />
                    </div>

                    {/* Preview of retained context */}
                    {ev.preview && (
                      <div
                        className="mt-1.5 px-2 py-1 rounded"
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--color-ink-tertiary)',
                          background: 'var(--color-app-bg)',
                          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                          lineHeight: 1.45,
                          maxHeight: '52px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {ev.preview}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
