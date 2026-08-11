import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { skillApi } from '../api/client';

export default function SkillEditor() {
  const navigate = useNavigate();
  const { name: paramName } = useParams<{ name?: string }>();
  const isNew = !paramName || paramName === 'new';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('analysis');
  const [version, setVersion] = useState('1.0.0');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [requiredTools, setRequiredTools] = useState<string[]>([]);
  const [toolInput, setToolInput] = useState('');
  const [requiredKnowledge, setRequiredKnowledge] = useState<string[]>([]);
  const [knowledgeInput, setKnowledgeInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew && paramName) {
      skillApi.get(paramName).then(r => {
        if (r.data) {
          const s = r.data;
          setName(s.name || '');
          setDescription(s.description || '');
          setCategory(s.category || 'analysis');
          setVersion(s.version || '1.0.0');
          setTags(s.tags || []);
          setPromptTemplate(s.promptTemplate || '');
          setRequiredTools(s.requiredTools || []);
          setRequiredKnowledge(s.requiredKnowledge || []);
          setIsPublic(s.isPublic || false);
        }
      }).catch(() => {});
    }
  }, [paramName, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body = { name, description, category, version, tags, promptTemplate, requiredTools, requiredKnowledge, isPublic };
      if (isNew) await skillApi.create(body);
      else await skillApi.update(name, body);
      navigate('/skill-editor');
    } catch (e) { console.error('Save failed', e); }
    setSaving(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  const addTool = () => {
    if (toolInput.trim() && !requiredTools.includes(toolInput.trim())) {
      setRequiredTools([...requiredTools, toolInput.trim()]);
      setToolInput('');
    }
  };
  const addKnowledge = () => {
    if (knowledgeInput.trim() && !requiredKnowledge.includes(knowledgeInput.trim())) {
      setRequiredKnowledge([...requiredKnowledge, knowledgeInput.trim()]);
      setKnowledgeInput('');
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--card-bg)' }}>
        <button onClick={() => navigate('/skills')}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[12px] font-medium"
          style={{ color: 'var(--ink-secondary)' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1" />
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
          {isNew ? 'New Skill' : `Edit: ${paramName}`}
        </h2>
        <div className="flex-1" />
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[900px] mx-auto flex flex-col gap-6">
          {/* Basic Info */}
          <section className="rounded-xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-tertiary)' }}>Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--ink-secondary)' }}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: 'var(--app-bg)', border: '1px solid var(--border-default)', color: 'var(--ink)' }}
                  placeholder="e.g., sales-analysis" />
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--ink-secondary)' }}>Version</label>
                <input value={version} onChange={e => setVersion(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: 'var(--app-bg)', border: '1px solid var(--border-default)', color: 'var(--ink)' }} />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--ink-secondary)' }}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none"
                  style={{ background: 'var(--app-bg)', border: '1px solid var(--border-default)', color: 'var(--ink)' }}
                  placeholder="What does this skill do?" />
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--ink-secondary)' }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
                  style={{ background: 'var(--app-bg)', border: '1px solid var(--border-default)', color: 'var(--ink)' }}>
                  <option value="analysis">Analysis</option>
                  <option value="generation">Generation</option>
                  <option value="visualization">Visualization</option>
                  <option value="data-engineering">Data Engineering</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} id="isPublic" />
                <label htmlFor="isPublic" className="text-[12px]" style={{ color: 'var(--ink-secondary)' }}>Publish to Skill Hub</label>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4">
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--ink-secondary)' }}>Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                    style={{ background: 'var(--primary-soft)', color: 'var(--color-primary)' }}>
                    {t} <X size={12} className="cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))} />
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-1.5 rounded-md text-[12px] outline-none"
                  style={{ background: 'var(--app-bg)', border: '1px solid var(--border-default)', color: 'var(--ink)' }}
                  placeholder="Type tag and press Enter" />
                <button onClick={addTag} className="px-2 py-1 rounded-md" style={{ color: 'var(--color-primary)' }}><Plus size={16} /></button>
              </div>
            </div>
          </section>

          {/* Required Tools & Knowledge */}
          <section className="rounded-xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-tertiary)' }}>Dependencies</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--ink-secondary)' }}>Required Tools</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {requiredTools.map(t => (
                    <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px]"
                      style={{ background: '#3b8c5e18', color: '#3b8c5e' }}>
                      {t} <X size={12} className="cursor-pointer" onClick={() => setRequiredTools(requiredTools.filter(x => x !== t))} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={toolInput} onChange={e => setToolInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTool())}
                    className="flex-1 px-3 py-1.5 rounded-md text-[12px] outline-none"
                    style={{ background: 'var(--app-bg)', border: '1px solid var(--border-default)', color: 'var(--ink)' }}
                    placeholder="e.g., sql_generation" />
                  <button onClick={addTool} className="px-2 py-1 rounded-md" style={{ color: 'var(--color-primary)' }}><Plus size={16} /></button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: 'var(--ink-secondary)' }}>Required Knowledge</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {requiredKnowledge.map(k => (
                    <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px]"
                      style={{ background: '#f0a04018', color: '#f0a040' }}>
                      {k} <X size={12} className="cursor-pointer" onClick={() => setRequiredKnowledge(requiredKnowledge.filter(x => x !== k))} />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={knowledgeInput} onChange={e => setKnowledgeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKnowledge())}
                    className="flex-1 px-3 py-1.5 rounded-md text-[12px] outline-none"
                    style={{ background: 'var(--app-bg)', border: '1px solid var(--border-default)', color: 'var(--ink)' }}
                    placeholder="e.g., sales_metrics" />
                  <button onClick={addKnowledge} className="px-2 py-1 rounded-md" style={{ color: 'var(--color-primary)' }}><Plus size={16} /></button>
                </div>
              </div>
            </div>
          </section>

          {/* Prompt Template Editor */}
          <section className="rounded-xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-tertiary)' }}>Prompt Template</h3>
            <p className="text-[11px] mb-3" style={{ color: 'var(--ink-tertiary)' }}>
              Use {'{variableName}'} for dynamic variables. This template is injected into the Agent's system prompt when the skill is activated.
            </p>
            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
              <Editor
                height="280px"
                defaultLanguage="markdown"
                value={promptTemplate}
                onChange={v => setPromptTemplate(v || '')}
                theme="vs-dark"
                options={{
                  fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false }, lineNumbers: 'on',
                  wordWrap: 'on', lineHeight: 1.6,
                  padding: { top: 12, bottom: 12 },
                }}
                beforeMount={monaco => {
                  monaco.editor.defineTheme('vs-dark', {
                    base: 'vs-dark', inherit: true,
                    rules: [{ token: '', foreground: 'e2e8f0', background: '1e2433' }],
                    colors: { 'editor.background': '#1e2433', 'editor.foreground': '#e2e8f0' },
                  });
                }}
              />
            </div>
          </section>

          {/* Preview */}
          <section className="rounded-xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-tertiary)' }}>Preview</h3>
            <div className="rounded-md p-4 text-[12px]" style={{ background: '#1e2433', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {promptTemplate || '// Prompt template will appear here'}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
