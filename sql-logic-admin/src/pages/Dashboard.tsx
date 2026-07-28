import { useState, useEffect } from 'react';
import { Users, Cpu, Activity, Search, ChevronLeft, ChevronRight, X, LayoutDashboard, Shield, Zap, Workflow, Bot } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';

type AdminTab = 'overview' | 'users' | 'workflows' | 'llm';

export default function Dashboard({ adminRole }: { adminRole: string }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userKeyword, setUserKeyword] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [llmMetrics, setLlmMetrics] = useState<any[]>([]);
  const [llmPage, setLlmPage] = useState(1);
  const [llmTotal, setLlmTotal] = useState(0);
  const [llmKeyword, setLlmKeyword] = useState('');
  const [llmSubTab, setLlmSubTab] = useState<'general' | 'system' | 'users' | 'agents'>('general');
  const [quotaEdit, setQuotaEdit] = useState<{ userId: number; current: number } | null>(null);
  const [quotaValue, setQuotaValue] = useState('');
  // Workflows tab state
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowPage, setWorkflowPage] = useState(1);
  const [workflowTotal, setWorkflowTotal] = useState(0);
  const [workflowKeyword, setWorkflowKeyword] = useState('');
  // Per-agent metrics (multi-agent telemetry, not paginated)
  const [agentMetrics, setAgentMetrics] = useState<any[]>([]);

  useEffect(() => { if (activeTab === 'overview') { fetchDashboard(); } }, [activeTab]);
  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, userPage, userKeyword]);
  useEffect(() => { if (activeTab === 'workflows') fetchWorkflows(); }, [activeTab, workflowPage, workflowKeyword]);
  useEffect(() => { if (activeTab === 'llm') fetchLlmMetrics(); }, [activeTab, llmPage, llmKeyword, llmSubTab]);

  const fetchDashboard = async () => {
    const res = await api.get<any>('/admin/dashboard');
    if (res.data) setDashboard(res.data);
  };
  const fetchUsers = async () => {
    setUserLoading(true);
    const params = new URLSearchParams({ page: String(userPage), size: '20' });
    if (userKeyword) params.set('keyword', userKeyword);
    const res = await api.get<any>(`/admin/users?${params}`);
    if (res.data) { setUsers(res.data.records || []); setUserTotal(res.data.total || 0); }
    setUserLoading(false);
  };
  const fetchWorkflows = async () => {
    const params = new URLSearchParams({ page: String(workflowPage), size: '20' });
    if (workflowKeyword) params.set('keyword', workflowKeyword);
    const res = await api.get<any>(`/admin/workflows?${params}`);
    if (res.data) { setWorkflows(res.data.records || []); setWorkflowTotal(res.data.total || 0); }
  };
  const fetchLlmMetrics = async () => {
    // Multi-agent telemetry is a flat list (not paginated) and uses a dedicated endpoint.
    if (llmSubTab === 'agents') {
      const res = await api.get<any>('/admin/llm/metrics/agents');
      setAgentMetrics(Array.isArray(res.data) ? res.data : []);
      return;
    }
    const path = llmSubTab === 'system' ? '/admin/llm/metrics/system'
      : llmSubTab === 'users' ? '/admin/llm/metrics/users'
      : '/admin/llm/metrics';
    const params = new URLSearchParams({ page: String(llmPage), size: '20' });
    if (llmKeyword) params.set('keyword', llmKeyword);
    const res = await api.get<any>(`${path}?${params}`);
    if (res.data) { setLlmMetrics(res.data.records || []); setLlmTotal(res.data.total || 0); }
  };
  const handleToggleStatus = async (userId: number, currentStatus: number) => {
    await api.put(`/admin/users/${userId}/status`, { status: currentStatus === 1 ? 0 : 1 });
    fetchUsers();
  };
  const handleAdjustQuota = async () => {
    if (!quotaEdit) return;
    await api.put(`/admin/users/${quotaEdit.userId}/quota`, { quota: parseInt(quotaValue) });
    setQuotaEdit(null);
    fetchUsers();
  };

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'workflows', label: 'Workflows', icon: Workflow },
    { key: 'llm', label: 'LLM', icon: Zap },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-vellum)' }}>
      {/* ════════════ Sidebar ════════════ */}
      <aside className="w-56 shrink-0 flex flex-col" style={{ background: 'var(--color-inkwell)' }}>
        {/* Brand */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: 'var(--color-register)' }}>
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-white tracking-tight">SQL Logic</span>
          </div>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] mt-1 block"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            Admin Console
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={active ? 'nav-item-active' : 'nav-item-idle'}>
                <Icon size={15} strokeWidth={active ? 2.5 : 1.6} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.25)' }}>{adminRole}</span>
        </div>
      </aside>

      {/* ════════════ Main Content ════════════ */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'overview' && <OverviewTab dashboard={dashboard} llmMetrics={llmMetrics} />}
        {activeTab === 'users' && (
          <UsersTab users={users} userTotal={userTotal} userPage={userPage} userLoading={userLoading}
            userKeyword={userKeyword} setUserKeyword={setUserKeyword} setUserPage={setUserPage}
            handleToggleStatus={handleToggleStatus} setQuotaEdit={setQuotaEdit} setQuotaValue={setQuotaValue} />
        )}
        {activeTab === 'workflows' && (
          <WorkflowsTab workflows={workflows} workflowTotal={workflowTotal} workflowPage={workflowPage}
            workflowKeyword={workflowKeyword} setWorkflowKeyword={setWorkflowKeyword} setWorkflowPage={setWorkflowPage} />
        )}
        {activeTab === 'llm' && (
          <LlmView llmMetrics={llmMetrics} llmTotal={llmTotal} llmPage={llmPage}
            llmKeyword={llmKeyword} setLlmKeyword={setLlmKeyword} setLlmPage={setLlmPage}
            llmSubTab={llmSubTab} setLlmSubTab={setLlmSubTab}
            agentMetrics={agentMetrics} />
        )}
      </main>

      {/* ════════════ Quota Modal ════════════ */}
      {quotaEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(17,22,34,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setQuotaEdit(null)}>
          <div className="card p-6 w-[380px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-mono text-sm font-semibold" style={{ color: 'var(--color-typeset)' }}>
                Adjust Token Quota
              </h3>
              <button onClick={() => setQuotaEdit(null)} className="p-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-marginalia)' }}>
                <X size={15} />
              </button>
            </div>
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--color-marginalia)' }}>Quota Amount</label>
            <input type="number" className="input w-full mb-5"
              value={quotaValue} onChange={e => setQuotaValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdjustQuota()} autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setQuotaEdit(null)} className="btn-ghost">Cancel</button>
              <button onClick={handleAdjustQuota} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════ */
