import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import TabNav from './TabNav';

interface ManagementPageProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tabs?: { key: string; label: string }[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  actions?: ReactNode;
  children: ReactNode;
}

export default function ManagementPage({
  title,
  subtitle,
  icon: Icon,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
}: ManagementPageProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant bg-surface flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && <Icon size={18} className="text-[#38bdf8] flex-shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-on-surface truncate">
              <span className="text-[#a3e635]">$</span> ls /{title.toLowerCase().replace(/\s+/g, '-')}
              {subtitle && <span className="text-on-surface-variant font-normal">/{subtitle}</span>}
            </h1>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {/* Tab Navigation */}
      {tabs && (
        <div className="border-b border-outline-variant bg-surface px-4">
          <TabNav tabs={tabs} activeTab={activeTab || tabs[0]?.key} onTabChange={onTabChange || (() => {})} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );
}
