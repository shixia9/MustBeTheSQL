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
        className="w-full max-w-md px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(skill => (
          <div key={skill.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
              <Puzzle size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">{skill.name}</h3>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                v{skill.version}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">{skill.description}</p>
            <div className="flex items-center gap-2">
              {skill.tags.map(tag => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500/70">
                  #{tag}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-slate-500/50">{skill.downloads} downloads</span>
            </div>
          </div>
        ))}
      </div>
    </ManagementPage>
  );
}
