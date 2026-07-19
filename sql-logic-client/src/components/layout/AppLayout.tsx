import { Outlet } from 'react-router-dom';
import { LayoutProvider } from '../../contexts/LayoutContext';
import AgentPulseLine from '../ui/AgentPulseLine';
import TopNav from './TopNav';
import Sidebar from './Sidebar';

export default function AppLayout() {
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
