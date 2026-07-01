import { useState } from 'react';
import { Sliders, Palette, ShieldCheck, Plus, Clock, ChevronDown, Sun, Moon, CheckCircle2, RefreshCw, Trash2, Star, Edit, Eye, EyeOff, X, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';
import { useLlmConfig } from '../contexts/LlmConfigContext';
import { api, llmConfigApi } from '../api/client';
import { LlmConfig } from '../types';

interface LlmConfigFormState {
  configName: string;
  providerType: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  isDefault: boolean;
}

const defaultFormState: LlmConfigFormState = {
  configName: '',
  providerType: 'OPENAI_COMPATIBLE',
  baseUrl: '',
  apiKey: '',
  modelName: '',
  isDefault: false,
};

const providerPlaceholders: Record<string, { baseUrl: string; modelName: string; apiKey: string }> = {
  OPENAI_COMPATIBLE: {
    baseUrl: 'https://api.openai.com',
    modelName: 'gpt-4o',
    apiKey: 'sk-...'
  },
  ANTHROPIC: {
    baseUrl: 'https://api.anthropic.com',
    modelName: 'claude-sonnet-4-6-20250514',
    apiKey: 'sk-ant-...'
  }
};

export default function SettingsPage({ user }: { user: any }) {
  const [creativeControl, setCreativeControl] = useState(0.2);
  const { theme, setTheme, fontSize, setFontSize } = useSettings();
  const { configs, refreshConfigs } = useLlmConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LlmConfig | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<LlmConfigFormState>(defaultFormState);
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phase A4: per-config connection test state — keyed by configId.
  const [testing, setTesting] = useState<Record<number, boolean>>({});
  const [testResult, setTestResult] = useState<Record<number, { success: boolean; latencyMs: number; message?: string }>>({});

  const handleTestConnection = async (configId: number) => {
    setTesting(prev => ({ ...prev, [configId]: true }));
    try {
      const res = await llmConfigApi.test(configId);
      if (res.code === 200 && res.data) {
        setTestResult(prev => ({ ...prev, [configId]: res.data }));
      } else {
        setTestResult(prev => ({ ...prev, [configId]: { success: false, latencyMs: 0, message: res.message || 'Failed' } }));
      }
    } catch (e: any) {
      setTestResult(prev => ({ ...prev, [configId]: { success: false, latencyMs: 0, message: e?.message || 'Network error' } }));
    } finally {
      setTesting(prev => ({ ...prev, [configId]: false }));
    }
  };

  const providerLabel = (type: string) => {
    switch (type) {
      case 'ANTHROPIC': return 'Anthropic';
      case 'OPENAI_COMPATIBLE': return 'OpenAI Compatible';
      default: return type;
    }
  };

  const handleSaveConfig = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (editingConfig) {
        await api.put('/llm-config/update', {
          configId: editingConfig.id,
          configName: formData.configName || undefined,
          providerType: formData.providerType || undefined,
          baseUrl: formData.baseUrl || undefined,
          apiKey: formData.apiKey || undefined,
          modelName: formData.modelName || undefined,
          isDefault: formData.isDefault || undefined,
        });
      } else {
        await api.post('/llm-config/create', {
          configName: formData.configName,
          providerType: formData.providerType,
          baseUrl: formData.baseUrl || undefined,
          apiKey: formData.apiKey,
          modelName: formData.modelName || undefined,
          isDefault: formData.isDefault || undefined,
        });
      }
      await refreshConfigs();
      setShowAddForm(false);
      setEditingConfig(null);
      setFormData(defaultFormState);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfig = async (configId: number) => {
    setIsSaving(true);
    try {
      await api.delete(`/llm-config/${configId}`);
      await refreshConfigs();
      setShowDeleteConfirm(null);
    } catch (e) {
      console.error('Failed to delete config', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (configId: number) => {
    try {
      await api.post(`/llm-config/${configId}/setDefault`);
      await refreshConfigs();
    } catch (e) {
      console.error('Failed to set default config', e);
    }
  };

  const startEdit = (config: LlmConfig) => {
    setEditingConfig(config);
    setFormData({
      configName: config.configName,
      providerType: config.providerType,
      baseUrl: config.baseUrl || '',
      apiKey: '',  // Don't pre-fill encrypted key
      modelName: config.modelName || '',
      isDefault: config.isDefault,
    });
    setShowAddForm(true);
  };

  const startAdd = () => {
    setEditingConfig(null);
    setFormData(defaultFormState);
    setShowAddForm(true);
  };

  const placeholders = providerPlaceholders[formData.providerType] || providerPlaceholders.OPENAI_COMPATIBLE;

  return (
    <main className="ml-[200px] pt-12 min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-6">
          <h1 className="text-sm font-mono font-semibold text-on-surface">Settings</h1>
          <p className="text-xs text-on-surface-variant mt-0.5 font-mono">api configs and preferences</p>
        </div>

        <div className="grid grid-cols-12 gap-6 pb-24">
          {/* Left: Configuration Sections */}
          <section className="col-span-12 lg:col-span-8 space-y-6">
            {/* LLM Configs Section */}
            <div className="border border-outline-variant bg-surface-container-lowest p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono font-semibold text-on-surface">LLM API Configs</h2>
                <button
                  onClick={startAdd}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-primary border border-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus size={14} />
                  Add Config
                </button>
              </div>

              {/* Add/Edit Form */}
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 bg-surface-container-low border border-outline-variant/50 p-5 border border-primary/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold">{editingConfig ? 'Edit Configuration' : 'New Configuration'}</h3>
                    <button onClick={() => { setShowAddForm(false); setEditingConfig(null); }} className="text-on-surface-variant hover:text-on-surface">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">Config Name</label>
                      <input
                        className="w-full bg-surface-container-high border-none  px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                        value={formData.configName}
                        onChange={e => setFormData(prev => ({ ...prev, configName: e.target.value }))}
                        placeholder="My API Key"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">Provider Type</label>
                      <div className="relative">
                        <select
                          className="w-full bg-surface-container-high border-none  px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary appearance-none font-medium"
                          value={formData.providerType}
                          onChange={e => setFormData(prev => ({ ...prev, providerType: e.target.value }))}
                        >
                          <option value="OPENAI_COMPATIBLE">OpenAI Compatible</option>
                          <option value="ANTHROPIC">Anthropic (Claude)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 pointer-events-none text-outline-variant" size={16} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">Model Name</label>
                      <input
                        className="w-full bg-surface-container-high border-none  px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                        value={formData.modelName}
                        onChange={e => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
                        placeholder={placeholders.modelName}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">Base URL <span className="text-on-surface-variant/50">(optional)</span></label>
                      <input
                        className="w-full bg-surface-container-high border-none  px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary font-mono"
                        value={formData.baseUrl}
                        onChange={e => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder={placeholders.baseUrl}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">
                        API Key {editingConfig && <span className="text-on-surface-variant/50">(leave blank to keep existing)</span>}
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-surface-container-high border-none  px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary font-mono pr-10"
                          type={showApiKey ? 'text' : 'password'}
                          value={formData.apiKey}
                          onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder={placeholders.apiKey}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-2 text-on-surface-variant hover:text-on-surface"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:col-span-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isDefault}
                          onChange={e => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-surface-container-high peer-focus:ring-2 peer-focus:ring-primary -full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <span className="text-sm text-on-surface-variant">Set as default configuration</span>
                    </div>
                  </div>

                  {error && <p className="text-xs text-error mt-3">{error}</p>}

                  <div className="flex justify-end gap-3 mt-5">
                    <button
                      onClick={() => { setShowAddForm(false); setEditingConfig(null); setError(null); }}
                      className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveConfig}
                      disabled={isSaving}
                      className={`border border-primary text-primary bg-primary/5 px-6 py-2 text-xs font-mono hover:bg-primary/10 transition-all flex items-center gap-2 ${isSaving ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="animate-spin" size={14} />
                          Saving...
                        </>
                      ) : (
                        editingConfig ? 'Update' : 'Create'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Config List */}
              <div className="space-y-3">
                {configs.filter(c => c.status === 1).map(config => (
                  <div key={config.id} className="flex items-center justify-between border border-outline-variant bg-surface-container-high px-3 py-2 hover:border-on-surface-variant/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-on-surface truncate">{config.configName}</span>
                        {config.isDefault && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 ">Default</span>
                        )}
                      </div>
                      <div className="text-[10px] text-on-surface-variant mt-0.5">
                        {providerLabel(config.providerType)}{config.modelName ? ` · ${config.modelName}` : ''}{config.baseUrl ? ` · ${config.baseUrl}` : ''}
                      </div>
                      <div className="text-[10px] text-on-surface-variant/60 mt-0.5 font-mono">{config.apiKeyMasked}</div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3">
                      {/* Phase A4: health status dot */}
                      {testResult[config.id] && (
                        <span
                          className={`w-2 h-2 rounded-full ${testResult[config.id].success ? 'bg-emerald-500' : 'bg-red-500'}`}
                          title={testResult[config.id].message || (testResult[config.id].success ? 'Connected' : 'Failed')}
                        />
                      )}
                      {testResult[config.id]?.success && testResult[config.id].latencyMs > 0 && (
                        <span className="text-[10px] text-on-surface-variant/60 mr-1">{testResult[config.id].latencyMs}ms</span>
                      )}
                      {/* Phase A4: test connection button */}
                      <button
                        onClick={() => handleTestConnection(config.id)}
                        disabled={testing[config.id]}
                        className="p-1.5 text-on-surface-variant hover:text-amber-400 transition-colors disabled:opacity-50"
                        title="Test connection"
                      >
                        {testing[config.id]
                          ? <RefreshCw size={14} className="animate-spin" />
                          : <Zap size={14} />}
                      </button>
                      {!config.isDefault && (
                        <button
                          onClick={() => handleSetDefault(config.id)}
                          className="p-1.5 text-on-surface-variant hover:text-primary  transition-colors"
                          title="Set as default"
                        >
                          <Star size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(config)}
                        className="p-1.5 text-on-surface-variant hover:text-primary  transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(config.id)}
                        className="p-1.5 text-on-surface-variant hover:text-error  transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {configs.filter(c => c.status === 1).length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant text-sm">
                    No API configurations yet. Add one to get started.
                  </div>
                )}
              </div>

              {/* Delete Confirmation */}
              {showDeleteConfirm !== null && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                  <div className="bg-surface-container-high border border-outline-variant p-6 max-w-sm w-full mx-4 ">
                    <h3 className="text-sm font-bold mb-2">Delete Configuration</h3>
                    <p className="text-xs text-on-surface-variant mb-5">Are you sure you want to delete this configuration? This action cannot be undone.</p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(showDeleteConfirm)}
                        disabled={isSaving}
                        className="px-4 py-2 text-xs font-bold text-error bg-error/10 hover:bg-error/20 border border-outline-variant/50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant p-6 border border-outline-variant/20 ">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 border border-outline-variant/50 text-primary">
                  <Palette size={20} />
                </div>
                <h2 className="text-lg font-bold font-mono">Interface Preferences</h2>
              </div>

              <div className="flex flex-wrap gap-12">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Theme Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center gap-2 px-4 py-2 border border-outline-variant/50 transition-all ${
                        theme === 'light'
                          ? 'bg-surface-container-high border border-primary/20 text-primary font-bold '
                          : 'hover:bg-surface-container-low text-on-surface-variant font-bold'
                      } text-xs`}
                    >
                      <Sun size={16} />
                      Light
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center gap-2 px-4 py-2 border border-outline-variant/50 transition-all ${
                        theme === 'dark'
                          ? 'bg-surface-container-high border border-primary/20 text-primary font-bold '
                          : 'hover:bg-surface-container-low text-on-surface-variant font-bold'
                      } text-xs`}
                    >
                      <Moon size={16} />
                      Dark
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Editor Font Size</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                      className="w-8 h-8  border border-outline-variant/30 flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90"
                    >
                      -
                    </button>
                    <span className="font-mono text-sm font-bold w-10 text-center">{fontSize}px</span>
                    <button
                      onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                      className="w-8 h-8  border border-outline-variant/30 flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: minimal */}
          <aside className="col-span-12 lg:col-span-4 space-y-4">
            <div className="border border-outline-variant bg-surface-container-lowest p-4">
              <div className="text-xs font-mono font-semibold text-on-surface mb-2">About</div>
              <div className="text-[10px] text-on-surface-variant font-mono leading-relaxed">
                API keys are encrypted at rest (AES). Use read-only credentials for query generation.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}