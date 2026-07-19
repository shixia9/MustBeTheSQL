import { useLlmConfig } from '../../contexts/LlmConfigContext';
import { getIcon } from '../../assets/icons';

export default function ModelSelector() {
  const { configs, selectedConfigId, setSelectedConfigId } = useLlmConfig();

  if (!configs || configs.length === 0) {
    return (
      <span
        className="px-2 select-none"
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--color-dark-ink-tertiary)',
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
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'var(--color-dark-ink-secondary)',
        fontSize: '11.5px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        padding: '4px 8px',
        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
        backgroundImage: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
        e.currentTarget.style.color = 'var(--color-dark-ink)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.color = 'var(--color-dark-ink-secondary)';
      }}
    >
      {configs.map((c: any) => (
        <option key={c.id} value={c.id} style={{ background: '#161821', color: '#e4e6ee' }}>
          {c.configName || c.modelName || `Model #${c.id}`}
        </option>
      ))}
    </select>
  );
}
