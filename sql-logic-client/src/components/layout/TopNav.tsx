import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { api } from '../../api/client';
import { getIcon } from '../../assets/icons';
import StatusIndicator from '../ui/StatusIndicator';
import TokenBudgetBar from '../ui/TokenBudgetBar';
import ModelSelector from '../ui/ModelSelector';

const LANGUAGES: { code: 'en' | 'zh'; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
];

export default function TopNav() {
  const { t, locale, setLocale } = useI18n();
  const { toggleSidebar, sidebarCollapsed } = useLayout();
  const { user, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.get<boolean>('/user/admin-check').then(r => {
      if (r.data === true || (r as any).code === 200) setIsAdmin(true);
    }).catch(() => {});
  }, []);
  const { theme, setTheme } = useSettings();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const goProfile = () => navigate('/profile');
  const CollapseIcon = getIcon(sidebarCollapsed ? 'expand' : 'collapse');

  // Close dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const shellText = 'var(--shell-text)';
  const shellTextDim = 'var(--shell-text-dim)';

  const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

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

      {/* Language selector */}
      <div className="relative" ref={langRef}>
        <button
          className="btn-ghost p-1.5 flex items-center gap-0.5"
          style={{ color: langOpen ? 'var(--shell-text-active)' : shellTextDim, border: 'none' }}
          onClick={() => setLangOpen(v => !v)}
          title="Select language"
        >
          {React.createElement(getIcon('languages'), { size: 15 })}
          <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.02em' }}>
            {locale.toUpperCase()}
          </span>
        </button>

        {langOpen && (
          <div
            className="absolute right-0 top-full mt-1 py-1 rounded-lg z-50"
            style={{
              minWidth: '130px',
              background: 'var(--color-content-bg)',
              border: '1px solid var(--color-border-subtle)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => { setLocale(lang.code); setLangOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
                style={{
                  fontSize: '12px',
                  fontWeight: lang.code === locale ? 600 : 400,
                  color: lang.code === locale ? 'var(--color-ink)' : 'var(--color-ink-secondary)',
                  background: lang.code === locale ? 'var(--color-primary-soft)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (lang.code !== locale) (e.currentTarget.style.background = 'var(--color-app-bg)');
                }}
                onMouseLeave={e => {
                  if (lang.code !== locale) (e.currentTarget.style.background = 'transparent');
                }}
              >
                <span style={{ fontSize: '11px' }}>{lang.nativeLabel}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-ink-tertiary)', marginLeft: 'auto' }}>
                  {lang.label}
                </span>
                {lang.code === locale && (
                  <span style={{ fontSize: '10px', color: 'var(--color-primary)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="btn-ghost p-1.5"
        onClick={goProfile}
        style={{ color: shellTextDim, border: 'none' }}
        title="Profile"
      >
        {React.createElement(getIcon('user'), { size: 15 })}
      </button>

      {isAdmin && (
        <button
          className="btn-ghost p-1.5"
          onClick={() => window.open('http://localhost:3001', '_blank')}
          style={{ color: shellTextDim, border: 'none' }}
          title="Admin Panel"
        >
          {React.createElement(getIcon('shield'), { size: 15 })}
        </button>
      )}

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
