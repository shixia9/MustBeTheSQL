import { useState, useEffect, useCallback } from 'react';
import { Cpu, Plus, Trash2, Pencil, Loader2, Zap, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { llmConfigApi, llmStrategyApi } from '../api/client';
import { useFlash } from '../hooks/useFlash';

interface LlmConfig {
  id: number;
  configName: string;
  providerType: string;
  baseUrl?: string;
  apiKeyMasked?: string;
  modelName?: string;
  isDefault?: boolean;
  status?: number;
  strategyType?: string;
  fallbackChain?: string;
  circuitState?: string;
  createTime?: string;
  updateTime?: string;
}

interface LlmMetrics {
  configId: number;
  successRate?: number;
  averageLatencyMs?: number;
  circuitState?: string;
  totalRequests?: number;
}

const tabs = [
  { key: 'configured', label: 'Configured' },
  { key: 'ha', label: 'HA Strategy' },
];

export default function ModelPage() {
  const [activeTab, setActiveTab] = useState('configured');
  const [configs, setConfigs] = useState<LlmConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LlmConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const { msg, flash } = useFlash();
  const [form, setForm] = useState({
    configName: '', providerType: 'OPENAI_COMPATIBLE', baseUrl: '', apiKey: '', modelName: '', isDefault: false,
  });
  const [metrics, setMetrics] = useState<Record<number, LlmMetrics>>({});
  const [strategyForm, setStrategyForm] = useState<Record<number, { strategyType: string; fallbackChain: string }>>({});

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const list = await llmConfigApi.list();
      setConfigs(list || []);
      // Load metrics + strategy for each config
      const m: Record<number, LlmMetrics> = {};
      const s: Record<number, { strategyType: string; fallbackChain: string }> = {};
      for (const c of (list || [])) {
        try {
          m[c.id] = await llmConfigApi.getMetrics(c.id);
        } catch { /* metrics may be empty for new configs */ }
        s[c.id] = {
          strategyType: c.strategyType || 'PRIMARY_ONLY',
          fallbackChain: c.fallbackChain || '',
        };
      }
      setMetrics(m);
      setStrategyForm(s);
    } catch (e: any) { flash('error', e.message || 'Failed to load configs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const openCreate = () => {
    setEditing(null);
    setForm({ configName: '', providerType: 'OPENAI_COMPATIBLE', baseUrl: '', apiKey: '', modelName: '', isDefault: false });
    setShowForm(true);
  };

  const openEdit = (cfg: LlmConfig) => {
    setEditing(cfg);
    setForm({
      configName: cfg.configName || '',
      providerType: cfg.providerType || 'OPENAI_COMPATIBLE',
      baseUrl: cfg.baseUrl || '',
      apiKey: '',  // never prefill; backend keeps existing on null
      modelName: cfg.modelName || '',
      isDefault: !!cfg.isDefault,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.configName.trim() || (!editing && !form.apiKey.trim())) {
      flash('error', 'Config name and API key are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const body: any = {
          configName: form.configName.trim(),
          providerType: form.providerType,
          baseUrl: form.baseUrl.trim() || null,
          modelName: form.modelName.trim() || null,
          isDefault: form.isDefault,
        };
        if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
        await llmConfigApi.update(editing.id, body);
        flash('success', 'Config updated');
      } else {
        await llmConfigApi.create({
          configName: form.configName.trim(),
          providerType: form.providerType,
          baseUrl: form.baseUrl.trim() || null,
          apiKey: form.apiKey.trim(),
          modelName: form.modelName.trim() || null,
          isDefault: form.isDefault,
        });
        flash('success', 'Config created');
      }
      setShowForm(false);
      await fetchConfigs();
    } catch (e: any) { flash('error', e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this LLM config?')) return;
    try {
      await llmConfigApi.delete(id);
      flash('success', 'Deleted');
      await fetchConfigs();
    } catch (e: any) { flash('error', e.message || 'Delete failed'); }
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const r = await llmConfigApi.test(id);
      const data = r.data;
      if (data?.success) flash('success', `Connected in ${data.latencyMs ?? '?'}ms`);
      else flash('error', data?.message || 'Connection failed');
    } catch (e: any) { flash('error', e.message || 'Test failed'); }
    finally { setTesting(null); }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await llmConfigApi.setDefault(id);
      flash('success', 'Set as default');
      await fetchConfigs();
    } catch (e: any) { flash('error', e.message || 'Failed'); }
  };

  const handleSaveStrategy = async (id: number) => {
    const s = strategyForm[id];
    if (!s) return;
    try {
      const fallback = s.fallbackChain.trim()
        ? s.fallbackChain.split(',').map(x => Number(x.trim())).filter(n => !isNaN(n))
        : [];
      await llmStrategyApi.updateStrategy(id, { strategyType: s.strategyType, fallbackChain: fallback });
      flash('success', 'Strategy saved');
      await fetchConfigs();
    } catch (e: any) { flash('error', e.message || 'Save failed'); }
  };

  const strategyOptions = [
    { value: 'PRIMARY_ONLY', label: 'Primary Only' },
    { value: 'FAILOVER', label: 'Failover (fallback chain)' },
    { value: 'ROUND_ROBIN', label: 'Round Robin' },
  ];

  return (
    <ManagementPage
      title="models"
      icon={Cpu}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        activeTab === 'configured' ? (
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} /> Add Model
          </button>
        ) : undefined
      }
    >
      {msg && (
        <div className={`mb-4 px-3 py-2 text-xs border rounded-md ${
          msg.type === 'success' ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-red-300 text-red-600 bg-red-50'
        }`}>
          <span className="mr-2">{msg.type === 'success' ? '✓' : '✗'}</span>{msg.text}
        </div>
      )}

      {showForm && (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-sm ${editing ? 'bg-emerald-500' : 'bg-blue-600'}`} />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700">
              {editing ? 'Edit' : 'New'} Model Config
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Config Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.configName} onChange={e => setForm({ ...form, configName: e.target.value })}
                placeholder="e.g. gpt-4o-prod" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Provider</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.providerType} onChange={e => setForm({ ...form, providerType: e.target.value })}>
                <option value="OPENAI_COMPATIBLE">OpenAI Compatible</option>
                <option value="ANTHROPIC">Anthropic</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Base URL</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1 (leave blank for provider default)" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                API Key {editing && <span className="font-normal text-slate-400">(leave blank to keep existing)</span>} {!editing && '*'}
              </label>
              <input type="password" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })}
                placeholder="sk-..." />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Model Name</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.modelName} onChange={e => setForm({ ...form, modelName: e.target.value })}
                placeholder="gpt-4o" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" checked={form.isDefault}
                  onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
                Set as default
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {editing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'configured' ? (
        loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading...
          </div>
        ) : configs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            No models configured. Click "Add Model" to create one.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
                  <th className="py-2.5 px-3 font-medium text-xs">Config</th>
                  <th className="py-2.5 px-3 font-medium text-xs">Provider</th>
                  <th className="py-2.5 px-3 font-medium text-xs">Model</th>
                  <th className="py-2.5 px-3 font-medium text-xs">Default</th>
                  <th className="py-2.5 px-3 font-medium text-xs">Status</th>
                  <th className="py-2.5 px-3 font-medium text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configs.map(cfg => {
                  const m = metrics[cfg.id];
                  return (
                    <tr key={cfg.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{cfg.configName}</div>
                        {cfg.baseUrl && <div className="text-[10px] text-slate-400">{cfg.baseUrl}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">{cfg.providerType}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">{cfg.modelName || '—'}</td>
                      <td className="py-2.5 px-3">
                        {cfg.isDefault ? <Zap size={13} className="text-amber-500" /> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {m?.circuitState ? (
                          <span className={`text-xs inline-flex items-center gap-1 ${
                            m.circuitState === 'CLOSED' ? 'text-emerald-600' :
                            m.circuitState === 'OPEN' ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {m.circuitState === 'CLOSED' ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                            {m.circuitState}
                          </span>
                        ) : cfg.status === 1 ? (
                          <span className="text-xs text-emerald-500">active</span>
                        ) : (
                          <span className="text-xs text-slate-400">inactive</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleTest(cfg.id)} disabled={testing === cfg.id}
                            className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-40" title="Test connection">
                            {testing === cfg.id ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
                          </button>
                          <button onClick={() => openEdit(cfg)} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit">
                            <Pencil size={13} />
                          </button>
                          {!cfg.isDefault && (
                            <button onClick={() => handleSetDefault(cfg.id)} className="p-1.5 text-slate-400 hover:text-amber-500" title="Set default">
                              <Zap size={13} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(cfg.id)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {configs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              Configure at least one model to manage HA strategy.
            </div>
          ) : configs.map(cfg => {
            const m = metrics[cfg.id];
            const s = strategyForm[cfg.id];
            return (
              <div key={cfg.id} className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{cfg.configName}</h3>
                    <p className="text-[10px] text-slate-400">{cfg.providerType} · {cfg.modelName || 'default model'}</p>
                  </div>
                  {m && (
                    <div className="flex gap-4 text-xs">
                      <div className="text-center">
                        <div className="text-slate-400 text-[10px] uppercase">Success</div>
                        <div className={`font-semibold ${m.successRate >= 0.9 ? 'text-emerald-600' : m.successRate >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                          {((m.successRate ?? 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400 text-[10px] uppercase">Avg Latency</div>
                        <div className="font-semibold text-slate-700">{m.averageLatencyMs ?? '—'}ms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400 text-[10px] uppercase">Requests</div>
                        <div className="font-semibold text-slate-700">{m.totalRequests ?? 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400 text-[10px] uppercase">Circuit</div>
                        <div className={`font-semibold ${m.circuitState === 'CLOSED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {m.circuitState || '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {s && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Strategy</label>
                      <select className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                        value={s.strategyType} onChange={e => setStrategyForm({ ...strategyForm, [cfg.id]: { ...s, strategyType: e.target.value } })}>
                        {strategyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                        Fallback Chain <span className="font-normal text-slate-400">(config IDs, comma-separated)</span>
                      </label>
                      <div className="flex gap-2">
                        <input className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                          value={s.fallbackChain} disabled={s.strategyType === 'PRIMARY_ONLY'}
                          onChange={e => setStrategyForm({ ...strategyForm, [cfg.id]: { ...s, fallbackChain: e.target.value } })}
                          placeholder="2, 3" />
                        <button onClick={() => handleSaveStrategy(cfg.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700">
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ManagementPage>
  );
}
