import { useState } from 'react';
import { Puzzle, Upload, Download } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { mockSkills } from '../mock/data';

export default function SkillsPage() {
  const [search, setSearch] = useState('');

  const filtered = mockSkills.filter(s =>
    !search || s.name.includes(search) || s.description.includes(search)
  );

  return (
    <ManagementPage
      title="skills"
      icon={Puzzle}
      actions={
        <div className="flex items-center gap-2">
          <button className="btn-ghost flex items-center gap-1.5" title="Coming soon">
            <Upload size={14} /> Import
          </button>
        </div>
      }
    >
      <input
        type="text"
        placeholder="> search skills..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input-flat w-full max-w-md mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(skill => (
          <div key={skill.id} className="panel p-4 hover:border-[#38bdf8]/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
              <Puzzle size={16} className="text-[#38bdf8]" />
              <h3 className="text-sm font-semibold text-on-surface">{skill.name}</h3>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono bg-primary/10 text-primary">
                v{skill.version}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mb-2">{skill.description}</p>
            <div className="flex items-center gap-2">
              {skill.tags.map(tag => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-surface-container-high text-on-surface-variant/70">
                  #{tag}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-on-surface-variant/50 font-mono">{skill.downloads} downloads</span>
            </div>
          </div>
        ))}
      </div>
    </ManagementPage>
  );
}
