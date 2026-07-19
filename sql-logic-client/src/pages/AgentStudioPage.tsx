import { useState, useEffect, useCallback } from 'react';
import { Bot, Plus, Trash2, Save, Star, Check, Loader2, Eye, EyeOff, Building2, GitBranch, History, RotateCcw, X } from 'lucide-react';
import { agentEntityApi, toolsApi } from '../api/client';
import type { AgentEntity, ToolDefinition } from '../types';
import { useI18n } from '../i18n';

const emptyDraft = (): Partial<AgentEntity> & { enabledTools: string[]; topK?: number; scoreThreshold?: number; ragEnabled?: boolean; contextStrategy?: string } => ({
  name: '',
  description: '',
  avatar: '🤖',
  systemPrompt: '',
  welcomeMessage: '',
  enabledTools: ['sql', 'schema', 'python', 'sample'],
  topK: 5,
  scoreThreshold: 0.6,
  ragEnabled: true,
  contextStrategy: 'TRUNCATE',
  memoryEnabled: true,
  isDefault: false,
});

const StatusDot = ({ on }: { on: boolean }) => (
  <span className={`w-2 h-2 inline-block rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`} />
);

const ToolTypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    BUILTIN: 'border-blue-500/40 text-blue-700 bg-blue-50',
    MCP_SSE: 'border-emerald-500/40 text-emerald-700 bg-emerald-50',
    MCP_STDIO: 'border-amber-500/40 text-amber-700 bg-amber-50',
    DOCKER_PYTHON: 'border-purple-500/40 text-purple-700 bg-purple-50',
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 border font-semibold uppercase tracking-wider rounded ${colors[type] || 'border-slate-300/40 text-slate-500 bg-slate-100'}`}>
      {type.replace(/_/g, '-')}
    </span>
  );
};

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
  const [availableTools, setAvailableTools] = useState<ToolDefinition[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [revertingId, setRevertingId] = useState<number | null>(null);

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

  const fetchTools = useCallback(async () => {
    try {
      const data = await toolsApi.list();
      if (data.code === 200 && data.data) {
        setAvailableTools(data.data);
      }
    } catch { /* tools are optional — keep fallback */ }
  }, []);
  useEffect(() => { fetchTools(); }, [fetchTools]);

  const selectAgent = (a: AgentEntity) => {
    setSelectedId(a.id);
    let ragTopK = 5; let ragThreshold = 0.6; let ragEnabled = true; let contextStrategy = 'TRUNCATE';
    try {
      if (a.ragConfig) {
        const rag = JSON.parse(a.ragConfig);
        ragTopK = rag.topK ?? 5; ragThreshold = rag.scoreThreshold ?? 0.6; ragEnabled = rag.enabled ?? true;
        contextStrategy = rag.contextStrategy ?? 'TRUNCATE';
      }
    } catch { /* keep defaults */ }
    setDraft({
      id: a.id, name: a.name, description: a.description ?? '',
      avatar: a.avatar ?? '🤖', systemPrompt: a.systemPrompt ?? '',
      welcomeMessage: a.welcomeMessage ?? '',
      enabledTools: a.enabledTools ?? ['sql', 'schema', 'python', 'sample'],
      topK: ragTopK, scoreThreshold: ragThreshold, ragEnabled, contextStrategy,
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

  const handleSaveSilent = async (): Promise<boolean> => {
    if (!selectedId || !draft.name?.trim()) return false;
    try {
      const data = await agentEntityApi.update(selectedId, {
        name: draft.name, description: draft.description, avatar: draft.avatar,
        systemPrompt: draft.systemPrompt, welcomeMessage: draft.welcomeMessage,
        enabledTools: draft.enabledTools,
        topK: draft.topK, scoreThreshold: draft.scoreThreshold, ragEnabled: draft.ragEnabled,
        contextStrategy: draft.contextStrategy,
        memoryEnabled: draft.memoryEnabled, isDefault: draft.isDefault,
      });
      return data.code === 200;
    } catch { return false; }
  };

  const handleSave = async () => {
    if (!selectedId || !draft.name?.trim()) { flash('error', t('agentStudio.nameRequired')); return; }
    setSaving(true);
    try {
      const ok = await handleSaveSilent();
      if (ok) {
        flash('success', t('agentStudio.saved'));
        await fetchAgents();
      } else {
        flash('error', t('agentStudio.saveFailed'));
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

  const fetchVersions = async () => {
    if (!selectedId) return;
    setVersionsLoading(true);
    try {
      const data = await agentEntityApi.listVersions(selectedId);
      if (data.code === 200) setVersions(data.data || []);
    } catch { /* ignore */ }
    finally { setVersionsLoading(false); }
  };

  const handlePublish = async () => {
    if (!selectedId) return;
    setPublishing(true);
    try {
      const saved = await handleSaveSilent();
      if (!saved) { flash('error', 'Save before publish failed'); setPublishing(false); return; }
      const data = await agentEntityApi.publish(selectedId);
      if (data.code === 200) {
        flash('success', 'Version published');
        await fetchVersions();
      } else flash('error', data.message || 'Publish failed');
    } catch (e: any) { flash('error', e.message || 'Publish failed'); }
    finally { setPublishing(false); }
  };

  const handleRevert = async (versionId: number) => {
    if (!selectedId || !confirm('Revert agent to this version? Unsaved changes will be lost.')) return;
    setRevertingId(versionId);
    try {
      const data = await agentEntityApi.revertToVersion(selectedId, versionId);
      if (data.code === 200) {
        flash('success', 'Reverted successfully');
        await fetchAgents();
        await fetchVersions();
      } else flash('error', data.message || 'Revert failed');
    } catch (e: any) { flash('error', e.message || 'Revert failed'); }
    finally { setRevertingId(null); }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!selectedId || !confirm('Delete this version permanently?')) return;
    try {
      const data = await agentEntityApi.deleteVersion(selectedId, versionId);
      if (data.code === 200) {
        flash('success', 'Version deleted');
        await fetchVersions();
      } else flash('error', data.message || 'Delete failed');
    } catch (e: any) { flash('error', e.message || 'Delete failed'); }
  };

  const selected = agents.find(a => a.id === selectedId);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Bot size={22} className="text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {t('agentStudio.title')}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('agentStudio.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t('agentStudio.newAgent')}
          </button>
        </div>

        {/* ── Flash messages ── */}
        {msg && (
          <div className={`mb-4 px-3 py-2 text-xs rounded-md ${
            msg.type === 'success'
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {msg.text}
          </div>
        )}

        {/* ── Two-panel layout ── */}
        <div className="grid grid-cols-[260px_1fr] gap-0 bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* ═══ Left: agent list ═══ */}
          <div className="border-r border-slate-200 bg-slate-50/50">
            <div className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              {t('agentStudio.lsAgents')} <span className="text-slate-400">({agents.length})</span>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="px-3 py-6 text-center text-xs text-slate-400">
                  <Loader2 size={14} className="inline animate-spin mr-1" /> {t('agentStudio.loading')}
                </div>
              ) : agents.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-slate-400">{t('agentStudio.noAgents')}</div>
              ) : (
                agents.map((a, i) => (
                  <div
                    key={a.id}
                    onClick={() => selectAgent(a)}
                    className={`px-3 py-2.5 flex items-center gap-2 border-b border-slate-100 cursor-pointer transition-colors text-xs ${
                      selectedId === a.id
                        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 border-l-2 border-transparent'
                    }`}
                  >
                    <span className="text-slate-400 w-5 flex-shrink-0 text-[10px]">
                      {selectedId === a.id ? <span className="text-blue-600">&#10095;</span> : `${String(i + 1).padStart(2, ' ')}`}
                    </span>
                    <span className="text-base flex-shrink-0">{a.avatar || '🤖'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate flex items-center gap-1.5">
                        {a.isDefault && <Star size={9} className="fill-amber-400 text-amber-400 flex-shrink-0" />}
                        <span className="truncate">{a.name}</span>
                        {a.workspaceId != null && (
                          <span className="text-[9px] px-1 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-0.5 flex-shrink-0 rounded">
                            <Building2 size={8} />
                          </span>
                        )}
                      </div>
                      {a.description && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{a.description}</div>
                      )}
                    </div>
                    <StatusDot on={a.status === 1} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ═══ Right: config editor ═══ */}
          <div className="bg-white">
            {!selected ? (
              <div className="px-6 py-20 text-center text-sm text-slate-400">
                {t('agentStudio.emptySelect')}
              </div>
            ) : (
              <div className="p-5 space-y-0">
                {/* ═══════ 1. BASIC INFO ═══════ */}
                <section className="pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-600 font-semibold text-xs">$</span>
                    <span className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{t('agentStudio.basicInfo')}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-3 items-start ml-5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('agentStudio.avatar')}</label>
                      <input
                        value={draft.avatar ?? ''}
                        onChange={e => setDraft({ ...draft, avatar: e.target.value })}
                        className="w-full px-2 py-2 text-center text-xl bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        maxLength={4}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('agentStudio.name')}</label>
                        <input
                          value={draft.name ?? ''}
                          onChange={e => setDraft({ ...draft, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder={t('agentStudio.namePlaceholder')}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('agentStudio.description')}</label>
                        <input
                          value={draft.description ?? ''}
                          onChange={e => setDraft({ ...draft, description: e.target.value })}
                          className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder={t('agentStudio.descriptionPlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ═══════ 2. PROMPT CONFIG ═══════ */}
                <section className="py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-semibold text-xs">$</span>
                      <span className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{t('agentStudio.promptConfig')}</span>
                    </div>
                    <button onClick={() => setShowPromptPreview(v => !v)} className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                      {showPromptPreview ? <EyeOff size={11} /> : <Eye size={11} />} {showPromptPreview ? t('agentStudio.hidePreview') : t('agentStudio.preview')}
                    </button>
                  </div>
                  <div className="ml-5 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        {t('agentStudio.systemPrompt')} <span className="text-slate-400 font-normal normal-case tracking-normal">{t('agentStudio.systemPromptSuffix')}</span>
                      </label>
                      <textarea
                        value={draft.systemPrompt ?? ''}
                        onChange={e => setDraft({ ...draft, systemPrompt: e.target.value })}
                        rows={showPromptPreview ? 6 : 3}
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-y"
                        placeholder={t('agentStudio.systemPromptPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('agentStudio.welcomeMessage')}</label>
                      <input
                        value={draft.welcomeMessage ?? ''}
                        onChange={e => setDraft({ ...draft, welcomeMessage: e.target.value })}
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder={t('agentStudio.welcomeMessagePlaceholder')}
                      />
                    </div>
                  </div>
                </section>

                {/* ═══════ 3. TOOL CONFIG ═══════ */}
                <section className="py-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-600 font-semibold text-xs">$</span>
                    <span className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{t('agentStudio.toolConfig')}</span>
                  </div>
                  <div className="ml-5 grid grid-cols-2 gap-2">
                    {availableTools.length > 0 ? availableTools.map(tool => {
                      const on = draft.enabledTools?.includes(tool.name);
                      return (
                        <button
                          key={tool.name}
                          onClick={() => toggleTool(tool.name)}
                          className={`flex items-start gap-3 px-3 py-2.5 text-left text-xs transition-all rounded-md ${
                            on
                              ? 'border border-blue-200 bg-blue-50/60 text-blue-700'
                              : 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            readOnly
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 mt-0.5"
                          />
                          <div>
                            <div className="text-xs font-semibold">{tool.displayName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{tool.description}</div>
                            <div className="mt-1"><ToolTypeBadge type={tool.type} /></div>
                          </div>
                        </button>
                      );
                    }) : (
                      <div className="col-span-2 text-[11px] text-slate-400 px-3 py-4">Loading tools...</div>
                    )}
                  </div>
                </section>

                {/* ═══════ 4. RAG CONFIG ═══════ */}
                <section className="py-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-600 font-semibold text-xs">$</span>
                    <span className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{t('agentStudio.ragConfig')}</span>
                  </div>
                  <div className="ml-5 space-y-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.ragEnabled ?? true}
                        onChange={e => setDraft({ ...draft, ragEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                      />
                      <span>{t('agentStudio.ragEnable')} <span className="text-slate-400">{t('agentStudio.ragSuffix')}</span></span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('agentStudio.topK')}</label>
                        <input
                          type="number" min={1} max={20}
                          value={draft.topK ?? 5}
                          onChange={e => setDraft({ ...draft, topK: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('agentStudio.scoreThreshold')}</label>
                        <input
                          type="number" min={0} max={1} step={0.05}
                          value={draft.scoreThreshold ?? 0.6}
                          onChange={e => setDraft({ ...draft, scoreThreshold: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Context Strategy</label>
                      <select
                        value={draft.contextStrategy ?? 'TRUNCATE'}
                        onChange={e => setDraft({ ...draft, contextStrategy: e.target.value })}
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="TRUNCATE">TRUNCATE — drop oldest turns when window overflows</option>
                        <option value="SUMMARIZE">SUMMARIZE — compress overflow turns into a summary</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* ═══════ 5. MEMORY ═══════ */}
                <section className="py-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-600 font-semibold text-xs">$</span>
                    <span className="text-sm font-semibold text-slate-900 uppercase tracking-wider">{t('agentStudio.memorySystem')}</span>
                  </div>
                  <div className="ml-5">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.memoryEnabled ?? true}
                        onChange={e => setDraft({ ...draft, memoryEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                      />
                      <span>{t('agentStudio.memoryEnable')}</span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1 ml-6">
                      {t('agentStudio.memoryDisabledNote')}
                    </p>
                  </div>
                </section>

                {/* ═══════ 6. VERSION MANAGEMENT ═══════ */}
                <section className="py-5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-semibold text-xs">$</span>
                      <span className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <History size={12} /> Versions
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setShowVersions(v => !v); if (!showVersions) fetchVersions(); }}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <GitBranch size={11} />
                        {showVersions ? 'hide' : 'versions'}
                      </button>
                      <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="btn-primary"
                      >
                        {publishing ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Publish
                      </button>
                    </div>
                  </div>

                  {showVersions && (
                    <div className="ml-5">
                      {versionsLoading ? (
                        <div className="text-[11px] text-slate-400 py-2">
                          <Loader2 size={11} className="inline animate-spin mr-1" />Loading...
                        </div>
                      ) : versions.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-2">
                          No versions yet. Click Publish to snapshot the current configuration.
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                          {versions.map((v: any) => (
                            <div key={v.id} className="flex items-center justify-between px-2.5 py-1.5 border border-slate-200 bg-slate-50/50 rounded-md text-xs">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">v{v.versionNumber}</span>
                                <span className="text-slate-400 text-[10px]">{v.publishTime}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleRevert(v.id)}
                                  disabled={revertingId === v.id}
                                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                                >
                                  {revertingId === v.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                                  Revert
                                </button>
                                <button
                                  onClick={() => handleDeleteVersion(v.id)}
                                  className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-red-500 ml-1 transition-colors"
                                  title="Delete version"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* ═══════ ACTIONS ═══════ */}
                <div className="flex items-center gap-2 pt-4 pb-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {t('agentStudio.save')}
                  </button>
                  <button
                    onClick={handleSetDefault}
                    disabled={selected.isDefault}
                    className="btn-ghost"
                  >
                    <Star size={13} className={selected.isDefault ? 'fill-amber-400 text-amber-400' : ''} />
                    {selected.isDefault ? t('agentStudio.alreadyDefault') : t('agentStudio.setDefault')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="ml-auto btn-danger"
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
    </div>
  );
}
