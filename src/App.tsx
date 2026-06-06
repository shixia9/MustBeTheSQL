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
import ProfilePage from './pages/ProfilePage.tsx';
import WorkspacePage from './pages/WorkspacePage';

import { SettingsProvider } from './contexts/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';

import storageUtils from './utils/storageUtils.ts'
import memoryUtils from './utils/memoryUtils.ts';
import { api } from './api/client.ts';

export default function App() {
  return (
    <SettingsProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </SettingsProvider>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: number, username: string, email?: string, avatar?: string, tokenQuota: number, status?: number } | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };
    init();

    const handleNavigate = (e: any) => {
      if (e.detail) {
        setCurrentPage(e.detail as Page);
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
    setCurrentPage('dashboard');
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
          return <DashboardPage user={user} />;
        case 'workspace':
          return <WorkspacePage user={user} />;
        case 'history':
          return <HistoryPage user={user} />;
        case 'database':
          return <DatabasePage user={user} />;
        case 'settings':
          return <SettingsPage user={user} />;
        case 'profile':
          return <ProfilePage user={user} onUserUpdate={handleUserUpdate} />;
        default:
          return <DashboardPage user={user} />;
      }
    };

  const handleLogout = async () => {
    try {
      // Notify backend to invalidate the Sa-Token session
      await api.post('/user/logout');
    } catch (e) {
      // Even if backend logout fails, clear local state
      console.warn('Backend logout failed:', e);
    }
    setUser(null);
    setIsLoggedIn(false);
    memoryUtils.user = null;
    storageUtils.deleteUser();
    setCurrentPage('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-on-surface-variant text-sm">Loading...</div>
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

