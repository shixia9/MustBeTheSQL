import { useState, useEffect } from 'react';
import { Users, Cpu, Activity, Search, ChevronLeft, ChevronRight, X, LayoutDashboard, Shield, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';

type AdminTab = 'overview' | 'users' | 'llm';

export default function Dashboard({ adminRole }: { adminRole: string }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [dashboard, setDashboard] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userKeyword, setUserKeyword] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [llmMetrics, setLlmMetrics] = useState<any[]>([]);
  const [quotaEdit, setQuotaEdit] = useState<{ userId: number; current: number } | null>(null);
  const [quotaValue, setQuotaValue] = useState('');

  useEffect(() => { if (activeTab === 'overview') { fetchDashboard(); fetchLlmMetrics(); } }, [activeTab]);
  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, userPage, userKeyword]);

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
  const fetchLlmMetrics = async () => {
    const res = await api.get<any[]>('/admin/llm/metrics');
    if (res.data) setLlmMetrics(res.data);
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
        {activeTab === 'llm' && <LlmTab llmMetrics={llmMetrics} />}
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
function LlmTab({ llmMetrics }: { llmMetrics: any[] }) {
  return (
    <div className="p-8 max-w-[1080px] space-y-5">
      <div>
        <h1 className="font-mono text-lg font-semibold tracking-tight" style={{ color: 'var(--color-typeset)' }}>
          LLM Monitoring
        </h1>
        <p className="font-mono text-[12px] mt-1" style={{ color: 'var(--color-marginalia)' }}>
          Call metrics per configuration
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Config</th>
              <th className="th w-24">Calls</th>
              <th className="th w-56">Success Rate</th>
              <th className="th w-32">Latency</th>
              <th className="th w-52">Tokens &nbsp;<span style={{ color: 'var(--color-marginalia)', fontWeight: 400 }}>In / Out</span></th>
            </tr>
          </thead>
          <tbody>
            {llmMetrics.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-14 text-center font-mono text-xs"
                style={{ color: 'var(--color-marginalia)' }}>No metrics available</td></tr>
            ) : llmMetrics.map((m: any, i: number) => {
              const rate = Math.round((m.successRate || 0) * 100);
              const barColor = rate > 90 ? 'var(--color-sig-green)' : rate > 70 ? '#d4932b' : 'var(--color-sig-red)';
              return (
                <tr key={i} className="transition-colors hover:bg-black/[0.015]">
                  <td className="td font-mono font-medium" style={{ color: 'var(--color-typeset)' }}>
                    #{m.configId}
                  </td>
                  <td className="td font-mono text-xs">{m.totalCalls}</td>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[140px]"
                        style={{ background: 'rgba(111,115,133,0.12)' }}>
                        <div className="h-full rounded-full transition-all duration-600"
                          style={{ width: `${rate}%`, background: barColor }} />
                      </div>
                      <span className="font-mono text-[11px] font-semibold w-9 text-right"
                        style={{ color: 'var(--color-marginalia)' }}>{rate}%</span>
                    </div>
                  </td>
                  <td className="td font-mono text-xs">{Math.round(m.avgLatencyMs || 0)} ms</td>
                  <td className="td font-mono text-xs" style={{ color: 'var(--color-marginalia)' }}>
                    {m.totalInputTokens?.toLocaleString()} / {m.totalOutputTokens?.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
