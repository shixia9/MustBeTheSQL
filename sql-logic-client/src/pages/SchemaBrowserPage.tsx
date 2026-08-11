import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import WorkspaceTree from '../components/workspace/WorkspaceTree';
import WorkspaceEditor from '../components/workspace/WorkspaceEditor';
import { Database, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface WorkspacePageProps {
  user: { id: number; username: string } | null;
}

export default function WorkspacePage({ user }: WorkspacePageProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { activeConnectionId, setActiveConnectionId } = useWorkspaceStore();

  useEffect(() => {
    const fetchConnections = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const json = await api.get(`/database/list?userId=${user.id}`);
        if (json.code === 200) {
          setConnections(json.data);
          if (json.data.length > 0 && !activeConnectionId) {
            setActiveConnectionId(json.data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch connections', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConnections();
  }, [activeConnectionId, setActiveConnectionId, user?.id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" />
      </div>
    );
  }

  return (
    <div className="min-h-full flex overflow-hidden">
      {/* Schema tree sidebar */}
      <div className="w-56 border-r border-outline-variant flex flex-col bg-surface-container-lowest flex-shrink-0">
        <div className="p-3 border-b border-outline-variant">
          <div className="flex items-center gap-1.5 mb-2 text-on-surface-variant text-[10px] font-mono uppercase tracking-wider">
            <Database className="w-3 h-3" />
            <span>connection</span>
          </div>
          <select
            className="w-full bg-surface-container-high border border-outline-variant text-on-surface text-xs font-mono px-2 py-1 outline-none focus:border-primary"
            value={activeConnectionId || ''}
            onChange={(e) => setActiveConnectionId(Number(e.target.value))}
          >
            <option value="" disabled>Select connection</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.dbType})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-1">
          {activeConnectionId ? (
            <WorkspaceTree connectionId={activeConnectionId} />
          ) : (
            <div className="text-center text-on-surface-variant/50 text-xs font-mono mt-8">
              select a connection
            </div>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface">
        <WorkspaceEditor />
      </div>
    </div>
  );
}
