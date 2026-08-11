import { Handle, Position, type NodeProps } from '@xyflow/react';

export default function EndNode({ data, selected }: NodeProps) {
  const d = data as any;
  return (
    <div
      style={{
        background: '#fef2f2',
        border: `2px solid ${selected ? '#d94545' : '#d94545'}`,
        borderRadius: 24,
        padding: '10px 28px',
        fontSize: 13,
        fontWeight: 700,
        color: '#a83838',
        boxShadow: selected
          ? '0 0 0 2px rgba(217,69,69,0.25)'
          : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#d94545', width: 9, height: 9 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>&#x25A0;</span>
        {d.label || 'End'}
      </div>
    </div>
  );
}
