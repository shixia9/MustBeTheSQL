import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeExecStatus } from '../../../types/flow';

interface ResourceNodeData {
  label: string;
  nodeType: string;
  inputsValues: Record<string, any>;
  execStatus?: NodeExecStatus;
}

export default function ResourceNode({ data, selected }: NodeProps) {
  const d = data as unknown as ResourceNodeData;

  return (
    <div
      style={{
        background: '#f0fafc',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: selected ? '#4dc9f6' : 'rgba(77,201,246,0.35)',
      }}
    >
      <Handle type="source" position={Position.Right} style={{ background: '#4dc9f6', width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 14 }}>&#x1F4E6;</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{d.label || 'Resource'}</div>
          <div style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--color-ink-tertiary)', marginTop: 1 }}>
            Resource
          </div>
        </div>
      </div>
      {d.inputsValues && Object.keys(d.inputsValues).length > 0 && (
        <div style={{ marginTop: 6, fontSize: 9.5, color: 'var(--color-ink-tertiary)' }}>
          {Object.entries(d.inputsValues).filter(([k]) => k !== 'branches').map(([k, v]) => (
            <div key={k}>{k}: {String(v).substring(0, 30)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
