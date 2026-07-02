import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react';
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
    OWNER: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    ADMIN: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    MEMBER: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    VIEWER: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
  };

  return (
    <div ref={ref} className="px-3 mb-2 overflow-visible">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs
          text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high
          border border-outline-variant/30 transition-colors"
      >
        <Building2 size={14} className="text-primary/60" />
        <span className="flex-1 text-left truncate">
          {loadingWorkspaces ? 'Loading...' : current ? current.name : 'Personal'}
        </span>
        {current && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleClass[current.role] || ''}`}>
            {current.role}
          </span>
        )}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {/* Inline dropdown — pushes nav items down when open */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="ws-dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-0.5">
              <button
                onClick={() => { setSelectedWorkspaceId(null); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors
                  ${!selectedWorkspaceId ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                <span className="flex-1 text-left">All (Personal)</span>
                {!selectedWorkspaceId && <Check size={10} className="text-primary" />}
              </button>
              {workspaces.map(w => (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWorkspaceId(w.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors
                    ${selectedWorkspaceId === w.id ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  <span className="flex-1 text-left truncate">{w.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleClass[w.role] || ''}`}>
                    {w.role}
                  </span>
                  {selectedWorkspaceId === w.id && <Check size={10} className="text-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
