import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User as UserIcon, LogOut, Zap } from 'lucide-react';
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
    try { await api.post('/user/logout'); } catch {}
    onLogout?.();
  };

  const providerLabel = (type: string) => {
    switch (type) {
      case 'ANTHROPIC': return 'anthropic';
      case 'OPENAI_COMPATIBLE': return 'openai';
      default: return type;
    }
  };

  return (
    <header className="bg-surface-container-lowest flex justify-between items-center w-full pl-[180px] pr-4 h-11 z-50 fixed top-0 border-b border-outline-variant">
      {/* Left: model selector */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={modelDropdownRef}>
          <button
            className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
          >
            <Zap size={12} className="text-primary" />
            <span>{selectedConfig ? selectedConfig.configName : 'system'}</span>
            <ChevronDown size={12} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showModelDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container-high border border-outline-variant py-1 z-50 max-h-72 overflow-y-auto font-mono text-xs">
              <div className="px-3 py-1.5 text-[10px] text-on-surface-variant/60 uppercase tracking-wider">API Configs</div>
              {configs.filter(c => c.status === 1).map(config => (
                <button
                  key={config.id}
                  className={`w-full text-left px-3 py-1.5 hover:bg-surface-container-highest transition-colors ${
                    config.id === selectedConfigId ? 'text-primary bg-primary/5' : 'text-on-surface'
                  }`}
                  onClick={() => { setSelectedConfigId(config.id); setShowModelDropdown(false); }}
                >
                  <div className="flex items-center justify-between">
                    <span>{config.configName}</span>
                    {config.isDefault && <span className="text-[9px] text-on-surface-variant">default</span>}
                  </div>
                  <div className="text-[10px] text-on-surface-variant/60 mt-0.5">
                    {providerLabel(config.providerType)}{config.modelName ? ` / ${config.modelName}` : ''}
                  </div>
                </button>
              ))}
              {configs.filter(c => c.status === 1).length === 0 && (
                <div className="px-3 py-2 text-on-surface-variant/50 text-center">No configs</div>
              )}
              <div className="border-t border-outline-variant my-1" />
              <button
                className={`w-full text-left px-3 py-1.5 hover:bg-surface-container-highest transition-colors ${
                  selectedConfigId === null ? 'text-primary' : 'text-on-surface-variant'
                }`}
                onClick={() => { setSelectedConfigId(null); setShowModelDropdown(false); }}
              >
                System Default
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: user */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center border border-primary/20">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <UserIcon size={13} className="text-primary" />
              )}
            </div>
            <span>{user?.username ?? 'user'}</span>
            <ChevronDown size={12} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-40 bg-surface-container-high border border-outline-variant py-1 z-50 font-mono text-xs">
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-on-surface hover:bg-surface-container-highest transition-colors"
                onClick={() => {
                  setShowDropdown(false);
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'profile' }));
                }}
              >
                <UserIcon size={13} />
                Profile
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-on-surface hover:bg-surface-container-highest transition-colors"
                onClick={handleLogout}
              >
                <LogOut size={13} className="text-error" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
