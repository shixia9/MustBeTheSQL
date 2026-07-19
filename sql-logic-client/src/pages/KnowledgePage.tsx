import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import { getIcon } from '../assets/icons';
import { mockKnowledgeSpaces, mockDocuments } from '../mock/data';

const tabs = [
  { key: 'spaces', label: 'Spaces' },
  { key: 'documents', label: 'Documents' },
  { key: 'chunks', label: 'Chunks' },
  { key: 'graph', label: 'Graph' },
  { key: 'recall', label: 'Recall Test' },
];

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState('spaces');

  const PlusIcon = getIcon('newItem');
  const DatabaseIcon = getIcon('datasources');

  return (
    <ManagementPage
      title="knowledge"
      icon={BookOpen}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <button className="btn-primary flex items-center gap-1.5">
          <PlusIcon size={14} /> New Space
        </button>
      }
    >
      {activeTab === 'spaces' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockKnowledgeSpaces.map(space => (
            <div key={space.id} className="bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <DatabaseIcon size={16} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">{space.name}</h3>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full
                  ${space.status === 'active' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                  {space.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{space.description}</p>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span>{space.docCount} documents</span>
                <span>{space.vectorType}</span>
              </div>
            </div>
          ))}
          <div className="bg-white border border-dashed border-slate-200 rounded-lg p-5 flex items-center justify-center cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all min-h-[120px]">
            <span className="text-slate-400 text-sm font-medium">+ New Space</span>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="py-3 px-4 font-medium text-xs">Name</th>
                <th className="py-3 px-4 font-medium text-xs">Space</th>
                <th className="py-3 px-4 font-medium text-xs">Size</th>
                <th className="py-3 px-4 font-medium text-xs">Status</th>
                <th className="py-3 px-4 font-medium text-xs">Chunks</th>
                <th className="py-3 px-4 font-medium text-xs">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockDocuments.map(doc => {
                const space = mockKnowledgeSpaces.find(s => s.id === doc.spaceId);
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="py-3 px-4 text-blue-600 text-sm">{doc.name}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{space?.name || doc.spaceId}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{doc.size}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs ${doc.status === 'synced' ? 'text-emerald-500' : 'text-amber-500'}`}>{doc.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{doc.chunks}</td>
                    <td className="py-3 px-4 text-slate-400 text-sm">{doc.updatedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab !== 'spaces' && activeTab !== 'documents' && (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          {activeTab} panel -- pending backend implementation
        </div>
      )}
    </ManagementPage>
  );
}
