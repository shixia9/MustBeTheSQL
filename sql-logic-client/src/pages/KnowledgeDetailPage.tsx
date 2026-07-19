import { useParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { mockDocuments, mockKnowledgeSpaces } from '../mock/data';

export default function KnowledgeDetailPage() {
  const { spaceId } = useParams();
  const space = mockKnowledgeSpaces.find(s => s.id === spaceId);
  const docs = mockDocuments.filter(d => d.spaceId === spaceId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <BookOpen size={18} className="text-blue-600" />
        <h1 className="text-sm font-semibold">
          <span className="text-emerald-500">$</span> ls /knowledge/<span className="text-slate-900">{space?.name || spaceId}</span>
        </h1>
        {space && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-500">
            {space.status}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-left">
                <th className="py-3 px-4 font-medium text-xs">Document</th>
                <th className="py-3 px-4 font-medium text-xs">Size</th>
                <th className="py-3 px-4 font-medium text-xs">Status</th>
                <th className="py-3 px-4 font-medium text-xs">Chunks</th>
                <th className="py-3 px-4 font-medium text-xs">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="py-3 px-4 text-blue-600 text-sm">{doc.name}</td>
                  <td className="py-3 px-4 text-slate-500 text-sm">{doc.size}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs ${doc.status === 'synced' ? 'text-emerald-500' : 'text-amber-500'}`}>{doc.status}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-sm">{doc.chunks}</td>
                  <td className="py-3 px-4 text-slate-400 text-sm">{doc.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
