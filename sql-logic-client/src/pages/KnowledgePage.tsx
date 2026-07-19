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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mockKnowledgeSpaces.map(space => (
            <div key={space.id} className="panel p-4 hover:border-[#38bdf8]/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <DatabaseIcon size={16} className="text-[#38bdf8]" />
                <h3 className="text-sm font-semibold text-on-surface">{space.name}</h3>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono
                  ${space.status === 'active' ? 'bg-[#a3e635]/10 text-[#a3e635]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                  {space.status}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mb-2">{space.description}</p>
              <div className="flex items-center gap-4 text-[10px] text-on-surface-variant/60 font-mono">
                <span>{space.docCount} documents</span>
                <span>{space.vectorType}</span>
              </div>
            </div>
          ))}
          <div className="panel p-4 border-dashed border-on-surface-variant/20 flex items-center justify-center cursor-pointer hover:border-[#38bdf8]/30 transition-colors min-h-[120px]">
            <span className="text-on-surface-variant/40 font-mono text-xs">+ New Space</span>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant text-left">
              <th className="py-2 px-2 font-normal">Name</th>
              <th className="py-2 px-2 font-normal">Space</th>
              <th className="py-2 px-2 font-normal">Size</th>
              <th className="py-2 px-2 font-normal">Status</th>
              <th className="py-2 px-2 font-normal">Chunks</th>
              <th className="py-2 px-2 font-normal">Updated</th>
            </tr>
          </thead>
          <tbody>
            {mockDocuments.map(doc => {
              const space = mockKnowledgeSpaces.find(s => s.id === doc.spaceId);
              return (
                <tr key={doc.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high cursor-pointer">
                  <td className="py-2 px-2 text-[#38bdf8]">{doc.name}</td>
                  <td className="py-2 px-2 text-on-surface-variant">{space?.name || doc.spaceId}</td>
                  <td className="py-2 px-2 text-on-surface-variant">{doc.size}</td>
                  <td className="py-2 px-2">
                    <span className={`${doc.status === 'synced' ? 'text-[#a3e635]' : 'text-[#f59e0b]'}`}>{doc.status}</span>
                  </td>
                  <td className="py-2 px-2 text-on-surface-variant">{doc.chunks}</td>
                  <td className="py-2 px-2 text-on-surface-variant/60">{doc.updatedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {activeTab !== 'spaces' && activeTab !== 'documents' && (
        <div className="flex items-center justify-center h-64 text-on-surface-variant/40 font-mono text-xs">
          &gt; {activeTab} panel — pending backend implementation
        </div>
      )}
    </ManagementPage>
  );
}
