import { useState, useEffect } from 'react';
import { Users, Server, Activity, Shield, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '../api/client';

type AdminTab = 'overview' | 'users' | 'llm' | 'audit';

export default function AdminDashboardPage({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState('');

  // Dashboard state
  const [dashboard, setDashboard] = useState<any>(null);
  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userKeyword, setUserKeyword] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  // LLM metrics state
  const [llmMetrics, setLlmMetrics] = useState<any[]>([]);
  // Edit dialogs
  const [quotaEdit, setQuotaEdit] = useState<{ userId: number; current: number } | null>(null);
  const [quotaValue, setQuotaValue] = useState('');

  useEffect(() => {
    api.get<{ isAdmin: boolean; role: string }>('/user/admin-check').then(res => {
      if (res.data) {
        setIsAdmin(res.data.isAdmin);
        setAdminRole(res.data.role || '');
      }
    });
  }, []);

  useEffect(() => { if (activeTab === 'overview') fetchDashboard(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, userPage, userKeyword]);
  useEffect(() => { if (activeTab === 'llm') fetchLlmMetrics(); }, [activeTab]);

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
    const newStatus = currentStatus === 1 ? 0 : 1;
    await api.put(`/admin/users/${userId}/status`, { status: newStatus });
    fetchUsers();
  };

  const handleAdjustQuota = async () => {
    if (!quotaEdit) return;
    await api.put(`/admin/users/${quotaEdit.userId}/quota`, { quota: parseInt(quotaValue) });
    setQuotaEdit(null);
    fetchUsers();
  };

  // Tab navigation
  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'llm', label: 'LLM Monitor', icon: Server },
  ];

  if (!isAdmin) {
    return (
      <main className="ml-[200px] pt-12 min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-error/60" />
          <h1 className="text-lg font-bold text-on-surface mb-2">Access Denied</h1>
          <p className="text-sm text-on-surface-variant">You need admin privileges to view this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-[200px] pt-12 min-h-screen bg-surface flex">
      {/* Admin sidebar */}
      <aside className="w-48 border-r border-outline-variant bg-surface-container-low p-4 flex flex-col gap-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 px-2">Admin</h2>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors text-left ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
        <div className="mt-auto pt-4 border-t border-outline-variant/20">
          <span className="text-[10px] text-on-surface-variant/40 px-2">{adminRole}</span>
        </div>
      </aside>

      {/* Content */}
      <section className="flex-1 p-8 overflow-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'llm' && renderLlm()}
      </section>

      {/* Quota edit modal */}
      {quotaEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setQuotaEdit(null)}>
          <div className="bg-surface-container-low p-6 shadow-lg border border-outline-variant w-96" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-on-surface">Adjust Token Quota</h3>
              <button onClick={() => setQuotaEdit(null)}><X size={18} /></button>
            </div>
            <input
              type="number"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant text-sm mb-4"
              value={quotaValue}
              onChange={e => setQuotaValue(e.target.value)}
              placeholder="Enter new quota"
            />
            <button onClick={handleAdjustQuota} className="w-full py-2 bg-primary text-white text-sm font-semibold">Save</button>
          </div>
        </div>
      )}
    </main>
  );

  function renderOverview() {
    const chartData = llmMetrics.slice(0, 10).map((m: any) => ({
      name: `Config ${m.configId}`,
      calls: m.totalCalls || 0,
      success: m.successCount || 0,
    }));

    return (
      <div className="space-y-6">
        <h1 className="text-lg font-bold text-on-surface">Admin Dashboard</h1>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Users" value={dashboard?.totalUsers ?? '-'} />
          <StatCard label="Total Admins" value={dashboard?.totalAdmins ?? '-'} />
          <StatCard label="Total Calls" value={dashboard?.totalExecutions ?? '-'} />
          <StatCard label="Active Today" value={dashboard?.activeToday ?? '-'} />
        </div>
        {chartData.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/10 p-6">
            <h3 className="text-sm font-bold text-on-surface mb-4">LLM Call Volume (by Config)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="calls" fill="#6366f1" name="Total Calls" />
                <Bar dataKey="success" fill="#22c55e" name="Success" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  function renderUsers() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-on-surface">User Management</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={16} />
            <input
              className="pl-9 pr-4 py-1.5 bg-surface-container-low border border-outline-variant text-sm"
              placeholder="Search..."
              value={userKeyword}
              onChange={e => { setUserKeyword(e.target.value); setUserPage(1); }}
            />
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high border-b border-outline-variant/10">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">ID</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Username</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Email</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Quota</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Admin</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {userLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-on-surface-variant">Loading...</td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-surface-container-high/20">
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{u.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-on-surface">{u.username}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{u.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold ${u.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status === 1 ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface">{u.tokenQuota ?? '-'}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{u.isAdmin ? u.adminRole : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggleStatus(u.id, u.status)}
                        className="px-2 py-1 text-[10px] font-bold bg-surface-container-high hover:bg-surface-container-highest">
                        {u.status === 1 ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => { setQuotaEdit({ userId: u.id, current: u.tokenQuota || 0 }); setQuotaValue(String(u.tokenQuota || 0)); }}
                        className="px-2 py-1 text-[10px] font-bold bg-surface-container-high hover:bg-surface-container-highest">
                        Quota
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {userTotal > 20 && (
            <div className="px-4 py-3 border-t border-outline-variant/10 flex items-center justify-between">
              <span className="text-[10px] text-on-surface-variant/60">Showing {(userPage - 1) * 20 + 1} - {Math.min(userPage * 20, userTotal)} of {userTotal}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}
                  className="p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span className="text-xs font-bold">{userPage}</span>
                <button onClick={() => setUserPage(p => p + 1)} disabled={userPage * 20 >= userTotal}
                  className="p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderLlm() {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-on-surface">LLM Monitoring</h1>
        <div className="bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high border-b border-outline-variant/10">
              <tr>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Config ID</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Total Calls</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Success</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Failures</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Success Rate</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Avg Latency</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase text-on-surface-variant">Tokens (In/Out)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {llmMetrics.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-on-surface-variant">No metrics yet.</td></tr>
              ) : llmMetrics.map((m: any, i: number) => (
                <tr key={i} className="hover:bg-surface-container-high/20">
                  <td className="px-4 py-3 text-sm font-mono text-on-surface">#{m.configId}</td>
                  <td className="px-4 py-3 text-xs">{m.totalCalls}</td>
                  <td className="px-4 py-3 text-xs text-green-600">{m.successCount}</td>
                  <td className="px-4 py-3 text-xs text-red-500">{m.failureCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-surface-container-high">
                        <div className="h-full bg-green-500" style={{ width: `${Math.round((m.successRate || 0) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-on-surface-variant">{Math.round((m.successRate || 0) * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{Math.round(m.avgLatencyMs || 0)}ms</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{m.totalInputTokens} / {m.totalOutputTokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/10 p-5">
      <p className="text-[10px] font-bold uppercase text-on-surface-variant/60 mb-1">{label}</p>
      <p className="text-2xl font-bold text-on-surface font-mono">{value}</p>
    </div>
  );
}
