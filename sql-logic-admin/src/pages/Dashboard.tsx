import { useState, useEffect } from 'react';
import { Users, Server, Activity, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    { key: 'llm', label: 'LLM Monitor', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-48 border-r border-gray-200 bg-white p-4 flex flex-col gap-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-2">Admin</h2>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left ${
                activeTab === tab.key ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
        <div className="mt-auto pt-4 border-t border-gray-200">
          <span className="text-[10px] text-gray-400 px-2">{adminRole}</span>
        </div>
      </aside>

      <section className="flex-1 p-8 overflow-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h1 className="text-lg font-bold text-gray-800">Admin Dashboard</h1>
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Total Users" value={dashboard?.totalUsers ?? '-'} />
              <StatCard label="Total Admins" value={dashboard?.totalAdmins ?? '-'} />
              <StatCard label="Total Calls" value={dashboard?.totalExecutions ?? '-'} />
              <StatCard label="Active Today" value={dashboard?.activeToday ?? '-'} />
            </div>
            {llmMetrics.length > 0 && (
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-gray-800 mb-4">LLM Call Volume</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={llmMetrics.slice(0, 10).map((m: any) => ({ name: `Cfg ${m.configId}`, calls: m.totalCalls || 0, success: m.successCount || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#6366f1" name="Total" />
                    <Bar dataKey="success" fill="#22c55e" name="Success" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-gray-800">User Management</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input className="pl-9 pr-4 py-1.5 border border-gray-300 text-sm bg-white" placeholder="Search..."
                  value={userKeyword} onChange={e => { setUserKeyword(e.target.value); setUserPage(1); }} />
              </div>
            </div>
            <div className="bg-white border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">ID</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Username</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Quota</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Loading...</td></tr>
                  ) : users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{u.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold ${u.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.status === 1 ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{u.tokenQuota ?? '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleToggleStatus(u.id, u.status)}
                          className="px-2 py-1 text-[10px] font-bold bg-gray-100 hover:bg-gray-200 mr-1">
                          {u.status === 1 ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => { setQuotaEdit({ userId: u.id, current: u.tokenQuota || 0 }); setQuotaValue(String(u.tokenQuota || 0)); }}
                          className="px-2 py-1 text-[10px] font-bold bg-gray-100 hover:bg-gray-200">Quota</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userTotal > 20 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{(userPage-1)*20+1}-{Math.min(userPage*20,userTotal)} of {userTotal}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUserPage(p => Math.max(1, p-1))} disabled={userPage===1} className="p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    <span className="text-xs font-bold">{userPage}</span>
                    <button onClick={() => setUserPage(p => p+1)} disabled={userPage*20>=userTotal} className="p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'llm' && (
          <div className="space-y-4">
            <h1 className="text-lg font-bold text-gray-800">LLM Monitoring</h1>
            <div className="bg-white border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Config</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Calls</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Success Rate</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Avg Latency</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Tokens (In/Out)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {llmMetrics.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No metrics.</td></tr>
                  ) : llmMetrics.map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-800">#{m.configId}</td>
                      <td className="px-4 py-3 text-xs">{m.totalCalls}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200"><div className="h-full bg-green-500" style={{ width: `${Math.round((m.successRate||0)*100)}%` }} /></div>
                          <span className="text-[10px] text-gray-500">{Math.round((m.successRate||0)*100)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{Math.round(m.avgLatencyMs||0)}ms</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.totalInputTokens} / {m.totalOutputTokens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {quotaEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setQuotaEdit(null)}>
          <div className="bg-white p-6 shadow-lg border border-gray-200 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Adjust Token Quota</h3>
              <button onClick={() => setQuotaEdit(null)}><X size={18} /></button>
            </div>
            <input type="number" className="w-full px-3 py-2 border border-gray-300 text-sm mb-4"
              value={quotaValue} onChange={e => setQuotaValue(e.target.value)} />
            <button onClick={handleAdjustQuota} className="w-full py-2 bg-indigo-500 text-white text-sm font-semibold">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800 font-mono">{value}</p>
    </div>
  );
}
