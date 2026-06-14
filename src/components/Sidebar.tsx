import { Database, Settings, History, MessageSquare, Plus, LayoutDashboard, LogOut, ShieldCheck, Cpu, Database as DbIcon, Activity } from 'lucide-react';
import { Page } from '../types';
import { useLlmConfig } from '../contexts/LlmConfigContext';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  user?: any;
}

export default function Sidebar({ currentPage, onPageChange, user }: SidebarProps) {
  const { configs } = useLlmConfig();
  const hasCustomConfig = configs.filter(c => c.status === 1).length > 0;
  const navItems = [
    { id: 'dashboard', label: 'Chat', icon: MessageSquare },
    { id: 'workspace', label: 'Workspace', icon: LayoutDashboard },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col pt-16 pb-4 z-40 bg-surface-container-low w-64 border-r border-outline-variant/10">
      <div className="px-6 mb-8 mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/70 mb-1">Logic Ledger</p>
        <p className="text-sm font-bold text-primary uppercase tracking-wider font-headline">SQL Architect</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id as Page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ease-in-out group ${
                isActive
                  ? 'bg-surface-container-highest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
              }`}
            >
              <Icon size={18} className={isActive ? 'fill-primary/10' : ''} />
              <span className="text-xs font-semibold uppercase tracking-widest font-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 mt-auto space-y-4">
        <div className="p-4 bg-surface-container-high/50 rounded-xl">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Usage</p>
          {hasCustomConfig ? (
            <>
              <div className="w-full bg-outline-variant/30 h-1 rounded-full mb-1">
                <div className="bg-primary h-full rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-[10px] text-primary font-bold">Custom Keys Active</p>
            </>
          ) : (
            <>
              <div className="w-full bg-outline-variant/30 h-1 rounded-full mb-1">
                <div className="bg-primary h-full rounded-full" style={{ 
                  width: `${Math.max(0, Math.min(100, ((Math.max(user?.tokenQuota || 0, user?.username === 'admin' ? 10000 : 100) - (user?.tokenQuota || 0)) / Math.max(user?.tokenQuota || 0, user?.username === 'admin' ? 10000 : 100)) * 100))}%` 
                }}></div>
              </div>
              <p className="text-[10px] text-on-surface-variant">
                {Math.max(0, Math.max(user?.tokenQuota || 0, user?.username === 'admin' ? 10000 : 100) - (user?.tokenQuota || 0)).toLocaleString()} / {Math.max(user?.tokenQuota || 0, user?.username === 'admin' ? 10000 : 100).toLocaleString()} tokens used
              </p>
            </>
          )}
        </div>

        <button 
          onClick={() => {
            onPageChange('dashboard');
            window.dispatchEvent(new CustomEvent('new-query'));
          }}
          className="w-full flex items-center justify-center gap-2 py-3 primary-gradient text-white rounded-md font-semibold text-xs uppercase tracking-widest shadow-lg hover:brightness-110 transition-all active:scale-95"
        >
          <Plus size={16} />
          New Query
        </button>
      </div>
    </aside>
  );
}
