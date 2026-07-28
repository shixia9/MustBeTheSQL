import { useState, useEffect, useCallback } from 'react';
import { Plug, Plus, Trash2, Pencil, Loader2, Link2, Unlink } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { connectorApi, databaseApi } from '../api/client';
import type { ConnectorTemplate, ActiveConnector } from '../api/client';
import { useFlash } from '../hooks/useFlash';

const tabs = [
  { key: 'templates', label: 'Templates' },
  { key: 'active', label: 'Active' },
];

const CONNECTOR_TYPES = ['REST', 'JDBC', 'FILE', 'KAFKA', 'WEBSOCKET'];

export default function ConnectorPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<ConnectorTemplate[]>([]);
  const [actives, setActives] = useState<ActiveConnector[]>([]);
  const [connections, setConnections] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ConnectorTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', connectorType: 'REST', config: '', description: '' });
  const [activeForm, setActiveForm] = useState({ name: '', templateId: '', connectionId: '' });
  const [showActiveForm, setShowActiveForm] = useState(false);
  const { msg, flash } = useFlash();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, acts, conns] = await Promise.all([
        connectorApi.listTemplates().catch(() => []),
        connectorApi.listActive().catch(() => []),
        databaseApi.listConnections().catch(() => []),
      ]);
      setTemplates(tpls || []);
      setActives(acts || []);
      setConnections(conns || []);
    } catch (e: any) { flash('error', e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditing(null);
    setTplForm({ name: '', connectorType: 'REST', config: '', description: '' });
    setShowForm(true);
  };

  const openEdit = (t: ConnectorTemplate) => {
    setEditing(t);
    setTplForm({ name: t.name, connectorType: t.connectorType, config: t.config || '', description: t.description || '' });
    setShowForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!tplForm.name.trim()) { flash('error', 'Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: tplForm.name.trim(),
        connectorType: tplForm.connectorType,
        config: tplForm.config.trim() || undefined,
        description: tplForm.description.trim() || undefined,
      };
      const r = editing
        ? await connectorApi.updateTemplate({ id: editing.id, ...payload })
        : await connectorApi.createTemplate(payload);
      if (r.code === 200) { flash('success', editing ? 'Updated' : 'Created'); setShowForm(false); await fetchAll(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Delete this connector template?')) return;
    try {
      const r = await connectorApi.deleteTemplate(id);
      if (r.code === 200) { flash('success', 'Deleted'); await fetchAll(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
  };

  const handleCreateActive = async () => {
    if (!activeForm.name.trim()) { flash('error', 'Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: activeForm.name.trim(),
        templateId: activeForm.templateId ? Number(activeForm.templateId) : undefined,
        connectionId: activeForm.connectionId ? Number(activeForm.connectionId) : undefined,
      };
      const r = await connectorApi.createActive(payload);
      if (r.code === 200) { flash('success', 'Created'); setShowActiveForm(false); setActiveForm({ name: '', templateId: '', connectionId: '' }); await fetchAll(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteActive = async (id: number) => {
    if (!confirm('Remove this active connector?')) return;
    try {
      const r = await connectorApi.deleteActive(id);
      if (r.code === 200) { flash('success', 'Removed'); await fetchAll(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
  };

  return (
    <ManagementPage
      title="connectors"
      icon={Plug}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        activeTab === 'templates' ? (
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} /> Add Template
          </button>
        ) : (
          <button onClick={() => setShowActiveForm(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} /> Activate Connector
          </button>
        )
      }
    >
      {msg && (
        <div className={`mb-4 px-3 py-2 text-xs border rounded-md ${
          msg.type === 'success' ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-red-300 text-red-600 bg-red-50'
        }`}>
          <span className="mr-2">{msg.type === 'success' ? '✓' : '✗'}</span>{msg.text}
        </div>
      )}

      {/* Template form */}
      {showForm && activeTab === 'templates' && (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-sm ${editing ? 'bg-emerald-500' : 'bg-blue-600'}`} />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700">
              {editing ? 'Edit' : 'New'} Connector Template
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={tplForm.name} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Type</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={tplForm.connectorType} onChange={e => setTplForm({ ...tplForm, connectorType: e.target.value })}>
                {CONNECTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Description</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={tplForm.description} onChange={e => setTplForm({ ...tplForm, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Config (JSON)</label>
              <textarea rows={4} className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={tplForm.config} onChange={e => setTplForm({ ...tplForm, config: e.target.value })}
                placeholder='{"url": "https://...", "method": "GET"}' />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button onClick={handleSaveTemplate} disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {editing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Active connector form */}
      {showActiveForm && activeTab === 'active' && (
        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-sm bg-blue-600" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-700">Activate Connector</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={activeForm.name} onChange={e => setActiveForm({ ...activeForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Template</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={activeForm.templateId} onChange={e => setActiveForm({ ...activeForm, templateId: e.target.value })}>
                <option value="">-- None --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">DB Connection</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={activeForm.connectionId} onChange={e => setActiveForm({ ...activeForm, connectionId: e.target.value })}>
                <option value="">-- None --</option>
                {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button onClick={() => setShowActiveForm(false)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button onClick={handleCreateActive} disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
              Activate
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : activeTab === 'templates' ? (
        templates.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No connector templates yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(t => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(t)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                    <button onClick={() => handleDeleteTemplate(t.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">{t.description || 'No description'}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">
                  {t.connectorType}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        actives.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No active connectors.</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
                  <th className="py-2.5 px-3 font-medium">Name</th>
                  <th className="py-2.5 px-3 font-medium">Template</th>
                  <th className="py-2.5 px-3 font-medium">Connection</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actives.map(c => {
                  const tpl = templates.find(t => t.id === c.templateId);
                  const conn = connections.find(cn => cn.id === c.connectionId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-blue-600">{c.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{tpl?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{conn?.name || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs ${c.status === 1 ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {c.status === 1 ? 'connected' : 'disconnected'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => handleDeleteActive(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 inline-flex items-center gap-1">
                          <Unlink size={13} /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </ManagementPage>
  );
}
