import { Handle, Position, type NodeProps } from '@xyflow/react';

export default function StartNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div
      style={{
        background: '#f0faf4',
        border: `2px solid ${selected ? '#3b8c5e' : '#3b8c5e'}`,
        borderRadius: 24,
        padding: '10px 28px',
        fontSize: 13,
        fontWeight: 700,
        color: '#2d6a4a',
        boxShadow: selected
          ? '0 0 0 2px rgba(59,140,94,0.25)'
          : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <Handle type="source" position={Position.Right} style={{ background: '#3b8c5e', width: 9, height: 9 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>&#x25B6;</span>
        {d.label || 'Start'}
      </div>
    </div>
  );
}
