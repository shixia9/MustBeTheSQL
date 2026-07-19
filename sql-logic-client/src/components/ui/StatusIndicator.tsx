import { getIcon } from '../../assets/icons';

type Status = 'live' | 'busy' | 'idle' | 'done' | 'error';

const statusConfig: Record<Status, { icon: string; label: string; color: string }> = {
  live: { icon: 'live', label: 'Live', color: '#a3e635' },
  busy: { icon: 'running', label: 'Busy', color: '#f59e0b' },
  idle: { icon: 'pending', label: 'Idle', color: '#64748b' },
  done: { icon: 'success', label: 'Done', color: '#a3e635' },
  error: { icon: 'error', label: 'Error', color: '#f25c5c' },
};

export default function StatusIndicator({ status }: { status: Status }) {
  const config = statusConfig[status];
  const Icon = getIcon(config.icon);

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: config.color }}>
      <Icon size={12} className={status === 'busy' || status === 'live' ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
