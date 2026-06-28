import { useState, useEffect } from 'react';
import { useLlmConfig } from '../contexts/LlmConfigContext';
import { api } from '../api/client';
import AgentFlowPanel from '../components/agent/AgentFlowPanel';

export default function DashboardPage({ user }: { user: any }) {
  const { selectedConfigId } = useLlmConfig();

  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<number | ''>(() => {
    const saved = localStorage.getItem(`chat_conn_${user?.id}`);
    return saved ? Number(saved) : '';
  });

  // Fetch connections on mount
  useEffect(() => {
    if (user?.id) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const data = await api.get(`/database/list?userId=${user.id}`);
      if (data.code === 200) {
        setConnections(data.data);
        if (data.data.length > 0 && !selectedConnId) {
          setSelectedConnId(data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch connections', e);
    }
  };

  return (
    <main className="ml-[180px] pt-11 flex flex-col h-screen bg-surface overflow-hidden">
      <AgentFlowPanel
        user={user}
        connections={connections}
        selectedConnId={selectedConnId}
        selectedConfigId={selectedConfigId}
        onConnectionChange={(connId) => {
          setSelectedConnId(connId);
          localStorage.setItem(`chat_conn_${user.id}`, connId.toString());
        }}
      />
    </main>
  );
}