import { Database, Loader2 } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import DatabasePage from './DatabasePage';
import { useAuth } from '../contexts/AuthContext';

const tabs = [
  { key: 'connections', label: 'Connections' },
];

export default function DatasourcePage() {
  const { user, loading } = useAuth();

  return (
    <ManagementPage title="datasources" icon={Database} tabs={tabs} activeTab="connections">
      {loading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <DatabasePage user={user} />
        </div>
      )}
    </ManagementPage>
  );
}
