import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeExecStatus } from '../../../types/flow';

interface ConditionNodeData {
  label: string;
  nodeType: string;
  inputsValues: Record<string, any>;
  execStatus?: NodeExecStatus;
}

export default function ConditionNode({ data, selected }: NodeProps) {
  const d = data as unknown as ConditionNodeData;
  const status = d.execStatus || 'idle';
  const branches: string[] = d.inputsValues?.branches || ['true', 'false'];

  return (
    <div
      style={{
        background: '#fff8ed',
        border: `2px solid ${selected ? '#f0a040' : '#f0a040'}`,
        borderRadius: 8,
        padding: '10px 18px',
        minWidth: 140,
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--color-ink)',
        textAlign: 'center',
        boxShadow: selected
          ? '0 0 0 2px rgba(240,160,64,0.25)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#f0a040', width: 8, height: 8 }} />
      <div style={{ marginBottom: 4 }}>&#x25C6;</div>
      <div>{d.label || 'Condition'}</div>
      {branches.map((branch, i) => (
        <Handle
          key={branch}
          type="source"
          position={Position.Right}
          id={branch}
          style={{
            background: '#f0a040',
            width: 7,
            height: 7,
            top: `${30 + i * 25}%`,
          }}
        />
      ))}
    </div>
  );
}
