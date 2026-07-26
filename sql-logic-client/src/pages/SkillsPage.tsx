import { useState, useEffect } from 'react';
import { Puzzle, Plus, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ManagementPage from '../components/layout/ManagementPage';
import { skillApi } from '../api/client';

export default function SkillsPage() {
  const [search, setSearch] = useState('');
  const [skills, setSkills] = useState<any[]>([]);
  const [tab, setTab] = useState<'my' | 'hub'>('my');
  const navigate = useNavigate();

  useEffect(() => {
    if (tab === 'my') skillApi.list().then(r => { if (r.data) setSkills(r.data); }).catch(() => {});
    else skillApi.hubBrowse().then(r => { if (r.data) setSkills(r.data); }).catch(() => {});
  }, [tab]);

  const filtered = skills.filter(s =>
    !search || s.name?.includes(search) || s.description?.includes(search)
  );

  return (
    <ManagementPage title="Skills" icon={Puzzle}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/skill-editor')} className="btn-primary flex items-center gap-1.5 text-[12px]">
            <Plus size={14} /> Create
          </button>
        </div>
      }>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('my')} className="px-4 py-1.5 rounded-md text-[12px] font-semibold"
          style={{ background: tab === 'my' ? 'var(--color-primary-soft)' : 'transparent', color: tab === 'my' ? 'var(--color-primary)' : 'var(--color-ink-secondary)' }}>
          My Skills
        </button>
        <button onClick={() => setTab('hub')} className="px-4 py-1.5 rounded-md text-[12px] font-semibold"
          style={{ background: tab === 'hub' ? 'var(--color-primary-soft)' : 'transparent', color: tab === 'hub' ? 'var(--color-primary)' : 'var(--color-ink-secondary)' }}>
          Hub
        </button>
        <div className="flex-1" />
        <input type="text" placeholder="Search skills..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 rounded-md text-[13px] outline-none"
          style={{ background: 'var(--color-app-bg)', border: '1px solid var(--color-border-default)', color: 'var(--color-ink)' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <p className="col-span-full text-[12px]" style={{ color: 'var(--color-ink-tertiary)' }}>
            {tab === 'my' ? 'No skills yet. Create one or browse the Hub.' : 'No public skills found.'}
          </p>
        )}
        {filtered.map(skill => (
          <div key={skill.name} className="rounded-xl p-4 cursor-pointer" style={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border-subtle)' }}
            onClick={() => tab === 'my' ? navigate(`/skill-editor/${skill.name}`) : skillApi.hubInstall(skill.name)}>
            <div className="flex items-center gap-2 mb-1">
              <Puzzle size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--color-ink)' }}>{skill.name}</h3>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                v{skill.version || '1.0.0'}
              </span>
            </div>
            <p className="text-[11px] mb-2" style={{ color: 'var(--color-ink-tertiary)' }}>{skill.description}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(skill.tags || []).slice(0, 4).map((tag: string) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-border-subtle)', color: 'var(--color-ink-tertiary)' }}>
                  #{tag}
                </span>
              ))}
              {tab === 'hub' && (
                <span className="ml-auto text-[11px] font-semibold" style={{ color: 'var(--color-primary)' }}>Install</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4" style={{ borderTop: '0.5px solid var(--color-border-subtle)' }}>
        <p className="text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>
          Skills inject domain-specific guidance into Agent prompts. Create custom skills for sales analysis, user retention, anomaly detection, or any repeatable analysis pattern.
        </p>
      </div>
    </ManagementPage>
  );
}
