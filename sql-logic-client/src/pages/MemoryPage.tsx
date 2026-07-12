import { useState, useEffect, useCallback } from 'react';
import { Brain, Plus, Trash2, Loader2, RefreshCw, Search } from 'lucide-react';
import { memoryApi } from '../api/client';
import { useI18n } from '../i18n';

const TYPES: { value: string; label: string; desc: string }[] = [
  { value: 'PROFILE', label: 'profile', desc: 'User preferences (output format, frequent tables)' },
  { value: 'TASK', label: 'task', desc: 'Historical task patterns (common SQL patterns)' },
  { value: 'FACT', label: 'fact', desc: 'Business knowledge (user-defined rules)' },
  { value: 'EPISODIC', label: 'episodic', desc: 'Session-level context' },
];

interface MemoryItem {
  id: number; type: string; content: string; importance: number | string;
  tags?: string[] | string; status?: number; createTime?: string;
}

const typeColor = (type: string): string => {
  switch (type) {
    case 'PROFILE': return 'border-blue-500/40 text-blue-400 bg-blue-500/10';
    case 'TASK': return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    case 'FACT': return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    case 'EPISODIC': return 'border-purple-500/40 text-purple-400 bg-purple-500/10';
    default: return 'border-outline-variant/40 text-on-surface-variant bg-surface-container';
  }
};

