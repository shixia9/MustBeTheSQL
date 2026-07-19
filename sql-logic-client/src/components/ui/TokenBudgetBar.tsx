export default function TokenBudgetBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min((used / total) * 100, 100);
  const level = pct > 90 ? 'danger' : pct > 70 ? 'warn' : 'safe';

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="token-bar flex-1">
        <div className={`token-bar-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-on-surface-variant whitespace-nowrap">
        {(used / 1000).toFixed(1)}k / {(total / 1000).toFixed(0)}k
      </span>
    </div>
  );
}
