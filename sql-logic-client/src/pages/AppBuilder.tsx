import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Trash2, Layout } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { api } from '../api/client';

export default function AppBuilder() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamMode, setTeamMode] = useState('auto_plan');

  useEffect(() => { loadApps(); }, []);

  const loadApps = () => {
    api.get<any[]>('/apps').then(r => { if (r.data) setApps(r.data); }).catch(() => {});
  };

  const createApp = async () => {
    if (!name.trim()) return;
    await api.post('/apps', { name: name.trim(), description, teamMode });
    setShowCreate(false); setName(''); setDescription('');
    loadApps();
  };

  const deleteApp = async (id: number) => {
    await api.delete(`/apps/${id}`);
    loadApps();
  };

  const startChat = async (app: any) => {
    const r = await api.post<any>('/conversations', { title: `${app.name} Chat`, llmStrategyId: 1 });
    if (r.data?.id) navigate(`/chat/${r.data.id}?appId=${app.id}`);
  };

  const modeLabel = (m: string) => m === 'single_agent' ? 'Single Agent' : m === 'auto_plan' ? 'Auto Plan' : 'AWEL Flow';

  return (
    <ManagementPage title="App Builder" icon={Layout}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          <Plus size={14} /> Create App
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map(app => (
          <div key={app.id} className="rounded-xl p-4" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>{app.name}</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-tertiary)' }}>{app.description || 'No description'}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                {modeLabel(app.teamMode)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: '0.5px solid var(--color-border-subtle)' }}>
              <button onClick={() => startChat(app)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                style={{ background: '#3b8c5e', color: '#fff' }}><Play size={12} /> Chat</button>
              <button onClick={() => navigate(`/app-builder/${app.id}`)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                style={{ color: 'var(--color-ink-secondary)', border: '1px solid var(--color-border-default)' }}><Edit size={12} /> Edit</button>
              <div className="flex-1" />
              <button onClick={() => deleteApp(app.id)} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ color: '#d94545' }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowCreate(false)}>
          <div className="rounded-xl p-6 w-[420px]" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-default)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Create App</h3>
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-ink-secondary)' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none mb-3"
              style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }}
              placeholder="e.g., Sales Analysis Bot" />
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-ink-secondary)' }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none mb-3"
              style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }} />
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--color-ink-secondary)' }}>Team Mode</label>
            <select value={teamMode} onChange={e => setTeamMode(e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none mb-4"
              style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }}>
              <option value="single_agent">Single Agent</option>
              <option value="auto_plan">Auto Plan (Multi-Agent)</option>
              <option value="awel_layout">AWEL Flow</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-md text-[12px] font-semibold"
                style={{ color: 'var(--color-ink-secondary)', border: '1px solid var(--color-border-default)' }}>Cancel</button>
              <button onClick={createApp} className="px-4 py-2 rounded-md text-[12px] font-semibold"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </ManagementPage>
  );
}
