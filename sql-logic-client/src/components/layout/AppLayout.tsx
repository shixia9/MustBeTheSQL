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
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="text-center font-mono">
          <div className="text-[#a3e635] text-lg mb-2">$ ssh sql-engine@gateway.local</div>
          <div className="text-on-surface-variant/60 text-xs">authenticating...</div>
          <div className="skeleton w-48 h-1 mt-3 mx-auto rounded" />
        </div>
      </div>
    );
  }

  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen bg-surface text-on-surface font-mono overflow-hidden">
        <AgentPulseLine />
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-surface-container-lowest">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}
