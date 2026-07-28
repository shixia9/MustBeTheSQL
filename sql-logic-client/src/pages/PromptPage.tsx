import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { promptApi } from '../api/client';
import type { PromptTemplate } from '../api/client';

export default function PromptPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', content: '', description: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await promptApi.list();
      setPrompts(list || []);
      if (list && list.length > 0 && selected === null) setSelected(list[0].id);
    } catch (e: any) { flash('error', e.message || 'Failed to load prompts'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  const selectedPrompt = prompts.find(p => p.id === selected);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', content: '', description: '' });
    setShowForm(true);
  };

  const openEdit = (p: PromptTemplate) => {
    setEditing(p);
    setForm({ name: p.name, content: p.content, description: p.description || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      flash('error', 'Name and content are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), content: form.content, description: form.description.trim() || undefined };
      const r = editing
        ? await promptApi.update({ id: editing.id, ...payload })
        : await promptApi.create(payload);
      if (r.code === 200) {
        flash('success', editing ? 'Updated' : 'Created');
        setShowForm(false);
        await fetchPrompts();
      } else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this prompt?')) return;
    try {
      const r = await promptApi.delete(id);
      if (r.code === 200) { flash('success', 'Deleted'); if (selected === id) setSelected(null); await fetchPrompts(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
  };

  return (
    <ManagementPage
      title="prompts"
      icon={FileText}
      actions={
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> New Prompt
        </button>
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
              {editing ? 'Edit' : 'New'} Prompt
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Name *</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. SQL Generation Prompt" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Description</label>
              <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What is this prompt used for?" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Content *</label>
              <textarea rows={8} className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md outline-none focus:border-blue-500"
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="You are a SQL expert. Given the schema: {{schema}}..." />
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

      <div className="flex gap-4 h-full">
        <div className="w-[300px] flex-shrink-0">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading...
            </div>
          ) : prompts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No prompts yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
                  <th className="py-2 px-2 font-medium">Prompt</th>
                  <th className="py-2 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prompts.map(p => (
                  <tr key={p.id} onClick={() => setSelected(p.id)}
                    className={`cursor-pointer hover:bg-slate-50 ${selected === p.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}>
                    <td className="py-2 px-2 text-blue-600">{p.name}</td>
                    <td className="py-2 px-2">
                      <span className={`text-[10px] ${p.status === 1 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {p.status === 1 ? 'active' : 'disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 overflow-auto">
          {selectedPrompt ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-900">{selectedPrompt.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded ${selectedPrompt.status === 1 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                  {selectedPrompt.status === 1 ? 'active' : 'disabled'}
                </span>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => openEdit(selectedPrompt)} className="btn-ghost p-1 hover:text-blue-600"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(selectedPrompt.id)} className="btn-ghost p-1 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              {selectedPrompt.description && <p className="text-[11px] text-slate-500 mb-3">{selectedPrompt.description}</p>}
              <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 rounded-md p-3 whitespace-pre-wrap break-words overflow-auto max-h-[400px]">
                {selectedPrompt.content}
              </pre>
              <div className="text-[10px] text-slate-400 mt-2">Updated: {selectedPrompt.updateTime || selectedPrompt.createTime}</div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
              &gt; select a prompt to view details
            </div>
          )}
        </div>
      </div>
    </ManagementPage>
  );
}
