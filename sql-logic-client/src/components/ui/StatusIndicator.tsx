import { getIcon } from '../../assets/icons';

type Status = 'live' | 'busy' | 'idle' | 'done' | 'error';

const statusConfig: Record<Status, { icon: string; label: string; color: string }> = {
  live: { icon: 'live', label: 'Live', color: 'var(--color-success)' },
  busy: { icon: 'running', label: 'Busy', color: 'var(--color-semantic-gate)' },
  idle: { icon: 'pending', label: 'Idle', color: 'var(--color-dark-ink-tertiary)' },
  done: { icon: 'success', label: 'Done', color: 'var(--color-success)' },
  error: { icon: 'error', label: 'Error', color: 'var(--color-error)' },
};

export default function StatusIndicator({ status }: { status: Status }) {
  const config = statusConfig[status];
  const Icon = getIcon(config.icon);

  return (
    <div
      className="flex items-center gap-1.5 select-none"
      style={{
        color: config.color,
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: config.color,
          boxShadow: `0 0 6px ${config.color}`,
          animation: status === 'busy' || status === 'live' ? 'token-pulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
