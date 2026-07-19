import { Database } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import DatabasePage from './DatabasePage';

export default function DatasourcePage() {
  return (
    <ManagementPage title="datasources" icon={Database}>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <DatabasePage />
      </div>
    </ManagementPage>
  );
}
