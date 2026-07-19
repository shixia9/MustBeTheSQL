import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useLayout } from '../../contexts/LayoutContext';
import { useLlmConfig } from '../../contexts/LlmConfigContext';
import { getIcon } from '../../assets/icons';
import StatusIndicator from '../ui/StatusIndicator';
import TokenBudgetBar from '../ui/TokenBudgetBar';
import ModelSelector from '../ui/ModelSelector';

export default function TopNav() {
  const { t } = useI18n();
  const { toggleSidebar, sidebarCollapsed } = useLayout();
  const { selectedConfigId } = useLlmConfig();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { api } = await import('../../api/client');
    await api.post('/user/logout', {});
    const storageUtils = (await import('../../utils/storageUtils')).default;
    storageUtils.deleteUser();
    navigate('/login');
  };

  const CollapseIcon = getIcon(sidebarCollapsed ? 'expand' : 'collapse');

  return (
    <header className="flex items-center h-12 px-3 border-b border-outline-variant bg-surface flex-shrink-0 z-50 gap-3">
      <button onClick={toggleSidebar} className="btn-ghost p-1.5" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <CollapseIcon size={16} />
      </button>

      <ModelSelector />

      <StatusIndicator status="live" />

      <div className="flex-1" />

      <TokenBudgetBar used={1200} total={8192} />

      <button className="btn-ghost p-1.5" title="Toggle theme">
        {React.createElement(getIcon('sun'), { size: 14 })}
      </button>

      <button className="btn-ghost p-1.5" title="Toggle language">
        {React.createElement(getIcon('languages'), { size: 14 })}
      </button>

      <button className="btn-ghost p-1.5 text-error hover:text-error/80" onClick={handleLogout} title="Logout">
        {React.createElement(getIcon('logout'), { size: 14 })}
      </button>
    </header>
  );
}
