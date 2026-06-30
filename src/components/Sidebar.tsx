import { Database, Settings, History, MessageSquare, Plus, Activity } from 'lucide-react';
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
    { id: 'workspace', label: 'Workspace', icon: Activity },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col pt-12 pb-3 z-40 bg-surface-container-lowest border-r border-outline-variant w-[200px]">
      {/* App identity */}
      <div className="px-5 mb-5 mt-3">
        <div className="text-sm font-mono font-semibold text-primary tracking-tight">MustBeTheSQL</div>
        <div className="text-[10px] text-on-surface-variant/50 font-mono">v2 · sql-engine</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id as Page)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-mono transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10 border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface border border-transparent hover:bg-surface-container-high'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Status & New Query */}
      <div className="px-3 mt-auto space-y-3">
        <div className="text-xs font-mono text-on-surface-variant/60 px-2">
          {hasCustomConfig
            ? <span>keys: <span className="text-primary">{configs.filter(c => c.status === 1).length}</span></span>
            : <span>quota: <span className="text-on-surface-variant">{Math.max(0, user?.tokenQuota || 0).toLocaleString()}</span></span>
          }
        </div>

        <button
          onClick={() => {
            onPageChange('dashboard');
            window.dispatchEvent(new CustomEvent('new-query'));
          }}
          className="w-full flex items-center justify-center gap-2 py-2 border border-primary text-primary text-xs font-mono hover:bg-primary/10 transition-colors"
        >
          <Plus size={14} />
          New Query
        </button>
      </div>
    </aside>
  );
}
