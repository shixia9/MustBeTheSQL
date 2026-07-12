/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Page } from './types';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import DatabasePage from './pages/DatabasePage';
import SettingsPage from './pages/SettingsPage';
import WorkspaceManagePage from './pages/WorkspaceManagePage';
import ProfilePage from './pages/ProfilePage.tsx';
import SchemaBrowserPage from './pages/SchemaBrowserPage';
import JoinWorkspacePage from './pages/JoinWorkspacePage';
import AgentStudioPage from './pages/AgentStudioPage';
import MemoryPage from './pages/MemoryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import { SettingsProvider } from './contexts/SettingsContext';
import { LlmConfigProvider } from './contexts/LlmConfigContext';
import { I18nProvider, useI18n } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';

import storageUtils from './utils/storageUtils.ts'
import memoryUtils from './utils/memoryUtils.ts';
import { api } from './api/client.ts';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useLlmConfig } from './contexts/LlmConfigContext';

export default function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <LlmConfigProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </LlmConfigProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}

function AppContent() {
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [navState, setNavState] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: number, username: string, email?: string, avatar?: string, tokenQuota: number, status?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const { clearConfigs, refreshConfigs } = useLlmConfig();

  useEffect(() => {
    const init = async () => {
      // Check if there's a stored user, then validate the session with the backend
      const localUser = storageUtils.getUser();
      if (localUser) {
        try {
          // Validate that the Sa-Token session is still active on the backend
          const data = await api.get<any>('/user/info');
          if (data.code === 200 && data.data) {
            // Session is valid — update user data from backend
            const serverUser = data.data;
            setUser({
              id: serverUser.id,
              username: serverUser.username,
              email: serverUser.email,
              avatar: serverUser.avatar,
              tokenQuota: serverUser.tokenQuota ?? 0,
              status: serverUser.status
            });
            setIsLoggedIn(true);
            memoryUtils.user = localUser;
            setCurrentPage('dashboard');
            // Update localStorage with fresh data from server
            storageUtils.saveUser(serverUser);
          } else {
            // Session invalid (e.g., token expired after server restart) — clear stale data
            storageUtils.deleteUser();
            memoryUtils.user = null;
          }
        } catch (e) {
          // Network error or 401 — session is invalid, clear stale data
          storageUtils.deleteUser();
          memoryUtils.user = null;
        }
      }
      // Check for invite token in URL params
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setInviteToken(urlToken);
        // Clean up URL bar
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        if (localUser) {
          setCurrentPage('invite');
        } else {
          // Not logged in — save token so handleLogin can redirect after auth
          localStorage.setItem('invite_redirect', urlToken);
        }
      }

      // Check for invite redirect token — used when returning from login page
      const redirectToken = localStorage.getItem('invite_redirect');
      if (redirectToken) {
        setInviteToken(redirectToken);
        if (localUser) {
          localStorage.removeItem('invite_redirect');
          setCurrentPage('invite');
        }
      }

      setLoading(false);
    };
    init();

    const handleNavigate = (e: any) => {
      if (e.detail) {
        if (typeof e.detail === 'string') {
          setCurrentPage(e.detail as Page);
          setNavState(null);
        } else {
          setCurrentPage(e.detail.page as Page);
          setNavState(e.detail);
        }
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  // Handle login transition
  const handleLogin = (userData: any) => {
    setUser(userData);
    setIsLoggedIn(true);
    memoryUtils.user = userData;
    storageUtils.saveUser(userData);

    // Check for invite redirect
    const redirectToken = localStorage.getItem('invite_redirect');
    if (redirectToken) {
      setInviteToken(redirectToken);
      localStorage.removeItem('invite_redirect');
      setCurrentPage('invite');
      return;
    }

    setCurrentPage('dashboard');
    refreshConfigs();
  };

  // Handle user update without navigation
  const handleUserUpdate = (userData: any) => {
    setUser(userData);
    memoryUtils.user = userData;
    storageUtils.saveUser(userData);
  };

  // Simple routing based on state
    const renderPage = () => {
      switch (currentPage) {
        case 'login':
          return <LoginPage onLogin={handleLogin} />;
        case 'dashboard':
          return <DashboardPage user={user} initialConversationId={navState?.conversationId ?? null} />;
        case 'agent-studio':
          return <AgentStudioPage user={user} />;
        case 'memory':
          return <MemoryPage />;
        case 'schema-browser':
          return <SchemaBrowserPage user={user} />;
        case 'workspace-manage':
          return <WorkspaceManagePage user={user} />;
        case 'history':
          return <HistoryPage user={user} />;
        case 'database':
          return <DatabasePage user={user} />;
        case 'settings':
          return <SettingsPage user={user} />;
        case 'profile':
          return <ProfilePage user={user} onUserUpdate={handleUserUpdate} />;
        case 'invite':
          return <JoinWorkspacePage token={inviteToken || ''} user={user} onPageChange={setCurrentPage} />;
        case 'admin':
          return <AdminDashboardPage user={user} />;
        default:
          return <DashboardPage user={user} />;
      }
    };

  const handleLogout = async () => {
    try {
      await api.post('/user/logout');
    } catch (e) {
      console.warn('Backend logout failed:', e);
    }
    setUser(null);
    setIsLoggedIn(false);
    memoryUtils.user = null;
    storageUtils.deleteUser();
    useWorkspaceStore.getState().resetState();
    clearConfigs();
    setCurrentPage('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-on-surface-variant text-sm">{t('app.loading')}</div>
      </div>
    );
  }

  if (!isLoggedIn && currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/10 selection:text-primary">
      <TopNav user={user} onLogout={handleLogout} />
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} user={user} />
      <div className="relative">
        {renderPage()}
      </div>
    </div>
  );
}

