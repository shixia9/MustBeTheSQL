import { useState, useEffect, useCallback } from 'react';
import { Server, Plus, Trash2, Loader2, Plug, PlugZap, Pencil } from 'lucide-react';
import { mcpServerApi } from '../api/client';
import type { McpServerConfig } from '../types';

const TransportBadge = ({ type }: { type: string }) => {
  const color = type === 'SSE'
    ? 'border-blue-300 text-blue-600 bg-blue-50'
    : 'border-amber-300 text-amber-600 bg-amber-50';
  return <span className={`text-[9px] px-1.5 py-0.5 border rounded font-semibold ${color}`}>{type}</span>;
};

const ConnectionDot = ({ connected }: { connected: boolean }) => (
  <span className={`w-2 h-2 inline-block rounded-full border ${
    connected ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-200'
  }`} />
);

export default function McpServerPage() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<number, boolean>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', transportType: 'SSE', endpoint: '', envStr: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mcpServerApi.list();
      if (data.code === 200 && data.data) {
        setServers(data.data);
        // Fetch connection status for each server
        const statuses: Record<number, boolean> = {};
        for (const s of data.data) {
          try {
            const st = await mcpServerApi.status(s.id);
            if (st.code === 200 && st.data) statuses[s.id] = st.data.connected;
          } catch { statuses[s.id] = false; }
        }
        setConnectionStatus(statuses);
        if (!selectedId && data.data.length > 0) setSelectedId(data.data[0].id);
      }
    } catch (e: any) { flash('error', e.message || 'Failed to load servers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.endpoint.trim()) {
      flash('error', 'Name and endpoint are required'); return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), transportType: form.transportType, endpoint: form.endpoint.trim(),
        env: form.envStr.trim() ? Object.fromEntries(form.envStr.split(',').map(s => s.split('=').map(x => x.trim()))) : undefined };
      if (editingId) {
        const data = await mcpServerApi.update(editingId, payload);
        if (data.code === 200) {
          flash('success', 'Server updated');
          setShowForm(false); setEditingId(null);
          setForm({ name: '', transportType: 'SSE', endpoint: '', envStr: '' });
          await fetchServers();
        } else flash('error', data.message || 'Failed to update');
      } else {
        const data = await mcpServerApi.create(payload);
        if (data.code === 200) {
          flash('success', 'Server added');
          setShowForm(false);
          setForm({ name: '', transportType: 'SSE', endpoint: '', envStr: '' });
          await fetchServers();
          if (data.data) setSelectedId(data.data.id);
        } else flash('error', data.message || 'Failed to add server');
      }
    } catch (e: any) { flash('error', e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleEdit = (s: McpServerConfig) => {
    setForm({ name: s.name, transportType: s.transportType, endpoint: s.endpoint,
      envStr: s.envVars ? (() => { try { const obj = JSON.parse(s.envVars); return Object.entries(obj).map(([k,v]) => `${k}=${v}`).join(','); } catch { return s.envVars.replace(/[{}"]/g,''); } })() : '' });
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this MCP server? Connected tools will be unregistered.')) return;
    try {
      const data = await mcpServerApi.delete(id);
      if (data.code === 200) {
        flash('success', 'Server removed');
        if (selectedId === id) setSelectedId(null);
        await fetchServers();
      }
    } catch (e: any) { flash('error', e.message || 'Failed to delete'); }
  };

  const handleConnect = async (id: number) => {
    setToggling(id);
    try {
      const data = await mcpServerApi.connect(id);
      if (data.code === 200) {
        setConnectionStatus(prev => ({ ...prev, [id]: true }));
        flash('success', 'Connected');
      } else flash('error', data.message || 'Connection failed');
    } catch (e: any) { flash('error', e.message || 'Connection failed'); }
    finally { setToggling(null); }
  };

  const handleDisconnect = async (id: number) => {
    setToggling(id);
    try {
      const data = await mcpServerApi.disconnect(id);
      if (data.code === 200) {
        setConnectionStatus(prev => ({ ...prev, [id]: false }));
        flash('success', 'Disconnected');
      }
    } catch (e: any) { flash('error', e.message || 'Disconnect failed'); }
    finally { setToggling(null); }
  };

  const selected = servers.find(s => s.id === selectedId);

  return (
    <div className="min-h-full text-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-slate-200">
          <div className="flex items-center gap-3">
            <Server size={22} className="text-blue-600" />
            <div>
              <h1 className="text-base font-semibold tracking-wider uppercase">
                <span className="text-blue-600">$</span> MCP Servers
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                # manage external MCP tool servers (SSE &amp; STDIO)
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setEditingId(null); setForm({ name: '', transportType: 'SSE', endpoint: '', envStr: '' }); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            {showForm ? 'Cancel' : <><Plus size={14} /> Add Server</>}
          </button>
        </div>

        {/* Flash messages */}
        {msg && (
          <div className={`mb-4 px-3 py-2 text-xs border rounded-md ${
            msg.type === 'success' ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-red-300 text-red-600 bg-red-50'
          }`}>
            <span className="text-blue-600 mr-2">{msg.type === 'success' ? '✓' : '✗'}</span>
            {msg.text}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="mb-6 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-lg">
            {/* Header strip */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
              <div className={`w-4 h-4 rounded-sm ${editingId ? 'bg-emerald-500' : 'bg-blue-600'}`} />
              <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-700">
                {editingId ? 'Edit MCP Server' : 'Register MCP Server'}
              </span>
              <span className="text-[10px] ml-auto text-slate-400">
                {editingId ? `config #${editingId}` : 'new connection'}
              </span>
            </div>

            {/* Form body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-[0.12em] font-semibold mb-1 text-slate-500">Name</label>
                  <input
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="my-mcp-server" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-[0.12em] font-semibold mb-1 text-slate-500">Transport</label>
                  <select
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors appearance-none"
                    value={form.transportType}
                    onChange={e => setForm({ ...form, transportType: e.target.value })}>
                    <option value="SSE">SSE -- Remote HTTP endpoint</option>
                    <option value="STDIO">STDIO -- Local process command</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-[0.12em] font-semibold mb-1 text-slate-500">Endpoint</label>
                  <input
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    value={form.endpoint}
                    onChange={e => setForm({ ...form, endpoint: e.target.value })}
                    placeholder={form.transportType === 'SSE' ? 'https://example.com/mcp/sse' : 'npx -y @modelcontextprotocol/server-example'} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-[0.12em] font-semibold mb-1 text-slate-400">
                    Environment Variables
                    <span className="font-normal ml-1.5 text-slate-300">optional</span>
                  </label>
                  <input
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    value={form.envStr}
                    onChange={e => setForm({ ...form, envStr: e.target.value })}
                    placeholder="KEY1=val1, KEY2=val2" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[10px] text-slate-400">
                  {form.transportType === 'SSE' ? 'Connects to a remote MCP server via HTTP' : 'Spawns a local process and communicates via stdin/stdout'}
                </span>
                <button onClick={handleAdd} disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs uppercase tracking-wider font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : editingId ? <Pencil size={12} /> : <Plus size={12} />}
                  {editingId ? 'Save Changes' : 'Register Server'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Two-panel layout */}
        <div className="grid grid-cols-[260px_1fr] gap-0 border border-slate-200 rounded-lg overflow-hidden">
          {/* Left: server list */}
          <div className="border-r border-slate-200 bg-white">
            <div className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 border-b border-dashed border-slate-200 bg-slate-50 font-semibold">
              <span className="text-blue-600">$</span> ls servers <span className="text-slate-400">({servers.length})</span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-xs text-slate-500">
                  <Loader2 size={14} className="inline animate-spin mr-1" /> Loading...
                </div>
              ) : servers.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-slate-500">
                  No MCP servers configured. Add one to import external tools.
                </div>
              ) : (
                servers.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`px-3 py-2.5 flex items-center gap-2 border-b border-slate-100 cursor-pointer transition-colors text-xs ${
                      selectedId === s.id
                        ? 'bg-blue-50 text-blue-600 border-l-2 border-l-blue-600'
                        : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <span className="text-slate-400 w-5 flex-shrink-0 text-[10px]">
                      {selectedId === s.id ? <span className="text-blue-600">{'❯'}</span> : `${String(i + 1).padStart(2, ' ')}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate flex items-center gap-1.5">
                        <ConnectionDot connected={!!connectionStatus[s.id]} />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <TransportBadge type={s.transportType} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: detail panel */}
          <div className="bg-white">
            {!selected ? (
              <div className="px-6 py-20 text-center text-xs text-slate-500">
                <span className="text-blue-600">$</span> Select a server or add a new one
              </div>
            ) : (
              <div className="p-5 space-y-0">
                <section className="pb-5 border-b border-dashed border-slate-200">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-blue-600 font-semibold">$</span>
                    <span className="text-slate-900 font-semibold uppercase tracking-wider">Server Info</span>
                  </div>
                  <div className="ml-5 space-y-3">
                    <div className="grid grid-cols-[80px_1fr] gap-2 text-xs">
                      <span className="text-slate-400">Name:</span>
                      <span>{selected.name}</span>
                      <span className="text-slate-400">Type:</span>
                      <span><TransportBadge type={selected.transportType} /></span>
                      <span className="text-slate-400">Status:</span>
                      <span className="flex items-center gap-1.5">
                        <ConnectionDot connected={!!connectionStatus[selected.id]} />
                        {connectionStatus[selected.id] ? 'Connected' : 'Disconnected'}
                      </span>
                      <span className="text-slate-400">Endpoint:</span>
                      <span className="break-all text-[11px] text-slate-700">{selected.endpoint}</span>
                      {selected.envVars && (
                        <>
                          <span className="text-slate-400">Env:</span>
                          <span className="text-[11px] break-all text-slate-700">{selected.envVars}</span>
                        </>
                      )}
                    </div>
                  </div>
                </section>

                <div className="flex items-center gap-2 pt-4 pb-1">
                  {connectionStatus[selected.id] ? (
                    <button onClick={() => handleDisconnect(selected.id)} disabled={toggling === selected.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 rounded-md transition-colors disabled:opacity-50">
                      {toggling === selected.id ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />}
                      Disconnect
                    </button>
                  ) : (
                    <button onClick={() => handleConnect(selected.id)} disabled={toggling === selected.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {toggling === selected.id ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
                      Connect
                    </button>
                  )}
                  <button onClick={() => handleEdit(selected)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 rounded-md transition-colors">
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-red-300 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
