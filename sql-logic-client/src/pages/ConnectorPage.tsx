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
            <div key={tmpl.id} className="panel p-4 hover:border-[#38bdf8]/30 transition-colors cursor-pointer">
              <h3 className="text-sm font-semibold text-on-surface mb-1">{tmpl.name}</h3>
              <p className="text-[11px] text-on-surface-variant mb-2">{tmpl.description}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-surface-container-high text-on-surface-variant/70">
                {tmpl.category}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'active' && (
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant text-left">
              <th className="py-2 px-2 font-normal">Name</th>
              <th className="py-2 px-2 font-normal">Type</th>
              <th className="py-2 px-2 font-normal">Status</th>
              <th className="py-2 px-2 font-normal">Activated</th>
            </tr>
          </thead>
          <tbody>
            {mockActiveConnectors.map(c => {
              const tmpl = mockConnectorTemplates.find(t => t.id === c.templateId);
              return (
                <tr key={c.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high">
                  <td className="py-2 px-2 text-[#38bdf8]">{c.name}</td>
                  <td className="py-2 px-2 text-on-surface-variant">{tmpl?.name || c.templateId}</td>
                  <td className="py-2 px-2 text-[#a3e635]">{c.status}</td>
                  <td className="py-2 px-2 text-on-surface-variant/60">{c.activatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </ManagementPage>
  );
}
