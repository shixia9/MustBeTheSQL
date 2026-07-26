import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, Connection,
  type Node, type Edge, MarkerType, BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Save, Play, FolderOpen, Download, Trash2, Loader, X } from 'lucide-react';
import { workflowApi } from '../api/client';
import type {
  FlowDocumentJSON, NodeTypeMeta, FlowNodeJSON,
  NodeExecutionEvent, NodeExecStatus, NodeStatusMap,
} from '../types/flow';
import AgentNode from '../components/workflow/nodes/AgentNode';
import ConditionNode from '../components/workflow/nodes/ConditionNode';
import ResourceNode from '../components/workflow/nodes/ResourceNode';
import StartNode from '../components/workflow/nodes/StartNode';
import EndNode from '../components/workflow/nodes/EndNode';
import NodeConfigPanel from '../components/workflow/NodeConfigPanel';

// Custom node type registry — maps FlowNode.type to React Flow component
const customNodeTypes = {
  agentNode: AgentNode,
  conditionNode: ConditionNode,
  resourceNode: ResourceNode,
  startNode: StartNode,
  endNode: EndNode,
};

/** Map the workflow node type string to the React Flow custom node type name. */
function reactFlowType(nodeType: string): string {
  switch (nodeType) {
    case 'start': return 'startNode';
    case 'end': return 'endNode';
    case 'agent': return 'agentNode';
    case 'condition': return 'conditionNode';
    case 'resource': return 'resourceNode';
    default: return 'agentNode';
  }
}

let idCounter = 0;
function uid() { return `${Date.now()}_${++idCounter}`; }

/** MiniMap color coding by node type */
function miniMapColor(node: Node): string {
  const t = (node.data as any)?.nodeType;
  if (t === 'start') return '#3b8c5e';
  if (t === 'end') return '#d94545';
  if (t === 'condition') return '#f0a040';
  if (t === 'resource') return '#4dc9f6';
  return '#5b7fd9';
}

export default function FlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}

function FlowEditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeTypeMeta[]>([]);
  const [savedList, setSavedList] = useState<{ id: string; name: string }[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [runPrompt, setRunPrompt] = useState('');
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatusMap>({});
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load node types and saved workflows
  useEffect(() => {
    workflowApi.listNodes().then(types => {
      if (Array.isArray(types)) setNodeTypes(types);
    }).catch(() => {});
    workflowApi.list().then(list => {
      if (Array.isArray(list)) setSavedList(list);
    }).catch(() => {});
  }, []);

  // --- Connection ---
  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  // --- Drag & Drop ---
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow-type');
      const label = e.dataTransfer.getData('application/reactflow-label');
      const agentName = e.dataTransfer.getData('application/reactflow-agentName');
      if (!type) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const pos = bounds
        ? { x: e.clientX - bounds.left - 90, y: e.clientY - bounds.top - 25 }
        : { x: e.clientX - 300, y: e.clientY - 150 };

      const rfType = reactFlowType(type);
      const newNode: Node = {
        id: uid(),
        type: rfType,
        position: pos,
        data: {
          label: label || type,
          nodeType: type,
          agentName: agentName || '',
          inputsValues: {},
          execStatus: 'idle' as NodeExecStatus,
        },
      };
      setNodes(nds => [...nds, newNode]);
    },
    [setNodes]
  );

  // --- Serialization ---
  const buildDocument = useCallback((): FlowDocumentJSON => ({
    version: '1.0',
    name: workflowName,
    nodes: nodes.map(n => {
      const d = n.data as any;
      return {
        id: n.id,
        type: (d.nodeType || 'agent') as FlowNodeJSON['type'],
        position: n.position,
        data: { title: String(d.label || ''), agentName: String(d.agentName || ''), inputsValues: (d.inputsValues || {}) },
      };
    }),
    edges: edges.map(e => ({ sourceNodeId: e.source, targetNodeId: e.target })),
    variables: [],
  }), [nodes, edges, workflowName]);

  // --- Save ---
  const handleSave = async () => {
    try {
      if (workflowId) {
        await workflowApi.update(workflowId, buildDocument());
      } else {
        const r = await workflowApi.create(buildDocument());
        if (r?.id) setWorkflowId(r.id);
      }
      setShowSaveModal(false);
      workflowApi.list().then(list => { if (Array.isArray(list)) setSavedList(list); }).catch(() => {});
    } catch (e) { console.error('Save failed', e); }
  };

  // --- Load ---
  const handleLoad = async (id: string) => {
    try {
      const doc = await workflowApi.get(id) as FlowDocumentJSON;
      if (!doc || !doc.nodes) return;
      setWorkflowId(id);
      setWorkflowName(doc.name || 'Untitled');
      setNodes(doc.nodes.map(n => ({
        id: n.id,
        type: reactFlowType(n.type),
        position: n.position,
        data: {
          label: n.data.title || n.data.agentName || n.type,
          nodeType: n.type,
          agentName: n.data.agentName || '',
          inputsValues: n.data.inputsValues || {},
          execStatus: 'idle' as NodeExecStatus,
        },
      })));
      setEdges(doc.edges.map(e => ({
        id: `${e.sourceNodeId}-${e.targetNodeId}`,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
      })));
      setShowLoadModal(false);
    } catch (e) { console.error('Load failed', e); }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!workflowId) return;
    await workflowApi.delete(workflowId);
    setWorkflowId(null); setNodes([]); setEdges([]);
    setWorkflowName('Untitled Workflow');
    workflowApi.list().then(list => { if (Array.isArray(list)) setSavedList(list); }).catch(() => {});
  };

  // --- Execute with SSE streaming ---
  const handleExecute = async () => {
    if (!workflowId) {
      await handleSave();
      // Re-check after save
      return;
    }
    if (!runPrompt.trim()) { setShowRunModal(true); return; }
    setExecuting(true);
    setShowRunModal(false);
    setExecutionOutput([]);
    setShowOutputPanel(true);
    setNodeStatuses({});

    try {
      const stream = await workflowApi.executeStream(workflowId, {
        userInput: runPrompt.trim(),
      });
      if (!stream) throw new Error('No response stream');

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: NodeExecutionEvent = JSON.parse(line.slice(6));
              handleExecutionEvent(event);
            } catch {
              // Non-JSON line, append to output
              setExecutionOutput(prev => [...prev, line]);
            }
          }
        }
      }
      setRunPrompt('');
    } catch (e: any) {
      console.error('Execution failed', e);
      setExecutionOutput(prev => [...prev, `ERROR: ${e.message}`]);
    } finally {
      setExecuting(false);
    }
  };

  const handleExecutionEvent = (event: NodeExecutionEvent) => {
    switch (event.type) {
      case 'NODE_STARTED':
        if (event.nodeId) {
          setNodeStatuses(prev => ({ ...prev, [event.nodeId]: 'running' }));
          // Also update the node data
          setNodes(nds => nds.map(n =>
            n.id === event.nodeId
              ? { ...n, data: { ...n.data, execStatus: 'running' as NodeExecStatus } }
              : n
          ));
        }
        break;
      case 'NODE_COMPLETED':
        if (event.nodeId) {
          setNodeStatuses(prev => ({ ...prev, [event.nodeId]: 'success' }));
          setNodes(nds => nds.map(n =>
            n.id === event.nodeId
              ? { ...n, data: { ...n.data, execStatus: 'success' as NodeExecStatus } }
              : n
          ));
          setExecutionOutput(prev => [...prev,
            `[${event.label || event.agentName || event.nodeId}] ${truncateOutput(event.output || '')}`,
          ]);
        }
        break;
      case 'NODE_FAILED':
        if (event.nodeId) {
          setNodeStatuses(prev => ({ ...prev, [event.nodeId]: 'fail' }));
          setNodes(nds => nds.map(n =>
            n.id === event.nodeId
              ? { ...n, data: { ...n.data, execStatus: 'fail' as NodeExecStatus } }
              : n
          ));
          setExecutionOutput(prev => [...prev, `[FAILED] ${event.label || event.nodeId}: ${event.error || ''}`]);
        }
        break;
      case 'WORKFLOW_COMPLETED':
        setExecutionOutput(prev => [...prev, '--- WORKFLOW COMPLETED ---']);
        break;
      case 'ERROR':
        setExecutionOutput(prev => [...prev, `ERROR: ${event.message || 'Unknown error'}`]);
        break;
    }
  };

  // --- Run button ---
  const handleRunClick = () => {
    if (!workflowId) { handleSave().then(() => setShowRunModal(true)); return; }
    setShowRunModal(true);
  };

  // --- Add Start/End nodes ---
  const addStartEnd = () => {
    const existingStart = nodes.find(n => (n.data as any)?.nodeType === 'start');
    const existingEnd = nodes.find(n => (n.data as any)?.nodeType === 'end');
    const newNodes: Node[] = [];
    if (!existingStart) {
      newNodes.push({
        id: uid(), type: 'startNode',
        position: { x: 100, y: 250 },
        data: { label: 'Start', nodeType: 'start', inputsValues: {}, execStatus: 'idle' as NodeExecStatus },
      });
    }
    if (!existingEnd) {
      newNodes.push({
        id: uid(), type: 'endNode',
        position: { x: 600, y: 250 },
        data: { label: 'End', nodeType: 'end', inputsValues: {}, execStatus: 'idle' as NodeExecStatus },
      });
    }
    if (newNodes.length) setNodes(nds => [...nds, ...newNodes]);
  };

  // --- Node config update ---
  const handleConfigChange = (nodeId: string, data: Record<string, any>) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
    ));
  };

  // --- Export ---
  const exportJson = () => {
    const doc = buildDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${workflowName.replace(/\s+/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null;

  const isSmallText = { fontSize: '11px', fontWeight: 600 } as const;

  // --- Render ---
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 44px - 11px)', background: 'var(--color-app-bg)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '0.5px solid var(--color-border-subtle)', background: 'var(--color-panel-bg)' }}>
        <input
          value={workflowName}
          onChange={e => setWorkflowName(e.target.value)}
          className="bg-transparent text-[13px] font-semibold outline-none"
          style={{ color: 'var(--color-ink)', width: 200 }}
          placeholder="Untitled Workflow"
        />
        <div className="flex-1" />
        <button onClick={addStartEnd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', border: '1px solid var(--color-primary)' }}>
          <Plus size={14} /> Start/End
        </button>
        <button onClick={() => setShowLoadModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, color: 'var(--color-ink-secondary)', border: '1px solid var(--color-border-default)' }}>
          <FolderOpen size={14} /> Load
        </button>
        <button onClick={() => setShowSaveModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, background: 'var(--color-primary)', color: '#fff' }}>
          <Save size={14} /> Save
        </button>
        <button onClick={exportJson} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, color: 'var(--color-ink-secondary)', border: '1px solid var(--color-border-default)' }}>
          <Download size={14} /> Export
        </button>
        {workflowId && (
          <>
            <button onClick={handleRunClick} disabled={executing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, background: executing ? '#999' : '#3b8c5e', color: '#fff' }}>
              {executing ? <Loader size={14} className="animate-spin" /> : <Play size={14} />} Run
            </button>
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, color: '#d94545', border: '1px solid rgba(217,69,69,0.19)' }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
        {showOutputPanel && (
          <button onClick={() => setShowOutputPanel(false)} className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ ...isSmallText, color: 'var(--color-ink-tertiary)', border: '1px solid var(--color-border-subtle)' }}>
            <X size={12} />
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Node palette */}
        <div className="w-[220px] flex-shrink-0 overflow-y-auto p-3"
          style={{ borderRight: '0.5px solid var(--color-border-subtle)', background: 'var(--color-panel-bg)' }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-tertiary)' }}>Agent Nodes</div>
          {nodeTypes.filter(n => n.category === 'agent').map(nt => (
            <div key={nt.label} draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow-type', nt.type);
                e.dataTransfer.setData('application/reactflow-label', nt.label);
                e.dataTransfer.setData('application/reactflow-agentName', nt.defaults?.agentName || '');
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-md cursor-grab"
              style={{ background: '#f8faff', border: '1px solid rgba(91,127,217,0.19)', fontSize: '12.5px', color: 'var(--color-ink)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#5b7fd9' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{nt.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-ink-tertiary)' }}>{nt.description?.substring(0, 40)}</div>
              </div>
            </div>
          ))}
          {nodeTypes.filter(n => n.category === 'agent').length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-ink-tertiary)', padding: '8px 0' }}>Loading agents...</div>
          )}

          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3 mt-4" style={{ color: 'var(--color-ink-tertiary)' }}>Flow Control</div>
          {nodeTypes.filter(n => n.category === 'flow').map(nt => (
            <div key={nt.label} draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow-type', nt.type);
                e.dataTransfer.setData('application/reactflow-label', nt.label);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-md cursor-grab"
              style={{
                background: nt.type === 'start' ? '#f0faf4' : nt.type === 'end' ? '#fef2f2' : '#fff8ed',
                border: `1px solid ${nt.type === 'start' ? 'rgba(59,140,94,0.25)' : nt.type === 'end' ? 'rgba(217,69,69,0.25)' : 'rgba(240,160,64,0.25)'}`,
                fontSize: '12.5px', color: 'var(--color-ink)',
              }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: nt.type === 'start' ? '#3b8c5e' : nt.type === 'end' ? '#d94545' : '#f0a040' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{nt.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-ink-tertiary)' }}>{nt.description?.substring(0, 40)}</div>
              </div>
            </div>
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3 mt-4" style={{ color: 'var(--color-ink-tertiary)' }}>Resources</div>
          {nodeTypes.filter(n => n.category === 'resource').map(nt => (
            <div key={nt.label} draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow-type', nt.type);
                e.dataTransfer.setData('application/reactflow-label', nt.label);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-md cursor-grab"
              style={{ background: '#f0fafc', border: '1px solid rgba(77,201,246,0.25)', fontSize: '12.5px', color: 'var(--color-ink)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4dc9f6' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{nt.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-ink-tertiary)' }}>{nt.description?.substring(0, 40)}</div>
              </div>
            </div>
          ))}
            {nodeTypes.filter(n => n.category === 'resource').length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-ink-tertiary)', padding: '8px 0' }}>Loading resources...</div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={customNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={(_, n) => setSelectedNodeId(n.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            style={{ width: '100%', height: '100%', background: 'var(--color-app-bg)' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d0d3dc" />
            <Controls />
            <MiniMap
              style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}
              nodeColor={miniMapColor}
            />
          </ReactFlow>
        </div>

        {/* Right sidebar — Node Config Panel */}
        <NodeConfigPanel
          node={selectedNode || null}
          nodeTypes={nodeTypes}
          onChange={handleConfigChange}
          onClose={() => setSelectedNodeId(null)}
        />

        {/* Execution output panel (overlay at bottom) */}
        {showOutputPanel && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 240,
              left: 220,
              height: 180,
              background: '#1a1a2e',
              borderTop: '1px solid var(--color-border-default)',
              color: '#e0e0e0',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: 10,
              overflowY: 'auto',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#4dc9f6', fontSize: 11 }}>
              Execution Output
              <span style={{ float: 'right', cursor: 'pointer', color: '#888' }} onClick={() => { setShowOutputPanel(false); setExecutionOutput([]); }}>&#x2715;</span>
            </div>
            {executionOutput.map((line, i) => (
              <div key={i} style={{ padding: '1px 0', whiteSpace: 'pre-wrap' }}>{line}</div>
            ))}
            {executionOutput.length === 0 && (
              <div style={{ color: '#666' }}>Waiting for execution events...</div>
            )}
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowSaveModal(false)}>
          <div className="rounded-xl p-6 w-[400px]" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-default)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Save Workflow</h3>
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-ink-tertiary)' }}>Name</label>
            <input value={workflowName} onChange={e => setWorkflowName(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none mb-4"
              style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-md text-[12px] font-semibold"
                style={{ color: 'var(--color-ink-secondary)', border: '1px solid var(--color-border-default)' }}>Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-md text-[12px] font-semibold"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowLoadModal(false)}>
          <div className="rounded-xl p-6 w-[400px] max-h-[500px] overflow-y-auto" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-default)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Load Workflow</h3>
            {savedList.length === 0 && <p className="text-[12px]" style={{ color: 'var(--color-ink-tertiary)' }}>No saved workflows</p>}
            {savedList.map(w => (
              <div key={w.id} onClick={() => handleLoad(w.id)}
                className="flex items-center justify-between px-3 py-2 mb-1 rounded-md cursor-pointer"
                style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-subtle)' }}>
                <span className="text-[13px] font-medium" style={{ color: 'var(--color-ink)' }}>{w.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>{w.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowRunModal(false)}>
          <div className="rounded-xl p-6 w-[450px]" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-default)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Run Workflow</h3>
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-ink-tertiary)' }}>Enter your input / question:</label>
            <textarea
              value={runPrompt}
              onChange={e => setRunPrompt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none mb-4 resize-none"
              style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }}
              placeholder="e.g. Show me the top 10 customers by revenue"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleExecute(); } }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRunModal(false)} className="px-4 py-2 rounded-md text-[12px] font-semibold"
                style={{ color: 'var(--color-ink-secondary)', border: '1px solid var(--color-border-default)' }}>Cancel</button>
              <button onClick={handleExecute} className="px-4 py-2 rounded-md text-[12px] font-semibold"
                style={{ background: '#3b8c5e', color: '#fff' }}>Execute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function truncateOutput(output: string, maxLen = 200): string {
  if (!output) return '(empty)';
  try {
    const obj = JSON.parse(output);
    if (obj.content) return obj.content.substring(0, maxLen);
    if (obj.error) return `Error: ${obj.error}`;
    return output.substring(0, maxLen);
  } catch {
    return output.substring(0, maxLen);
  }
}
