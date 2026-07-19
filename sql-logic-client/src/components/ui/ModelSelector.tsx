import { useLlmConfig } from '../../contexts/LlmConfigContext';
import { getIcon } from '../../assets/icons';

export default function ModelSelector() {
  const { configs, selectedConfigId, setSelectedConfigId } = useLlmConfig();

  const ChevronDown = getIcon('chevronDown');

  if (!configs || configs.length === 0) {
    return (
      <span className="text-[11px] text-on-surface-variant/60 font-mono px-2">
        No model configured
      </span>
    );
  }

  return (
    <select
      value={selectedConfigId || configs[0]?.id || ''}
      onChange={(e) => setSelectedConfigId(e.target.value ? Number(e.target.value) : null)}
      className="input-flat text-[11px] appearance-none pr-6 cursor-pointer max-w-[180px] truncate"
      style={{ backgroundImage: 'none' }}
    >
      {configs.map((c: any) => (
        <option key={c.id} value={c.id}>
          {c.configName || c.modelName || `Model #${c.id}`}
        </option>
      ))}
    </select>
  );
}