function OverviewTab({ dashboard, llmMetrics }: { dashboard: any; llmMetrics: any[] }) {
  const stats = [
    { label: 'Total Users', value: dashboard?.totalUsers ?? '—', icon: Users },
    { label: 'Admins', value: dashboard?.totalAdmins ?? '—', icon: Shield },
    { label: 'Executions', value: dashboard?.totalExecutions ?? '—', icon: Activity },
    { label: 'Active 24h', value: dashboard?.activeToday ?? '—', icon: Cpu },
  ];

  return (
    <div className="p-8 max-w-[1080px] space-y-8">
      <div>
        <h1 className="font-mono text-lg font-semibold tracking-tight" style={{ color: 'var(--color-typeset)' }}>
          Overview
        </h1>
        <p className="font-mono text-[12px] mt-1" style={{ color: 'var(--color-marginalia)' }}>
          System health and key metrics
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="stat-label">{s.label}</p>
                  <p className="stat-number">{s.value}</p>
                </div>
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-register-soft)' }}>
                  <Icon size={15} style={{ color: 'var(--color-register)' }} strokeWidth={1.8} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      {llmMetrics.length > 0 && (
        <div className="card p-6">
          <h3 className="font-mono text-sm font-semibold mb-0.5" style={{ color: 'var(--color-typeset)' }}>
            LLM Call Volume
          </h3>
          <p className="font-mono text-[11px] mb-5" style={{ color: 'var(--color-marginalia)' }}>
            Calls per configuration
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={llmMetrics.slice(0, 10).map((m: any) => ({
              name: `#${m.configId}`,
              calls: m.totalCalls || 0,
              success: m.successCount || 0,
            }))} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(111,115,133,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#6f7385' }}
                axisLine={{ stroke: 'rgba(111,115,133,0.18)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#6f7385' }}
                axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{
                borderRadius: 5, border: '1px solid rgba(111,115,133,0.18)',
                fontFamily: 'JetBrains Mono', fontSize: 11,
                boxShadow: '0 4px 20px rgba(17,22,34,0.08)',
              }} />
              <Bar dataKey="calls" fill="var(--color-register)" radius={[3, 3, 0, 0]} name="Total" />
              <Bar dataKey="success" fill="var(--color-sig-green)" radius={[3, 3, 0, 0]} name="Success" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Users Tab
   ═══════════════════════════════════════════ */
function UsersTab({ users, userTotal, userPage, userLoading, userKeyword, setUserKeyword, setUserPage, handleToggleStatus, setQuotaEdit, setQuotaValue }: any) {
  return (
    <div className="p-8 max-w-[1080px] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold tracking-tight" style={{ color: 'var(--color-typeset)' }}>
            User Management
          </h1>
          <p className="font-mono text-[12px] mt-1" style={{ color: 'var(--color-marginalia)' }}>
            {userTotal} registered
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14}
            style={{ color: 'var(--color-marginalia)' }} />
          <input className="input pl-9 pr-4 w-64" placeholder="Search..."
            value={userKeyword} onChange={e => { setUserKeyword(e.target.value); setUserPage(1); }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-16">ID</th>
              <th className="th">Username</th>
              <th className="th w-24">Status</th>
              <th className="th w-20">Quota</th>
              <th className="th w-44 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userLoading ? (
              <tr><td colSpan={5} className="px-4 py-14 text-center font-mono text-xs"
                style={{ color: 'var(--color-marginalia)' }}>Loading&hellip;</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-14 text-center font-mono text-xs"
                style={{ color: 'var(--color-marginalia)' }}>No users found</td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} className="transition-colors hover:bg-black/[0.015]">
                <td className="td font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>{u.id}</td>
                <td className="td font-medium" style={{ color: 'var(--color-typeset)' }}>{u.username}</td>
                <td className="td">
                  <span className={u.status === 1 ? 'badge-ok' : 'badge-err'}>
                    {u.status === 1 ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="td font-mono text-xs">{u.tokenQuota ?? '—'}</td>
                <td className="td text-right">
                  <button onClick={() => handleToggleStatus(u.id, u.status)}
                    className="btn-ghost text-[10px] mr-1">
                    {u.status === 1 ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => { setQuotaEdit({ userId: u.id, current: u.tokenQuota || 0 }); setQuotaValue(String(u.tokenQuota || 0)); }}
                    className="btn-ghost text-[10px]">Quota</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {userTotal > 20 && (
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(111,115,133,0.1)', background: 'rgba(111,115,133,0.02)' }}>
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>
              {(userPage - 1) * 20 + 1}&ndash;{Math.min(userPage * 20, userTotal)} of {userTotal}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setUserPage((p: number) => Math.max(1, p - 1))} disabled={userPage === 1}
                className="p-1.5 rounded-md transition-colors disabled:opacity-20 disabled:pointer-events-none"
                style={{ color: 'var(--color-marginalia)' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="font-mono text-xs font-semibold px-1" style={{ color: 'var(--color-typeset)' }}>
                {userPage}
              </span>
              <button onClick={() => setUserPage((p: number) => p + 1)} disabled={userPage * 20 >= userTotal}
                className="p-1.5 rounded-md transition-colors disabled:opacity-20 disabled:pointer-events-none"
                style={{ color: 'var(--color-marginalia)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LLM Tab
   ═══════════════════════════════════════════ */
type LlmSubTab = 'general' | 'system' | 'users' | 'agents';

function LlmView({ llmMetrics, llmTotal, llmPage, llmKeyword, setLlmKeyword, setLlmPage, llmSubTab, setLlmSubTab, agentMetrics }: {
  llmMetrics: any[]; llmTotal: number; llmPage: number;
  llmKeyword: string; setLlmKeyword: (v: string) => void; setLlmPage: (v: number) => void;
  llmSubTab: LlmSubTab; setLlmSubTab: (v: LlmSubTab) => void;
  agentMetrics: any[];
}) {
  const subtabs: { key: LlmSubTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'system', label: 'System LLM' },
    { key: 'users', label: 'User LLM' },
    { key: 'agents', label: 'Agents' },
  ];
  const isAgents = llmSubTab === 'agents';

  return (
    <div className="flex" style={{ minHeight: 'calc(100vh - 0px)' }}>
      {/* ═══ Sub-sidebar ═══ */}
      <div className="w-48 shrink-0 border-r" style={{ borderColor: 'rgba(111,115,133,0.12)', background: 'rgba(111,115,133,0.02)' }}>
        <div className="px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--color-marginalia)' }}>LLM Views</p>
          {subtabs.map(st => (
            <button key={st.key} onClick={() => { setLlmSubTab(st.key); setLlmPage(1); }}
              className={`w-full text-left px-3 py-2 mb-0.5 rounded-md font-mono text-xs transition-colors ${
                llmSubTab === st.key ? 'font-semibold' : ''
              }`}
              style={llmSubTab === st.key
                ? { color: 'var(--color-register)', background: 'var(--color-register-soft)' }
                : { color: 'var(--color-marginalia)' }}
            >{st.label}</button>
          ))}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="flex-1 p-8" style={{ maxWidth: 'calc(1080px - 192px)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            {isAgents && (
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-register-soft)' }}>
                <Bot size={15} style={{ color: 'var(--color-register)' }} strokeWidth={1.8} />
              </div>
            )}
            <div>
              <h1 className="font-mono text-lg font-semibold tracking-tight" style={{ color: 'var(--color-typeset)' }}>
                {isAgents ? 'Multi-Agent Telemetry' : llmSubTab === 'system' ? 'System LLM Monitoring' : llmSubTab === 'users' ? 'User LLM Monitoring' : 'LLM Monitoring'}
              </h1>
              <p className="font-mono text-[12px] mt-1" style={{ color: 'var(--color-marginalia)' }}>
                {isAgents ? 'Per-agent step metrics aggregated from workflow executions'
                  : llmSubTab === 'system' ? 'Platform default LLM usage by user, IP, and token consumption'
                  : llmSubTab === 'users' ? 'User-owned LLM configurations with masked credentials'
                  : 'Call metrics per configuration'}
              </p>
            </div>
          </div>
          {!isAgents && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--color-marginalia)' }} />
              <input className="input pl-9 pr-4 w-56" placeholder="Search config..."
                value={llmKeyword} onChange={e => { setLlmKeyword(e.target.value); setLlmPage(1); }} />
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          {isAgents ? <AgentsTable data={agentMetrics} />
            : llmSubTab === 'system' ? <SystemLlmTable data={llmMetrics} />
            : llmSubTab === 'users' ? <UserLlmTable data={llmMetrics} />
            : <GeneralLlmTable data={llmMetrics} />}
          {!isAgents && llmTotal > 20 && (
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(111,115,133,0.1)', background: 'rgba(111,115,133,0.02)' }}>
              <span className="font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>
                {(llmPage - 1) * 20 + 1}&ndash;{Math.min(llmPage * 20, llmTotal)} of {llmTotal}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setLlmPage(Math.max(1, llmPage - 1))} disabled={llmPage === 1}
                  className="p-1.5 rounded-md transition-colors disabled:opacity-20 disabled:pointer-events-none"
                  style={{ color: 'var(--color-marginalia)' }}><ChevronLeft size={14} /></button>
                <span className="font-mono text-xs font-semibold px-1" style={{ color: 'var(--color-typeset)' }}>{llmPage}</span>
                <button onClick={() => setLlmPage(llmPage + 1)} disabled={llmPage * 20 >= llmTotal}
                  className="p-1.5 rounded-md transition-colors disabled:opacity-20 disabled:pointer-events-none"
                  style={{ color: 'var(--color-marginalia)' }}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneralLlmTable({ data }: { data: any[] }) {
  if (data.length === 0) return <div className="px-4 py-14 text-center font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>No metrics available</div>;
  return (
    <table className="w-full">
      <thead><tr>
        <th className="th">Config Name</th><th className="th w-20">Calls</th><th className="th w-48">Success Rate</th>
        <th className="th w-24">Latency</th><th className="th w-44">Tokens In / Out</th>
      </tr></thead>
      <tbody>
        {data.map((m: any, i: number) => {
          const rate = Math.round((m.successRate || 0) * 100);
          const barColor = rate > 90 ? 'var(--color-sig-green)' : rate > 70 ? 'var(--color-sig-amber)' : 'var(--color-sig-red)';
          return (
            <tr key={i} className="transition-colors hover:bg-black/[0.015]">
              <td className="td font-mono text-xs font-medium" style={{ color: 'var(--color-typeset)' }}>{m.configName || `#${m.configId}`}</td>
              <td className="td font-mono text-xs">{m.totalCalls}</td>
              <td className="td"><div className="flex items-center gap-2.5"><div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[120px]" style={{ background: 'rgba(111,115,133,0.12)' }}><div className="h-full rounded-full transition-all duration-600" style={{ width: `${rate}%`, background: barColor }} /></div><span className="font-mono text-[11px] font-semibold w-9 text-right" style={{ color: 'var(--color-marginalia)' }}>{rate}%</span></div></td>
              <td className="td font-mono text-xs">{Math.round(m.avgLatencyMs || 0)} ms</td>
              <td className="td font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>{(m.totalInputTokens || 0).toLocaleString()} / {(m.totalOutputTokens || 0).toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SystemLlmTable({ data }: { data: any[] }) {
  if (data.length === 0) return <div className="px-4 py-14 text-center font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>No system LLM metrics available</div>;
  return (
    <table className="w-full">
      <thead><tr>
        <th className="th">Config</th><th className="th">User</th><th className="th w-28">IP</th>
        <th className="th w-16">Calls</th><th className="th w-36">Success Rate</th>
        <th className="th w-20">Latency</th><th className="th w-24">Tokens</th><th className="th w-20">Status</th>
      </tr></thead>
      <tbody>
        {data.map((m: any, i: number) => {
          const rate = Math.round((m.successRate || 0) * 100);
          const barColor = rate > 90 ? 'var(--color-sig-green)' : rate > 70 ? 'var(--color-sig-amber)' : 'var(--color-sig-red)';
          return (
            <tr key={i} className="transition-colors hover:bg-black/[0.015]">
              <td className="td font-mono text-xs" style={{ color: 'var(--color-typeset)' }}>{m.configName || `#${m.configId}`}</td>
              <td className="td"><span className="font-mono text-xs">{m.username || `#${m.userId}`}</span><br /><span className="text-[10px]" style={{ color: 'var(--color-marginalia)' }}>{m.userEmail}</span></td>
              <td className="td font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>{m.lastIp || '—'}</td>
              <td className="td font-mono text-xs">{m.totalCalls}</td>
              <td className="td"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px]" style={{ background: 'rgba(111,115,133,0.12)' }}><div className="h-full rounded-full" style={{ width: `${rate}%`, background: barColor }} /></div><span className="font-mono text-[11px] font-semibold w-8 text-right" style={{ color: 'var(--color-marginalia)' }}>{rate}%</span></div></td>
              <td className="td font-mono text-xs">{Math.round(m.avgLatencyMs || 0)} ms</td>
              <td className="td font-mono text-xs">{(m.totalTokens || 0).toLocaleString()}</td>
              <td className="td"><span className={m.userStatus === 1 ? 'badge-ok' : 'badge-err'}>{m.userStatus === 1 ? 'Active' : 'Disabled'}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function UserLlmTable({ data }: { data: any[] }) {
  if (data.length === 0) return <div className="px-4 py-14 text-center font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>No user LLM metrics available</div>;
  return (
    <table className="w-full">
      <thead><tr>
        <th className="th">Owner</th><th className="th">Config</th><th className="th">Provider</th>
        <th className="th">Model</th><th className="th w-28">API Key</th>
        <th className="th w-16">Calls</th><th className="th w-20">Latency</th><th className="th w-20">Tokens</th>
      </tr></thead>
      <tbody>
        {data.map((m: any, i: number) => (
          <tr key={i} className="transition-colors hover:bg-black/[0.015]">
            <td className="td"><span className="font-mono text-xs">{m.username || `#${m.userId}`}</span></td>
            <td className="td font-mono text-xs" style={{ color: 'var(--color-typeset)' }}>{m.configName || `#${m.configId}`}</td>
            <td className="td font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>{m.providerType || '—'}</td>
            <td className="td font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>{m.modelName || '—'}</td>
            <td className="td font-mono text-[10px]" style={{ color: 'var(--color-marginalia)' }}>{m.apiKeyMasked || '***'}</td>
            <td className="td font-mono text-xs">{m.totalCalls}</td>
            <td className="td font-mono text-xs">{Math.round(m.avgLatencyMs || 0)} ms</td>
            <td className="td font-mono text-xs">{(m.totalTokens || 0).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ═══════════════════════════════════════════
   Workflows Tab — multi-agent execution overview
   ═══════════════════════════════════════════ */
function WorkflowsTab({ workflows, workflowTotal, workflowPage, workflowKeyword, setWorkflowKeyword, setWorkflowPage }: any) {
  const fmtTime = (s: string | null | undefined) => {
    if (!s) return '—';
    // Backend sends LocalDateTime#toString() (e.g. "2026-07-28T14:30:00"); trim the T.
    return s.replace('T', ' ').substring(0, 19);
  };

  return (
    <div className="p-8 max-w-[1080px] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold tracking-tight" style={{ color: 'var(--color-typeset)' }}>
            Workflow Executions
          </h1>
          <p className="font-mono text-[12px] mt-1" style={{ color: 'var(--color-marginalia)' }}>
            {workflowTotal} multi-agent runs
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: 'var(--color-marginalia)' }} />
          <input className="input pl-9 pr-4 w-64" placeholder="Search thread / status..."
            value={workflowKeyword} onChange={e => { setWorkflowKeyword(e.target.value); setWorkflowPage(1); }} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-16">ID</th>
              <th className="th w-20">User</th>
              <th className="th">Thread</th>
              <th className="th w-28">Status</th>
              <th className="th w-20">Model</th>
              <th className="th w-20">Tool</th>
              <th className="th w-24">Tokens</th>
              <th className="th w-40">Created</th>
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-14 text-center font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>No workflow executions found</td></tr>
            ) : workflows.map((w: any) => (
              <tr key={w.id} className="transition-colors hover:bg-black/[0.015]">
                <td className="td font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>{w.id}</td>
                <td className="td font-mono text-xs">#{w.userId}</td>
                <td className="td font-mono text-[11px]" style={{ color: 'var(--color-typeset)' }}>{w.threadId || '—'}</td>
                <td className="td"><WorkflowStatusBadge status={w.status} /></td>
                <td className="td font-mono text-xs">{w.modelCalls ?? '0'}</td>
                <td className="td font-mono text-xs">{w.toolCalls ?? '0'}</td>
                <td className="td font-mono text-xs">{(w.totalTokens ?? '0').toLocaleString()}</td>
                <td className="td font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>{fmtTime(w.createTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {workflowTotal > 20 && (
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(111,115,133,0.1)', background: 'rgba(111,115,133,0.02)' }}>
            <span className="font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>
              {(workflowPage - 1) * 20 + 1}&ndash;{Math.min(workflowPage * 20, workflowTotal)} of {workflowTotal}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setWorkflowPage((p: number) => Math.max(1, p - 1))} disabled={workflowPage === 1}
                className="p-1.5 rounded-md transition-colors disabled:opacity-20 disabled:pointer-events-none"
                style={{ color: 'var(--color-marginalia)' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="font-mono text-xs font-semibold px-1" style={{ color: 'var(--color-typeset)' }}>
                {workflowPage}
              </span>
              <button onClick={() => setWorkflowPage((p: number) => p + 1)} disabled={workflowPage * 20 >= workflowTotal}
                className="p-1.5 rounded-md transition-colors disabled:opacity-20 disabled:pointer-events-none"
                style={{ color: 'var(--color-marginalia)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowStatusBadge({ status }: { status?: string | null }) {
  const s = (status || '').toUpperCase();
  const cls = s === 'SUCCESS' || s === 'COMPLETED' ? 'badge-ok'
    : s === 'FAILED' || s === 'ERROR' ? 'badge-err'
    : 'badge-warn';
  const label = s || 'UNKNOWN';
  return <span className={cls}>{label}</span>;
}

/* ═══════════════════════════════════════════
   Agents Table — per-agent (node) step metrics
   ═══════════════════════════════════════════ */
function AgentsTable({ data }: { data: any[] }) {
  if (data.length === 0) return <div className="px-4 py-14 text-center font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>No agent metrics available</div>;
  return (
    <table className="w-full">
      <thead><tr>
        <th className="th">Agent</th><th className="th w-28">Type</th><th className="th w-16">Steps</th>
        <th className="th w-40">Success Rate</th><th className="th w-24">Avg Duration</th>
        <th className="th w-44">Tokens In / Out</th>
      </tr></thead>
      <tbody>
        {data.map((m: any, i: number) => {
          const rate = Math.round((m.successRate || 0) * 100);
          const barColor = rate > 90 ? 'var(--color-sig-green)' : rate > 70 ? 'var(--color-sig-amber)' : 'var(--color-sig-red)';
          return (
            <tr key={i} className="transition-colors hover:bg-black/[0.015]">
              <td className="td font-mono text-xs font-medium" style={{ color: 'var(--color-typeset)' }}>{m.agentName || 'unknown'}</td>
              <td className="td font-mono text-[11px]" style={{ color: 'var(--color-marginalia)' }}>{m.nodeType || '—'}</td>
              <td className="td font-mono text-xs">{m.totalSteps}</td>
              <td className="td"><div className="flex items-center gap-2.5"><div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[120px]" style={{ background: 'rgba(111,115,133,0.12)' }}><div className="h-full rounded-full transition-all duration-600" style={{ width: `${rate}%`, background: barColor }} /></div><span className="font-mono text-[11px] font-semibold w-9 text-right" style={{ color: 'var(--color-marginalia)' }}>{rate}%</span></div></td>
              <td className="td font-mono text-xs">{Math.round(m.avgDurationMs || 0)} ms</td>
              <td className="td font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>{(m.totalInputTokens || 0).toLocaleString()} / {(m.totalOutputTokens || 0).toLocaleString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
