import { Outlet } from 'react-router-dom';
import { LayoutProvider } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import AgentPulseLine from '../ui/AgentPulseLine';
import TopNav from './TopNav';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-dark-surface)' }}>
        <div className="text-center">
          <div className="text-[#4dc9f6] text-sm font-semibold mb-2 font-sans" style={{ letterSpacing: '-0.01em' }}>
            Must Be The SQL
          </div>
          <div className="text-[#636882] text-[11px] font-medium font-sans">
            Authenticating...
          </div>
          <div className="skeleton w-48 h-1 mt-3 mx-auto rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>
    );
  }

  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-dark-surface)' }}>
        <AgentPulseLine />
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main
            className="flex-1 overflow-auto"
            style={{ background: 'var(--color-content-bg)' }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}
