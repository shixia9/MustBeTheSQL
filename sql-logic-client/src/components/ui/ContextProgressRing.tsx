import { motion } from 'motion/react';

/**
 * Circular (ring) progress bar — "圆环进度条 + N%" visual.
 *
 * Renders an SVG ring graded by level (safe / warn / danger) with the
 * percentage centred inside. Used by {@link TurnActionBar} to show how full
 * the agent context window is; clicking it opens the manual-compaction modal.
 *
 * Colour grading mirrors {@link TokenBudgetBar}: <50% success, 50–80% gate
 * (amber), >80% error (red) — so the ring reads consistently with the rest of
 * the context telemetry.
 */
export type RingLevel = 'safe' | 'warn' | 'danger';

const LEVEL_COLORS: Record<RingLevel, string> = {
  safe: 'var(--color-success)',
  warn: 'var(--color-semantic-gate)',
  danger: 'var(--color-error, #ef4444)',
};

export function levelFor(percent: number): RingLevel {
  if (percent >= 80) return 'danger';
  if (percent >= 50) return 'warn';
  return 'safe';
}

export default function ContextProgressRing({
  percent,
  size = 34,
  strokeWidth = 3.5,
  onClick,
  title,
  loading = false,
}: {
  percent: number;            // 0–100
  size?: number;
  strokeWidth?: number;
  onClick?: () => void;
  title?: string;
  loading?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const level = levelFor(clamped);
  const color = LEVEL_COLORS[level];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - clamped / 100);
  const interactive = Boolean(onClick);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        cursor: interactive ? 'pointer' : 'default',
        background: 'transparent',
        border: 'none',
        padding: 0,
        outline: 'none',
      }}
      title={title}
      aria-label={title || `上下文使用 ${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc — rotated so it starts at 12 o'clock */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: loading ? circumference : dashoffset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      {/* Centre percentage label */}
      <span
        style={{
          position: 'absolute',
          fontSize: Math.max(8, size * 0.26),
          fontWeight: 700,
          color: 'var(--color-ink-secondary)',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {loading ? '–' : Math.round(clamped)}
      </span>
    </motion.button>
  );
}
