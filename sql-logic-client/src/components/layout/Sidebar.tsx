import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n';
import { getIcon } from '../../assets/icons';
import { conversationApi } from '../../api/client';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'chat', icon: 'chat', shortcut: '⌘K' },
  { path: '/knowledge', label: 'knowledge', icon: 'knowledge' },
  { path: '/skills', label: 'skills', icon: 'skills' },
  { path: '/datasources', label: 'datasources', icon: 'datasources' },
  { path: '/prompts', label: 'prompts', icon: 'prompts' },
  { path: '/connectors', label: 'connectors', icon: 'connectors' },
  { path: '/scheduled-tasks', label: 'scheduledTasks', icon: 'scheduledTasks' },
  { path: '/models', label: 'models', icon: 'models' },
  { path: '/agent-studio', label: 'agentStudio', icon: 'agentStudio' },
  { path: '/memory', label: 'memory', icon: 'memory' },
  { path: '/history', label: 'history', icon: 'history' },
  { path: '/settings', label: 'settings', icon: 'settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed } = useLayout();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    conversationApi.list(1, 1, 7).then(d => {
      if (d.code === 200 && d.data?.records) setRecentTasks(d.data.records);
    }).catch(() => {});
  }, []);

  const width = sidebarCollapsed ? 'w-[64px]' : 'w-[240px]';

  return (
    <aside className={`${width} sidebar-transition flex flex-col border-r border-outline-variant bg-surface flex-shrink-0 overflow-hidden`}>
      {/* Top: Navigation */}
      <div className="flex-1 overflow-y-auto">
        {!sidebarCollapsed && (
          <div className="px-3 py-3 text-[10px] uppercase tracking-[0.15em] text-on-surface-variant select-none">
            $ ls /pages
          </div>
        )}

        <nav className="px-2 py-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = getIcon(item.icon);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-[#38bdf8] border-l-2 border-[#38bdf8]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border-l-2 border-transparent'
                  }`}
                title={sidebarCollapsed ? t(item.label as any) || item.label : undefined}
              >
                <Icon size={16} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{t(item.label as any) || item.label}</span>
                    {item.shortcut && (
                      <span className="text-[10px] text-on-surface-variant/50">{item.shortcut}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-3 my-2 border-t border-outline-variant" />

        {/* Recent Tasks */}
        {!sidebarCollapsed && (
          <>
            <div className="px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-on-surface-variant select-none">
              $ ls /tasks --recent
            </div>
            <div className="px-2 overflow-y-auto max-h-[200px]">
              {recentTasks.length > 0 ? recentTasks.slice(0, 7).map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors truncate"
                >
                  <span>{conv.title || `Conversation #${conv.id}`}</span>
                </button>
              )) : (
                <div className="text-[11px] text-on-surface-variant/40 px-3 py-2">No recent tasks</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom: UserBar */}
      <div className="border-t border-outline-variant px-3 py-2.5">
        {sidebarCollapsed ? (
          <div className="flex justify-center" title="User">
            {React.createElement(getIcon('user'), { size: 16, className: 'text-on-surface-variant' })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              {React.createElement(getIcon('user'), { size: 14, className: 'text-primary' })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-on-surface truncate">{user?.username || 'user'}@db</div>
              <div className="text-[9px] text-on-surface-variant/60">{user?.email || ''}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
