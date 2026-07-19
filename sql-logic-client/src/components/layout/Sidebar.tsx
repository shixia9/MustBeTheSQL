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

  const width = sidebarCollapsed ? 'w-[56px]' : 'w-[232px]';

  return (
    <aside
      className={`${width} sidebar-transition flex flex-col flex-shrink-0 overflow-hidden dark-scrollbar`}
      style={{
        background: 'linear-gradient(180deg, var(--color-dark-surface) 0%, var(--color-dark-surface-raised) 100%)',
      }}
    >
      {/* Subtle top glow */}
      {!sidebarCollapsed && (
        <div
          className="flex-shrink-0 pointer-events-none"
          style={{
            height: 1,
            margin: '0 12px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(91,127,217,0.25) 30%, rgba(91,127,217,0.25) 70%, transparent 100%)',
          }}
        />
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto dark-scrollbar py-2">
        {!sidebarCollapsed && (
          <div
            className="px-4 py-2 select-none"
            style={{
              color: 'var(--color-dark-ink-tertiary)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Navigation
          </div>
        )}

        <nav className="px-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = getIcon(item.icon);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={isActive ? 'nav-item-active' : 'nav-item-idle'}
                title={sidebarCollapsed ? t(item.label as any) || item.label : undefined}
              >
                <Icon size={sidebarCollapsed ? 18 : 16} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">
                      {t(item.label as any) || item.label}
                    </span>
                    {item.shortcut && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--color-dark-ink-tertiary)',
                          fontWeight: 400,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {item.shortcut}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-3 my-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }} />

        {/* Recent Tasks */}
        {!sidebarCollapsed && (
          <>
            <div
              className="px-4 py-2 select-none"
              style={{
                color: 'var(--color-dark-ink-tertiary)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Recent
            </div>
            <div className="px-2 overflow-y-auto max-h-[200px] dark-scrollbar">
              {recentTasks.length > 0 ? recentTasks.slice(0, 7).map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full text-left px-3 py-1.5 rounded-md transition-colors truncate"
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--color-dark-ink-secondary)',
                    letterSpacing: '-0.01em',
                    transitionDuration: '150ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#d0d3dc';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--color-dark-ink-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {conv.title || `Conversation #${conv.id}`}
                </button>
              )) : (
                <div
                  className="px-4 py-3 select-none"
                  style={{ fontSize: '11px', color: 'var(--color-dark-ink-tertiary)', fontWeight: 400 }}
                >
                  No recent tasks
                </div>
              )}
            </div>
          </>
        )}

        {/* Collapsed recent dots */}
        {sidebarCollapsed && recentTasks.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 pt-2">
            {recentTasks.slice(0, 5).map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: 'var(--color-dark-ink-tertiary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-dark-ink)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-dark-ink-tertiary)'; }}
                title={conv.title || `#${conv.id}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* User section */}
      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        {sidebarCollapsed ? (
          <div className="flex justify-center py-3" title="User">
            {React.createElement(getIcon('user'), {
              size: 18,
              style: { color: 'var(--color-dark-ink-secondary)' },
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-sidebar-active)' }}
            >
              {React.createElement(getIcon('user'), {
                size: 14,
                style: { color: 'var(--color-primary)' },
              })}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="truncate"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-dark-ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {user?.username || 'user'}
              </div>
              <div
                className="truncate"
                style={{
                  fontSize: '10.5px',
                  fontWeight: 400,
                  color: 'var(--color-dark-ink-tertiary)',
                }}
              >
                {user?.email || ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