export default function MemoryPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0, PROFILE: 0, TASK: 0, FACT: 0, EPISODIC: 0 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'PROFILE', content: '', importance: 0.8, tags: '' });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const fetchCounts = useCallback(async () => {
    try {
      const data = await memoryApi.counts();
      if (data.code === 200 && data.data) setCounts(data.data);
    } catch { /* best-effort */ }
  }, []);

  const fetchMemories = useCallback(async (type?: string) => {
    setLoading(true);
    try {
      const data = await memoryApi.list(type);
      if (data.code === 200) setItems(data.data || []);
    } catch (e: any) { flash('error', e.message || t('common.error')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCounts(); fetchMemories(); }, [fetchCounts, fetchMemories]);

  const handleFilter = (type: string) => {
    setFilter(type);
    fetchMemories(type || undefined);
  };

  const handleCreate = async () => {
    if (!form.content.trim()) { flash('error', 'Content cannot be empty'); return; }
    setSaving(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const data = await memoryApi.create({
        type: form.type, content: form.content.trim(),
        importance: Number(form.importance), tags,
      });
      if (data.code === 200) {
        flash('success', 'Memory added');
        setForm({ type: 'PROFILE', content: '', importance: 0.8, tags: '' });
        setShowForm(false);
        fetchMemories(filter || undefined);
        fetchCounts();
      } else flash('error', data.message || 'Failed to add');
    } catch (e: any) { flash('error', e.message || 'Failed to add'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this memory?')) return;
    try {
      const data = await memoryApi.delete(id);
      if (data.code === 200) {
        fetchMemories(filter || undefined);
        fetchCounts();
        flash('success', 'Deleted');
      }
    } catch (e: any) { flash('error', e.message || 'Failed to delete'); }
  };

  const filteredItems = searchQuery.trim()
    ? items.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  return (
    <main className="ml-[200px] pt-12 min-h-screen bg-surface text-on-surface font-mono">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-outline-variant/40">
          <div className="flex items-center gap-3">
            <Brain size={22} className="text-primary" />
            <div>
              <h1 className="text-base font-semibold tracking-wider uppercase">
                <span className="text-primary">$</span> {t('memory.title')}
              </h1>
              <p className="text-[11px] text-on-surface-variant mt-0.5 font-mono">
                {t('memory.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); if (!showForm) setSearchQuery(''); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            {showForm ? <Trash2 size={13} /> : <Plus size={13} />}
            {showForm ? t('memory.cancel') : t('memory.addMemory')}
          </button>
        </div>

        {/* ── Flash messages ── */}
        {msg && (
          <div className={`mb-4 px-3 py-2 text-xs font-mono border ${msg.type === 'success' ? 'border-primary/40 text-primary bg-primary/10' : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>
            <span className="mr-2">{msg.type === 'success' ? '✓' : '✗'}</span>
            {msg.text}
          </div>
        )}

        {/* ── Two-panel layout ── */}
        <div className="grid grid-cols-[220px_1fr] gap-0 border border-outline-variant/40">
          {/* ═══ Left: filter panel ═══ */}
          <div className="border-r border-outline-variant/40 bg-surface-container-lowest">
            <div className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-on-surface-variant border-b border-dashed border-outline-variant/40 bg-surface-container-low font-semibold">
              <span className="text-primary">$</span> {t('memory.categories')}
            </div>
            {/* Search bar */}
            <div className="px-2 py-2 border-b border-dashed border-outline-variant/10">
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('memory.searchPlaceholder')}
                  className="w-full bg-surface text-[10px] text-on-surface border border-outline-variant/30 pl-6 pr-2 py-1.5 outline-none focus:border-primary placeholder-on-surface-variant/40"
                />
              </div>
            </div>
            <div className="p-2 space-y-0.5">
              <FilterButton
                label="all"
                count={counts['all'] || 0}
                active={filter === ''}
                onClick={() => handleFilter('')}
              />
              {TYPES.map(tp => (
                <FilterButton
                  key={tp.value}
                  label={tp.label}
                  count={counts[tp.value] || 0}
                  desc={tp.desc}
                  active={filter === tp.value}
                  onClick={() => handleFilter(tp.value)}
                />
              ))}
            </div>
          </div>

          {/* ═══ Right: content panel ═══ */}
          <div className="bg-surface-container-lowest">
            {/* Header with title + refresh */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-dashed border-outline-variant/20 bg-surface-container-low/50">
              <span className="text-[10px] text-on-surface-variant/60">
                {!loading && filteredItems.length > 0
                  ? t('memory.showingCount', { count: filteredItems.length })
                  : ''}
              </span>
              <button
                onClick={() => fetchMemories(filter || undefined)}
                className="flex items-center gap-1 text-[10px] text-on-surface-variant/50 hover:text-primary transition-colors"
                title={t('memory.refresh')}
              >
                <RefreshCw size={10} />
                {t('memory.refresh')}
              </button>
            </div>
            {/* ── Inline add form ── */}
            {showForm && (
              <div className="m-3 p-3 border border-dashed border-primary/40 bg-primary/[0.03]">
                <div className="flex items-center gap-2 mb-2 text-[10px] text-on-surface-variant">
                  <span className="text-primary">$</span> {t('memory.newMemory')}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-28 px-2 py-1.5 text-[11px] bg-surface border border-outline-variant/50 outline-none focus:border-primary font-mono"
                    >
                      {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
                    </select>
                    <input
                      value={form.content}
                      onChange={e => setForm({ ...form, content: e.target.value })}
                      placeholder={t('memory.contentPlaceholder')}
                      className="flex-1 px-2 py-1.5 text-[11px] bg-surface border border-outline-variant/50 outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={form.tags}
                      onChange={e => setForm({ ...form, tags: e.target.value })}
                      placeholder={t('memory.tagsPlaceholder')}
                      className="flex-1 px-2 py-1.5 text-[11px] bg-surface border border-outline-variant/50 outline-none focus:border-primary font-mono"
                    />
                    <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                      <span>{t('memory.importance')}:</span>
                      <input
                        type="number" min={0} max={1} step={0.1}
                        value={form.importance}
                        onChange={e => setForm({ ...form, importance: Number(e.target.value) })}
                        className="w-16 px-2 py-1.5 text-[11px] bg-surface border border-outline-variant/50 outline-none focus:border-primary font-mono text-center"
                      />
                    </div>
                    <button
                      onClick={handleCreate}
                      disabled={saving}
                      className="px-3 py-1.5 text-[11px] uppercase bg-primary text-on-primary hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50 font-mono"
                    >
                      {saving ? <Loader2 size={11} className="inline animate-spin" /> : t('common.save')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Memory items ── */}
            <div className="p-3">
              {loading ? (
                <div className="py-10 text-center text-xs text-on-surface-variant">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" />{t('memory.loading')}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-on-surface-variant">
                  {searchQuery.trim() ? t('memory.noSearchResults') : t('memory.noMemories')}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map(m => (
                    <div key={m.id} className="group flex items-start gap-2 px-3 py-2 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors bg-surface-container-low/30">
                      <span className={`text-[9px] px-1.5 py-0.5 border font-semibold uppercase tracking-wider flex-shrink-0 ${typeColor(m.type)}`}>
                        [{m.type.slice(0, 4)}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-on-surface leading-relaxed break-words">{m.content}</div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-on-surface-variant/60">
                          {m.tags && Array.isArray(m.tags) && m.tags.length > 0 && (
                            <span>tags: {m.tags.join(', ')}</span>
                          )}
                          {m.tags && typeof m.tags === 'string' && m.tags.length > 0 && (
                            <span>tags: {m.tags}</span>
                          )}
                          <span>★ {fmtImportance(m.importance)}</span>
                          {m.createTime && <span>· {fmtDate(m.createTime)}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-on-surface-variant/30 hover:text-error opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        title={t('common.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Left-panel filter button */
function FilterButton({ label, count, active, desc, onClick }: {
  label: string; count: number; active: boolean; desc?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors ${
        active
          ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
          : 'text-on-surface-variant hover:bg-surface-container border-l-2 border-l-transparent'
      }`}
      title={desc}
    >
      <span className="flex-1 truncate">{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 font-mono ${active ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant/60'}`}>
        {count}
      </span>
    </button>
  );
}

function fmtImportance(v: number | string): string {
  const n = typeof v === 'number' ? v : Number(v);
  return isNaN(n) ? String(v) : n.toFixed(2);
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}
