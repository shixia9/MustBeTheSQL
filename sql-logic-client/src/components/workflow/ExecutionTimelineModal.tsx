import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react';
import type { NodeExecutionEvent } from '../../types/flow';

interface TimelineEntry {
  nodeId: string;
  label: string;
  agentName: string;
  nodeType: string;
  status: 'running' | 'success' | 'fail';
  output?: string;
  error?: string;
  timestamp: number;
}

interface ExecutionTimelineModalProps {
  open: boolean;
  onClose: () => void;
  /** Callers push events here; the modal consumes and renders them as a timeline. */
  events: NodeExecutionEvent[];
  executing: boolean;
}

export default function ExecutionTimelineModal({ open, onClose, events, executing }: ExecutionTimelineModalProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Process events into timeline entries
  useEffect(() => {
    if (events.length === 0) return;
    setEntries(prev => {
      const existingIds = new Set(prev.map(e => e.nodeId + '_' + e.status));
      const newEntries: TimelineEntry[] = [...prev];

      for (const event of events) {
        if (event.type === 'WORKFLOW_COMPLETED' || event.type === 'ERROR') continue;
        const key = event.nodeId + '_' + (event.type === 'NODE_STARTED' ? 'running' : event.type === 'NODE_COMPLETED' ? 'success' : 'fail');
        if (existingIds.has(key)) continue;
        existingIds.add(key);

        if (event.type === 'NODE_STARTED') {
          newEntries.push({
            nodeId: event.nodeId!,
            label: event.label || event.agentName || event.nodeId!,
            agentName: event.agentName || '',
            nodeType: event.nodeType || 'agent',
            status: 'running',
            timestamp: Date.now(),
          });
        } else if (event.type === 'NODE_COMPLETED') {
          // Update the matching started entry
          const idx = newEntries.findIndex(
            e => e.nodeId === event.nodeId && e.status === 'running'
          );
          if (idx >= 0) {
            newEntries[idx] = {
              ...newEntries[idx],
              status: 'success',
              output: event.output || '',
            };
          } else {
            newEntries.push({
              nodeId: event.nodeId!,
              label: event.label || event.agentName || event.nodeId!,
              agentName: event.agentName || '',
              nodeType: event.nodeType || 'agent',
              status: 'success',
              output: event.output || '',
              timestamp: Date.now(),
            });
          }
        } else if (event.type === 'NODE_FAILED') {
          const idx = newEntries.findIndex(
            e => e.nodeId === event.nodeId && e.status === 'running'
          );
          if (idx >= 0) {
            newEntries[idx] = {
              ...newEntries[idx],
              status: 'fail',
              error: event.error || '',
            };
          } else {
            newEntries.push({
              nodeId: event.nodeId!,
              label: event.label || event.agentName || event.nodeId!,
              agentName: event.agentName || '',
              nodeType: event.nodeType || 'agent',
              status: 'fail',
              error: event.error || '',
              timestamp: Date.now(),
            });
          }
        }
      }
      return newEntries;
    });
  }, [events]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const formatOutput = (output: string | undefined): string => {
    if (!output) return '(empty)';
    try {
      const obj = JSON.parse(output);
      if (obj.content) return obj.content;
      if (obj.error) return `Error: ${obj.error}`;
      if (obj.actionOutput) return obj.actionOutput;
      return output;
    } catch {
      return output;
    }
  };

  const getNodeTypeBadge = (nodeType: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      start: { bg: 'rgba(59,140,94,0.12)', text: '#3b8c5e' },
      end: { bg: 'rgba(217,69,69,0.12)', text: '#d94545' },
      agent: { bg: 'rgba(91,127,217,0.12)', text: '#5b7fd9' },
      condition: { bg: 'rgba(240,160,64,0.12)', text: '#f0a040' },
      resource: { bg: 'rgba(77,201,246,0.12)', text: '#4dc9f6' },
    };
    const c = colors[nodeType] || colors.agent;
    return (
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
        background: c.bg, color: c.text, textTransform: 'uppercase',
        letterSpacing: '0.3px',
      }}>
        {nodeType}
      </span>
    );
  };

  if (!open) return null;

  const colorInk = 'var(--color-ink)';
  const colorInkSecondary = 'var(--color-ink-secondary)';
  const colorInkTertiary = 'var(--color-ink-tertiary)';
  const colorPanelBg = 'var(--color-panel-bg)';
  const colorAppBg = 'var(--color-app-bg)';
  const colorBorderSubtle = 'var(--color-border-subtle)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560, maxHeight: '85vh',
          background: colorPanelBg,
          border: `1px solid ${colorBorderSubtle}`,
          borderRadius: 14,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${colorBorderSubtle}`,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colorInk }}>Workflow Execution</div>
            <div style={{ fontSize: 11, color: colorInkTertiary, marginTop: 2 }}>
              {executing ? 'Running...' : entries.length > 0 ? `${entries.length} nodes executed` : 'Starting...'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: `1px solid ${colorBorderSubtle}`, borderRadius: 6,
            padding: '6px 10px', cursor: 'pointer', color: colorInkSecondary,
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
          }}>
            <X size={14} /> Close
          </button>
        </div>

        {/* Timeline */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {entries.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '40px 0', color: colorInkTertiary, fontSize: 12,
            }}>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
              Waiting for execution to start...
            </div>
          )}

          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1;
            const isExpanded = expandedNodes.has(entry.nodeId);
            const outputText = formatOutput(entry.output);
            const hasOutput = entry.output && outputText.length > 0;

            return (
              <div key={entry.nodeId + '_' + entry.status} style={{ position: 'relative', paddingLeft: 28 }}>
                {/* Timeline line */}
                {!isLast && (
                  <div style={{
                    position: 'absolute', left: 6, top: 26, bottom: -8,
                    width: 2, background: 'var(--color-border-subtle)',
                  }} />
                )}

                {/* Status dot */}
                <div style={{
                  position: 'absolute', left: 0, top: 8,
                  width: 14, height: 14, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${
                    entry.status === 'success' ? '#3b8c5e' :
                    entry.status === 'fail' ? '#d94545' : '#5b7fd9'
                  }`,
                  background: colorPanelBg,
                }}>
                  {entry.status === 'success' && <CheckCircle size={10} style={{ color: '#3b8c5e' }} />}
                  {entry.status === 'fail' && <XCircle size={10} style={{ color: '#d94545' }} />}
                  {entry.status === 'running' && (
                    <Loader size={9} style={{ color: '#5b7fd9', animation: 'spin 1s linear infinite' }} />
                  )}
                </div>

                {/* Card */}
                <div style={{
                  background: colorAppBg,
                  border: `1px solid ${colorBorderSubtle}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: isLast ? 0 : 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hasOutput ? 6 : 0 }}>
                    {getNodeTypeBadge(entry.nodeType)}
                    <span style={{ fontSize: 13, fontWeight: 600, color: colorInk }}>
                      {entry.label}
                    </span>
                    {entry.agentName && entry.agentName !== entry.label && (
                      <span style={{ fontSize: 10, color: colorInkTertiary }}>
                        {entry.agentName}
                      </span>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: colorInkTertiary }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Output (expandable) */}
                  {hasOutput && (
                    <>
                      <button
                        onClick={() => toggleExpand(entry.nodeId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600, color: colorInkSecondary,
                          padding: 0, marginTop: 4,
                        }}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {isExpanded ? 'Hide' : 'Show'} output
                      </button>
                      {isExpanded && (
                        <pre style={{
                          margin: '6px 0 0 0', padding: '8px 10px',
                          background: colorPanelBg,
                          border: `1px solid ${colorBorderSubtle}`,
                          borderRadius: 6,
                          fontSize: 11, lineHeight: 1.5,
                          color: colorInk,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 200,
                          overflowY: 'auto',
                          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                        }}>
                          {outputText}
                        </pre>
                      )}
                    </>
                  )}

                  {entry.status === 'fail' && entry.error && (
                    <div style={{
                      marginTop: 6, padding: '6px 10px',
                      background: 'rgba(217,69,69,0.08)',
                      border: '1px solid rgba(217,69,69,0.15)',
                      borderRadius: 6,
                      fontSize: 11, color: '#d94545',
                    }}>
                      {entry.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Completed indicator */}
          {!executing && entries.length > 0 && (
            <div style={{
              textAlign: 'center', padding: '12px 0 4px',
              fontSize: 11, fontWeight: 600,
              color: colorInkTertiary,
            }}>
              Execution complete
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
