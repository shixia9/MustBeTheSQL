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
      <div className="min-h-screen flex items-center justify-center bg-vellum">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full"
            style={{ border: '3px solid rgba(60,94,184,0.18)', borderTopColor: 'var(--color-register)' }} />
          <span className="text-xs font-mono text-marginalia">Verifying credentials&hellip;</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vellum">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-sig-red-soft)' }}>
            <Shield size={26} style={{ color: 'var(--color-sig-red)' }} />
          </div>
          <h1 className="text-lg font-bold text-typeset mb-1">Access Denied</h1>
          <p className="text-sm text-marginalia">You need administrator privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  return <Dashboard adminRole={adminRole} />;
}
