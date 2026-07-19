import { Database } from 'lucide-react';
import ManagementPage from '../components/layout/ManagementPage';
import DatabasePage from './DatabasePage';

export default function DatasourcePage() {
  return (
    <ManagementPage title="datasources" icon={Database}>
      <DatabasePage />
    </ManagementPage>
  );
}
