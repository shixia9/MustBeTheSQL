import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, Pencil, Loader2, ArrowLeft } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { databaseApi, businessKnowledgeApi } from '../api/client';
import type { BusinessKnowledgeItem } from '../api/client';

const tabs = [
  { key: 'glossary', label: 'Glossary' },
  { key: 'qa', label: 'Q & A' },
];

const VECTOR_GLOSSARY = 'GLOSSARY_KNOWLEDGE';
const VECTOR_QA = 'QUESTION_KNOWLEDGE';

export default function KnowledgeDetailPage() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const connectionId = spaceId ? Number(spaceId) : null;
  const [activeTab, setActiveTab] = useState('glossary');
  const [connection, setConnection] = useState<{ id: number; name: string; dbType?: string } | null>(null);
  const [items, setItems] = useState<BusinessKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BusinessKnowledgeItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [glossaryForm, setGlossaryForm] = useState({ term: '', description: '', synonyms: '' });
  const [qaForm, setQaForm] = useState({ question: '', answer: '' });

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const fetchConnection = useCallback(async () => {
    if (!connectionId) return;
    try {
      const list = await databaseApi.listConnections();
      const conn = (list || []).find(c => c.id === connectionId);
      setConnection(conn || null);
    } catch { setConnection(null); }
  }, [connectionId]);

  const fetchItems = useCallback(async () => {
    if (!connectionId) { setItems([]); return; }
    setLoading(true);
    try {
      const list = await businessKnowledgeApi.list(connectionId);
      setItems(list || []);
    } catch (e: any) { flash('error', e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, [connectionId]);

  useEffect(() => { fetchConnection(); }, [fetchConnection]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter(i =>
    activeTab === 'glossary' ? i.vectorType === VECTOR_GLOSSARY : i.vectorType === VECTOR_QA
  );

  const openCreate = () => {
    setEditing(null);
    setGlossaryForm({ term: '', description: '', synonyms: '' });
    setQaForm({ question: '', answer: '' });
    setShowForm(true);
  };

  const openEdit = (item: BusinessKnowledgeItem) => {
    setEditing(item);
    setGlossaryForm({ term: item.term || '', description: item.description || '', synonyms: item.synonyms || '' });
    setQaForm({ question: item.question || '', answer: item.answer || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!connectionId) return;
    setSaving(true);
    try {
      if (activeTab === 'glossary') {
        if (!glossaryForm.term.trim()) { flash('error', 'Term is required'); setSaving(false); return; }
        const payload = {
          connectionId, vectorType: VECTOR_GLOSSARY,
          term: glossaryForm.term.trim(), description: glossaryForm.description.trim(), synonyms: glossaryForm.synonyms.trim(),
        };
        const r = editing
          ? await businessKnowledgeApi.update({ id: editing.id, ...payload })
          : await businessKnowledgeApi.create(payload);
        if (r.code === 200) { flash('success', 'Saved'); setShowForm(false); await fetchItems(); }
        else flash('error', r.message || 'Failed');
      } else {
        if (!qaForm.question.trim()) { flash('error', 'Question is required'); setSaving(false); return; }
        const payload = {
          connectionId, vectorType: VECTOR_QA,
          question: qaForm.question.trim(), answer: qaForm.answer.trim(),
        };
        const r = editing
          ? await businessKnowledgeApi.update({ id: editing.id, ...payload })
          : await businessKnowledgeApi.create(payload);
        if (r.code === 200) { flash('success', 'Saved'); setShowForm(false); await fetchItems(); }
        else flash('error', r.message || 'Failed');
      }
    } catch (e: any) { flash('error', e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    try {
      const r = await businessKnowledgeApi.delete(id);
      if (r.code === 200) { flash('success', 'Deleted'); await fetchItems(); }
      else flash('error', r.message || 'Failed');
    } catch (e: any) { flash('error', e.message || 'Failed'); }
  };

  return (
    <ManagementPage
      title="knowledge"
      subtitle={connection?.name || `connection #${spaceId}`}
      icon={BookOpen}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <>
          <button onClick={() => navigate('/knowledge')} className="btn-ghost flex items-center gap-1.5">
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5" disabled={!connectionId}>
            <Plus size={14} /> New {activeTab === 'glossary' ? 'Term' : 'Q&A'}
          </button>
        </>
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
              {editing ? 'Edit' : 'New'} {activeTab === 'glossary' ? 'Glossary Term' : 'Q&A Pair'}
            </span>
          </div>
          {activeTab === 'glossary' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Term *</label>
                <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                  value={glossaryForm.term} onChange={e => setGlossaryForm({ ...glossaryForm, term: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Description</label>
                <textarea rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                  value={glossaryForm.description} onChange={e => setGlossaryForm({ ...glossaryForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Synonyms</label>
                <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                  value={glossaryForm.synonyms} onChange={e => setGlossaryForm({ ...glossaryForm, synonyms: e.target.value })}
                  placeholder="comma, separated, aliases" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Question *</label>
                <textarea rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                  value={qaForm.question} onChange={e => setQaForm({ ...qaForm, question: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Answer</label>
                <textarea rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                  value={qaForm.answer} onChange={e => setQaForm({ ...qaForm, answer: e.target.value })} />
              </div>
            </div>
          )}
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

      {!connectionId ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Invalid connection.</div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No {activeTab === 'glossary' ? 'glossary terms' : 'Q&A pairs'} yet.
        </div>
      ) : activeTab === 'glossary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">{item.term}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              </div>
              {item.description && <p className="text-xs text-slate-600 mb-2">{item.description}</p>}
              {item.synonyms && (
                <div className="flex flex-wrap gap-1">
                  {item.synonyms.split(',').map((s, i) => s.trim() && (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{s.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {filtered.map((item, idx) => (
            <div key={item.id} className={`p-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 mb-1">{item.question}</p>
                  {item.answer && <p className="text-xs text-slate-600">{item.answer}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ManagementPage>
  );
}
