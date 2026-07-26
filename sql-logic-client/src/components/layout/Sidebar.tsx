import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n';
import { getIcon } from '../../assets/icons';
import { conversationApi } from '../../api/client';
import { ChevronDown } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  shortcut?: string;
}

const primaryItems: NavItem[] = [
  { path: '/', label: 'nav.chat', icon: 'chat', shortcut: 'Cmd+K' },
  { path: '/skills', label: 'nav.skills', icon: 'skills' },
  { path: '/datasources', label: 'nav.datasources', icon: 'datasources' },
  { path: '/knowledge', label: 'nav.knowledge', icon: 'knowledge' },
];

const constructItems: NavItem[] = [
  { path: '/app-builder', label: 'nav.appBuilder', icon: 'appBuilder' },
  { path: '/flow-editor', label: 'nav.flowEditor', icon: 'gitBranch' },
  { path: '/models', label: 'nav.models', icon: 'models' },
  { path: '/prompts', label: 'nav.prompts', icon: 'prompts' },
  { path: '/connectors', label: 'nav.connectors', icon: 'connectors' },
  { path: '/mcp-servers', label: 'nav.mcpServers', icon: 'server' },
  { path: '/memory', label: 'nav.memory', icon: 'memory' },
  { path: '/scheduled-tasks', label: 'nav.scheduledTasks', icon: 'scheduledTasks' },
  { path: '/agent-studio', label: 'nav.agentStudio', icon: 'agentStudio' },
  { path: '/eval', label: 'nav.evaluation', icon: 'chart' },
  { path: '/history', label: 'nav.history', icon: 'history' },
  { path: '/settings', label: 'nav.settings', icon: 'settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed } = useLayout();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [constructOpen, setConstructOpen] = useState(false);

  useEffect(() => {
    conversationApi.list(1, 1, 7).then(d => {
      if (d.code === 200 && d.data?.records) setRecentTasks(d.data.records);
    }).catch(() => {});
  }, []);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.path);
    const Icon = getIcon(item.icon);
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={active ? 'nav-item-active' : 'nav-item-idle'}
        title={sidebarCollapsed ? t(item.label as any) || item.label : undefined}
      >
        <Icon size={sidebarCollapsed ? 18 : 16} />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{t(item.label as any) || item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: '10px', color: 'var(--shell-text-dim)', fontWeight: 400, letterSpacing: '0.02em' }}>
                {item.shortcut}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const width = sidebarCollapsed ? 'w-[56px]' : 'w-[232px]';

  return (
    <aside
      className={`${width} sidebar-transition flex flex-col flex-shrink-0 overflow-hidden`}
      style={{
        background: 'linear-gradient(180deg, var(--shell-bg) 0%, var(--shell-bg-end) 100%)',
        borderRight: '0.5px solid var(--shell-border)',
      }}
    >
      {!sidebarCollapsed && (
        <div className="flex-shrink-0 pointer-events-none"
          style={{ height: 1, margin: '0 12px', background: 'linear-gradient(90deg, transparent 0%, var(--shell-top-glow) 30%, var(--shell-top-glow) 70%, transparent 100%)' }} />
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {/* Primary navigation */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2 select-none" style={{ color: 'var(--shell-text-dim)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {t('nav.navigation')}
          </div>
        )}
        <nav className="px-2 space-y-0.5">{primaryItems.map(renderNavItem)}</nav>

        {/* Construct section divider */}
        <div className="mx-3 my-3" style={{ borderTop: '0.5px solid var(--shell-divider)' }} />

        {!sidebarCollapsed ? (
          <>
            <button
              onClick={() => setConstructOpen(!constructOpen)}
              className="w-full flex items-center gap-2 px-4 py-2 select-none hover:opacity-80 transition-opacity"
              style={{ color: 'var(--shell-text-dim)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              {t('nav.construct') || 'Construct'}
              <ChevronDown size={10} style={{ transform: constructOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms' }} />
            </button>
            {constructOpen && (
              <nav className="px-2 space-y-0.5 pb-1">{constructItems.map(renderNavItem)}</nav>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 pt-1">
            {constructItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                style={{ color: isActive(item.path) ? 'var(--sidebar-text-active)' : 'var(--sidebar-text-dim)' }}
                title={t(item.label as any) || item.label}
              >
                {React.createElement(getIcon(item.icon), { size: 16 })}
              </button>
            ))}
          </div>
        )}

        {/* Recent Tasks */}
        {!sidebarCollapsed && (
          <>
            <div className="mx-3 my-3" style={{ borderTop: '0.5px solid var(--shell-divider)' }} />
            <div className="px-4 py-2 select-none" style={{ color: 'var(--shell-text-dim)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {t('nav.recent')}
            </div>
            <div className="px-2 overflow-y-auto max-h-[200px]">
              {recentTasks.length > 0 ? recentTasks.slice(0, 7).map((conv: any) => (
                <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full text-left px-3 py-1.5 rounded-md transition-colors truncate"
                  style={{ fontSize: '12px', fontWeight: 500, color: 'var(--shell-text)', letterSpacing: '-0.01em', transitionDuration: '150ms' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--shell-text-active)'; e.currentTarget.style.background = 'var(--shell-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--shell-text)'; e.currentTarget.style.background = 'transparent'; }}>
                  {conv.title || `Conversation #${conv.id}`}
                </button>
              )) : (
                <div className="px-4 py-3 select-none" style={{ fontSize: '11px', color: 'var(--shell-text-dim)', fontWeight: 400 }}>
                  {t('nav.noRecentTasks')}
                </div>
              )}
            </div>
          </>
        )}

        {sidebarCollapsed && recentTasks.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 pt-2">
            {recentTasks.slice(0, 5).map((conv: any) => (
              <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: 'var(--shell-text-dim)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--shell-text-active)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--shell-text-dim)'; }}
                title={conv.title || `#${conv.id}`} />
            ))}
          </div>
        )}
      </div>

      {/* User section */}
      <div style={{ borderTop: '0.5px solid var(--shell-divider)' }}>
        {sidebarCollapsed ? (
          <div className="flex justify-center py-3" title="User">
            {React.createElement(getIcon('user'), { size: 18, style: { color: 'var(--shell-text)' } })}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--shell-active)' }}>
              {React.createElement(getIcon('user'), { size: 14, style: { color: 'var(--color-primary)' } })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--shell-text-active)', letterSpacing: '-0.01em' }}>
                {user?.username || 'user'}
              </div>
              <div className="truncate" style={{ fontSize: '10.5px', fontWeight: 400, color: 'var(--shell-text-dim)' }}>
                {user?.email || ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
