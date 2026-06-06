import { useState } from 'react';
import { Database, Settings, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';

interface TopNavProps {
  user?: { id: number, username: string, email?: string, avatar?: string, tokenQuota: number } | null;
  onLogout?: () => void;
}

export default function TopNav({ user, onLogout }: TopNavProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // logout
  const handleLogout = async () => {
    setShowDropdown(false);
    try {
      await fetch('/api/v1/user/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'  // Include cookies (Sa-Token)
      });
    } catch (error) {
      console.log('logout backend failed, but still logout in frontend: ', error);
    }
    onLogout && onLogout();
  };

  return (
    <header className="bg-surface-container-low flex justify-between items-center w-full px-6 h-14 z-50 fixed top-0 border-b border-outline-variant/20">
      <div className="flex items-center gap-8">
        <span className="text-lg font-bold tracking-tight text-primary font-headline">Must Be the SQL</span>
        
        <div className="hidden md:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant font-label">Model</span>
          <div className="flex items-center gap-1 cursor-pointer">
            <span className="text-sm font-medium">GPT-4o (OpenAI)</span>
            <ChevronDown size={14} className="text-on-surface-variant" />
          </div>
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
