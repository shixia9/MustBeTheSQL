import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { workspaceApi } from '../../api/client';

export default function WorkspaceSelector() {
  const {
    selectedWorkspaceId, workspaces, setWorkspaces,
    setSelectedWorkspaceId, loadingWorkspaces, setLoadingWorkspaces,
  } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (workspaces.length > 0) return;
    setLoadingWorkspaces(true);
    workspaceApi.list()
      .then(res => { if (res.code === 200 && Array.isArray(res.data)) setWorkspaces(res.data); })
      .catch(() => {})
      .finally(() => setLoadingWorkspaces(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = workspaces.find(w => w.id === selectedWorkspaceId);
  const roleClass: Record<string, string> = {
    OWNER: 'text-amber-500 bg-amber-500/10',
    ADMIN: 'text-blue-500 bg-blue-500/10',
    MEMBER: 'text-emerald-500 bg-emerald-500/10',
    VIEWER: 'text-gray-500 bg-gray-500/10',
  };

  return (
    <div ref={ref} className="relative px-3 mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs
          text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high
          border border-outline-variant/30 transition-colors"
      >
        <Building2 size={14} />
        <span className="flex-1 text-left truncate">
          {loadingWorkspaces ? 'Loading...' : current ? current.name : 'Personal'}
        </span>
        {current && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleClass[current.role] || ''}`}>
            {current.role}
          </span>
        )}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50
          bg-surface-container border border-outline-variant/30 rounded shadow-lg
          max-h-60 overflow-y-auto">
          <div className="p-1">
            <button
              onClick={() => { setSelectedWorkspaceId(null); setOpen(false); }}
              className={`w-full text-left px-2 py-1.5 rounded text-xs
                ${!selectedWorkspaceId ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              All (Personal)
            </button>
            {workspaces.map(w => (
              <button
                key={w.id}
                onClick={() => { setSelectedWorkspaceId(w.id); setOpen(false); }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2
                  ${selectedWorkspaceId === w.id ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="flex-1 truncate">{w.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleClass[w.role] || ''}`}>
                  {w.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
