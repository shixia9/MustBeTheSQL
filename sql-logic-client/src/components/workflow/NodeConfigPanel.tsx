import { useState } from 'react';
import type { Node } from '@xyflow/react';
import type { NodeTypeMeta } from '../../types/flow';

interface NodeConfigPanelProps {
  node: Node | null;
  nodeTypes: NodeTypeMeta[];
  onChange: (nodeId: string, data: Record<string, any>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ node, nodeTypes, onChange, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState<Record<string, any>>((node?.data as any) || {});

  if (!node) {
    return (
      <div
        className="config-panel-empty"
        style={{
          width: 240,
          flexShrink: 0,
          borderLeft: '0.5px solid var(--color-border-subtle)',
          background: 'var(--color-panel-bg)',
          padding: 16,
          fontSize: 11.5,
          color: 'var(--color-ink-tertiary)',
        }}
      >
        Select a node to configure
      </div>
    );
  }

  const d = node.data as any;
  const nodeType = d.nodeType || 'agent';
  const isAgent = nodeType === 'agent';
  const isCondition = nodeType === 'condition';
  const isResource = nodeType === 'resource';

  const availableAgents = nodeTypes.filter(n => n.category === 'agent');

  const handleChange = (key: string, value: any) => {
    const updated = { ...localData, [key]: value };
    setLocalData(updated);
  };

  const handleSave = () => {
    onChange(node.id, localData);
  };

  const hintStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--color-ink-tertiary)',
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  return (
    <div
      className="config-panel"
      style={{
        width: 240,
        flexShrink: 0,
        borderLeft: '0.5px solid var(--color-border-subtle)',
        background: 'var(--color-panel-bg)',
        padding: 16,
        overflowY: 'auto',
        fontSize: 12,
        color: 'var(--color-ink)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Node Config</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: 'var(--color-ink-tertiary)',
          }}
        >
          &times;
        </button>
      </div>

      {/* Node Type Info */}
      <div style={{ ...hintStyle, marginTop: 0 }}>Type</div>
      <div
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          background: 'var(--color-app-bg)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {nodeType.toUpperCase()}
      </div>

      {/* Title / Label */}
      <div style={hintStyle}>Label</div>
      <input
        value={localData.label || ''}
        onChange={e => handleChange('label', e.target.value)}
        placeholder={d.label || d.agentName || 'Node'}
        style={{
          width: '100%',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid var(--color-border-default)',
          fontSize: 12,
          background: 'var(--color-app-bg)',
          color: 'var(--color-ink)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Agent-specific config */}
      {isAgent && (
        <>
          <div style={hintStyle}>Agent</div>
          <select
            value={localData.agentName || d.agentName || ''}
            onChange={e => handleChange('agentName', e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-default)',
              fontSize: 12,
              background: 'var(--color-app-bg)',
              color: 'var(--color-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- Select Agent --</option>
            {availableAgents.map(a => (
              <option key={a.label} value={a.defaults?.agentName || a.label}>
                {a.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 10, color: 'var(--color-ink-tertiary)', marginTop: 4 }}>
            {availableAgents.find(a => (a.defaults?.agentName || a.label) === (localData.agentName || d.agentName))?.description || ''}
          </div>
        </>
      )}

      {/* Condition-specific config */}
      {isCondition && (
        <>
          <div style={hintStyle}>Condition Field</div>
          <input
            value={localData.inputsValues?.conditionField || d.inputsValues?.conditionField || 'nextNode'}
            onChange={e => handleChange('inputsValues', { ...(localData.inputsValues || d.inputsValues || {}), conditionField: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-default)',
              fontSize: 12,
              background: 'var(--color-app-bg)',
              color: 'var(--color-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={hintStyle}>Branches (comma-separated)</div>
          <input
            value={((localData.inputsValues || d.inputsValues)?.branches || ['true', 'false']).join(',')}
            onChange={e => handleChange('inputsValues', {
              ...(localData.inputsValues || d.inputsValues || {}),
              branches: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
            })}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-default)',
              fontSize: 12,
              background: 'var(--color-app-bg)',
              color: 'var(--color-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </>
      )}

      {/* Resource-specific config */}
      {isResource && (
        <>
          <div style={hintStyle}>Resource Type</div>
          <select
            value={localData.agentName || d.agentName || 'DatabaseResource'}
            onChange={e => handleChange('agentName', e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-default)',
              fontSize: 12,
              background: 'var(--color-app-bg)',
              color: 'var(--color-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            {nodeTypes.filter(n => n.category === 'resource').map(r => (
              <option key={r.label} value={r.defaults?.agentName || r.label}>
                {r.label}
              </option>
            ))}
          </select>
          <div style={hintStyle}>Connection ID</div>
          <input
            value={(localData.inputsValues || d.inputsValues)?.connectionId || ''}
            onChange={e => handleChange('inputsValues', {
              ...(localData.inputsValues || d.inputsValues || {}),
              connectionId: e.target.value,
            })}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-default)',
              fontSize: 12,
              background: 'var(--color-app-bg)',
              color: 'var(--color-ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </>
      )}

      <button
        onClick={handleSave}
        style={{
          width: '100%',
          marginTop: 16,
          padding: '8px 0',
          borderRadius: 6,
          border: 'none',
          background: 'var(--color-primary)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Apply Changes
      </button>
    </div>
  );
}
