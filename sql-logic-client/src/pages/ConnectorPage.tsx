import { useState } from 'react';
import { Plug } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { getIcon } from '../assets/icons';
import { mockConnectorTemplates, mockActiveConnectors } from '../mock/data';

const tabs = [
  { key: 'templates', label: 'Templates' },
  { key: 'active', label: 'Active' },
];

export default function ConnectorPage() {
  const [activeTab, setActiveTab] = useState('templates');

  const PlusIcon = getIcon('newItem');

  return (
    <ManagementPage
      title="connectors"
      icon={Plug}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <button className="btn-primary flex items-center gap-1.5">
          <PlusIcon size={14} /> Add Custom
        </button>
      }
    >
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mockConnectorTemplates.map(tmpl => (
            <div key={tmpl.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{tmpl.name}</h3>
              <p className="text-[11px] text-slate-500 mb-2">{tmpl.description}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500/70">
                {tmpl.category}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'active' && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-left">
              <th className="py-2 px-2 font-normal">Name</th>
              <th className="py-2 px-2 font-normal">Type</th>
              <th className="py-2 px-2 font-normal">Status</th>
              <th className="py-2 px-2 font-normal">Activated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockActiveConnectors.map(c => {
              const tmpl = mockConnectorTemplates.find(t => t.id === c.templateId);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2 px-2 text-blue-600">{c.name}</td>
                  <td className="py-2 px-2 text-slate-500">{tmpl?.name || c.templateId}</td>
                  <td className="py-2 px-2 text-emerald-500">{c.status}</td>
                  <td className="py-2 px-2 text-slate-500/60">{c.activatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </ManagementPage>
  );
}
