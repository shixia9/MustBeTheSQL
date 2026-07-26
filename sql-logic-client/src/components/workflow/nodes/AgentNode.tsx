import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeExecStatus } from '../../../types/flow';

interface AgentNodeData {
  label: string;
  nodeType: string;
  agentName: string;
  inputsValues: Record<string, any>;
  execStatus?: NodeExecStatus;
}

export default function AgentNode({ data, selected }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const status = d.execStatus || 'idle';

  const statusColors: Record<NodeExecStatus, string> = {
    idle: '#c0c6d1',
    running: '#5b9bd5',
    success: '#3b8c5e',
    fail: '#d94545',
  };

  return (
    <div
      className="agent-node"
      style={{
        background: '#f8faff',
        border: `2px solid ${selected ? '#5b7fd9' : statusColors[status]}`,
        borderRadius: 10,
        padding: '12px 16px',
        minWidth: 180,
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--color-ink)',
        boxShadow: selected
          ? '0 0 0 2px rgba(91,127,217,0.25)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'border-color 0.3s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#5b7fd9', width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: statusColors[status],
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{d.label || d.agentName || 'Agent'}</div>
          {d.agentName && d.agentName !== d.label && (
            <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-ink-tertiary)', marginTop: 2 }}>
              {d.agentName}
            </div>
          )}
        </div>
      </div>
      {d.inputsValues && Object.keys(d.inputsValues).length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--color-ink-tertiary)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 6 }}>
          {Object.entries(d.inputsValues).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontWeight: 500 }}>{k}:</span>
              <span>{String(v).substring(0, 40)}</span>
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#5b7fd9', width: 8, height: 8 }} />
    </div>
  );
}
