import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getIcon } from '../../assets/icons';
import StatusIndicator from '../ui/StatusIndicator';
import TokenBudgetBar from '../ui/TokenBudgetBar';
import ModelSelector from '../ui/ModelSelector';

export default function TopNav() {
  const { t } = useI18n();
  const { toggleSidebar, sidebarCollapsed } = useLayout();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useSettings();
  const navigate = useNavigate();

  const goProfile = () => navigate('/profile');
  const CollapseIcon = getIcon(sidebarCollapsed ? 'expand' : 'collapse');

  const shellText = 'var(--shell-text)';
  const shellTextDim = 'var(--shell-text-dim)';

  return (
    <header
      className="flex items-center h-11 px-3 flex-shrink-0 z-50 gap-2"
      style={{
        background: 'var(--shell-bg)',
        borderBottom: '0.5px solid var(--shell-border)',
      }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="btn-ghost p-1.5"
        style={{ color: shellTextDim, border: 'none' }}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <CollapseIcon size={16} />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2">
        <span
          className="text-[12.5px] font-semibold select-none"
          style={{ color: 'var(--shell-text-active)', letterSpacing: '-0.01em' }}
        >
          MBS
        </span>
        <span
          className="text-[10px] font-medium select-none hidden sm:inline"
          style={{ color: shellTextDim, letterSpacing: '0.02em' }}
        >
          /
        </span>
      </div>

      <ModelSelector />

      <div className="flex-1" />

      <StatusIndicator status="live" />

      <TokenBudgetBar used={1200} total={8192} />

      {/* Divider */}
      <div style={{ width: 0.5, height: 20, background: 'var(--shell-border)', margin: '0 4px' }} />

      {/* Icon buttons */}
      <button
        className="btn-ghost p-1.5"
        style={{ color: shellTextDim, border: 'none' }}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {React.createElement(getIcon(theme === 'dark' ? 'sun' : 'moon'), { size: 15 })}
      </button>

      <button
        className="btn-ghost p-1.5"
        style={{ color: shellTextDim, border: 'none' }}
        title="Toggle language"
      >
        {React.createElement(getIcon('languages'), { size: 15 })}
      </button>

      <button
        className="btn-ghost p-1.5"
        onClick={goProfile}
        style={{ color: shellTextDim, border: 'none' }}
        title="Profile"
      >
        {React.createElement(getIcon('user'), { size: 15 })}
      </button>

      <button
        className="btn-ghost p-1.5"
        onClick={logout}
        style={{ color: 'var(--color-error)', border: 'none' }}
        title="Logout"
      >
        {React.createElement(getIcon('logout'), { size: 15 })}
      </button>
    </header>
  );
}
