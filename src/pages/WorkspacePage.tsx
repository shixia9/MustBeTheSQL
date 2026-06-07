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
      if (!user?.id) {
        setLoading(false);
        return;
      }
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
      <div className="flex h-screen items-center justify-center bg-surface text-secondary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="ml-64 pt-14 flex h-screen overflow-hidden bg-surface text-on-surface">
      {/* Sidebar for Connections and Tree */}
      <div className="w-72 border-r border-outline-variant/30 flex flex-col bg-surface-container-low flex-shrink-0">
        <div className="p-4 border-b border-outline-variant/30">
          <div className="flex items-center gap-2 mb-3 text-on-surface-variant text-sm font-medium">
            <Database className="w-4 h-4" />
            <span>Connection</span>
          </div>
          <select
            className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={activeConnectionId || ''}
            onChange={(e) => setActiveConnectionId(Number(e.target.value))}
          >
            <option value="" disabled>Select a connection...</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.dbType})
              </option>
            ))}
          </select>
        </div>
        
        {/* Tree Component */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {activeConnectionId ? (
             <WorkspaceTree connectionId={activeConnectionId} />
          ) : (
            <div className="text-center text-on-surface-variant text-sm mt-10">
              Please select a connection to view workspace.
            </div>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface">
        <WorkspaceEditor />
      </div>
    </div>
  );
}
