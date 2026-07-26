import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { workflowApi } from '../api/client';

export default function AppBuilderConfig() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const AGENT_LIST = ['ManagerAgent', 'PlannerAgent', 'DataScientistAgent', 'CodeAssistantAgent', 'DashboardAssistantAgent', 'ToolAssistantAgent'];

  useEffect(() => {
    if (!appId) return;
    api.get<any>(`/apps/${appId}`).then(r => {
      if (r.data) {
        setApp(r.data);
        if (r.data.teamContext) {
          try { const ctx = JSON.parse(r.data.teamContext); setSelectedFlowId(ctx.flowId || ''); } catch {}
        }
        if (r.data.agentDetails) {
          try { setSelectedAgents(JSON.parse(r.data.agentDetails).map((a: any) => a.agentName)); } catch {}
        }
      }
    }).catch(() => {});
    workflowApi.list().then(r => { if (Array.isArray(r)) setWorkflows(r); }).catch(() => {});
  }, [appId]);

  const save = async () => {
    const teamContext = app?.teamMode === 'awel_layout' ? JSON.stringify({ flowId: selectedFlowId }) : null;
    const agentDetails = (app?.teamMode === 'single_agent' || app?.teamMode === 'auto_plan')
      ? JSON.stringify(selectedAgents.map(a => ({ agentName: a, llmStrategy: 'default' }))) : null;
    await api.put(`/apps/${appId}`, { teamContext, agentDetails });
    navigate('/app-builder');
  };

  if (!app) return <div className="p-6" style={{ color: 'var(--color-ink-tertiary)' }}>Loading...</div>;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-app-bg)' }}>
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0" style={{ borderBottom: '0.5px solid var(--color-border-subtle)', background: 'var(--color-panel-bg)' }}>
        <button onClick={() => navigate('/app-builder')} className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1" />
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--color-ink)' }}>Configure: {app.name}</h2>
        <div className="flex-1" />
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
          {app.teamMode === 'single_agent' ? 'Single Agent' : app.teamMode === 'auto_plan' ? 'Auto Plan' : 'AWEL Flow'}
        </span>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold"
          style={{ background: 'var(--color-primary)', color: '#fff' }}><Save size={14} /> Save</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[700px] mx-auto space-y-6">
          {app.teamMode === 'awel_layout' ? (
            <section className="rounded-xl p-5" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>Bind AWEL Flow</h3>
              <select value={selectedFlowId} onChange={e => setSelectedFlowId(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }}>
                <option value="">-- Select a workflow --</option>
                {workflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                ))}
              </select>
              {selectedFlowId && (
                <p className="text-[11px] mt-2" style={{ color: 'var(--color-ink-tertiary)' }}>
                  The selected workflow will be the runtime for this app. Every chat message will go through the workflow DAG.
                </p>
              )}
            </section>
          ) : (
            <section className="rounded-xl p-5" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>Select Agents</h3>
              <div className="grid grid-cols-2 gap-2">
                {AGENT_LIST.map(a => (
                  <label key={a} className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer"
                    style={{ background: selectedAgents.includes(a) ? 'var(--color-primary-soft)' : 'var(--color-app-bg)', border: '1px solid var(--color-border-subtle)' }}>
                    <input type="checkbox" checked={selectedAgents.includes(a)} onChange={e => {
                      setSelectedAgents(e.target.checked ? [...selectedAgents, a] : selectedAgents.filter(x => x !== a));
                    }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--color-ink)' }}>{a}</span>
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
