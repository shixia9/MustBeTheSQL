import { useLlmConfig } from '../../contexts/LlmConfigContext';

export default function ModelSelector() {
  const { configs, selectedConfigId, setSelectedConfigId } = useLlmConfig();

  if (!configs || configs.length === 0) {
    return (
      <span
        className="px-2 select-none"
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--shell-text-dim)',
          letterSpacing: '-0.01em',
        }}
      >
        No model configured
      </span>
    );
  }

  return (
    <select
      value={selectedConfigId || configs[0]?.id || ''}
      onChange={(e) => setSelectedConfigId(e.target.value ? Number(e.target.value) : null)}
      className="appearance-none pr-5 cursor-pointer max-w-[170px] truncate outline-none transition-colors rounded-md"
      style={{
        background: 'var(--shell-hover)',
        border: '1px solid var(--shell-border)',
        color: 'var(--shell-text)',
        fontSize: '11.5px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        padding: '4px 8px',
        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        backgroundImage: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.color = 'var(--shell-text-active)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--shell-border)';
        e.currentTarget.style.color = 'var(--shell-text)';
      }}
    >
      {configs.map((c: any) => (
        <option key={c.id} value={c.id} style={{ background: 'var(--card-bg)', color: 'var(--ink)' }}>
          {c.configName || c.modelName || `Model #${c.id}`}
        </option>
      ))}
    </select>
  );
}
