import { useParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { mockDocuments, mockKnowledgeSpaces } from '../mock/data';

export default function KnowledgeDetailPage() {
  const { spaceId } = useParams();
  const space = mockKnowledgeSpaces.find(s => s.id === spaceId);
  const docs = mockDocuments.filter(d => d.spaceId === spaceId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant bg-surface">
        <BookOpen size={18} className="text-[#38bdf8]" />
        <h1 className="text-sm font-semibold">
          <span className="text-[#a3e635]">$</span> ls /knowledge/<span className="text-on-surface">{space?.name || spaceId}</span>
        </h1>
        {space && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#a3e635]/10 text-[#a3e635]">
            {space.status}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant text-left">
              <th className="py-2 px-2 font-normal">Document</th>
              <th className="py-2 px-2 font-normal">Size</th>
              <th className="py-2 px-2 font-normal">Status</th>
              <th className="py-2 px-2 font-normal">Chunks</th>
              <th className="py-2 px-2 font-normal">Updated</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => (
              <tr key={doc.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high cursor-pointer">
                <td className="py-2 px-2 text-[#38bdf8]">{doc.name}</td>
                <td className="py-2 px-2 text-on-surface-variant">{doc.size}</td>
                <td className="py-2 px-2">
                  <span className={doc.status === 'synced' ? 'text-[#a3e635]' : 'text-[#f59e0b]'}>{doc.status}</span>
                </td>
                <td className="py-2 px-2 text-on-surface-variant">{doc.chunks}</td>
                <td className="py-2 px-2 text-on-surface-variant/60">{doc.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
