import { useState, useEffect, useCallback } from 'react';
import { Bot, Plus, Trash2, Save, Star, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { agentEntityApi } from '../api/client';
import type { AgentEntity } from '../types';
import { useI18n } from '../i18n';

const ALL_TOOLS: { key: string; labelKey: string; descKey: string }[] = [
  { key: 'sql', labelKey: 'agentStudio.toolSql', descKey: 'agentStudio.toolSqlDesc' },
  { key: 'schema', labelKey: 'agentStudio.toolSchema', descKey: 'agentStudio.toolSchemaDesc' },
  { key: 'python', labelKey: 'agentStudio.toolPython', descKey: 'agentStudio.toolPythonDesc' },
  { key: 'sample', labelKey: 'agentStudio.toolSample', descKey: 'agentStudio.toolSampleDesc' },
];

const emptyDraft = (): Partial<AgentEntity> & { enabledTools: string[]; topK?: number; scoreThreshold?: number; ragEnabled?: boolean } => ({
  name: '',
  description: '',
  avatar: '🤖',
  systemPrompt: '',
  welcomeMessage: '',
  enabledTools: ['sql', 'schema', 'python', 'sample'],
  topK: 5,
  scoreThreshold: 0.6,
  ragEnabled: true,
  memoryEnabled: true,
  isDefault: false,
});

const StatusDot = ({ on }: { on: boolean }) => (
  <span className={`w-2 h-2 inline-block border ${on ? 'bg-primary border-primary' : 'bg-transparent border-outline-variant'}`} />
);

export default function AgentStudioPage({ user }: { user: any }) {
  const { t } = useI18n();
  const [agents, setAgents] = useState<AgentEntity[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const flash = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agentEntityApi.list();
      if (data.code === 200) {
        setAgents(data.data || []);
        if ((data.data || []).length > 0 && selectedId == null) {
          selectAgent(data.data[0]);
        }
      }
    } catch (e: any) {
      flash('error', e.message || t('agentStudio.createFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const selectAgent = (a: AgentEntity) => {
    setSelectedId(a.id);
    let ragTopK = 5; let ragThreshold = 0.6; let ragEnabled = true;
    try {
      if (a.ragConfig) {
        const rag = JSON.parse(a.ragConfig);
        ragTopK = rag.topK ?? 5; ragThreshold = rag.scoreThreshold ?? 0.6; ragEnabled = rag.enabled ?? true;
      }
    } catch { /* keep defaults */ }
    setDraft({
      id: a.id, name: a.name, description: a.description ?? '',
      avatar: a.avatar ?? '🤖', systemPrompt: a.systemPrompt ?? '',
      welcomeMessage: a.welcomeMessage ?? '',
      enabledTools: a.enabledTools ?? ['sql', 'schema', 'python', 'sample'],
      topK: ragTopK, scoreThreshold: ragThreshold, ragEnabled,
      memoryEnabled: a.memoryEnabled ?? true, isDefault: a.isDefault ?? false,
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await agentEntityApi.create({
        name: 'New Agent', description: '', avatar: '🤖',
        systemPrompt: '', welcomeMessage: '',
        enabledTools: ['sql', 'schema', 'python', 'sample'],
        topK: 5, scoreThreshold: 0.6, ragEnabled: true,
        memoryEnabled: true, isDefault: false,
      });
      if (data.code === 200) {
        await fetchAgents();
        selectAgent(data.data);
        flash('success', t('agentStudio.created'));
      }
    } catch (e: any) { flash('error', e.message || t('agentStudio.createFailed')); }
    finally { setCreating(false); }
  };

  const handleSave = async () => {
    if (!selectedId || !draft.name?.trim()) { flash('error', t('agentStudio.nameRequired')); return; }
    setSaving(true);
    try {
      const data = await agentEntityApi.update(selectedId, {
        name: draft.name, description: draft.description, avatar: draft.avatar,
        systemPrompt: draft.systemPrompt, welcomeMessage: draft.welcomeMessage,
        enabledTools: draft.enabledTools,
        topK: draft.topK, scoreThreshold: draft.scoreThreshold, ragEnabled: draft.ragEnabled,
        memoryEnabled: draft.memoryEnabled, isDefault: draft.isDefault,
      });
      if (data.code === 200) {
        flash('success', t('agentStudio.saved'));
        await fetchAgents();
      } else {
        flash('error', data.message || t('agentStudio.saveFailed'));
      }
    } catch (e: any) { flash('error', e.message || t('agentStudio.saveFailed')); }
    finally { setSaving(false); }
  };

  const handleSetDefault = async () => {
    if (!selectedId) return;
    try {
      const data = await agentEntityApi.setDefault(selectedId);
      if (data.code === 200) { flash('success', t('agentStudio.setDefaultSuccess')); await fetchAgents(); }
    } catch (e: any) { flash('error', e.message || t('agentStudio.setDefaultFailed')); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm(t('agentStudio.deleteConfirm'))) return;
    try {
      const data = await agentEntityApi.delete(selectedId);
      if (data.code === 200) {
        setSelectedId(null);
        setDraft(emptyDraft());
        await fetchAgents();
        flash('success', t('agentStudio.deleted'));
      }
    } catch (e: any) { flash('error', e.message || t('agentStudio.deleteFailed')); }
  };

  const toggleTool = (key: string) => {
    setDraft(d => ({
      ...d,
      enabledTools: d.enabledTools?.includes(key)
        ? d.enabledTools.filter(t => t !== key)
        : [...(d.enabledTools ?? []), key],
    }));
  };

  const selected = agents.find(a => a.id === selectedId);

  return (
    <main className="ml-[200px] pt-12 min-h-screen bg-surface text-on-surface font-mono">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-outline-variant/40">
          <div className="flex items-center gap-3">
            <Bot size={22} className="text-primary" />
            <div>
              <h1 className="text-base font-semibold tracking-wider uppercase">
                <span className="text-primary">$</span> {t('agentStudio.title')}
              </h1>
              <p className="text-[11px] text-on-surface-variant mt-0.5 font-mono">
                {t('agentStudio.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t('agentStudio.newAgent')}
          </button>
        </div>

        {/* ── Flash messages ── */}
        {msg && (
          <div className={`mb-4 px-3 py-2 text-xs font-mono border ${msg.type === 'success' ? 'border-primary/40 text-primary bg-primary/10' : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>
            <span className="text-primary mr-2">{msg.type === 'success' ? '✓' : '✗'}</span>
            {msg.text}
          </div>
        )}

        {/* ── Two-panel layout ── */}
        <div className="grid grid-cols-[260px_1fr] gap-0 border border-outline-variant/40">
          {/* ═══ Left: agent file browser ═══ */}
          <div className="border-r border-outline-variant/40 bg-surface-container-lowest">
            <div className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-on-surface-variant border-b border-dashed border-outline-variant/40 bg-surface-container-low font-semibold">
              <span className="text-primary">$</span> {t('agentStudio.lsAgents')} <span className="text-on-surface-variant/50">({agents.length})</span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-xs text-on-surface-variant">
                  <Loader2 size={14} className="inline animate-spin mr-1" /> {t('agentStudio.loading')}
                </div>
              ) : agents.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-on-surface-variant">{t('agentStudio.noAgents')}</div>
              ) : (
                agents.map((a, i) => (
                  <div
                    key={a.id}
                    onClick={() => selectAgent(a)}
                    className={`px-3 py-2.5 flex items-center gap-2 border-b border-outline-variant/20 cursor-pointer transition-colors font-mono text-xs ${
                      selectedId === a.id
                        ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
                        : 'hover:bg-surface-container border-l-2 border-l-transparent'
                    }`}
                  >
                    <span className="text-on-surface-variant/40 w-5 flex-shrink-0 text-[10px]">
                      {selectedId === a.id ? <span className="text-primary">❯</span> : `${String(i + 1).padStart(2, ' ')}`}
                    </span>
                    <span className="text-base flex-shrink-0">{a.avatar || '🤖'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate flex items-center gap-1.5">
                        {a.isDefault && <Star size={9} className="fill-primary text-primary flex-shrink-0" />}
                        <span className="truncate">{a.name}</span>
                      </div>
                      {a.description && (
                        <div className="text-[10px] text-on-surface-variant truncate mt-0.5"># {a.description}</div>
                      )}
                    </div>
                    <StatusDot on={a.status === 1} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ═══ Right: terminal config editor ═══ */}
          <div className="bg-surface-container-lowest">
            {!selected ? (
              <div className="px-6 py-20 text-center text-xs text-on-surface-variant">
                <span className="text-primary">$</span> {t('agentStudio.emptySelect')}
              </div>
            ) : (
              <div className="p-5 space-y-0">
                {/* ═══════ 1. BASIC INFO ═══════ */}
                <section className="pb-5 border-b border-dashed border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-primary font-semibold">$</span>
                    <span className="text-on-surface font-semibold uppercase tracking-wider">{t('agentStudio.basicInfo')}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-3 items-start ml-5">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">{t('agentStudio.avatar')}</label>
                      <input
                        value={draft.avatar ?? ''}
                        onChange={e => setDraft({ ...draft, avatar: e.target.value })}
                        className="w-full px-2 py-2 text-center text-xl bg-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">{t('agentStudio.name')}</label>
                        <input
                          value={draft.name ?? ''}
                          onChange={e => setDraft({ ...draft, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                          placeholder={t('agentStudio.namePlaceholder')}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">{t('agentStudio.description')}</label>
                        <input
                          value={draft.description ?? ''}
                          onChange={e => setDraft({ ...draft, description: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                          placeholder={t('agentStudio.descriptionPlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ═══════ 2. PROMPT CONFIG ═══════ */}
                <section className="py-5 border-b border-dashed border-outline-variant/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-primary font-semibold">$</span>
                      <span className="text-on-surface font-semibold uppercase tracking-wider">{t('agentStudio.promptConfig')}</span>
                    </div>
                    <button onClick={() => setShowPromptPreview(v => !v)} className="text-[10px] text-on-surface-variant hover:text-primary flex items-center gap-1">
                      {showPromptPreview ? <EyeOff size={11} /> : <Eye size={11} />} {showPromptPreview ? t('agentStudio.hidePreview') : t('agentStudio.preview')}
                    </button>
                  </div>
                  <div className="ml-5 space-y-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">
                        {t('agentStudio.systemPrompt')} <span className="text-on-surface-variant/50">{t('agentStudio.systemPromptSuffix')}</span>
                      </label>
                      <textarea
                        value={draft.systemPrompt ?? ''}
                        onChange={e => setDraft({ ...draft, systemPrompt: e.target.value })}
                        rows={showPromptPreview ? 6 : 3}
                        className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant/50 focus:border-primary outline-none resize-y font-mono"
                        placeholder={t('agentStudio.systemPromptPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">{t('agentStudio.welcomeMessage')}</label>
                      <input
                        value={draft.welcomeMessage ?? ''}
                        onChange={e => setDraft({ ...draft, welcomeMessage: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                        placeholder={t('agentStudio.welcomeMessagePlaceholder')}
                      />
                    </div>
                  </div>
                </section>

                {/* ═══════ 3. TOOL CONFIG ═══════ */}
                <section className="py-5 border-b border-dashed border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-primary font-semibold">$</span>
                    <span className="text-on-surface font-semibold uppercase tracking-wider">{t('agentStudio.toolConfig')}</span>
                  </div>
                  <div className="ml-5 grid grid-cols-2 gap-2">
                    {ALL_TOOLS.map(tool => {
                      const on = draft.enabledTools?.includes(tool.key);
                      return (
                        <button
                          key={tool.key}
                          onClick={() => toggleTool(tool.key)}
                          className={`flex items-start gap-3 px-3 py-2.5 text-left text-xs transition-all font-mono ${
                            on
                              ? 'tool-toggle-on'
                              : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            readOnly
                            className="term-checkbox mt-0.5"
                          />
                          <div>
                            <div className="text-xs font-semibold">{t(tool.labelKey)}</div>
                            <div className="text-[10px] text-on-surface-variant/70 mt-0.5"># {t(tool.descKey)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* ═══════ 4. RAG CONFIG ═══════ */}
                <section className="py-5 border-b border-dashed border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-primary font-semibold">$</span>
                    <span className="text-on-surface font-semibold uppercase tracking-wider">{t('agentStudio.ragConfig')}</span>
                  </div>
                  <div className="ml-5 space-y-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={draft.ragEnabled ?? true}
                        onChange={e => setDraft({ ...draft, ragEnabled: e.target.checked })}
                        className="term-checkbox"
                      />
                      <span>{t('agentStudio.ragEnable')} <span className="text-on-surface-variant/60">{t('agentStudio.ragSuffix')}</span></span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">{t('agentStudio.topK')}</label>
                        <input
                          type="number" min={1} max={20}
                          value={draft.topK ?? 5}
                          onChange={e => setDraft({ ...draft, topK: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">{t('agentStudio.scoreThreshold')}</label>
                        <input
                          type="number" min={0} max={1} step={0.05}
                          value={draft.scoreThreshold ?? 0.6}
                          onChange={e => setDraft({ ...draft, scoreThreshold: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm bg-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ═══════ 5. MEMORY ═══════ */}
                <section className="py-5 border-b border-dashed border-outline-variant/30">
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-primary font-semibold">$</span>
                    <span className="text-on-surface font-semibold uppercase tracking-wider">{t('agentStudio.memorySystem')}</span>
                  </div>
                  <div className="ml-5">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={draft.memoryEnabled ?? true}
                        onChange={e => setDraft({ ...draft, memoryEnabled: e.target.checked })}
                        className="term-checkbox"
                      />
                      <span>{t('agentStudio.memoryEnable')}</span>
                    </label>
                    <p className="text-[10px] text-on-surface-variant mt-1 ml-6">
                      {t('agentStudio.memoryDisabledNote')}
                    </p>
                  </div>
                </section>

                {/* ═══════ ACTIONS ═══════ */}
                <div className="flex items-center gap-2 pt-4 pb-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs uppercase tracking-wider bg-primary text-on-primary font-semibold hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono shadow-sm"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {t('agentStudio.save')}
                  </button>
                  <button
                    onClick={handleSetDefault}
                    disabled={selected.isDefault}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                  >
                    <Star size={13} className={selected.isDefault ? 'fill-primary text-primary' : ''} />
                    {selected.isDefault ? t('agentStudio.alreadyDefault') : t('agentStudio.setDefault')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition-colors font-mono"
                  >
                    <Trash2 size={13} />
                    {t('agentStudio.delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
