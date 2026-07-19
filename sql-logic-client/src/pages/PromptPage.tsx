import { useState } from 'react';
import { FileText } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { getIcon } from '../assets/icons';
import { mockPrompts } from '../mock/data';

export default function PromptPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPrompt = mockPrompts.find(p => p.id === selected);

  const EditIcon = getIcon('edit');
  const TrashIcon = getIcon('delete');
  const PlusIcon = getIcon('newItem');

  return (
    <ManagementPage
      title="prompts"
      icon={FileText}
      actions={
        <button className="btn-primary flex items-center gap-1.5">
          <PlusIcon size={14} /> New Prompt
        </button>
      }
    >
      <div className="flex gap-4 h-full">
        <div className="w-[280px] flex-shrink-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
                <th className="py-2 px-2 font-normal">Prompt</th>
                <th className="py-2 px-2 font-normal">Scene</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockPrompts.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`cursor-pointer hover:bg-slate-50
                    ${selected === p.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
                >
                  <td className="py-2 px-2 text-blue-600">{p.name}</td>
                  <td className="py-2 px-2 text-slate-500">{p.scene}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4">
          {selectedPrompt ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-900">{selectedPrompt.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 text-slate-500">
                  {selectedPrompt.scene}
                </span>
                <div className="ml-auto flex gap-1">
                  <button className="btn-ghost p-1"><EditIcon size={14} /></button>
                  <button className="btn-ghost p-1 text-red-600"><TrashIcon size={14} /></button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">{selectedPrompt.description}</p>
              <div className="text-[10px]">
                <span className="text-slate-500/60">Variables: </span>
                {selectedPrompt.variables.map((v: string) => (
                  <code key={v} className="px-1 py-0.5 bg-slate-50 rounded mr-1 text-emerald-500">{`{${v}}`}</code>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500/40 text-xs">
              &gt; select a prompt to view details
            </div>
          )}
        </div>
      </div>
    </ManagementPage>
  );
}
