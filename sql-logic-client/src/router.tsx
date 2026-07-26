import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import ProfilePageInner from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import JoinWorkspacePage from './pages/JoinWorkspacePage';
import FlowEditor from './pages/FlowEditor';
import SkillEditor from './pages/SkillEditor';
import AppBuilder from './pages/AppBuilder';
import AppBuilderConfig from './pages/AppBuilderConfig';
import EvaluationPage from './pages/EvaluationPage';

function LoginWrapper() {
  return <LoginPage onLogin={() => { window.location.href = '/'; }} />;
}

function InviteWrapper() {
  const token = window.location.pathname.split('/').pop() || '';
  return <JoinWorkspacePage token={token} user={null} onPageChange={() => {}} />;
}

function AppShell() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

function ProfileWrapper() {
  const { user, updateUser } = useAuth();
  if (!user) return null;
  return <ProfilePageInner user={user} onUserUpdate={updateUser} />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginWrapper /> },
  { path: '/invite/:token', element: <InviteWrapper /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'chat/:conversationId', element: <ChatPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'knowledge/:spaceId', element: <KnowledgeDetailPage /> },
      { path: 'skills', element: <SkillsPage /> },
      { path: 'skill-editor', element: <SkillEditor /> },
      { path: 'skill-editor/:name', element: <SkillEditor /> },
      { path: 'flow-editor', element: <FlowEditor /> },
      { path: 'app-builder', element: <AppBuilder /> },
      { path: 'app-builder/:appId', element: <AppBuilderConfig /> },
      { path: 'eval', element: <EvaluationPage /> },
      { path: 'prompts', element: <PromptPage /> },
      { path: 'connectors', element: <ConnectorPage /> },
      { path: 'scheduled-tasks', element: <ScheduledTaskPage /> },
      { path: 'models', element: <ModelPage /> },
      { path: 'datasources', element: <DatasourcePage /> },
      { path: 'agent-studio', element: <AgentStudioPage user={null} /> },
      { path: 'agent-studio/:agentId', element: <AgentStudioPage user={null} /> },
      { path: 'memory', element: <MemoryPage /> },
      { path: 'mcp-servers', element: <McpServerPage /> },
      { path: 'history', element: <HistoryPage user={null} /> },
      { path: 'schema', element: <SchemaBrowserPage user={null} /> },
      { path: 'workspace', element: <SchemaBrowserPage user={null} /> },
      { path: 'workspace/:workspaceId', element: <SchemaBrowserPage user={null} /> },
      { path: 'settings', element: <SettingsPage user={null} /> },
      { path: 'profile', element: <ProfileWrapper /> },
    ],
  },
]);
