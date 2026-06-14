import { useState, useRef, useEffect } from 'react';
import { Database, Settings, LogOut, ChevronDown, User as UserIcon, Zap } from 'lucide-react';
import { api } from '../api/client';
import { useLlmConfig } from '../contexts/LlmConfigContext';

interface TopNavProps {
  user?: { id: number, username: string, email?: string, avatar?: string, tokenQuota: number } | null;
  onLogout?: () => void;
}

export default function TopNav({ user, onLogout }: TopNavProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const { configs, selectedConfigId, selectedConfig, setSelectedConfigId } = useLlmConfig();
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close model dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    try {
      await api.post('/user/logout');
    } catch (error) {
      console.log('logout backend failed, but still logout in frontend: ', error);
    }
    onLogout && onLogout();
  };

  const providerLabel = (type: string) => {
    switch (type) {
      case 'ANTHROPIC': return 'Anthropic';
      case 'OPENAI_COMPATIBLE': return 'OpenAI';
      default: return type;
    }
  };

  return (
    <header className="bg-surface-container-low flex justify-between items-center w-full px-6 h-14 z-50 fixed top-0 border-b border-outline-variant/20">
      <div className="flex items-center gap-8">
        <span className="text-lg font-bold tracking-tight text-primary font-headline">Must Be the SQL</span>

        <div className="hidden md:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30 relative" ref={modelDropdownRef}>
          <Zap size={12} className="text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant font-label">Model</span>
          <button
            className="flex items-center gap-1 cursor-pointer hover:bg-surface-container-high px-1.5 py-0.5 rounded transition-colors"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
          >
            <span className="text-sm font-medium">
              {selectedConfig ? selectedConfig.configName : 'System Default'}
            </span>
            <ChevronDown size={14} className={`text-on-surface-variant transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showModelDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-surface-container-high rounded-lg shadow-lg border border-outline-variant/20 py-1 z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-2 text-[10px] font-bold uppercase text-on-surface-variant">Your API Configs</div>
              {configs.filter(c => c.status === 1).map(config => (
                <button
                  key={config.id}
                  className={`w-full text-left px-3 py-2.5 hover:bg-surface-container-highest transition-colors ${
                    config.id === selectedConfigId ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    setSelectedConfigId(config.id);
                    setShowModelDropdown(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${config.id === selectedConfigId ? 'text-primary' : 'text-on-surface'}`}>
                      {config.configName}
                    </span>
                    {config.isDefault && (
                      <span className="text-[10px] text-on-surface-variant bg-primary/10 px-1.5 py-0.5 rounded">Default</span>
                    )}
                  </div>
                  <div className="text-[10px] text-on-surface-variant mt-0.5">
                    {providerLabel(config.providerType)}{config.modelName ? ` / ${config.modelName}` : ''}
                  </div>
                </button>
              ))}
              {configs.filter(c => c.status === 1).length === 0 && (
                <div className="px-3 py-3 text-xs text-on-surface-variant text-center">
                  No API configs. Add one in Settings.
                </div>
              )}
              <div className="border-t border-outline-variant/20 my-1"></div>
              <button
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-surface-container-highest transition-colors ${
                  selectedConfigId === null ? 'text-primary font-medium' : 'text-on-surface-variant'
                }`}
                onClick={() => {
                  setSelectedConfigId(null);
                  setShowModelDropdown(false);
                }}
              >
                System Default (Admin Key)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg">
          <Database size={20} />
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg">
          <Settings size={20} />
        </button>

        <div className="h-8 w-px bg-outline-variant/30 mx-1"></div>

        <div className="relative">
          <button
            className="flex items-center gap-2 pl-2"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container overflow-hidden border border-primary/10">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon size={18} className="text-primary" />
              )}
            </div>
            <span className="text-sm font-medium hidden lg:block">
              {user ? user.username : 'Architect Mode'}
            </span>
            <ChevronDown size={14} className="text-on-surface-variant hidden lg:block" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-container-high rounded-lg shadow-lg border border-outline-variant/20 py-1 overflow-hidden z-50">
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-highest transition-colors"
                onClick={() => {
                  setShowDropdown(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }));
                }}
              >
                <UserIcon size={16} className="text-primary" />
                <span>Profile Center</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-highest transition-colors"
                onClick={handleLogout}
              >
                <LogOut size={16} className="text-error" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}