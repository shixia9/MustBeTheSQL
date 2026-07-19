import React, { useState } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ChatPage from './pages/ChatPage';
import KnowledgePage from './pages/KnowledgePage';
import KnowledgeDetailPage from './pages/KnowledgeDetailPage';
import SkillsPage from './pages/SkillsPage';
import PromptPage from './pages/PromptPage';
import ConnectorPage from './pages/ConnectorPage';
import ScheduledTaskPage from './pages/ScheduledTaskPage';
import ModelPage from './pages/ModelPage';
import DatasourcePage from './pages/DatasourcePage';
import AgentStudioPage from './pages/AgentStudioPage';
import MemoryPage from './pages/MemoryPage';
import McpServerPage from './pages/McpServerPage';
import HistoryPage from './pages/HistoryPage';
import SchemaBrowserPage from './pages/SchemaBrowserPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import JoinWorkspacePage from './pages/JoinWorkspacePage';

const dummyUser = { id: 1, username: 'analyst', email: 'analyst@db.local', tokenQuota: 10000 };

function LoginWrapper() {
  return <LoginPage onLogin={() => window.location.href = '/'} />;
}

function InviteWrapper() {
  const token = window.location.pathname.split('/').pop() || '';
  return <JoinWorkspacePage token={token} user={null} onPageChange={() => {}} />;
}

function ProfileWrapper() {
  const [user, setUser] = useState<any>(dummyUser);
  return <ProfilePage user={user} onUserUpdate={(u: any) => setUser(u)} />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginWrapper /> },
  { path: '/invite/:token', element: <InviteWrapper /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'chat/:conversationId', element: <ChatPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'knowledge/:spaceId', element: <KnowledgeDetailPage /> },
      { path: 'skills', element: <SkillsPage /> },
      { path: 'prompts', element: <PromptPage /> },
      { path: 'connectors', element: <ConnectorPage /> },
      { path: 'scheduled-tasks', element: <ScheduledTaskPage /> },
      { path: 'models', element: <ModelPage /> },
      { path: 'datasources', element: <DatasourcePage /> },
      { path: 'agent-studio', element: <AgentStudioPage user={dummyUser} /> },
      { path: 'agent-studio/:agentId', element: <AgentStudioPage user={dummyUser} /> },
      { path: 'memory', element: <MemoryPage /> },
      { path: 'mcp-servers', element: <McpServerPage /> },
      { path: 'history', element: <HistoryPage user={dummyUser} /> },
      { path: 'schema', element: <SchemaBrowserPage user={dummyUser} /> },
      { path: 'workspace', element: <SchemaBrowserPage user={dummyUser} /> },
      { path: 'workspace/:workspaceId', element: <SchemaBrowserPage user={dummyUser} /> },
      { path: 'settings', element: <SettingsPage user={dummyUser} /> },
      { path: 'profile', element: <ProfileWrapper /> },
    ],
  },
]);
