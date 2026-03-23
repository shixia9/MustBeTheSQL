import { Database, Settings, User, ChevronDown } from 'lucide-react';

export default function TopNav() {
  return (
    <header className="bg-surface-container-low flex justify-between items-center w-full px-6 h-14 z-50 fixed top-0 border-b border-outline-variant/20">
      <div className="flex items-center gap-8">
        <span className="text-lg font-bold tracking-tight text-primary font-headline">SQL Logic Engine</span>
        
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
        
        <button className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container overflow-hidden border border-primary/10">
            <img 
              src="https://picsum.photos/seed/architect/100/100" 
              alt="User" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-sm font-medium hidden lg:block">Architect Mode</span>
        </button>
      </div>
    </header>
  );
}
