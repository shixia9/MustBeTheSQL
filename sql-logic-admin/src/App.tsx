import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { api } from './api/client';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminRole, setAdminRole] = useState('');

  useEffect(() => {
    api.get<{ isAdmin: boolean; role: string }>('/admin/check').then(res => {
      if (res.data) {
        setIsAdmin(res.data.isAdmin);
        setAdminRole(res.data.role || '');
      } else {
        setIsAdmin(false);
      }
    }).catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-lg font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return <Dashboard adminRole={adminRole} />;
}
