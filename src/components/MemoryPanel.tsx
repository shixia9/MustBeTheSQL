import { useState, useEffect, useCallback } from 'react';
import { Brain, Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { memoryApi } from '../api/client';

const TYPES: { value: string; label: string; desc: string }[] = [
  { value: 'PROFILE', label: '偏好', desc: '用户偏好 (输出格式/常用表)' },
  { value: 'TASK', label: '任务', desc: '历史任务模式 (常用 SQL/关联表)' },
  { value: 'FACT', label: '事实', desc: '业务知识 (用户自定义规则)' },
  { value: 'EPISODIC', label: '片段', desc: '会话级上下文' },
];

interface MemoryItem {
  id: number; type: string; content: string; importance: number | string;
  tags?: string[] | string; status?: number; createTime?: string;
}

/**
 * Phase B (B4): memory management panel — list / create / delete long-term
 * memories, embedded in SettingsPage. Memories are injected into the Agent's
 * system prompt at the start of each run (see MemoryRecallNode).
 */
export default function MemoryPanel() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'PROFILE', content: '', importance: 0.8, tags: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const fetchMemories = useCallback(async (type?: string) => {
    setLoading(true);
    try {
      const data = await memoryApi.list(type);
      if (data.code === 200) setItems(data.data || []);
    } catch (e: any) { flash('error', e.message || '加载失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleFilter = (type: string) => {
    setFilter(type);
    fetchMemories(type || undefined);
  };

  const handleCreate = async () => {
    if (!form.content.trim()) { flash('error', '内容不能为空'); return; }
    setSaving(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const data = await memoryApi.create({
        type: form.type, content: form.content.trim(),
        importance: Number(form.importance), tags,
      });
      if (data.code === 200) {
        flash('success', '已添加记忆');
        setForm({ type: 'PROFILE', content: '', importance: 0.8, tags: '' });
        setShowForm(false);
        fetchMemories(filter || undefined);
      } else flash('error', data.message || '添加失败');
    } catch (e: any) { flash('error', e.message || '添加失败'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('删除该记忆？')) return;
    try {
      const data = await memoryApi.delete(id);
      if (data.code === 200) {
        fetchMemories(filter || undefined);
        flash('success', '已删除');
      }
    } catch (e: any) { flash('error', e.message || '删除失败'); }
  };

  return (
    <section className="mt-6 border border-outline-variant bg-surface-container-lowest p-4 rounded">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-primary" />
          <h2 className="text-xs font-mono font-semibold text-on-surface uppercase tracking-wider">记忆管理</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => fetchMemories(filter || undefined)} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors" title="刷新">
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus size={12} /> 手动添加
          </button>
        </div>
      </div>

      <p className="text-[10px] text-on-surface-variant mb-3">
        这些记忆会在每次 Agent 对话开始时被检索并注入到提示词中。Agent 也会在每次对话完成后自动提取新记忆。
      </p>

      {/* Type filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => handleFilter('')}
          className={`px-2 py-1 text-[11px] border rounded ${filter === '' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/40 hover:bg-surface-container'}`}
        >全部</button>
        {TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => handleFilter(t.value)}
            title={t.desc}
            className={`px-2 py-1 text-[11px] border rounded ${filter === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/40 hover:bg-surface-container'}`}
          >{t.label}</button>
        ))}
      </div>

      {msg && (
        <div className={`mb-3 px-2 py-1.5 text-[11px] border ${msg.type === 'success' ? 'border-primary/40 text-primary bg-primary/10' : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>{msg.text}</div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-3 p-3 border border-outline-variant/50 bg-surface-container rounded space-y-2">
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="px-2 py-1.5 text-xs bg-surface border border-outline-variant/50 rounded outline-none"
            >
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label} - {t.desc}</option>)}
            </select>
            <input
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="记忆内容，例如：以后所有分析结果都用中文解释"
              className="px-2 py-1.5 text-xs bg-surface border border-outline-variant/50 rounded outline-none"
            />
          </div>
          <div className="grid grid-cols-[1fr_120px_auto] gap-2">
            <input
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="标签 (逗号分隔，可选)"
              className="px-2 py-1.5 text-xs bg-surface border border-outline-variant/50 rounded outline-none"
            />
            <input
              type="number" min={0} max={1} step={0.1}
              value={form.importance}
              onChange={e => setForm({ ...form, importance: Number(e.target.value) })}
              placeholder="重要性"
              className="px-2 py-1.5 text-xs bg-surface border border-outline-variant/50 rounded outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-3 py-1.5 text-[11px] uppercase bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="inline animate-spin" /> : '保存'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-6 text-center text-xs text-on-surface-variant"><Loader2 size={14} className="inline animate-spin" /> 加载中…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-xs text-on-surface-variant">暂无记忆。Agent 会在对话后自动积累，也可手动添加。</div>
      ) : (
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {items.map(m => (
            <div key={m.id} className="flex items-start gap-2 px-2.5 py-2 border border-outline-variant/40 bg-surface-container rounded">
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary flex-shrink-0">{typeLabel(m.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-on-surface break-words">{m.content}</div>
                <div className="text-[10px] text-on-surface-variant/70 mt-0.5">
                  重要性 {fmtImportance(m.importance)}
                  {m.createTime && ` · ${m.createTime}`}
                </div>
              </div>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-1 text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
                title="删除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function typeLabel(t: string): string {
  return TYPES.find(x => x.value === t)?.label || t;
}

function fmtImportance(v: number | string): string {
  const n = typeof v === 'number' ? v : Number(v);
  return isNaN(n) ? String(v) : n.toFixed(2);
}
