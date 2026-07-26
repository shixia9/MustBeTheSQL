import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, Connection,
  type Node, type Edge, MarkerType, BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Save, Play, FolderOpen, Download, Trash2, Loader } from 'lucide-react';
import { workflowApi } from '../api/client';
import type { FlowDocumentJSON, NodeTypeMeta, FlowNodeJSON } from '../types/flow';

let idCounter = 0;
function uid() { return `${Date.now()}_${++idCounter}`; }

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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    workflowApi.listNodes().then(r => { if (r.data) setNodeTypes(r.data); }).catch(() => {});
    workflowApi.list().then(r => { if (r.data) setSavedList(r.data); }).catch(() => {});
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/reactflow-type');
      const label = e.dataTransfer.getData('application/reactflow-label');
      const agentName = e.dataTransfer.getData('application/reactflow-agentName');
      if (!type) return;
      const pos = { x: e.clientX - 300, y: e.clientY - 150 };
      const newNode: Node = {
        id: uid(), type: 'default', position: pos,
        data: { label: label || type, nodeType: type, agentName: agentName || '', inputsValues: {} },
        style: nodeStyle(type),
      };
      setNodes(nds => [...nds, newNode]);
    },
    [setNodes]
  );

  function nodeStyle(type: string): React.CSSProperties {
    if (type === 'start') return { background: '#f0faf4', border: '2px solid #3b8c5e', borderRadius: 24, padding: '10px 24px', fontSize: 12.5, fontWeight: 600 };
    if (type === 'end') return { background: '#fef2f2', border: '2px solid #d94545', borderRadius: 24, padding: '10px 24px', fontSize: 12.5, fontWeight: 600 };
    if (type === 'condition') return { background: '#fff8ed', border: '2px solid #f0a040', borderRadius: 8, padding: 12, width: 180, fontSize: 12.5, fontWeight: 600 };
    if (type === 'resource') return { background: '#f0fafc', border: '2px solid #4dc9f6', borderRadius: 8, padding: 12, width: 180, fontSize: 12.5, fontWeight: 600 };
    return { background: '#f8faff', border: '2px solid #5b7fd9', borderRadius: 8, padding: 12, width: 180, fontSize: 12.5, fontWeight: 600 };
  }

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

  const handleSave = async () => {
    const doc = buildDocument();
    try {
      if (workflowId) { await workflowApi.update(workflowId, doc); }
      else { const r = await workflowApi.create(doc); if (r.data?.id) setWorkflowId(r.data.id); }
      setShowSaveModal(false);
      workflowApi.list().then(r => { if (r.data) setSavedList(r.data); }).catch(() => {});
    } catch (e) { console.error('Save failed', e); }
  };

  const handleLoad = async (id: string) => {
    try {
      const r = await workflowApi.get(id);
      const doc: FlowDocumentJSON = r.data;
      setWorkflowId(id);
      setWorkflowName(doc.name || 'Untitled');
      setNodes(doc.nodes.map(n => ({
        id: n.id, type: 'default', position: n.position,
        data: { label: n.data.title || n.data.agentName || n.type, nodeType: n.type, agentName: n.data.agentName || '', inputsValues: n.data.inputsValues || {} },
        style: nodeStyle(n.type),
      })));
      setEdges(doc.edges.map(e => ({
        id: `${e.sourceNodeId}-${e.targetNodeId}`,
        source: e.sourceNodeId, target: e.targetNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
      })));
      setShowLoadModal(false);
    } catch (e) { console.error('Load failed', e); }
  };

  const handleDelete = async () => {
    if (!workflowId) return;
    await workflowApi.delete(workflowId);
    setWorkflowId(null); setNodes([]); setEdges([]);
    setWorkflowName('Untitled Workflow');
    workflowApi.list().then(r => { if (r.data) setSavedList(r.data); }).catch(() => {});
  };

  const handleExecute = async () => {
    if (!workflowId) { await handleSave(); return; }
    if (!runPrompt.trim()) { setShowRunModal(true); return; }
    setExecuting(true); setShowRunModal(false);
    try {
      await workflowApi.execute(workflowId, { userInput: runPrompt.trim() });
      setRunPrompt('');
    } finally { setExecuting(false); }
  };

  const handleRunClick = () => {
    if (!workflowId) { handleSave().then(() => setShowRunModal(true)); return; }
    setShowRunModal(true);
  };

  const addStartEnd = () => {
    const existingStart = nodes.find(n => (n.data as any)?.nodeType === 'start');
    const existingEnd = nodes.find(n => (n.data as any)?.nodeType === 'end');
    const newNodes: Node[] = [];
    if (!existingStart) newNodes.push({ id: uid(), type: 'default', position: { x: 100, y: 250 }, data: { label: 'Start', nodeType: 'start', inputsValues: {} }, style: nodeStyle('start') });
    if (!existingEnd) newNodes.push({ id: uid(), type: 'default', position: { x: 600, y: 250 }, data: { label: 'End', nodeType: 'end', inputsValues: {} }, style: nodeStyle('end') });
    if (newNodes.length) setNodes(nds => [...nds, ...newNodes]);
  };

  const exportJson = () => {
    const doc = buildDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${workflowName.replace(/\s+/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const isSmallText = { fontSize: '11px', fontWeight: 600 } as const;
  const pillBtn = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--color-primary-soft)' : 'transparent',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-border-subtle)',
  });

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
            <button onClick={handleExecute} disabled={executing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, background: '#3b8c5e', color: '#fff' }}>
              {executing ? <Loader size={14} className="animate-spin" /> : <Play size={14} />} Run
            </button>
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ ...isSmallText, color: '#d94545', border: '1px solid rgba(217,69,69,0.19)' }}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Node types */}
        <div className="w-[220px] flex-shrink-0 overflow-y-auto p-3"
          style={{ borderRight: '0.5px solid var(--color-border-subtle)', background: 'var(--color-panel-bg)' }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-tertiary)' }}>Agent Nodes</div>
          {nodeTypes.filter(n => n.category === 'agent').map(nt => (
            <div key={nt.label} draggable
              onDragStart={e => { e.dataTransfer.setData('application/reactflow-type', nt.type); e.dataTransfer.setData('application/reactflow-label', nt.label); e.dataTransfer.setData('application/reactflow-agentName', nt.defaults?.agentName || ''); }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-md cursor-grab"
              style={{ background: '#f8faff', border: '1px solid rgba(91,127,217,0.19)', fontSize: '12.5px', color: 'var(--color-ink)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#5b7fd9' }} />
              {nt.label}
            </div>
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3 mt-4" style={{ color: 'var(--color-ink-tertiary)' }}>Flow Control</div>
          {nodeTypes.filter(n => n.category === 'flow').map(nt => (
            <div key={nt.label} draggable
              onDragStart={e => { e.dataTransfer.setData('application/reactflow-type', nt.type); e.dataTransfer.setData('application/reactflow-label', nt.label); }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-md cursor-grab"
              style={{
                background: nt.type === 'start' ? '#f0faf4' : nt.type === 'end' ? '#fef2f2' : '#fff8ed',
                border: `1px solid ${nt.type === 'start' ? 'rgba(59,140,94,0.19)' : nt.type === 'end' ? 'rgba(217,69,69,0.19)' : 'rgba(240,160,64,0.19)'}`,
                fontSize: '12.5px', color: 'var(--color-ink)',
              }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: nt.type === 'start' ? '#3b8c5e' : nt.type === 'end' ? '#d94545' : '#f0a040' }} />
              {nt.label}
            </div>
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3 mt-4" style={{ color: 'var(--color-ink-tertiary)' }}>Resources</div>
          {nodeTypes.filter(n => n.category === 'resource').map(nt => (
            <div key={nt.label} draggable
              onDragStart={e => { e.dataTransfer.setData('application/reactflow-type', nt.type); e.dataTransfer.setData('application/reactflow-label', nt.label); }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-md cursor-grab"
              style={{ background: '#f0fafc', border: '1px solid rgba(77,201,246,0.19)', fontSize: '12.5px', color: 'var(--color-ink)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4dc9f6' }} />
              {nt.label}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver} onDrop={onDrop}
            fitView
            style={{ width: '100%', height: '100%', background: 'var(--color-app-bg)' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d0d3dc" />
            <Controls />
            <MiniMap
              style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}
              nodeColor={n => (n.data as any)?.nodeType === 'start' ? '#3b8c5e' : (n.data as any)?.nodeType === 'end' ? '#d94545' : (n.data as any)?.nodeType === 'condition' ? '#f0a040' : '#5b7fd9'}
            />
          </ReactFlow>
        </div>
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
    </div>
  );
}
